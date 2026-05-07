# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A Claude Code **plugin marketplace** (`deviantony-plugins`). Each plugin lives in its own top-level directory (e.g., `cdx/`) with a `.claude-plugin/plugin.json` manifest. The marketplace catalog is at `.claude-plugin/marketplace.json`.

Users add this marketplace with:
```
/plugin marketplace add deviantony/claude-plugins
```

## Repository Layout

This is a **plugin marketplace monorepo**. The root `.claude-plugin/marketplace.json` lists all available plugins. Each plugin lives in its own top-level directory with its own `.claude-plugin/plugin.json` manifest. Plugins expose skills (SKILL.md files) that become slash commands when installed.

The cdx plugin has six skills:
- `skills/setup/SKILL.md` → `/cdx:setup` — 7-step bootstrap wizard (CLAUDE.md check → stack detection → git init → LSP plugins → jscpd → update CLAUDE.md + language rules → summary). Supports Go, TypeScript/JavaScript, Python, Swift only.
- `skills/coderev/SKILL.md` → `/cdx:coderev` — comprehensive code review (3 parallel agents covering correctness, reuse/conventions, efficiency/security; structured report; offers to fix). Reuse agent is augmented by `cdx:scan` when jscpd configs exist.
- `skills/scan/SKILL.md` → `/cdx:scan` — runs jscpd against per-language `.jscpd-<key>.json` configs and reports structured duplication findings. Invoked by `cdx:coderev` and standalone.
- `skills/safe-deps/SKILL.md` → `/cdx:safe-deps` — enforces pnpm/bun/uv with exact pinning, 10-day minimum release age, and disabled post-install scripts; bans npm/yarn/npx
- `skills/web-security-audit/SKILL.md` → `/cdx:web-security-audit` — 7-phase web-app security audit (static + live), with per-class authorization gates and a timestamped output folder
- `skills/labctl/SKILL.md` → `/cdx:labctl` — DigitalOcean VM management via the `labctl` CLI

Reference data used by skills lives in `skills/<skill>/references/`. Helper scripts live in `skills/<skill>/scripts/`. Starter configs live in `configs/`.

## Plugin Conventions

- **Plugin manifest**: `.claude-plugin/plugin.json` with name, version, description, author
- **Skill frontmatter**: YAML with `name`, `description` (include trigger phrases), `user-invocable: true`
- **`${CLAUDE_PLUGIN_ROOT}`**: Resolved at runtime to the plugin's root directory; use this in skills to reference sibling files (e.g., reference tables, templates)
- **Interactive by design**: Skills use AskUserQuestion to confirm decisions before taking action — never auto-apply destructive changes

## Adding a New Plugin

1. Create `<plugin-name>/.claude-plugin/plugin.json`
2. Add skills under `<plugin-name>/skills/<skill-name>/SKILL.md`
3. Put reference data in `<plugin-name>/skills/<skill-name>/references/`
4. Put shared configs in `<plugin-name>/configs/`
5. Register the plugin in `.claude-plugin/marketplace.json` under the `plugins` array

## Adding a New Skill to cdx

1. Create `cdx/skills/<skill-name>/SKILL.md` with proper YAML frontmatter
2. If the skill needs reference data, add it under `cdx/skills/<skill-name>/references/`
3. Update the README.md commands section

## Key Design Decisions

- jscpd configs are per-language (`.jscpd-<lang>.json`) rather than a single config, to allow language-specific thresholds and ignore patterns
- The coderev skill launches three review agents in parallel and reports findings read-only before offering to apply fixes — keeps audit and edit phases distinct so the user sees the full picture first
- Best practices come from `skills/setup/references/claude-md-practices.md`: the Generic section is written into the user's CLAUDE.md, while language-specific sections are written to path-scoped `.claude/rules/cdx-<lang>.md` files. To add support for a new language, add a `## <Language>` section (with a `Paths:` line) to this reference file.
