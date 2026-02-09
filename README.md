# claude-plugins

A collection of Claude Code plugins.

## cdx — Claude Developer Experience

Setup wizard and code review tools for Claude Code projects. Eliminates repetitive project bootstrapping by auto-detecting tech stacks, configuring LSP plugins, generating simplifier agents, and setting up duplication detection.

### Install

```bash
claude plugin install cdx@claude-plugins
```

### Commands

#### `/cdx:setup`

Interactive wizard that walks you through:

1. **Tech stack detection** — scans for `go.mod`, `package.json`, `Cargo.toml`, `pyproject.toml`, etc.
2. **Git initialization** — sets up git repo and `.gitignore` if needed
3. **LSP plugin installation** — installs Claude Code LSP plugins for your detected languages
4. **Simplifier agent generation** — creates tailored code simplification agents in `.claude/agents/`
5. **jscpd setup** — configures duplication detection for your tech stack

#### `/cdx:review`

Code review workflow that:

1. Identifies recently changed files (committed, staged, and unstaged)
2. Runs your project's simplifier agent(s) against changed files
3. Runs jscpd duplication detection
4. Presents combined results with actionable next steps

### Supported Languages

Go, Python, TypeScript, JavaScript, Rust, Java, Ruby, C#, PHP, Swift, Kotlin, C/C++, Lua, Elixir

### Project Structure

```
cdx/
├── .claude-plugin/plugin.json       # Plugin manifest
├── skills/
│   ├── setup/
│   │   ├── SKILL.md                 # Setup wizard
│   │   └── references/
│   │       ├── lsp-plugins.md       # LSP plugin reference
│   │       └── simplifier-template.md
│   └── review/
│       └── SKILL.md                 # Code review workflow
└── configs/
    └── jscpd/
        └── go.json                  # Go jscpd config
```
