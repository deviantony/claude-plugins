# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A collection of Claude Code plugins. Currently contains one plugin: **cdx** (Claude Developer Experience) — a setup wizard and code review toolchain for bootstrapping any project with Claude Code.

## Repository Layout

This is a **plugin monorepo**. Each plugin lives in its own top-level directory (e.g., `cdx/`) with a `.claude-plugin/plugin.json` manifest. Plugins expose skills (SKILL.md files) that become slash commands when installed.

The cdx plugin has two skills:
- `skills/setup/SKILL.md` → `/cdx:setup` — interactive 6-step wizard (stack detection → git init → LSP plugins → simplifier agents → jscpd → summary)
- `skills/review/SKILL.md` → `/cdx:review` — code review workflow (diff detection → run simplifier + jscpd → present results → offer actions)

Reference data used by skills lives in `skills/<skill>/references/`. Starter configs live in `configs/`.

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

## Adding a New Skill to cdx

1. Create `cdx/skills/<skill-name>/SKILL.md` with proper YAML frontmatter
2. If the skill needs reference data, add it under `cdx/skills/<skill-name>/references/`
3. Update the README.md commands section

## Key Design Decisions

- The simplifier template (`simplifier-template.md`) uses `{{LANGUAGE}}` and `{{LANGUAGE_STANDARDS}}` placeholders — the setup skill performs string replacement at generation time to produce project-specific agents written to `.claude/agents/`
- jscpd configs are per-language (`.jscpd-<lang>.json`) rather than a single config, to allow language-specific thresholds and ignore patterns
- The review skill runs simplifier and duplication checks in parallel via the Task tool, and initially reports findings read-only before offering to apply changes
