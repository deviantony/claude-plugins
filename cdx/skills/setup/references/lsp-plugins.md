# LSP Plugin Reference

This table maps programming languages to their Claude Code LSP plugins and required binaries.

Used by the setup skill to determine which LSP plugins to install for a detected tech stack.

## Plugin Table

| Language   | Plugin              | Binary                      | Install Command                                                      |
|------------|---------------------|-----------------------------|----------------------------------------------------------------------|
| Go         | gopls-lsp           | gopls                       | `go install golang.org/x/tools/gopls@latest`                         |
| Python     | pyright-lsp         | pyright-langserver          | `npm install -g pyright`                                             |
| TypeScript | typescript-lsp      | typescript-language-server  | `npm install -g typescript-language-server typescript`                |
| Rust       | rust-analyzer-lsp   | rust-analyzer               | `rustup component add rust-analyzer`                                 |
| C/C++      | clangd-lsp          | clangd                      | Install via system package manager (e.g., `apt install clangd`)      |
| Java       | jdtls-lsp           | jdtls                       | Install Eclipse JDT Language Server from eclipse.org                 |
| PHP        | php-lsp             | intelephense                | `npm install -g intelephense`                                        |
| Kotlin     | kotlin-lsp          | kotlin-language-server      | Install from https://github.com/fwcd/kotlin-language-server/releases |
| Swift      | swift-lsp           | sourcekit-lsp               | Included with Xcode / Swift toolchain                                |
| C#         | csharp-lsp          | csharp-ls                   | `dotnet tool install -g csharp-ls`                                   |
| Lua        | lua-lsp             | lua-language-server         | Install from https://github.com/LuaLS/lua-language-server/releases   |

## Detection Mapping

Maps config files to languages:

| Config File      | Language   |
|------------------|------------|
| go.mod           | Go         |
| package.json     | TypeScript |
| tsconfig.json    | TypeScript |
| pyproject.toml   | Python     |
| setup.py         | Python     |
| requirements.txt | Python     |
| Cargo.toml       | Rust       |
| pom.xml          | Java       |
| build.gradle     | Java       |
| Gemfile          | Ruby       |
| mix.exs          | Elixir     |
| *.csproj         | C#         |
| composer.json    | PHP        |
| Package.swift    | Swift      |
| build.zig        | Zig        |
