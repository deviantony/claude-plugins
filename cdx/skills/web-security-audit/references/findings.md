# Findings & Reporting Reference

This file defines the severity rubric, the per-finding template, and the summary report (`README.md`) template. Consistency here is what makes the audit folder useful to the people who'll act on it.

---

## Severity rubric

Severity is **impact × confirmability**, not impact alone. A confirmed Medium beats a theoretical Critical because the reader can act on it.

| Severity | Definition | Examples |
|---|---|---|
| **Critical** | Confirmed bug that gives an attacker unrestricted access, full data exposure, or full takeover, with low effort and no special access. Fix immediately. | Confirmed RCE; pre-auth SQLi pulling full user table; auth bypass on admin functions; secrets in public repo with confirmed live access; confirmed cross-tenant data access. |
| **High** | Confirmed bug exposing sensitive data, allowing privilege escalation, or compromising authentication for a class of users — but requires some condition (auth as low-priv user, specific input, etc.). | Confirmed authenticated SQLi or stored XSS; IDOR exposing PII; auth bypass on a non-admin sensitive endpoint; SSRF reaching internal services; high-CVSS dependency CVE in actively-used path. |
| **Medium** | Confirmed weakness that materially aids an attack chain, or a likely-but-unconfirmed High. | Reflected XSS in low-traffic surface; missing rate limiting on auth; weak session config (missing flags); CSRF on a state-change endpoint where SameSite mitigates most browsers; verbose error pages exposing internals. |
| **Low** | Defense-in-depth gap, configuration deviation from best practice, low-likelihood issue. | Missing security header (CSP, HSTS); information disclosure with low value (server banner); known-old library version with no exploitable path; weak password policy. |
| **Info** | Observation worth recording but not actionable on its own. | "All auth endpoints use the same rate-limit window — consider per-endpoint tuning"; "DB driver supports prepared statements throughout — good"; tech-stack notes. |

When in doubt, downgrade. A wrong "High" wastes the reader's attention; a Medium that's secretly a High will get re-rated.

**Status field** (separate from severity):
- `Confirmed` — you have evidence (HTTP exchange, code excerpt with proof of reachability) that the bug exists and is exploitable
- `Suspected` — code or behavior suggests the bug; you couldn't confirm (no live access, destructive risk, time)

---

## Per-finding template

Save each finding as `findings/F<NNN>-<slug>.md`. Number sequentially in discovery order. Use this template:

```markdown
# F001 — Brief descriptive title

| Field | Value |
|---|---|
| Severity | High |
| Status | Confirmed |
| Class | injection / access-control / auth / xss / ssrf / csrf / config / dependency / secret / business-logic |
| CWE | [CWE-89](https://cwe.mitre.org/data/definitions/89.html) — SQL Injection |
| OWASP | A03:2021 — Injection |
| Discovered | 2026-05-02 14:32 UTC |
| Location | `src/api/products.js:42` and `GET /api/products?id=` |

## Summary

One paragraph: what's wrong, where, and what an attacker gets. Read this and the severity field — that should be enough for triage.

## Evidence

Code excerpt with file:line:

```javascript
// src/api/products.js:38-46
app.get('/api/products', async (req, res) => {
  const id = req.query.id
  const result = await db.query(`SELECT * FROM products WHERE id = ${id}`)  // ← unparameterized
  res.json(result.rows)
})
```

Confirming request:

```http
GET /api/products?id=1%20UNION%20SELECT%20username,password,3,4%20FROM%20users HTTP/1.1
Host: target.example.com
Authorization: Bearer eyJ...

HTTP/1.1 200 OK
Content-Type: application/json

