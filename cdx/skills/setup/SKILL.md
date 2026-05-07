---
name: setup
description: |
  Interactive setup wizard to bootstrap a project for Claude Code development.
  Detects the tech stack, configures LSP plugins, sets up duplication detection
  via jscpd, and writes language-specific rules and best practices to CLAUDE.md.
  Supports Go, TypeScript/JavaScript, Python, and Swift.
  Use when user says: "set up project for Claude", "initialize Claude Code",
  "bootstrap Claude dev environment", "cdx setup", or "configure Claude tools".
user-invocable: true
---

# CDX Setup Wizard

You are running the CDX setup wizard. Walk the user through each step interactively, using AskUserQuestion to confirm decisions before taking action. Be concise.

This wizard supports four languages: **Go**, **TypeScript/JavaScript** (combined under key `ts`), **Python**, **Swift**. Anything else is silently skipped.

## Step 0: CLAUDE.md Pre-requisite

The wizard depends on a project `CLAUDE.md` for context. Glob the project root for `CLAUDE.md`.

**If CLAUDE.md exists**: read it in full, store the content as `CLAUDE_MD_CONTENT`, continue.

**If CLAUDE.md is missing**: AskUserQuestion:

- Question: "No CLAUDE.md found. Run `/init` now to generate one, then continue?"
- Options: "Run /init now" / "Abort"

If the user picks **Run /init now**: invoke the `init` skill via the Skill tool. When it returns, re-glob for `CLAUDE.md`. If still missing, abort with: "CLAUDE.md was not created — re-run `/cdx:setup` once it exists."

If the user picks **Abort**: stop the wizard.

## Step 1: Tech Stack Detection

Before detecting, verify the reference files exist (these ship with the plugin):

- `${CLAUDE_PLUGIN_ROOT}/skills/setup/references/lsp-plugins.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/setup/references/claude-md-practices.md`

If either is missing, abort: "Plugin install looks broken — reference files not found. Re-install cdx."

Read `lsp-plugins.md` and use its **Detection** table as the single source of truth for which config files map to which language key.

Glob the project root for the listed config files. Collect detected language keys (deduped).

Cross-reference `CLAUDE_MD_CONTENT` for any of the four supported languages it mentions that the glob missed (common in monorepos where config files live in subdirectories).

Present to the user via AskUserQuestion:

- Question: "Detected stack: [list]. Confirm?"
- Options: "Yes, proceed" / "Adjust" (lets them add or remove from the supported four)

Store the confirmed stack as `STACK` for all subsequent steps. If any unsupported language was inferred, mention it once and ignore it for the rest of the wizard.

## Step 2: Git and .gitignore

Check for `.git/` via `test -d .git`.

**If `.git/` is missing**:

- AskUserQuestion: "Initialize a git repository?" — Yes / No
- If yes: ask for default branch name (default `main`) and optional remote URL, then run `git init -b <branch>` and `git remote add origin <url>` if provided.

**.gitignore handling**:

Build the proposed entry list:

- Always: `.env`, `.env.*`, `.DS_Store`, `*.swp`, `*.swo`, `.idea/`, `.vscode/`, `*.log`
- For `go` in STACK: `vendor/`, `*.exe`, `*.test`, `*.out`
- For `ts` in STACK: `node_modules/`, `dist/`, `build/`, `.next/`, `coverage/`, `*.tsbuildinfo`
- For `python` in STACK: `__pycache__/`, `*.pyc`, `.venv/`, `venv/`, `dist/`, `*.egg-info/`, `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`
- For `swift` in STACK: `.build/`, `DerivedData/`, `*.xcodeproj/xcuserdata/`, `Package.resolved`

Read `.gitignore` if it exists. Drop any proposed entry that already appears as a non-comment line (exact match after trimming whitespace). Present the de-duplicated list to the user via AskUserQuestion before appending. If the existing file already covers everything, report "gitignore already covers stack" and skip.

