# Code Audit Reference

This file is the playbook for the static-analysis side of the audit. Use it after recon — by then you know the stack, so you can jump straight to the relevant section.

The patterns below are starting points, not exhaustive checklists. The goal is to find *exploitable* issues, not pattern-match for show. When you find something that looks dangerous, read the surrounding code to confirm: is the input actually user-controlled? Is there validation upstream? Is there a defense you missed?

---

## How to read code with security eyes

Three habits make code review productive:

1. **Trace data, not lines.** Pick an HTTP entry point. Follow the input through every transformation until it hits a sink (DB query, shell, template, file path, network call, response body). Every transformation is a chance for a defense to be bypassed or absent.
2. **Read the auth perimeter first.** Where is the boundary between unauthenticated and authenticated? What enforces it? If middleware is the answer, *which routes are wired to it and which aren't?* The bug is usually at the seam.
3. **Diff against the framework's defaults.** Frameworks ship with sensible defaults (CSRF tokens, output encoding, parameterized queries via ORMs). When the code *opts out* (`csrf().disable()`, `dangerouslySetInnerHTML`, raw query, `--unsafe-eval` in CSP), that opt-out is where to look.

---

## Universal sweeps (run on every audit)

Regardless of stack:

```bash
# Hardcoded secrets — quick pass; use gitleaks for thorough
grep -rEn 'password|secret|api[_-]?key|token' --include='*.{js,ts,py,rb,go,java,php,cs}' . \
  | grep -iE '=\s*["\047][^"\047 ]{8,}["\047]' | head -50

# TODO/FIXME/HACK that mention security
grep -rEn '(TODO|FIXME|HACK|XXX).{0,80}(security|auth|sanitize|escape|inject|fixme.*later)' . | head -30

# Disabled security features
grep -rEn '(verify\s*=\s*False|InsecureSkipVerify|csrf.*disable|noverify|--no-check)' . | head -30

# Dangerous patterns regardless of language
grep -rEn '(eval\(|exec\(|system\(|shell_exec|child_process|Runtime\.exec)' . | head -30

# Permissive CORS
grep -rEn 'Access-Control-Allow-Origin.{0,40}\*|cors.*\{[^}]*origin.*true' . | head -20

# Debug mode flags hardcoded
grep -rEn 'DEBUG\s*=\s*True|debug:\s*true|NODE_ENV.{0,20}development' . | head -20
```

These are starting threads; each hit deserves a closer look at context.

---

## By language / framework

### Node.js (Express / Fastify / Koa / NestJS / Next.js)

**Routing & auth perimeter:**
```bash
# Find all routes
grep -rEn "(app|router|fastify)\.(get|post|put|patch|delete)" --include='*.ts' --include='*.js' .

# Middleware ordering — auth must be applied before sensitive routes
# Look for app.use(auth) and confirm it's not after a route registration
```

**SQLi / NoSQLi sinks:**
```bash
# Raw queries
grep -rEn "(query|execute|raw)\s*\(" --include='*.ts' --include='*.js' . | grep -iE '\$\{|`.*\+.*`'

# Mongoose with operator injection risk
grep -rEn '\.(find|findOne|update|delete)\s*\(\s*req\.(body|query|params)' .
```

**Prototype pollution:**
```bash
grep -rEn '(_|lodash)\.(merge|set|defaultsDeep)\b|Object\.assign\s*\([^)]*req\.' .
```

**Command injection:**
```bash
grep -rEn 'child_process\.(exec|execSync|spawn)' --include='*.ts' --include='*.js' . | grep -iE '\$\{|\+.*req|\+.*input'
```

**SSRF:**
```bash
grep -rEn '(axios|got|fetch|request)\s*\([^)]*req\.(body|query|params)' .
```

**JWT:**
- Check `jwt.verify(token, secret, { algorithms: ['HS256'] })` — algorithms allowlist must be present
- Old `jsonwebtoken` versions accepted `alg: none`; check `package.json` version
- Confirm `exp` is checked — `verify()` does this, `decode()` does NOT

