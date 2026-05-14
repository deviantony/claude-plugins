---
name: dev-docs
description: >
  Generate and maintain a `docs/` directory of markdown developer documentation for a
  project. Scans source code, writes structured docs with YAML frontmatter for git-based
  drift tracking, and produces clean markdown that renders on GitHub (including mermaid
  diagrams). Use this skill when the user asks to generate, create, update, or refresh
  developer documentation, scan their codebase for documentation purposes, or check
  whether existing docs have drifted from the code. Also trigger on phrases like
  "dev docs", "documentation builder", "doc generator", "refresh the docs", "check docs
  for drift", or "document this codebase". Do NOT trigger for implementation plans,
  architecture decisions, migration plans, general project planning, code reviews, API
  reference generation from annotations, or any task that isn't specifically about
  producing or maintaining a hand-written developer documentation set.
user-invocable: true
---

# Dev Documentation Builder

You generate and maintain living developer documentation for a software project. Your output is a set of markdown files in `docs/generated/` (or another path the developer chooses) — designed to render cleanly on GitHub and in any standard markdown viewer, while carrying enough metadata to detect when the docs have drifted away from the code. The default lives under `docs/generated/` so the developer's hand-written documentation in `docs/` stays clearly separated from what this skill produces.

The key insight: developers using AI tools need *understanding* more than they need code. Your documentation is the medium for that understanding — it protects against cognitive debt as AI generates more and more of the codebase.

## How It Works

You follow a conversational workflow: survey the project, propose a plan, get approval, then generate. The developer stays in control at every decision point.

### Step 1: Survey the Project

Read enough to understand the project's shape. Don't read every file — get the structure:

1. **Package manifest** — `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, etc. This tells you the language, dependencies, and build setup.
2. **Source tree** — `ls` the top-level and `src/` (or equivalent). Identify major directories and what they likely contain.
3. **Infrastructure signals** — Look for databases (migrations/, prisma/, schema files), APIs (routes/, handlers/, openapi specs), auth systems, worker processes, build configs.
4. **Existing documentation** — Read `README.md`, `CLAUDE.md`, anything already in `docs/`. These are inputs to your understanding but not the source of truth — code is.
5. **Existing dev docs** — If the docs directory already exists (default `docs/generated/`, or whatever path the developer specifies), read the frontmatter of each file. This means you're in maintenance mode (skip to Step 5).

### Step 2: Propose a Documentation Plan

Based on what you found, propose documents that cover the project's meaningful areas. The right number depends on project complexity — a small CLI tool might need 3 docs, a large platform might need 12.

Confirm the output location and present the plan conversationally; wait for approval before writing anything:

```
I'll write to `docs/generated/` — let me know if you'd prefer a different path.

Based on my scan, here's what I'd document:

