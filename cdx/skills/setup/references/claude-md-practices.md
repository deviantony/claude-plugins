# Best Practices Reference

This file is read by the setup wizard during Step 6.

- The **Generic** section is written into the project's CLAUDE.md under `## Best Practices`.
- Each **language** section is written to a separate `.claude/rules/cdx-<language>.md` file with path-scoped frontmatter. If a detected language has no section here, it is silently skipped.

---

## Generic

These apply to every project regardless of language — written into CLAUDE.md:

- No dead code — remove unused functions, variables, imports, and commented-out blocks
- No magic numbers — extract named constants for any non-obvious literal value
- Prefer early returns over deeply nested conditionals
- Single responsibility — each function/method should do one thing well
- Keep it simple, don't over-engineer, YAGNI — only build what is needed now
- Favor consistency over cleverness and premature optimization
- Write code that reads like prose — clear naming over comments explaining unclear code
- These principles apply across planning, implementation, and review

## Go

Paths: `**/*.go`

Build and test commands:

- `go build ./...` — compile all packages
- `go test ./...` — run all tests
- `go vet ./...` — static analysis
- `golangci-lint run` — lint (if available)

Conventions:

- Follow effective Go idioms and Go proverbs
- Keep packages focused — name them after what they provide, not what they contain
- Exported names get doc comments; unexported helpers do not need them
- Use short variable names in small scopes, descriptive names for exported identifiers
- `fmt.Errorf` with `%w` for error wrapping; handle errors explicitly, never discard with `_`
- Prefer table-driven tests
- Avoid `interface{}` / `any` when a concrete type works
- Accept interfaces, return structs

File structure patterns:

- `cmd/` for entry points, `internal/` for private packages, `pkg/` for public libraries
- `_test.go` files live next to the code they test
- `testdata/` directories for test fixtures
