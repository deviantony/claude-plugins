---
name: web-security-audit
description: Run a deep web-application security audit — combine static code review with live-instance testing to discover real exploits, not just checklist items. Trigger whenever the user asks to security-review, harden, audit, pentest, or look for vulnerabilities/exploits/CVEs in a web app, API, or backend service. Also trigger for related framings ("is this app secure?", "OWASP audit", "find security bugs", "check for SQL injection / XSS / SSRF / IDOR", "review the auth flow", "harden this before launch", "production readiness from a security angle"), even when the user doesn't explicitly say "audit" or "skill".
user-invocable: true
---

# Web Security Audit

This skill runs a thorough security audit against a web application. It combines static analysis of the codebase with live-instance probing to find real, exploitable issues — not a generic OWASP checklist.

## Mindset

Audit like an attacker, report like an engineer.

- **Prove vulnerabilities, don't just list them.** A finding that says "this might be vulnerable to SQLi" is worth half as much as one that includes the exact request that returned the database version. When you can confirm an issue, do — and capture the request/response as evidence. When you can't (no creds, destructive risk, scope limit), say so and mark the finding "Suspected" not "Confirmed".
- **Investigate, don't just scan.** Scanners find easy stuff. The interesting bugs come from understanding *this app's* business logic — auth flows, multi-tenant isolation, state machines, file handling, integrations. Spend time reading the code that matters.
- **Skepticism beats credulity.** When a defense looks present (a sanitizer, a CSRF token, an auth check), assume it's incomplete until you've tested it. Most real bugs live in the gap between "we have X" and "X works correctly in all paths".
- **Severity is impact × confirmability.** A confirmed medium beats a theoretical critical.

## Phases

The audit runs in seven phases. Use TaskCreate to track them so the user can see progress.

1. **Scope** — what targets, what authorization, what's out of bounds
2. **Preflight tooling** — detect what scanners are available; offer to install gaps
3. **Recon & fingerprinting** — establish the tech stack
4. **Threat model** — map the stack to the attack surface that actually matters here
5. **Investigation** — code audit + live testing (passive always; active behind auth gate)
6. **Findings authoring** — one markdown file per finding
7. **Summary report** — executive overview with severity counts and prioritized remediation

Don't skip ahead. Each phase informs the next — recon decides what to look for in code; code review surfaces hypotheses to test live.

---

## Phase 1: Scope

Before doing anything else, establish:

1. **Target type** — codebase only, live instance only, or both?
   - **Codebase only:** static analysis. No live probes. Findings will be marked "Suspected" unless trivially confirmable from code.
   - **Live only:** black-box / grey-box testing. Limited to what's observable from the network surface.
   - **Both (preferred):** code review surfaces hypotheses; live testing confirms them. Highest signal.

2. **For codebase targets:** what's the path? Any monorepo subset to focus on? Are there `.gitignore`d configs (env files, secrets) that should be in scope?

3. **For live targets:** ask for `URL`, any authentication (credentials, API tokens, OAuth flows, session cookies), known account types (admin / regular user / service account), and any out-of-scope endpoints (e.g., third-party integrations, payment gateways, prod-only systems).

4. **Authorization for live testing.** Before sending any traffic to a live target, get an explicit yes from the user that they have authorization to test it. This is non-negotiable. See the authorization gate section below.

5. **Time budget / depth.** Quick sanity check (~30 min) vs. deep audit (multiple hours)? Adjust the breadth of the threat model accordingly.

Capture all of this in `security-audit-<YYYYMMDD-HHMM>/SCOPE.md` so it's auditable later. Use the user's local time for the timestamp.

---

## Phase 2: Preflight tooling

Run `scripts/preflight.sh` to detect which security tools are installed. Read the output and report it to the user.

The skill is designed to work with **pure curl + scripting** as a baseline — every active probe in `references/live-testing.md` includes a manual fallback. But several common scanners dramatically speed up specific phases (`nuclei` for known-CVE checks, `ffuf` for content discovery, `sqlmap` for SQLi confirmation, `trivy`/`grype` for dependency CVEs, `gitleaks` for secrets).

After running preflight, ask the user whether to install missing tools. Show them the install commands from `references/tooling.md`. Don't install without asking — the user may be on a shared system, prefer a different package manager, or want to keep their environment minimal.

