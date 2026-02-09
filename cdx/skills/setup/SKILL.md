---
name: setup
description: |
  Interactive setup wizard to bootstrap any project for Claude Code development.
  Auto-detects tech stacks, configures LSP plugins, generates tailored simplifier agents,
  and sets up duplication detection via jscpd.
  Use when user says: "set up project for Claude", "initialize Claude Code",
  "bootstrap Claude dev environment", "cdx setup", or "configure Claude tools".
user-invocable: true
---

# CDX Setup Wizard

You are running the CDX setup wizard. Walk the user through each step interactively, using AskUserQuestion to confirm decisions before taking action. Be concise and actionable.

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

Present the detected stack to the user via AskUserQuestion:
- "I detected the following tech stack: [list]. Is this correct?"
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

## Step 4: Simplifier Agent Generation

Read the base simplifier template from `${CLAUDE_PLUGIN_ROOT}/skills/setup/references/simplifier-template.md`.

For each primary language in the confirmed tech stack, generate a tailored simplifier agent:

1. **Replace `{{LANGUAGE}}`** with the language name
2. **Replace `{{LANGUAGE_STANDARDS}}`** with language-specific coding standards:

   **Go**:
   - Follow effective Go idioms and Go proverbs
   - Use `fmt.Errorf` with `%w` for error wrapping
   - Prefer table-driven tests
   - Use short variable names in small scopes, descriptive names for exported identifiers
   - Avoid `interface{}` / `any` when a concrete type works
   - Handle errors explicitly — never use `_` to discard errors

   **Python**:
   - Follow PEP 8 style guidelines
   - Use type hints for function signatures
   - Prefer list/dict/set comprehensions over manual loops when clearer
   - Use `pathlib.Path` over `os.path`
   - Use context managers (`with`) for resource management
   - Prefer `dataclasses` or `pydantic` over plain dicts for structured data

   **TypeScript**:
   - Use strict TypeScript — avoid `any` type
   - Prefer `const` over `let`, never use `var`
   - Use `interface` for object shapes, `type` for unions/intersections
   - Prefer `async/await` over raw Promise chains
   - Use optional chaining (`?.`) and nullish coalescing (`??`)
   - Avoid `enum` — prefer const objects or union types

   **Rust**:
   - Follow Rust API Guidelines
   - Use `?` operator for error propagation
   - Prefer `impl Trait` over `dyn Trait` where possible
   - Use pattern matching instead of if-else chains
   - Leverage the type system — make invalid states unrepresentable
   - Use `clippy` recommendations as guidance

   **Java**:
   - Follow Google Java Style Guide
   - Use `var` for local variables when type is obvious
   - Prefer streams and lambdas for collection processing
   - Use `Optional` instead of null returns
   - Prefer `record` types for data-only classes

   **Ruby**:
   - Follow Ruby Style Guide
   - Use `frozen_string_literal` pragma
   - Prefer `Symbol` over `String` for identifiers
   - Use blocks and iterators over explicit loops

   **C#**:
   - Follow .NET coding conventions
   - Use `var` for local variables when type is obvious
   - Prefer LINQ for collection operations
   - Use `async/await` pattern for async code
   - Use records for immutable data types

   **PHP**:
   - Follow PSR-12 coding standard
   - Use type declarations for parameters and returns
   - Prefer named arguments for clarity
   - Use null-safe operator (`?->`)

   For other languages: generate reasonable defaults based on the language's community conventions.

3. **Check for CLAUDE.md**: If the project has a CLAUDE.md, note in the agent template that it should reference project-specific standards from CLAUDE.md.

4. **Write the agent** to `.claude/agents/<language>-simplifier.md` in the project root (create `.claude/agents/` if it doesn't exist).

5. Use AskUserQuestion to confirm before writing each agent file.

## Step 5: jscpd Setup

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

### Simplifier Agents Created
- [list of agent files created]

### Duplication Detection
- [list of jscpd configs created]

### Manual Steps Needed
- [any pending items, e.g., "Install gopls: `go install golang.org/x/tools/gopls@latest`"]
```

Inform the user they can now use `/cdx:review` to run code reviews on their project.
