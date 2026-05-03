#!/usr/bin/env bash
# Preflight tooling check for web-security-audit skill.
# Detects which security tools are installed and prints a structured report
# the calling agent can read and surface to the user.
#
# Usage:  bash scripts/preflight.sh
# Output: stdout — sections for INSTALLED / MISSING with one tool per line,
#         category and one-line role for each. Exit code is always 0.

set -u

# Tool catalog: name|category|description|install_hint
# install_hint shown to user; agent should map to the user's actual OS via tooling.md
TOOLS=(
  # Recon / fingerprinting
  "nuclei|recon|Template-based scanner — known CVE & tech fingerprints|brew install nuclei  OR  go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest"
  "httpx|recon|Fast HTTP probing — status, title, server, tech|brew install httpx  OR  go install github.com/projectdiscovery/httpx/cmd/httpx@latest"
  "whatweb|recon|HTTP fingerprinter|brew install whatweb  OR  apt install whatweb"
  # Content discovery
  "ffuf|discovery|Fast HTTP fuzzer — paths, params, vhosts|brew install ffuf  OR  go install github.com/ffuf/ffuf/v2@latest"
  "gobuster|discovery|Path/DNS/vhost enumeration|brew install gobuster  OR  apt install gobuster"
  # Exploitation
  "sqlmap|exploit|Automated SQLi detection & exploitation|brew install sqlmap  OR  apt install sqlmap  OR  pip install sqlmap"
  "commix|exploit|Command injection detection|brew install commix  OR  pip install commix"
  # TLS
  "testssl.sh|tls|Comprehensive TLS scanner|brew install testssl  OR  git clone https://github.com/drwetter/testssl.sh"
  "sslyze|tls|TLS scanner with JSON output|pipx install sslyze"
  # Dependency / supply chain
  "trivy|deps|Filesystem/container/IaC scanner|brew install trivy  OR  apt install trivy"
  "grype|deps|Vuln scanner for SBOMs & images|brew install grype"
  "syft|deps|SBOM generator (pairs with grype)|brew install syft"
  "npm|deps|Node — npm audit (built-in)|comes with Node.js"
  "pnpm|deps|Node — pnpm audit (built-in)|npm install -g pnpm"
  "govulncheck|deps|Go — official vuln scanner|go install golang.org/x/vuln/cmd/govulncheck@latest"
  # Secrets
  "gitleaks|secrets|Secret detection (filesystem & git history)|brew install gitleaks  OR  apt install gitleaks"
  "trufflehog|secrets|Secret scanner with verification|brew install trufflehog  OR  pipx install trufflehog"
  # SAST
  "semgrep|sast|Pattern-based multi-language SAST|brew install semgrep  OR  pip install semgrep"
  "gosec|sast|Go SAST|go install github.com/securego/gosec/v2/cmd/gosec@latest"
  # Network
  "nmap|network|Port & service scanning|brew install nmap  OR  apt install nmap"
  # Browser automation
  "playwright|browser|Headless browser for SPA testing|pip install playwright && playwright install chromium"
  # Baseline (always expected)
  "curl|baseline|HTTP client (baseline)|usually preinstalled"
  "openssl|baseline|TLS / crypto utility (baseline)|usually preinstalled"
  "jq|baseline|JSON processor|brew install jq  OR  apt install jq"
  "git|baseline|VCS — needed for history-based scans|usually preinstalled"
  "python3|baseline|Python interpreter|usually preinstalled"
)

INSTALLED=()
MISSING=()

for entry in "${TOOLS[@]}"; do
  IFS='|' read -r name category desc install <<<"$entry"
  if command -v "$name" >/dev/null 2>&1; then
    # Try to capture a version string for context
    version=$("$name" --version 2>/dev/null | head -1 | tr -d '\n' || true)
    [ -z "$version" ] && version=$("$name" -version 2>/dev/null | head -1 | tr -d '\n' || true)
    [ -z "$version" ] && version=$("$name" version 2>/dev/null | head -1 | tr -d '\n' || true)
    [ -z "$version" ] && version="(version unknown)"
    INSTALLED+=("$category|$name|$version|$desc")
  else
    MISSING+=("$category|$name|$desc|$install")
  fi
done

# OS hint for the agent so it can show the right install command
OS_HINT="unknown"
case "$(uname -s)" in
  Darwin) OS_HINT="macOS (use brew where shown)";;
  Linux)
    if command -v apt >/dev/null 2>&1; then OS_HINT="Linux/Debian (use apt where shown)"
    elif command -v dnf >/dev/null 2>&1; then OS_HINT="Linux/Fedora (use dnf where shown)"
    elif command -v pacman >/dev/null 2>&1; then OS_HINT="Linux/Arch (use pacman where shown)"
    else OS_HINT="Linux (unknown package manager)"
    fi
    ;;
esac

cat <<EOF
=== Web Security Audit — Tool Preflight ===

OS: $OS_HINT

INSTALLED (${#INSTALLED[@]}):
EOF
if [ ${#INSTALLED[@]} -eq 0 ]; then
  echo "  (none — that's surprising; even baseline tools are missing)"
else
  printf "  %-12s %-15s %s\n" "category" "tool" "version"
  printf "  %-12s %-15s %s\n" "--------" "----" "-------"
  for entry in "${INSTALLED[@]}"; do
    IFS='|' read -r category name version desc <<<"$entry"
    printf "  %-12s %-15s %s\n" "$category" "$name" "$version"
  done
fi

cat <<EOF

MISSING (${#MISSING[@]}):
EOF
if [ ${#MISSING[@]} -eq 0 ]; then
  echo "  (none — full toolchain available)"
else
  for entry in "${MISSING[@]}"; do
    IFS='|' read -r category name desc install <<<"$entry"
    echo "  [$category] $name"
    echo "    role:    $desc"
    echo "    install: $install"
    echo ""
  done
fi

cat <<EOF
=== End Preflight ===

Next step (for the calling agent):
  - Surface installed tools as available capability
  - Recommend installation of MISSING tools that match the audit scope:
      * recon/discovery: helpful if live target is in scope
      * exploit:        helpful if confirming injection findings
      * deps:           helpful if codebase is in scope
      * secrets:        helpful for codebase + git history
      * sast:           helpful for codebase audit
      * tls:            helpful if HTTPS target is in scope
  - Show the per-OS install command from references/tooling.md
  - Wait for explicit per-tool yes before installing
EOF