**Mass assignment:**
- `User.create(req.body)` without an explicit field allowlist
- Prisma `update({ data: req.body })` — Prisma protects against unknown fields, but allows updating any *defined* field unless filtered
- Mongoose models with `strict: false`

**Express-specific:**
- `res.redirect(req.query.next)` → open redirect
- `res.render('view', { ...req.body })` → SSTI / XSS via template
- `app.disable('x-powered-by')` should be present
- `helmet()` middleware presence and configuration

**Next.js:**
- API routes: `pages/api/*` and `app/api/*/route.ts` — check auth on each
- `getServerSideProps` returning user-controlled data → check for prototype pollution via `JSON.parse`
- Client-side env vars (`NEXT_PUBLIC_*`) shouldn't contain secrets — they ship in the bundle

---

### Go

```bash
# SQLi
grep -rn 'fmt\.Sprintf.*SELECT\|INSERT\|UPDATE\|DELETE' --include='*.go' .
grep -rn 'db\.\(Query\|Exec\)' --include='*.go' . | grep -E '\+'

# Path traversal
grep -rEn 'filepath\.Join\([^)]*r\.\(URL\|Form\|Body\)' --include='*.go' .
grep -rEn 'os\.Open\([^)]*r\.' --include='*.go' .

# Command injection
grep -rEn 'exec\.Command\(\s*["\047]/bin/(sh|bash)' --include='*.go' .
grep -rEn 'exec\.Command\([^,)]*\+' --include='*.go' .

# SSRF
grep -rEn 'http\.\(Get\|Post\|NewRequest\)\([^)]*r\.' --include='*.go' .

# Weak crypto / randomness
grep -rEn 'math/rand' --include='*.go' . | grep -v test

# TLS skip verify
grep -rEn 'InsecureSkipVerify\s*:\s*true' --include='*.go' .

# JWT
grep -rEn 'jwt\.ParseWithClaims\|jwt\.Parse' --include='*.go' .
# Confirm signing method check inside the keyfunc
```

**Auth perimeter:**
- Mux/router middleware — find where auth middleware is registered
- Routes registered before the middleware are unprotected
- Gin: `router.Group("/api").Use(authMiddleware)` vs raw `router.GET(...)`

**Go-specific gotchas:**
- `filepath.Join` does NOT prevent `..` escape. Use `filepath.Clean` and verify result has the expected prefix.
- `http.ServeFile` without sanitization → directory traversal
- TOCTOU: race between auth check and resource access (especially with goroutines)

If `gosec` is installed: `gosec ./...`
If `govulncheck` is installed: `govulncheck ./...`

---

### Frontend (React / Vue / Angular / Svelte)

The frontend is mostly a delivery system for XSS-class bugs and a leak point for secrets. The browser-side audit focuses on:

```bash
# Dangerous sinks
grep -rEn 'dangerouslySetInnerHTML|v-html|\[innerHTML\]|bypassSecurityTrust|\{@html ' --include='*.{ts,tsx,vue,svelte,html}' .

# DOM XSS sinks
grep -rEn 'innerHTML\s*=|outerHTML\s*=|document\.write' --include='*.{ts,tsx,js,jsx}' .

# postMessage without origin check
grep -rEn 'addEventListener\(["\047]message["\047]' --include='*.{ts,tsx,js,jsx}' . -A 5 | grep -B 5 -A 5 -v 'origin'

# Tokens in localStorage (XSS = takeover)
grep -rEn 'localStorage\.(set|get)Item.*(token|jwt|auth)' --include='*.{ts,tsx,js,jsx}' .

# Embedded secrets / API keys
grep -rEn '(api[_-]?key|secret|token).*["\047][A-Za-z0-9_-]{20,}["\047]' --include='*.{ts,tsx,js,jsx}' .

# Source maps in prod build configs
grep -rEn 'sourceMap\s*[:=]\s*true|devtool.*source-map' --include='*.{js,ts}' . | grep -v node_modules
```

