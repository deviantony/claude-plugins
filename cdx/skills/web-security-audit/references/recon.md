# Recon & Threat Modeling Reference

The goal of recon is two things: figure out *what* you're attacking, and use that to prioritize *where* to look. A generic OWASP sweep against an unknown stack is low-signal; a stack-aware investigation is where real bugs come from.

This file has two parts:
1. **Fingerprinting techniques** — how to identify the stack from code or live signals
2. **Stack → threat mapping** — once you know the stack, which classes of bugs to prioritize

---

## Part 1: Fingerprinting

### From a codebase

Walk the repo root first. The directory structure usually gives away the stack in seconds.

| Signal | Likely stack |
|---|---|
| `package.json` | Node.js — read `dependencies` for framework (express, fastify, koa, next, nestjs, hapi) |
| `go.mod` | Go — read for gin, echo, fiber, chi, net/http |
| `mix.exs` | Elixir — Phoenix |
| `Cargo.toml` | Rust — actix-web, axum, rocket, warp |

**Then map the architecture:**
- Routing: where are routes defined? (`routes.rb`, `urls.py`, `app.routes.ts`, OpenAPI spec)
- Auth: search for `authenticate`, `login`, `jwt`, `session`, `passport`, `omniauth`, middleware named `auth*`
- DB: ORM (Prisma, TypeORM, Sequelize, ActiveRecord, SQLAlchemy, Django ORM, GORM, Hibernate) or raw queries (`query(`, `execute(`, `db.exec`)
- Templating: file extensions reveal it (`.erb`, `.jinja`, `.hbs`, `.ejs`, `.tsx`, `.vue`, `.svelte`, `.html.haml`)
- Frontend: `web/`, `client/`, `frontend/`, `public/` directories; `vite.config`, `next.config`, `webpack.config`, `angular.json`
- Reverse proxy / edge: `nginx.conf`, `Caddyfile`, `traefik.yml`, `Dockerfile`/`docker-compose.yml`, `k8s/` manifests
- Secrets and config: `.env*`, `config/`, `appsettings*.json`, `application.properties`, `secrets/`. Note: `.env` files are usually gitignored — ask the user if they want sensitive configs included in scope.

**Run a `git log --stat` skim** for files touched in the last 90 days. Recent activity is where regressions hide and where the code is least settled — high-yield audit area.

### From a live target (passive only)

Passive recon does not send abnormal traffic. It's safe by default but still note it in scope.

```bash
# Headers + status
curl -sI https://target.example.com/

# Full response with headers
curl -sv https://target.example.com/ 2>&1 | head -100

# Robots, sitemap, common metadata
for path in robots.txt sitemap.xml humans.txt .well-known/security.txt .git/HEAD .env; do
  echo "=== $path ==="
  curl -s -o /dev/null -w "%{http_code}\n" "https://target.example.com/$path"
done

# TLS configuration
echo | openssl s_client -connect target.example.com:443 -servername target.example.com 2>/dev/null \
  | openssl x509 -noout -text | head -60

# JS bundle inspection — extract endpoints, keys, comments from main bundle(s)
curl -s https://target.example.com/ | grep -oE 'src="[^"]+\.js[^"]*"'
# Then fetch each JS file and grep for: api/, /v1/, fetch(, axios., process.env, AKIA, sk_live, eyJ
```