If the user declines a tool, note it in `SCOPE.md` and use the manual fallback for the relevant phase.

---

## Phase 3: Recon & fingerprinting

Establish what you're attacking. Detailed techniques live in `references/recon.md` — read it now if this is your first phase.

For **codebase recon:**
- Language(s), framework(s), versions
- Routing layer / API style (REST, GraphQL, RPC)
- Auth mechanism (sessions, JWT, OAuth, API keys)
- Data layer (ORM, raw SQL, NoSQL)
- Templating / rendering (SSR, SPA, hybrid)
- Deployment surface (Dockerfile, k8s manifests, IaC, reverse proxy config)
- Dependencies and their versions

For **live recon (passive only at this phase):**
- HTTP response headers — server banners, framework cookies, security headers present/absent
- TLS configuration
- Visible endpoints from the homepage / sitemap / robots.txt
- JavaScript bundle inspection — extract API endpoints, embedded keys, comments

Save findings to `recon/stack.md`. This becomes the basis for the threat model.

---

## Phase 4: Threat model

A generic OWASP Top 10 sweep is low-signal. The valuable threat model is **stack-specific**: what does this *exact* combination of choices make likely?

Examples:
- A Node/Express app with `body-parser` and dynamic `req.body` access → mass assignment, prototype pollution
- A Rails app with `find_by_id(params[:id])` → IDOR, mass assignment via `permit`
- A SPA with JWT in localStorage → XSS → token theft is a critical-impact path
- A GraphQL API → introspection exposure, query depth/cost DoS, batched resolver auth bypass
- A multi-tenant app → cross-tenant data leak via missing tenant scoping in queries
- A file-upload feature → unrestricted file types, path traversal, SSRF via image processing
- An OAuth/SSO integration → redirect URI validation, state parameter, token storage

Reference `references/recon.md` for the stack→threat mapping. Output a prioritized list of attack surface to investigate, saved to `recon/attack-surface.md`. This drives Phase 5.

---

## Phase 5: Investigation

This is where the real work happens. Code audit and live testing are interleaved — code review surfaces a hypothesis ("this endpoint takes user input and passes it to `child_process.exec`"), live testing confirms it.

### Code audit

Read `references/code-audit.md` for language- and framework-specific patterns. The high-leverage areas across every stack:

- **Auth & session handling** — login, logout, password reset, MFA, session fixation, token validation
- **Authorization** — every endpoint that takes a resource ID. Is there an ownership / role check?
- **Injection sinks** — SQL, NoSQL, OS commands, template injection, LDAP, XPath, deserialization
- **Output encoding** — XSS in templates, sinks like `innerHTML`, `dangerouslySetInnerHTML`, `v-html`
- **Crypto usage** — homegrown crypto, weak algorithms, hardcoded keys, weak randomness
- **Secrets & config** — credentials in code, debug flags in prod, permissive CORS, missing CSRF tokens
- **Dependencies** — known-vulnerable versions; run `trivy`/`grype`/`npm audit`/`pip-audit`/`bundler-audit` if available
- **Multi-tenancy & access control** — tenant scoping in queries, IDOR-prone endpoints
- **File handling** — uploads, downloads, path construction, archive extraction (zip slip)
- **Server-side requests** — anywhere the server fetches a user-controlled URL → SSRF

For each suspected issue: capture file path + line number, the relevant code excerpt, and what makes it suspicious. If a live target is in scope, queue it for confirmation.

### Live testing

Read `references/live-testing.md` for the playbook. It's split into two tiers:

**Passive tier — always allowed once authorization is confirmed.** Headers, TLS, info disclosure, fingerprinting, observation of normal app behavior with valid creds. No payloads.

**Active tier — requires per-class authorization.** SQLi probes, XSS, SSRF, IDOR, auth bypass attempts, file upload abuse, brute force. See the authorization gate below.

Capture full request/response for every probe — these become evidence in findings.

---

## Phase 6: Findings authoring

Every finding gets its own markdown file in `security-audit-<timestamp>/findings/`, named `F<NNN>-<slug>.md` (e.g., `F003-sqli-search-endpoint.md`). Number sequentially in discovery order; severity isn't part of the filename so files don't get renamed if you re-rate.

