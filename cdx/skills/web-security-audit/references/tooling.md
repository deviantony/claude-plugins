# Tooling Reference

This skill works with **pure curl + scripting** as a baseline. Every active probe in `live-testing.md` includes a manual fallback. But several tools dramatically improve speed and coverage on specific tasks. The Phase 2 preflight script detects what's installed; this file is the catalog used to discuss installation with the user.

When asking about installation, always:
1. Show what's missing
2. Show what each missing tool would help with for *this audit's* stack/scope (not generic value)
3. Show the install command for the user's OS
4. Wait for explicit yes per tool — don't bulk-install

---

## Tool catalog

### Reconnaissance & fingerprinting

**`nuclei`** (ProjectDiscovery) — template-based scanner with thousands of CVE checks and tech fingerprints. Best single tool for "what is this and what's known-bad about it".
- Use for: stack fingerprinting, known-CVE scanning, exposed-config probes
- Install:
  - macOS: `brew install nuclei`
  - Linux: `go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest`
  - Update templates: `nuclei -update-templates`

**`httpx`** (ProjectDiscovery) — fast HTTP probing, status/title/server/tech detection.
- Use for: bulk endpoint discovery, header summarization
- Install: `go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest` or `brew install httpx`

**`whatweb`** — older but solid tech fingerprinter.
- Install: `apt install whatweb` / `brew install whatweb`

### Content discovery

**`ffuf`** — fast HTTP fuzzer for path discovery, parameter discovery, vhost enumeration.
- Use for: hidden endpoints, backup files, parameter mining
- Install: `brew install ffuf` / `go install github.com/ffuf/ffuf/v2@latest`
- Wordlists: pair with `seclists` (`brew install seclists` or `git clone https://github.com/danielmiessler/SecLists`)

**`gobuster`** — alternative content scanner, good for DNS/vhost subcommands.
- Install: `brew install gobuster` / `apt install gobuster`

### Injection & exploitation

**`sqlmap`** — automated SQLi detection and exploitation.
- Use for: confirming and characterizing SQL injection points after manual probes hint at them
- Install: `brew install sqlmap` / `apt install sqlmap` / `pip install sqlmap`
- Always run with explicit `--batch --risk=1 --level=1` initially; raise only with user confirmation

**`commix`** — command injection detection and exploitation.
- Install: `brew install commix` / `pip install commix`

### TLS & crypto

**`testssl.sh`** — comprehensive TLS configuration scanner.
- Use for: TLS audit (cipher suites, protocols, cert chain, known vulns like Heartbleed/ROBOT)
- Install: `brew install testssl` / `git clone https://github.com/drwetter/testssl.sh`
- Run: `testssl.sh https://target.example.com`

**`sslyze`** — alternative TLS scanner, JSON output friendly.
- Install: `pip install sslyze` / `pipx install sslyze`

### Dependency / supply chain

**`trivy`** — broad scanner: filesystem deps, container images, secrets.
- Use for: dependency CVEs in repo (`trivy fs .`), container images (`trivy image <img>`)
- Install: `brew install trivy` / `apt install trivy`

**`grype`** — focused vulnerability scanner for SBOMs and container images.
- Install: `brew install grype` / `curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin`

**`syft`** — SBOM generator (often paired with grype).
- Install: `brew install syft` / similar curl install

**Per-ecosystem audit tools** (preferred when present, faster than generic):
- Node: `npm audit` (built-in), `pnpm audit`, `yarn audit`
- Go: `govulncheck` (`go install golang.org/x/vuln/cmd/govulncheck@latest`)

### Secrets

**`gitleaks`** — fast secret detection in git history and filesystem.
- Use for: hardcoded credentials, API keys, tokens (current files + history)
- Install: `brew install gitleaks` / `apt install gitleaks`
- Note: the `code-scan` skill already wraps gitleaks; you can defer to it for secret scanning

**`trufflehog`** — secret scanner with verification (some keys can be live-tested).
- Install: `brew install trufflehog` / `pipx install trufflehog`

**`detect-secrets`** (Yelp) — alternative, supports baseline files.
- Install: `pip install detect-secrets`

### Static analysis (SAST)

**`semgrep`** — pattern-based SAST with extensive rule packs (OWASP, language-specific).
- Use for: structured pattern matching across many languages
- Install: `brew install semgrep` / `pip install semgrep`
- Run: `semgrep --config auto .` (downloads relevant rules) or `semgrep --config p/security-audit .`

**`gosec`** — Go-specific SAST.
- Install: `go install github.com/securego/gosec/v2/cmd/gosec@latest` — `gosec ./...`

**ESLint security plugins** for Node/TS:
- `eslint-plugin-security`, `eslint-plugin-no-unsanitized`

### Network & infrastructure

**`nmap`** — port and service scanning.
- Use for: enumerating exposed services beyond the web port (databases, admin panels, etc.)
- Install: `brew install nmap` / `apt install nmap`
- For audits, the most useful invocation is: `nmap -sV -sC -p- --min-rate=1000 target.example.com` (slow; use `-p 1-10000` for speed)
- **Be aggressive about scope confirmation** — port-scanning random hosts is rude and possibly illegal

### Browser automation (for SPA testing)

**`playwright`** — headless browser, useful for SPAs where curl can't render
- Install: `pip install playwright && playwright install chromium` or `npm install -g playwright`

**Burp Suite Community** — manual proxy / repeater (GUI). Optional but often the fastest way to iterate on a payload manually. Can be replaced by `mitmproxy` (CLI) or `caido` (newer alternative).

---

## Tools to mention only when relevant

These are powerful but situational — don't suggest installing unless their use case matches the audit scope:

- **`zap`** (OWASP ZAP) — full-featured proxy/scanner. Heavyweight; usually overkill for what we're doing.
- **`metasploit`** — exploitation framework. Out of scope for most web audits.
- **`hashcat`** / **`john`** — password cracking. Only relevant if hash dumps are in scope (rare for an authorized web audit).

---

## Detection script

`scripts/preflight.sh` checks a curated subset of these. After running it, surface the gap to the user using this template:

```
Tool preflight results:

Installed:  curl, jq, openssl, nmap, gitleaks
Missing:    nuclei, ffuf, sqlmap, trivy, semgrep

Recommended for this audit (Express + Postgres + React stack):
  - nuclei      — fast known-CVE scan against the live target
  - sqlmap      — confirm any SQLi probe finds during code review
  - trivy       — scan node_modules and the Dockerfile for CVEs
  - semgrep     — pattern scan for dangerous Express/Prisma/React idioms

Not as critical for this audit:
  - ffuf        — content discovery; useful but the SPA bundles already
                  reveal most endpoints

Want me to install the recommended ones? I'll show each command first.
```

Tailor the "recommended for this audit" sentences to what you learned in Phase 3 (recon). A generic recommendation list is low-signal.
