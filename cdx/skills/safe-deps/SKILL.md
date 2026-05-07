---
name: safe-deps
description: "Enforces safe dependency installation practices across all projects. MUST trigger whenever Claude is about to run any package install command (pnpm, bun, uv), add a dependency, initialize a project, scaffold an app, or set up a dev environment. Also triggers when Claude would reach for npm, yarn, or npx — these are banned and must be replaced. Covers JavaScript/TypeScript (pnpm or bun) and Python (uv) ecosystems."
user-invocable: true
---

# Safe Dependency Installation

This skill enforces the user's preferred package managers and security-hardened install settings. The rules below exist to defend against supply-chain attacks (typosquats, malicious post-install scripts, surprise updates pulled in by fuzzy version ranges) and to keep installs reproducible across environments — every constraint maps back to one of those two goals.

## Banned tools

Never use `npm`, `yarn`, or `npx`. The user does not use these. If a README, tutorial, or template says `npm install` or `yarn add`, translate to the correct tool below. For one-off package execution, use `pnpm dlx` or `bunx` (never `npx`).

## Choosing the right package manager

### JavaScript / TypeScript projects

The user works with both **pnpm** and **bun** depending on the project. Detect which one by checking the project directory:

| Signal | Use |
|---|---|
| `pnpm-lock.yaml` or `pnpm-workspace.yaml` exists | **pnpm** |
| `bun.lock` or `bun.lockb` or `bunfig.toml` exists | **bun** |
| `.npmrc` with pnpm-specific settings | **pnpm** |
| Neither detected | Ask the user which they prefer for this project |

If both signals exist (e.g. a migration in progress), ask the user.

### Python projects

Always use **uv**. Never use `pip`, `pip3`, `poetry`, or `pipenv` directly.

## Required security settings

Every install must enforce three things: **exact version pinning**, a **minimum release age** of 10 days, and **disabled post-install scripts**. These protect against supply-chain attacks and ensure reproducible builds.

### Exact version pinning (all ecosystems)

Never use `~`, `^`, or any range specifier when adding dependencies. Always pin to an exact version. Fuzzy ranges silently pull in new code that hasn't been reviewed.

- **pnpm**: `pnpm add <package> --save-exact --ignore-scripts`
- **bun**: `bun add <package> --exact --ignore-scripts`
- **uv**: `uv add <package>` (uv pins exact versions by default in `pyproject.toml`)

Also set this as the default in config so it applies even if `--save-exact`/`--exact` is accidentally omitted:

**pnpm** — in `.npmrc`:
```ini
save-exact=true
```

**bun** — in `bunfig.toml`:
```toml
[install]
exact = true
```

### pnpm

**Minimum release age** — set in `pnpm-workspace.yaml` (value is in minutes; 10 days = 14400):

```yaml
minimumReleaseAge: 14400
```

If the project doesn't have this setting yet, add it before running any install command.

**Disable scripts** — always pass `--ignore-scripts`:

```bash
pnpm install --ignore-scripts
pnpm add <package> --ignore-scripts
```

### bun

**Minimum release age** — set in `bunfig.toml` under `[install]` (value is in seconds; 10 days = 864000):

```toml
[install]
minimumReleaseAge = 864000
```

If the project doesn't have this setting yet, add it (create `bunfig.toml` if needed) before running any install command.

**Disable scripts** — always pass `--ignore-scripts`:

```bash
bun install --ignore-scripts
bun add <package> --ignore-scripts
```

Note: bun already skips lifecycle scripts for dependencies by default, but `--ignore-scripts` also skips the project's own pre/post install scripts, which is what we want.

### uv

**Minimum release age** — set in `pyproject.toml` or `uv.toml` using `exclude-newer` with a friendly duration:

```toml
[tool.uv]
exclude-newer = "10 days"
```

If the project doesn't have this setting yet, add it before running any install command.

Python packages don't have post-install scripts in the same way as npm, so no extra flag is needed here.

## Workflow

When you're about to install dependencies:

1. **Detect** the package manager from the project directory (see table above)
2. **Check** that all three config settings are in place (exact pinning, minimum release age, scripts disabled) — if any are missing, add them before running anything
3. **Run** the install command with `--ignore-scripts` and `--save-exact`/`--exact` (for pnpm/bun)
4. **Validate** after installation: briefly confirm the config is in place and the install completed without bypassing the age gate. Spot-check that no `^` or `~` ranges crept into `package.json`

## Scaffolding new projects

When creating a new project from scratch:

- Ask the user whether they want pnpm or bun (for JS/TS) or use uv (for Python)
- Set up the config files (`pnpm-workspace.yaml`, `bunfig.toml`, or `pyproject.toml`) with the security settings from the start
- Never run a project generator's default `npm install` — if a scaffolding tool runs npm automatically, re-install with the correct tool afterward

## Quick reference

| Ecosystem | Tool | Exact pin config | Min release age config | Scripts flag |
|---|---|---|---|---|
| JS/TS | pnpm | `.npmrc`: `save-exact=true` | `pnpm-workspace.yaml`: `minimumReleaseAge: 14400` | `--ignore-scripts` |
| JS/TS | bun | `bunfig.toml`: `exact = true` | `bunfig.toml`: `minimumReleaseAge = 864000` | `--ignore-scripts` |
| Python | uv | default behavior | `pyproject.toml`: `exclude-newer = "10 days"` | N/A |