[{"id":"alice","name":"$2b$10$abc...","col3":3,"col4":4}, ...]
```

(Raw exchanges saved to `evidence/F001/`.)

## Impact

What an attacker actually gets:
- Full read access to all tables in the application database
- Specifically: user credentials (bcrypt hashes), session tokens table, internal audit log
- No authentication required beyond a valid session — any logged-in user can exploit

## Reproduction

Step-by-step, copy-pasteable. Someone reading this should be able to confirm the bug in under 2 minutes:

1. Log in as any user
2. Capture the session token
3. Send: `curl -H "Authorization: Bearer $TOKEN" "https://target.example.com/api/products?id=1%20UNION%20SELECT%201,2,3,4--"`
4. Observe: response includes attacker-controlled values from the UNION SELECT

## Remediation

Concrete fix, ideally with code:

```javascript
// Replace string interpolation with parameterized query
const result = await db.query('SELECT * FROM products WHERE id = $1', [id])
```

Additional hardening:
- Validate `id` is a UUID/integer before use (defense in depth)
- Run `eslint-plugin-security` to catch similar patterns elsewhere — there are 3 other `db.query` callsites in this file that should be audited

## References

- CWE-89: https://cwe.mitre.org/data/definitions/89.html
- OWASP Cheatsheet: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- pg (node-postgres) parameterized queries: https://node-postgres.com/features/queries#parameterized-query
```

### Field guidance

- **Severity** — apply the rubric above strictly. If a teammate would re-rate it, reconsider.
- **Status** — `Confirmed` requires evidence that proves the bug. If you can't write the Evidence section, you don't have a finding yet.
- **Class** — pick one from the list. Helps when filtering many findings.
- **CWE** — link the most specific CWE; CWE catalog is searchable at cwe.mitre.org. Skip if no good fit.
- **OWASP** — map to OWASP Top 10 2021 if applicable; for APIs use OWASP API Security Top 10 2023.
- **Discovered** — local time + timezone (or UTC). Helps with audit trail.
- **Location** — file:line for code findings; HTTP method + path for endpoint findings; both if available.
- **Summary** — make it triageable on its own. Reader skims this + severity to decide priority.
- **Evidence** — actual proof. Code excerpt with line numbers for SAST findings; HTTP exchange for live findings; both ideally.
- **Impact** — concrete damage. Avoid generic "could lead to compromise" filler. Specific systems, specific data, specific scope.
- **Reproduction** — copy-pasteable. Someone reproducing this in 6 months won't have your context.
- **Remediation** — actionable. Don't just say "use parameterized queries" — show the patched code if you can.
- **References** — CWE, OWASP, framework docs, related CVEs. Skip filler.

---

## Summary report template (`README.md`)

This goes in the audit folder root. It's the first thing the reader sees.