**Build output review:**

The shipped JS bundle is the artifact attackers actually see. Source files often differ from what builds — env-substitution, dead-code elimination, source-map config, and bundler-injected helpers all change the surface. Build the project and scan the output, don't just read source.

1. **Locate the build entrypoint.** Check (in order): `Makefile` (look for targets like `build`, `web-build`, `frontend`), `package.json` `scripts.build`, `pnpm-workspace.yaml` / `turbo.json` for monorepo build orchestration, `Dockerfile` for `RUN npm run build` or similar, CI configs (`.github/workflows/*.yml`) for the actual command used to produce the prod artifact.
2. **Run the same build the user ships.** Prefer `make build` (or whatever the project uses) over guessing — it picks up project-specific env vars, bundler configs, and post-processing. Use the safe-deps skill if you need to install dependencies first.
3. **Locate the output.** Common: `dist/`, `build/`, `.next/`, `out/`, `web/dist/`. The build's stdout usually prints the path.
4. **Scan the bundle:**
   ```bash
   BUNDLE_DIR="dist"
   # Embedded secrets (string constants survive minification)
   grep -roEh '"(AKIA|sk_live|sk_test|ghp_|xoxb|eyJ)[A-Za-z0-9_-]{20,}"' "$BUNDLE_DIR" | sort -u
   # Internal API hosts that shouldn't ship
   grep -roEh '"https?://[^"]*(internal|staging|dev|local|admin)[^"]*"' "$BUNDLE_DIR" | sort -u
   # All API paths the bundle calls — useful for endpoint inventory
   grep -roEh '"(/(api|v[0-9]+|graphql)/[^"]+)"' "$BUNDLE_DIR" | sort -u
   # Source maps shipped alongside JS — leak full source
   find "$BUNDLE_DIR" -name '*.js.map' -o -name '*.map'
   ```
5. **Compare source vs. bundle.** A token that's gated on `process.env.NODE_ENV !== 'production'` in source may still be present in the bundle if the env var wasn't set at build time. Trust the bundle, not the source.

---

### GraphQL (any backend)

```bash
# Introspection — should be off in prod
grep -rEn '(introspection|playground).*(true|enabled)' .

# Resolver auth — every resolver needs an auth guard
# Look for resolver definitions and check for context.user / requireAuth wrapper
grep -rEn '(Query|Mutation):\s*\{' .
```

Test live:
```bash
# Introspection probe
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"query":"{__schema{types{name}}}"}' https://target/graphql | jq .

# Aliased query rate-limit bypass test
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"query":"{a:user(id:1){id} b:user(id:2){id} c:user(id:3){id}}"}' https://target/graphql | jq .
```

---

### Containers (Dockerfile / docker-compose)

If `Dockerfile` or `docker-compose.yml` is in scope:

**Dockerfile:**
- `USER` set to non-root (`USER node`, `USER 1000`)?
- Secrets in `RUN` commands or `ENV` — these end up in image layers
- Base image pinned to a digest, not just a tag
- `HEALTHCHECK` and `EXPOSE` reasonable
- `--no-cache` on package installers; package versions pinned where possible

**docker-compose.yml:**
- Services exposing ports they don't need (`ports:` vs `expose:`)
- Default credentials in `environment:` (`POSTGRES_PASSWORD: password`)
- Volumes mounting sensitive host paths

If `trivy` is available: `trivy fs .` (filesystem deps) and `trivy image <image>` (built containers).

---

## Output of the code-audit phase

For each suspicious finding, capture:
- File path and line number
- A short code excerpt (3-10 lines)
- A one-sentence description of why it's suspicious
- A confirmation plan: "if a live target is in scope, send `<probe>` to confirm"

Don't write the finding file yet — these go in a working list. Promote to a finding file (`findings/F<NNN>-...md`) only after you've either confirmed the issue or decided to ship it as "Suspected" with that status clearly marked.