## Step 3: LSP Plugins

For each language in STACK, look up its row in the **LSP Plugins** table from `lsp-plugins.md` (plugin name, binary, install command).

For each language:

1. Run `which <binary>`. If missing, AskUserQuestion: "Install `<binary>` for <language> via `<install command>`?" — Install now / Skip. If skipped, mark the language as needing manual setup and do not install the plugin for it.
2. If the binary is present (or was just installed), run:
   ```
   claude plugin install <plugin>@claude-plugins-official --scope project
   ```
3. Record the result.

After processing all languages, tell the user to run `/reload-plugins` once the wizard finishes so the new LSPs activate.

## Step 4: Duplication Detection (jscpd)

**pnpm pre-check**: run `which pnpm`. If missing, AskUserQuestion: "pnpm is required (cdx standardizes on pnpm via safe-deps). Install it via `npm install -g pnpm` or follow https://pnpm.io/installation?" — Install now / Skip step. If skipped, abort this step entirely.

**jscpd pre-check**: run `which jscpd`. If missing, AskUserQuestion: "Install jscpd globally via `pnpm add -g jscpd`?" — Install / Skip step. If skipped, abort this step.

For each language in STACK:

1. Read the shipped config from `${CLAUDE_PLUGIN_ROOT}/configs/jscpd/<key>.json` (one ships per supported language). If the file is missing, skip that language and report it.
2. Present the config to the user via AskUserQuestion: "Write `.jscpd-<key>.json` to project root?" — Write / Skip. Note that re-running this step will overwrite the file.
3. If approved, write the file. Overwrite without warning if it already exists.

## Step 5: CLAUDE.md and Language Rules

Re-read the project's `CLAUDE.md` (it may have been touched by earlier steps).
Read `${CLAUDE_PLUGIN_ROOT}/skills/setup/references/claude-md-practices.md`.

**Build the `## CDX Tools` section** based on what was actually configured in earlier steps. Only list items that were created. Example:

```
## CDX Tools

The following tools were configured by `/cdx:setup`:

- LSP plugins: `gopls-lsp`, `typescript-lsp` (project scope)
- Duplication detection: `.jscpd-go.json`, `.jscpd-ts.json` — run `/cdx:scan` to consume them
- Language rules: `.claude/rules/cdx-go.md`, `.claude/rules/cdx-ts.md`
```

**Build the `## Best Practices` section** from the `## Generic` block in the practices reference verbatim.

**Build language rule files**: For each language in STACK with a section in the practices reference, prepare `.claude/rules/cdx-<key>.md` with:

- YAML frontmatter listing the `paths` from that section (e.g., `paths: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"]`)
- The body of that section (commands, conventions, file structure) without the `Key:` and `Paths:` lines

If a language in STACK has no section in the reference, skip silently.

**Confirm before writing**: present all proposed changes via AskUserQuestion — the CLAUDE.md sections to add/replace and the rule files to create. Options: "Apply" / "Skip".

**Apply**:

- For CLAUDE.md, replace `## CDX Tools` and `## Best Practices` sections in place if present (matched by heading); otherwise append at the end.
- For rule files, create `.claude/rules/` if missing, then write each file (overwrite).

## Step 6: Summary

Present a clear summary:

```
## CDX Setup Complete

### Tech stack
- [list]

### Git
- [initialized / already existed]
- .gitignore: [created / appended N entries / already covered]

### LSP plugins (project scope)
- [list]
- Run `/reload-plugins` to activate.
- Manual binary installs needed: [list, or omit line]

### Duplication detection
- [list of .jscpd-<key>.json files]
- Run `/cdx:scan` to scan, or `/cdx:coderev` to fold scan findings into a code review.

### CLAUDE.md
- [Updated with CDX Tools and Best Practices sections, or "skipped"]

### Language rules
- [list of .claude/rules/cdx-<key>.md files, or "skipped"]
```
