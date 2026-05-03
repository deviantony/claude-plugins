---
name: setup
description: |
  Interactive setup wizard to bootstrap any project for Claude Code development.
  Auto-detects tech stacks, configures LSP plugins, sets up duplication detection
  via jscpd, and writes language-specific rules and best practices to CLAUDE.md.
  Use when user says: "set up project for Claude", "initialize Claude Code",
  "bootstrap Claude dev environment", "cdx setup", or "configure Claude tools".
user-invocable: true
---

# CDX Setup Wizard

You are running the CDX setup wizard. Walk the user through each step interactively, using AskUserQuestion to confirm decisions before taking action. Be concise and actionable.

## Step 0: CLAUDE.md Pre-requisite

Before anything else, check if the project has a `CLAUDE.md` in the project root using Glob.

**If CLAUDE.md is missing**: Stop the wizard and tell the user:

> This wizard works best when it can read your project's CLAUDE.md for context.
> Please run `/init` first — it scans your codebase and creates a CLAUDE.md with project description, tech stack notes, and build commands. The setup wizard uses this to make smarter decisions about what to configure.
>
> Once `/init` is done, run `/cdx:setup` again.

Do not proceed to any further steps.

**If CLAUDE.md exists**: Read it in full and carry the content forward as `CLAUDE_MD_CONTENT` — you will reference it in Step 1 and Step 5.

## Step 1: Tech Stack Detection

Scan the project root for config files to detect the tech stack:

- `go.mod` → Go
- `package.json` → JavaScript/TypeScript
- `tsconfig.json` → TypeScript
- `pyproject.toml`, `setup.py`, `requirements.txt` → Python
- `Cargo.toml` → Rust
- `pom.xml`, `build.gradle` → Java
- `Gemfile` → Ruby
- `mix.exs` → Elixir
- `*.csproj` → C#
- `composer.json` → PHP
- `Package.swift` → Swift

Use Glob to check for these files. Collect all detected languages.

Next, cross-reference with `CLAUDE_MD_CONTENT` (from Step 0). The `/init`-generated CLAUDE.md typically contains a project description, tech stack notes, and build commands. Look for mentions of languages, frameworks, or tools that glob-based detection may have missed (e.g., a monorepo where config files are in subdirectories, or a language used only for tooling/scripts).

Present both sources to the user via AskUserQuestion:
- "I detected the following tech stack from config files: [glob list]. CLAUDE.md also mentions: [any additional languages/frameworks found]. Combined stack: [merged list]. Is this correct?"
- If CLAUDE.md didn't add anything new, just show the glob results
- Options: "Yes, proceed" / "Let me adjust" (allow them to add/remove languages)

Store the confirmed stack for all subsequent steps.

## Step 2: Git Initialization

Check if `.git/` exists in the project root using Bash: `test -d .git && echo exists || echo missing`

**If `.git/` exists**: Skip to .gitignore check.

**If `.git/` is missing**:
1. Use AskUserQuestion to ask:
   - "Would you like to initialize a git repository?"
   - If yes, ask for optional remote origin URL and default branch name (default: `main`)
2. Run `git init` and set default branch
3. Add remote if provided

**`.gitignore` check**:
- Check if `.gitignore` exists
- If missing or empty, generate one based on the confirmed tech stack:
  - Always include: `.env`, `.env.*`, `.DS_Store`, `*.swp`, `*.swo`, `.idea/`, `.vscode/`, `*.log`
  - Go: `vendor/`, binary patterns
  - Python: `__pycache__/`, `*.pyc`, `.venv/`, `venv/`, `dist/`, `*.egg-info/`
  - TypeScript/JavaScript: `node_modules/`, `dist/`, `build/`, `.next/`
  - Rust: `target/`
  - Java: `target/`, `build/`, `*.class`
  - Ruby: `.bundle/`, `vendor/bundle/`
  - C#: `bin/`, `obj/`, `*.suo`, `*.user`
  - PHP: `vendor/`
- Use AskUserQuestion to confirm before writing

## Step 3: Claude Code Intelligence (LSP Plugins)

Read the LSP plugin reference table from `${CLAUDE_PLUGIN_ROOT}/skills/setup/references/lsp-plugins.md`.

For each language in the confirmed tech stack that has an LSP plugin entry:

1. **Check binary availability**: Use Bash to run `which <binary>` (e.g., `which gopls`, `which pyright-langserver`)
2. **If binary is missing**:
   - Warn the user: "LSP binary `<binary>` not found for <language>."
   - Provide the install command from the reference table
   - Use AskUserQuestion: "Install it now?" / "Skip, I'll install later"
   - If they choose to install now, run the install command via Bash
3. **If binary is present**:
   - Install the Claude Code LSP plugin via Bash:
     ```
     claude plugin install <plugin>@claude-plugins-official --scope project
     ```
   - Report success

After processing all languages, summarize which LSP plugins were installed and which need manual setup.

## Step 4: jscpd Setup

1. **Check if jscpd is installed**: Run `which jscpd` via Bash
2. **If not installed**: Use AskUserQuestion — "jscpd is not installed. Install it via `npm install -g jscpd`?"
   - If yes: run `npm install -g jscpd`
   - If no: skip duplication detection setup entirely

