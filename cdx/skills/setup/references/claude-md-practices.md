# Best Practices Reference

Read by the setup skill when updating CLAUDE.md and creating language rule files.

- The **Generic** section is written into the project's CLAUDE.md under `## Best Practices`.
- Each **language** section is written to a separate `.claude/rules/cdx-<key>.md` file with path-scoped frontmatter. If a detected language has no section here, it is silently skipped.

Supported language keys: `go`, `ts` (TypeScript/JavaScript), `python`, `swift`.

---

## Generic

These apply to every project regardless of language — written into CLAUDE.md:

- No dead code — remove unused functions, variables, imports, and commented-out blocks
- No magic numbers — extract named constants for any non-obvious literal value
- Prefer early returns over deeply nested conditionals
- Single responsibility — each function/method should do one thing well
- Keep it simple, don't over-engineer, YAGNI — only build what is needed now
- Keep dependencies minimal — prefer standard library solutions over adding new packages
- Favor consistency over cleverness and premature optimization
- Write code that reads like prose — clear naming over comments explaining unclear code
- These principles apply across planning, implementation, and review

## Go

Key: `go`
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

## TypeScript / JavaScript

Key: `ts`
Paths: `**/*.ts`, `**/*.tsx`, `**/*.js`, `**/*.jsx`, `**/*.mjs`, `**/*.cjs`

Package manager: pnpm (per cdx safe-deps). Avoid npm, yarn, npx.

Build and test commands:

- `pnpm install --frozen-lockfile` — install dependencies
- `pnpm build` — build the project (if defined)
- `pnpm test` — run tests
- `pnpm tsc --noEmit` — type-check without emitting
- `pnpm lint` — lint (if defined)

Conventions:

- Prefer TypeScript over plain JavaScript in mixed projects; new files default to `.ts` / `.tsx`
- Strict mode on (`strict: true` in tsconfig); fix at the type level rather than casting with `as`
- Avoid `any`; reach for `unknown` and narrow before use
- Use named exports; avoid default exports except for framework-required entry points
- Async/await over chained `.then`; throw `Error` subclasses, not strings
- ESM (`import`/`export`) over CommonJS (`require`) in new code
- Verify the standard library or existing deps don't already cover a need before adding a package

File structure patterns:

- `src/` for sources, mirrored by `tests/` or co-located `*.test.ts`
- `dist/` and `build/` are generated; never edit by hand
- `tsconfig.json` at the project root; extend in subprojects when needed

## Python

Key: `python`
Paths: `**/*.py`

Package manager: uv (per cdx safe-deps). Avoid bare `pip` for project deps.

Build and test commands:

- `uv sync` — install dependencies from lockfile
- `uv run pytest` — run tests
- `uv run ruff check .` — lint
- `uv run ruff format .` — format
- `uv run mypy .` or `uv run pyright` — type-check (whichever the project uses)

Conventions:

- Type hints on all public functions and class attributes
- Prefer `dataclasses` / `pydantic` models over loose dicts for structured data
- Raise specific exception classes, not bare `Exception`; never `except:` without a type
- f-strings over `%` and `.format()`
- `pathlib` over `os.path`
- Context managers (`with`) for any resource that has a close/release
- Keep modules small and focused; avoid circular imports by depending on abstractions

File structure patterns:

- Source under `src/<package>/` (src layout) or `<package>/` at the root
- Tests under `tests/`, mirroring the package layout
- `pyproject.toml` is the single source of truth for project metadata, deps, and tool config

## Swift

Key: `swift`
Paths: `**/*.swift`

Build and test commands:

- `swift build` — compile (SwiftPM projects)
- `swift test` — run tests
- `xcodebuild -scheme <name> build` — for Xcode-managed projects
- `xcodebuild -scheme <name> test` — run tests in an Xcode project

Conventions:

- Follow the Swift API Design Guidelines (clarity at the call site over brevity)
- Value types (`struct`, `enum`) by default; reach for `class` only when you need identity or inheritance
- `let` over `var`; mutable state must be justified
- Optionals: prefer `if let` / `guard let` over force-unwrap (`!`); reserve `!` for invariants you can prove
- Use `Result` and `throws` rather than sentinel return values
- Mark types and methods `final` unless explicitly designed for subclassing
- Embrace protocol-oriented design; protocols with extensions over deep class hierarchies

File structure patterns:

- `Sources/<Target>/` and `Tests/<Target>Tests/` for SwiftPM
- One primary type per file; filename matches the type name
- `Package.swift` at the root for SwiftPM projects