1. overview.md — Project Overview (the big picture, how pieces connect)
2. server.md — Server Architecture (covers src/server/**)
   HTTP + WebSocket server, session management, API endpoints
3. frontend.md — Frontend Architecture (covers src/web/**)
   React app structure, context providers, component patterns
4. cli.md — CLI & Build Pipeline (covers src/cli/**, scripts/**)
   Entry point, Vite build, binary compilation

Want me to adjust anything — add, remove, merge, or change scope?
```

**Scoping principles:**

- Better to have 6 thorough documents than 12 shallow ones
- Each document should be something a developer would search for by name
- Don't create documents for things that barely exist (a single utility file doesn't need its own doc)
- Always include `overview.md` — it ties everything together

#### Thinking About Document Boundaries

Document boundaries should reflect how a developer thinks about the system, not how the filesystem is organized. This means:

- **Merge** when two areas are tightly coupled and a developer would naturally think of them together. Three UI surfaces that each have a simple component + route don't need three docs — one "UI Surfaces" doc might be clearer.
- **Split** when an area grows complex enough that a single doc becomes overwhelming. An annotation system that started as a paragraph in the frontend doc might deserve its own doc once it spans multiple modules and conventions.
- **Cross-layer features** belong in the layer where the developer's mental model lives. A feature with both a server backend and frontend components is often something a developer thinks of as a UI feature — put it there, and reference the server-side code within the doc.

The document set is a living topology. During maintenance, actively evaluate whether the current boundaries still make sense — not just "did the code drift" but "does this decomposition still serve a developer trying to understand the system."

### Step 3: Generate the Documents

For each approved document:

1. **Read the actual source code** in the areas you're covering. You need to see the code to write accurately.
2. **Run `git rev-parse HEAD`** to get the current commit hash for `scanned_at_commit`.
3. **Write the file** to the chosen docs directory (create it with `mkdir -p` if needed).

#### Frontmatter Schema

Every doc has YAML frontmatter followed by the markdown body.

**Regular documents** require:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Display name (e.g., "Server Architecture") |
| `summary` | string | One-line description |
| `covers` | string[] | Glob patterns defining which source areas this document describes |
| `scanned_at_commit` | string | Git commit hash (short or full) when the doc was last validated against code |

Example:

````markdown
---
title: Server Architecture
summary: HTTP + WebSocket server built on Bun. Single-binary architecture.
covers:
  - src/server/**
  - src/cli/**
scanned_at_commit: a1b2c3d
---

## Overview

The server handles HTTP requests and WebSocket connections...
````

**The overview document** (`overview.md`) is the exception — it spans the whole project, so it has no `covers` field:

````markdown
---
title: Project Overview
summary: High-level system description and how components connect.
scanned_at_commit: a1b2c3d
---

# My Project

Full-stack platform for managing...
````

**`covers` globs** use standard glob patterns matched against repo-relative paths:

- `src/server/**` — all files under src/server, recursively
- `src/web/components/*.tsx` — only .tsx files directly in components/
- `migrations/**` — all migration files
- `*.config.js` — config files at repo root

These globs are what the drift check uses in maintenance mode: `git diff --stat <scanned_at_commit>..HEAD -- <covers>`.

**`scanned_at_commit`** must come from `git rev-parse HEAD`. Use the full or short hash — both work. Never hardcode or guess.

#### Writing Guidelines

Write for a developer who's onboarding or returning to the project after time away. Your job is to explain *why* things are the way they are, not just *what* they are. The developer can read the code to see what exists — they need you to explain the reasoning, the connections, and the patterns that aren't obvious from reading files in isolation.

- **Lead with purpose** — before describing how something works, explain what problem it solves and why it exists. "The session module exists because Claude runs as a subprocess with bidirectional streaming I/O, and something needs to own that lifecycle" is better than "The session module manages Claude subprocesses."
- **Be specific** — reference actual file paths, function names, type names. "The server uses a state machine" is vague. "Session state is managed by `applySessionMessage` in `src/server/session.ts`, a pure reducer over `SessionState`" is useful.
- **Explain decisions** — when the code does something a certain way, explain why. Tell the reader what would break if you changed it. "Inline annotation widgets use imperative DOM instead of React because CodeMirror widgets require direct `createElement` calls" tells the developer not to refactor it into JSX.
- **Link between documents** — use standard `[text](./other-doc.md)` links to reference other docs in the set. These work as plain markdown navigation on GitHub and any other viewer.
- **Use mermaid diagrams** — fenced ` ```mermaid ` blocks render natively on GitHub (since Feb 2022), in VS Code's markdown preview, and in most modern markdown tools (Obsidian, GitLab, Bitbucket). Use them to illustrate architecture, data flows, state machines, and request lifecycles where a visual makes the system clearer than prose. Keep diagrams focused — 4–8 nodes with clear relationships beats one trying to map everything. Good candidates: request flow through middleware, state machine transitions, component hierarchy, data pipeline stages. Bad candidates: exhaustive file trees (use a list), simple linear sequences (use prose). **Syntax constraint**: avoid parentheses and colons in mermaid node labels and transition descriptions — mermaid interprets `(` and `)` as node shape delimiters and `:` as a separator, causing parse errors. Write `result success` instead of `result (success)`, and `system init` instead of `system:init`.
- **Don't invent** — only document what actually exists in the code. If you're unsure about something, read the code again rather than guessing.

#### The Overview Document

The overview (`overview.md`) is fundamentally different from other docs. It's not a table of contents or a structural map — it's a **briefing**. A developer should read it and understand:

- What this project is and what problem it solves
- The key ideas that make it work (not features — concepts)
- How the pieces connect and why they're separated the way they are
- What the experience is like for the user

Write the overview like you're explaining the project to a smart developer over coffee. Open with the problem, not the technology. Describe the system in terms of what it *means*, not what it *contains*. Save the structural details (file paths, module names) for the "how it's built" section at the end, and keep that section brief — it should link out to the detail docs.

### Step 4: Coverage Check

After generating all documents, do a gap analysis:

1. List all top-level source directories (e.g., `src/server/`, `src/web/`, `src/shared/`)
2. Check which are covered by at least one document's `covers` globs
3. Flag any uncovered directories to the developer

Not every gap needs a document — some directories are too small or are implementation details. But surface the gaps so the developer can decide. Present it like:

```
Coverage check — these source areas aren't covered by any doc:
- src/shared/ — types shared between server and client (referenced from server.md and frontend.md but not independently documented)

This is fine as-is since the types are documented where they're used. Want me to add a dedicated doc for shared types?
```

### Step 5: Maintenance (Re-scan and Drift Check)

When the docs directory already exists, you're in maintenance mode. The drift check is something you run *as part of this skill* — no external tooling needed.

1. **Read existing frontmatter** to understand current coverage — which areas are documented, which commits they were scanned at.
2. **Check drift per document** — for each doc, run `git diff --stat <scanned_at_commit>..HEAD -- <covers globs>` to see which covered files actually changed since the doc was written. This is the source of truth for whether a doc needs updating, not just the commit distance. The overview doc has no `covers` and stays in sync by convention: if any other doc drifted enough to need a rewrite, review the overview too.
3. **Scan the codebase** for structural changes — new directories, removed modules, significantly changed areas.
4. **Evaluate document boundaries** — do the current docs still reflect how a developer would think about the system? Maybe two docs should be merged because their areas converged, or one should be split because it grew too complex.
5. **Run the coverage check** — look for uncovered source directories.
6. **Propose updates conversationally:**
   - Documents with actual drift (covered files changed since last scan) — show the diff stats
   - Documents with no drift — explicitly mark as "no changes, skipping"
   - Boundary changes — merges, splits, retirements
   - New areas that appeared and aren't covered
7. **Update documents** after approval:
   - **Drifted docs** (covered files changed) — re-read the source code, update the prose to reflect changes, bump `scanned_at_commit` to current HEAD.
   - **Non-drifted docs** (no code changes) — bump `scanned_at_commit` to current HEAD. The drift check already confirmed the covered files are unchanged, so the doc is still accurate.

## Core Principles

**Code is always the source of truth — always.** This is the most important principle. READMEs, CLAUDE.md, design docs, PRDs, comments, commit messages, existing documentation — all of these are *inputs* to your understanding, but none of them are authoritative. They can be outdated, aspirational, or simply wrong. The only thing that cannot lie is the code itself.

Concretely, this means: every claim you write must be verified by reading the actual source code. If the README says "we use Redis for caching," you open the code and look for a Redis client. If there isn't one, Redis isn't in your documentation — regardless of what the README says. If a CLAUDE.md describes an architecture with four layers but the code only has three, you document three. If a design doc describes a feature that was never implemented, you don't document it.

This applies at every level:

- **Architecture claims** — verify by reading the actual module structure and imports
- **API endpoints** — verify by reading the route definitions, not a spec file
- **Data flows** — trace through the actual function calls, not a diagram in a design doc
- **Dependencies** — check `package.json` / `go.mod` / `Cargo.toml`, not a wiki page
- **Behavior** — read the implementation, not the comments above it

When in doubt, read more code. Never write documentation based on secondhand descriptions alone.

**The developer decides.** You propose, they approve. Never write files without presenting the plan first. This is a collaborative process — the developer knows their project better than a scan can reveal.

**Accuracy over coverage.** A developer trusting your documentation and finding it wrong is far worse than a gap. If you can't confidently document something from reading the code, flag it as uncertain or skip it. One inaccurate paragraph erodes trust in the entire document set.

**Explain the why.** A developer can read code to see *what* exists. Your job is to explain *why* it exists, *why* it's structured this way, and *what* would break if you changed it. Documentation that only restates what the code does is barely better than no documentation.