Use the template and severity rubric in `references/findings.md`. Each finding must have:

- Severity (Critical / High / Medium / Low / Info) with a one-sentence justification
- Status (Confirmed / Suspected)
- Location (file:line OR endpoint+method)
- Description
- Evidence (code excerpt or HTTP request/response — actual proof)
- Impact (what an attacker gains)
- Remediation (concrete fix, with code if applicable)
- References (CWE, OWASP category, CVE if relevant)

If you can't write the Evidence section, you don't have a finding yet — you have a hypothesis. Either go confirm it or downgrade to "Suspected" and say what would confirm it.

---

## Phase 7: Summary report

Write `security-audit-<timestamp>/README.md` using the template in `references/findings.md`. It should include:

- Audit metadata (date, target, scope, methodology, tooling used)
- Executive summary (2-3 paragraphs — what you found, what matters most)
- Severity counts and an index table linking to each finding file
- Top remediation priorities (ordered by exploitability × impact, not just severity)
- What was *not* tested and why (out of scope, time-boxed, blocked)

The "what was not tested" section matters. It's honest and it tells the reader where residual risk remains.

---

## Authorization gate (CRITICAL)

Active testing against a live system can:
- Trigger security alerting / incident response
- Lock out user accounts
- Exhaust quotas or rate limits
- Inadvertently exfiltrate data
- In rare cases, cause data corruption (mass-assignment probes, SSRF to internal mutating endpoints)

**Before any active probe:**

1. Confirm the user has explicit authorization to test the target. Don't accept "it's mine" alone if the target looks like a third-party domain — ask. Don't proceed without a clear yes.
2. Confirm the test class with the user. The classes are:
   - `auth-bypass` (login probes, JWT manipulation, session fixation)
   - `injection` (SQLi, NoSQLi, command, template, deserialization payloads)
   - `xss` (reflected/stored payload injection)
   - `access-control` (IDOR, privilege escalation attempts)
   - `ssrf` (server-side request probes — risky if internal network is reachable)
   - `file-upload` (uploading test files to confirm filter bypass)
   - `brute-force` (any credential or token guessing — coordinate with WAF/lockout)
3. Show the user the probe request *before sending* the first one in each class. Subsequent probes in the same class don't need confirmation unless they materially change scope (e.g., moving from read-only SQLi probes to UNION SELECT data extraction).
4. Stop immediately if the user says stop, or if a probe causes obvious unintended impact (account lockout, 5xx storm, etc.).

**Passive testing** (headers, TLS scan, observing normal app behavior with provided creds) is allowed once initial authorization is confirmed and does not require per-class confirmation.

Refusal scenarios — do not proceed even if asked:
- Targets the user clearly does not own and has no authorization context for (e.g., "audit microsoft.com")
- Anything that reads as DoS, mass exploitation, or supply-chain compromise
- Evading detection / disabling security monitoring as a goal in itself

If a request feels off, ask before acting.

---

## Output structure

```
security-audit-<YYYYMMDD-HHMM>/
├── README.md              # Executive summary + index
├── SCOPE.md               # What was in scope, what wasn't, authorization context
├── recon/
│   ├── stack.md           # Tech stack discovered
│   └── attack-surface.md  # Threat model output
└── findings/
    ├── F001-<slug>.md
    ├── F002-<slug>.md
    └── ...
```

Create the timestamped folder at the start of Phase 1 and write into it incrementally — don't batch everything for the end. If something interrupts the audit, the partial output is still useful.

---

## When to stop

The audit ends when one of:

- You've covered every item on the attack-surface list (best case)
- The time budget the user set is exhausted (write `What was not tested` honestly)
- You've hit a blocker that requires user input and the user has signed off on stopping there

Always finish with the summary report — don't leave the audit folder without a `README.md`. A partial summary is more useful than a complete absence.

---

## Reference files

- `references/recon.md` — Stack fingerprinting techniques (code + live), stack→threat mapping
- `references/tooling.md` — CLI tool catalog with install commands per OS
- `references/code-audit.md` — Static analysis patterns by language/framework
- `references/live-testing.md` — Passive + active testing playbook with concrete probes
- `references/findings.md` — Severity rubric, finding template, summary template
- `scripts/preflight.sh` — Tool detection script (run in Phase 2)