**Headers tell a story:**
- `Server:` / `X-Powered-By:` — direct fingerprint
- `Set-Cookie` names — `connect.sid` (Express), `JSESSIONID` (Java), `PHPSESSID`, `_<app>_session` (Rails), `sessionid` (Django), `laravel_session`
- `X-Request-Id` patterns sometimes reveal stack
- Missing security headers (`Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are findings in themselves
- `WWW-Authenticate` reveals auth scheme

**Cookie attributes:** check `Secure`, `HttpOnly`, `SameSite` for every Set-Cookie. Missing flags on session cookies are usually findings.

**Use `nuclei` for known fingerprints** if installed:
```bash
nuclei -u https://target.example.com/ -t technologies/ -silent
```

### What if both?

Cross-reference. Code says "we use Express 4.17"; live response says `Server: nginx` with no Express signature → there's a reverse proxy in front. Note the proxy in scope; some attacks (host header injection, request smuggling, header parsing differences) live at the proxy boundary.

Code says "auth uses JWT in Authorization header"; live shows session cookies are set anyway → there are likely two auth paths and the second one may be untested. Investigate both.

---

## Part 2: Stack → threat mapping

For each stack, the table below shows the high-yield bug classes — the ones where this stack's defaults, idioms, or common mistakes produce real, exploitable issues. Use this to prioritize Phase 5 investigation.

This isn't exhaustive — it's a starting prioritization. The OWASP Top 10 still applies everywhere.

### Node.js (Express / Fastify / Koa / NestJS)

- **Prototype pollution** — `Object.assign`, `lodash.merge`, `_.set` with user-controlled keys; check `__proto__` and `constructor.prototype` paths
- **Mass assignment** — `User.create(req.body)` without an allowlist; check Mongoose models, Sequelize/TypeORM definitions, Prisma usage
- **Async ReDoS** — user-controllable regex inputs, especially in validation middleware
- **SSRF** — `axios`/`got`/`fetch`/`node-fetch` calls with user-controlled URLs; check `request`, `superagent` too
- **Path traversal** — `fs.readFile`, `path.join` with unsanitized input; archive extraction (`adm-zip`, `tar`)
- **Command injection** — `child_process.exec`, `execSync` with template strings or concatenated input (use `execFile` with array args instead)
- **JWT issues** — `jsonwebtoken` accepting `alg: none` (older versions), missing `algorithms` allowlist, secret confusion
- **NoSQL injection** — Mongoose `.find(req.body)` accepting `{$gt: ""}` operator injections
- **CORS misconfig** — `cors()` with wildcards or reflecting Origin; credentials with permissive origin

### Go

- **Path traversal** — `filepath.Join`, `os.Open` with user input (Go's `filepath.Join` does NOT prevent `..` escape — use `filepath.Clean` and re-verify the prefix)
- **SSRF** — `http.Get(userURL)`, `net/http` clients without URL validation
- **Command injection** — `exec.Command` with shell strings; safer with `exec.Command("cmd", arg1, arg2)` (no shell)
- **Open redirect** — `http.Redirect(w, r, userURL, ...)`
- **Session fixation** — manual session implementations that reuse session IDs across login
- **Crypto** — homegrown JWT validation, `math/rand` instead of `crypto/rand`, missing constant-time compare
- **Race conditions** — TOCTOU in auth checks, especially with goroutines accessing shared state without sync
- **Template injection** — `html/template` is safe; `text/template` with user-controlled actions is not

### GraphQL (any backend)

- **Introspection enabled in prod** — exposes full schema
- **Query depth / cost** — no depth or complexity limit → DoS via deeply nested queries
- **Batched queries** — single request runs many operations, can bypass rate limiting
- **Field-level authz** — auth often checked at resolver entry but not at nested field resolvers
- **Aliasing brute force** — same field aliased N times in one query bypasses per-request rate limits
- **Mutation enumeration** — error messages reveal whether usernames/emails exist

### REST APIs (general)

- **BOLA / IDOR** — every endpoint that takes a resource ID needs an ownership check
- **BFLA** — function-level authz: admin endpoints reachable by non-admins via guessing
- **Mass assignment** — accepting more fields than the user should be able to set
- **Excessive data exposure** — endpoints returning full user objects when only a subset is needed (relying on frontend to filter)
- **Rate limiting absence** — login, password reset, OTP verification need it
- **API key in URL** — keys passed as query params get logged everywhere

### Frontend (SPA — React / Vue / Angular / Svelte)

- **XSS via dangerous sinks** — `dangerouslySetInnerHTML` (React), `v-html` (Vue), `[innerHTML]` (Angular bypassed via `bypassSecurityTrust*`), `{@html}` (Svelte)
- **Token storage** — JWT in localStorage means XSS = full account takeover. Cookies with HttpOnly are safer.
- **CSRF on cookie-based auth** — SPA + cookies needs SameSite or CSRF tokens
- **Source map exposure in prod** — `*.js.map` files reveal full source
- **Embedded secrets in bundles** — API keys, internal URLs, debug flags
- **postMessage handlers** without origin checks → cross-window XSS
- **OAuth flows** — implicit flow (deprecated), missing PKCE on public clients, state parameter validation

### Multi-tenant SaaS

- **Cross-tenant data access** — every query needs tenant scoping; one missing `WHERE tenant_id = ?` is critical
- **Tenant ID in URL or body trusted as authoritative** — should derive from session
- **Subdomain takeover** — dangling DNS pointing to deprovisioned tenant subdomains
- **Resource exhaustion** — one tenant can DoS shared infrastructure (test with realistic limits)

### Files & uploads

- **Unrestricted file types** — `.php`, `.jsp`, `.svg` (XSS), `.html` (XSS) uploads served from same origin
- **Path traversal in filename** — `../../etc/passwd` as filename
- **Zip slip** — extracting archives that contain `../` paths
- **Image processing libraries** — ImageMagick (Ghostscript chain), libvips, Pillow have a long CVE history
- **SSRF via image fetch** — "fetch image from URL" features → internal network probing
- **Polyglot files** — content-type detection can be bypassed by files valid in multiple formats

### Auth & sessions

- **Login** — username enumeration via timing or different error messages; rate limiting; account lockout DoS
- **Password reset** — predictable tokens, tokens that don't expire, tokens that don't invalidate after use, host header injection in reset email links
- **MFA bypass** — second factor not enforced on every sensitive action; "remember device" with weak tokens
- **Session fixation** — session ID not regenerated on login
- **Logout** — session not invalidated server-side, just cleared from client
- **JWT** — `alg: none`, `alg: HS256` with public RSA key as secret, missing expiry validation, no audience/issuer checks
- **OAuth** — open redirect via `redirect_uri`, missing/predictable `state`, missing PKCE on public clients

---

## Output of this phase

After recon and threat modeling, write **two files** in the audit folder:

`recon/stack.md` — what you discovered:
```markdown
# Stack
- Framework: Express 4.18.2
- Auth: JWT (jsonwebtoken 9.0.0) in Authorization header; sessions also set via express-session for legacy admin UI
- DB: PostgreSQL via Prisma 5.x
- Frontend: React 18 SPA, Vite build, served by same Express instance
- Edge: nginx 1.24 reverse proxy (terminates TLS, adds X-Forwarded-* headers)
- Deployed: Docker on a single VM (docker-compose.yml in repo)
- Notable deps: lodash 4.17.20 (older — check CVEs), axios 0.27 (SSRF surface)
```

`recon/attack-surface.md` — prioritized investigation queue:
```markdown
# Attack surface (prioritized)

## P0 — investigate first
- [ ] JWT validation: confirm algorithm allowlist, expiry, issuer
- [ ] /api/users/:id endpoint — IDOR check (no visible ownership scoping)
- [ ] Admin UI session flow — second auth path increases attack surface
- [ ] axios calls to user-supplied URLs in /api/preview-link → SSRF

## P1 — investigate after P0
- [ ] Mass assignment in /api/users PATCH (Prisma update)
- [ ] File uploads in /api/avatar — content-type, size, path
- [ ] CORS config in Express — currently wildcards in dev, verify prod
- [ ] Lodash CVE check (4.17.20)

## P2 — defense in depth
- [ ] Security headers via nginx
- [ ] Rate limiting on auth endpoints
- [ ] CSP coverage of SPA inline scripts
```

This file becomes the working checklist for Phase 5.
