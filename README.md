# claude-plugins

A Claude Code plugin marketplace (`deviantony-plugins`).

## Marketplace setup

All commands below are slash commands typed inside Claude Code.

### Add the marketplace

```
/plugin marketplace add deviantony/claude-plugins
```

### Manage plugins

| Action | Command |
|---|---|
| Install a plugin | `/plugin install <name>@deviantony-plugins` |
| Upgrade installed plugins to the latest version | `/plugin marketplace update deviantony-plugins` |
| Uninstall a plugin | `/plugin uninstall <name>@deviantony-plugins` |
| Remove the marketplace itself | `/plugin marketplace remove deviantony-plugins` |

After marketplace operations you may need to run `/reload-plugins` for changes to take effect.

## cdx — Claude Developer Experience

A bundle of skills covering project bootstrapping, code review, dependency safety, web security auditing, and DigitalOcean VM management.

Install with `/plugin install cdx@deviantony-plugins`.

### Commands

#### `/cdx:setup`

Interactive wizard that walks you through:

1. **Tech stack detection** — scans for `go.mod`, `package.json`, `Cargo.toml`, `pyproject.toml`, etc.
2. **Git initialization** — sets up git repo and `.gitignore` if needed
3. **LSP plugin installation** — installs Claude Code LSP plugins for your detected languages
4. **jscpd setup** — configures duplication detection for your tech stack
5. **CLAUDE.md + language rules** — writes generic best practices to CLAUDE.md and per-language rules to `.claude/rules/cdx-<lang>.md`

#### `/cdx:coderev`

Comprehensive code review of current changes. Launches three agents in parallel covering:

- Structure & correctness (simplification, over-engineering, YAGNI, dead code, correctness)
- Code reuse & conventions (missed reuse, naming/structure drift)
- Efficiency & security (hot-path bloat, injection, auth gaps)

Produces a structured findings report and offers to apply fixes.

#### `/cdx:safe-deps`

Enforces safe dependency installation: bans `npm`/`yarn`/`npx`, uses `pnpm`/`bun`/`uv`, pins exact versions, requires a 10-day minimum release age, disables post-install scripts. Auto-triggers before any package install.

#### `/cdx:web-security-audit`

Deep web-app security audit combining static code review with live-instance probing. Seven phases (scope, preflight, recon, threat model, investigation, findings, summary), with per-class authorization gates for active testing.

#### `/cdx:labctl`

Manages DigitalOcean VMs via the `labctl` CLI — create, list, remove droplets. Always returns ready-to-paste SSH commands.

### Supported Languages (setup wizard)

Go, Python, TypeScript, JavaScript, Rust, Java, Ruby, C#, PHP, Swift, Kotlin, C/C++, Lua, Elixir

## canon — Code Annotation Tool

Browser-based annotation tool for Claude Code that lets you add line-specific feedback to any file, with annotations flowing back into your conversation as structured context.

Install with `/plugin install canon@deviantony-plugins`, then run `/canon:setup` to download the platform-specific binary.

### Commands

- `/canon:setup` — Install or update the Canon binary
- `/canon:new` — Open an annotation session to review code changes

Source: [deviantony/canon](https://github.com/deviantony/canon)