3. **For each language in the confirmed stack**:
   a. Check if a config exists at `${CLAUDE_PLUGIN_ROOT}/configs/jscpd/<language>.json` using Glob
   b. **If config exists**: Read it and present to user
   c. **If no config exists**: Generate a default config:
      ```json
      {
        "threshold": 5,
        "minLines": 20,
        "minTokens": 100,
        "reporters": ["console"],
        "format": ["<language-format>"],
        "ignore": [<language-appropriate-patterns>]
      }
      ```
      Language format mappings:
      - Go → `"go"`
      - Python → `"python"`
      - TypeScript → `"typescript"`, JavaScript → `"javascript"`
      - Rust → `"rust"`
      - Java → `"java"`
      - Ruby → `"ruby"`
      - C# → `"csharp"`
      - PHP → `"php"`
      - Swift → `"swift"`

      Language-appropriate ignore patterns:
      - Go: `vendor/**`, `**/*_test.go`, `**/*.pb.go`, `**/testdata/**`
      - Python: `.venv/**`, `venv/**`, `**/__pycache__/**`, `**/migrations/**`, `**/*_test.py`, `**/tests/**`
      - TypeScript/JS: `node_modules/**`, `dist/**`, `build/**`, `**/*.d.ts`, `**/*.min.js`
      - Rust: `target/**`, `**/tests/**`
      - Java: `target/**`, `build/**`, `**/test/**`
      - Ruby: `vendor/**`, `**/spec/**`
      - C#: `bin/**`, `obj/**`, `**/Tests/**`
      - PHP: `vendor/**`, `**/tests/**`

   d. Use AskUserQuestion to confirm or adjust the config before writing
   e. Write the config to `.jscpd-<language>.json` in the project root

## Step 5: Update CLAUDE.md and Create Language Rules

Now update the project's CLAUDE.md and create language-specific rule files.

1. **Read current state**: Read the project's `CLAUDE.md` again (it may have been modified by other steps).

2. **Read best practices reference**: Read `${CLAUDE_PLUGIN_ROOT}/skills/setup/references/claude-md-practices.md`.

3. **Build the `## CDX Tools` section** from what was actually configured in previous steps. Only list items that were created — for example:

   ```
   ## CDX Tools

   The following tools were configured by `/cdx:setup`:

   - **LSP plugins**: `gopls` installed at project scope for Go intelligence
   - **Duplication detection**: `.jscpd-go.json` — run `jscpd --config .jscpd-go.json .` to check for duplicates
   - **Language rules**: `.claude/rules/cdx-go.md` — Go-specific conventions and commands
   ```

4. **Build the `## Best Practices` section** using only the `## Generic` block from the reference file. This section contains project-wide principles (YAGNI, early returns, single responsibility, etc.) that apply regardless of language.

5. **Create language-specific rule files**: For each language in the confirmed stack, check if the reference file has a matching `## <Language>` section.
   - **If it does**: Create `.claude/rules/cdx-<language>.md` (e.g., `.claude/rules/cdx-go.md`) with:
     - YAML frontmatter containing a `paths` field scoped to that language's file extensions (e.g., `"**/*.go"` for Go)
     - The language-specific content from the reference file (commands, conventions, file structure)
   - **If the language has no entry in the reference**: Skip silently — no warning, no placeholder.
   - Create the `.claude/rules/` directory if it doesn't exist.

   Example `.claude/rules/cdx-go.md`:
   ```
   ---
   paths:
     - "**/*.go"
   ---

   # Go

   Build and test commands:
   ...

   Conventions:
   ...
   ```

6. **Handle re-runs**:
   - If `## CDX Tools` or `## Best Practices` sections already exist in CLAUDE.md, replace them in place. Otherwise, append them at the end.
   - If a `.claude/rules/cdx-<language>.md` file already exists, overwrite it.

7. **Confirm before writing**: Present all proposed changes to the user via AskUserQuestion before writing anything. Show: the CLAUDE.md additions/replacements and the rule files that will be created.

## Step 6: Summary

Present a clear summary of everything that was set up:

```
## CDX Setup Complete

### Tech Stack
- [list of confirmed languages]

### Git
- [initialized / already existed]
- .gitignore: [created / updated / already existed]

### LSP Plugins Installed
- [list of installed plugins]

### Duplication Detection
- [list of jscpd configs created]

### CLAUDE.md
- [Updated with CDX Tools and Best Practices sections]

### Language Rules
- [list of .claude/rules/cdx-<language>.md files created]

### Manual Steps Needed
- [any pending items, e.g., "Install gopls: `go install golang.org/x/tools/gopls@latest`"]
```

Point the user at the other cdx skills they may want to use:
- `/cdx:coderev` — comprehensive code review (correctness, reuse, conventions, efficiency, security)
- `/cdx:safe-deps` — enforced safe dependency installation
- `/cdx:web-security-audit` — deep web-app security audit
- `/cdx:labctl` — DigitalOcean VM management
