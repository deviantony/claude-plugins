# LSP & Detection Reference

Single source of truth for the setup skill: how to detect each supported language and which Claude Code LSP plugin to install for it.

Supported languages: Go, TypeScript/JavaScript (one entry, key `ts`), Python, Swift. Anything else is silently skipped by the wizard.

## Detection

| Config file       | Language key |
|-------------------|--------------|
| go.mod            | go           |
| package.json      | ts           |
| tsconfig.json     | ts           |
| pyproject.toml    | python       |
| setup.py          | python       |
| requirements.txt  | python       |
| Package.swift     | swift        |

## LSP Plugins

All plugins live on the `claude-plugins-official` marketplace, which is available by default.

| Language key | Plugin           | Binary                       | Install command                                       |
|--------------|------------------|------------------------------|-------------------------------------------------------|
| go           | gopls-lsp        | gopls                        | `go install golang.org/x/tools/gopls@latest`          |
| ts           | typescript-lsp   | typescript-language-server   | `pnpm add -g typescript-language-server typescript`   |
| python       | pyright-lsp      | pyright-langserver           | `pnpm add -g pyright`                                 |
| swift        | swift-lsp        | sourcekit-lsp                | Included with Xcode / Swift toolchain                 |

Install a plugin with:

```
claude plugin install <plugin>@claude-plugins-official --scope project
```

After installs, run `/reload-plugins` in the Claude Code session to activate.