```markdown
# Security audit — <target name>

| | |
|---|---|
| Target | <repo path / URL / both> |
| Date | 2026-05-02 |
| Auditor | <handle/name from git config or "Claude (web-security-audit skill)"> |
| Authorization | Confirmed by <user> on <date> |
| Methodology | Code review + live black/grey-box testing |
| Tools used | curl, jq, openssl, nuclei v3.x, sqlmap 1.7, gitleaks, trivy |

## Executive summary

Two or three paragraphs. What you found at a glance. The first paragraph should be readable by someone who only reads the first paragraph. Lead with the most important issues, mention the audit's overall posture, and call out anything that requires immediate action.

Example:

> The audit identified **2 Critical**, **5 High**, **8 Medium**, and **6 Low/Info** findings across the codebase and live target. The most pressing issues are a confirmed pre-auth SQL injection in `/api/login` (F002) that allows extracting any user's credentials, and a confirmed JWT validation flaw (F004) that accepts unsigned tokens, enabling full account impersonation. Both should be remediated before any further deployment.
>
> The application's overall security posture is mixed. Defenses like CSRF tokens, HTTPS-only cookies, and parameterized ORM queries are in place across most of the codebase. The findings cluster in two areas: a legacy `/api/v1/*` namespace that bypasses the middleware perimeter applied to `/api/v2/*`, and the recently-added webhook subsystem (commit history shows it was added in the last 30 days) which lacks the validation present elsewhere.
>
> Beyond the listed findings, the audit was unable to test <X, Y> due to <reason>. See "What was not tested" below.

## Severity counts

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 5 |
| Medium | 8 |
| Low | 4 |
| Info | 2 |

## Top remediation priorities

Ordered by exploitability × impact, not strictly by severity. The reader should fix things in this order:

1. **F002** — Pre-auth SQL injection in `/api/login` (Critical) — fix immediately; rotate any potentially-exposed creds
2. **F004** — JWT `alg: none` accepted (Critical) — fix immediately; force re-login for all sessions after fix
3. **F007** — IDOR in `/api/notes/:id` exposes any user's notes (High) — fix; consider audit log review for past abuse
4. ...

## All findings

| ID | Severity | Status | Title |
|---|---|---|---|
| [F001](findings/F001-missing-csp.md) | Low | Confirmed | Missing Content-Security-Policy header |
| [F002](findings/F002-sqli-login.md) | Critical | Confirmed | Pre-auth SQL injection in /api/login |
| [F003](findings/F003-cors-wildcard.md) | Medium | Confirmed | CORS allows arbitrary origins with credentials |
| [F004](findings/F004-jwt-alg-none.md) | Critical | Confirmed | JWT validation accepts unsigned tokens |
| ... | | | |

## Methodology

Brief description of what was actually done:

- Code review of <N> files in `src/`, focusing on auth, DB layer, and `/api/*` routes
- Tools: semgrep with `p/security-audit` ruleset; trivy on `Dockerfile` and `package.json`; gitleaks on full git history
- Live testing against `https://staging.example.com`:
  - Passive: header analysis, TLS scan, info-disclosure path probes, JS bundle inspection
  - Active: <classes tested — auth-bypass, injection, access-control, xss, csrf>
  - Authenticated as: regular user (provided), admin (provided)
- Time spent: ~3 hours

## What was not tested

This section matters as much as the findings list — it tells the reader where residual risk remains.

- **Production environment** — testing was against staging; assume staging and prod can drift. A pre-prod re-test is recommended.
- **Payment integration** — out of scope per user request; contact the payment processor for their SOC2 report.
- **WebSocket subsystem** — code reviewed but not live-probed; no client to drive realistic traffic patterns.
- **Brute-force resilience on real user accounts** — only tested against throwaway accounts to avoid lockouts.
- **Mobile app surface** — not in scope.
- **Internal admin dashboard at admin.example.com** — separate target, not in scope.

## Notes / observations

(Optional — defense-in-depth observations or context that didn't make it to a finding.)

- Auth middleware wiring is consistent across `/api/v2/*` — good baseline
- All DB access goes through Prisma ORM with parameterized queries (the SQLi finding is in a single legacy raw-query path that pre-dates the ORM migration)
- Recent commits show CSP headers are being phased in (`X-Content-Security-Policy: report-only`) — encourage moving to enforcement after a soak period
```

### Tone for the summary

- Be direct. The reader is busy and trusts you to triage. Don't hedge with "it appears that" if you confirmed it.
- Lead with the bad news. The good news (defenses that work, things that are right) goes in the third paragraph or in "Notes".
- Number-anchor everything. "2 Critical, 5 High" beats "several issues of varying severity".
- Acknowledge what wasn't tested. This builds trust and tells the reader where to look next.
- Avoid security theater. Don't pad the report with low-value findings to look thorough. A short report with real bugs beats a long report with noise.

---

## Filename and ordering rules

- `F<NNN>-<slug>.md` — `F001`, `F002`, ..., zero-padded to 3 digits
- `<slug>` is kebab-case, brief, descriptive — matches the title
- **Number in discovery order, not severity order.** Severity may change during the audit; renaming files is annoying. The summary table is what surfaces severity ordering.
- Don't reuse numbers if a finding is dropped — leave the gap and note it in the summary if you removed something
