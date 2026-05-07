---
name: coderev
description: Review current code changes for bugs, unnecessary complexity, missed reuse, convention drift, efficiency issues, and security gaps. Launches three parallel agents, produces a structured findings report, and offers to fix issues.
user-invocable: true
---

# Code Review

You are conducting a comprehensive code review of the current changes. The goal is to surface genuine issues — bugs, unnecessary complexity, missed reuse, inefficiency, convention drift, and security gaps — then give the user clear, actionable findings so they can decide what to fix.

## Mindset

Review like a thoughtful peer, not a checklist:

- **Genuine issues only.** Stylistic preferences and matters of taste aren't findings. If the code is clean and direct, an empty report is the right outcome — don't manufacture findings to look thorough. Reviewer credibility comes from honest signal, not from finding-count.
- **Specific over vague.** "This could be simpler" is a non-finding. "Lines 42-58 nest three conditionals where an early return would flatten the logic" is a finding. File path, line range, and a concrete recommended action are the minimum bar — without those, the user can't act on it.
- **Accidental, not essential.** Complex code in a complex domain is honest. The goal is to surface complexity that exists *by accident* — copy-paste, premature abstraction, dead branches, defensive code for impossible states — not complexity that the problem actually demands.
- **Severity by impact, not labels.** A 3-line helper that could be inlined is minor. A 200-line abstraction wrapping a single API call is major. Specificity in the description carries more signal than the priority tag itself — calibrate honestly so the user trusts what they're reading.
- **Audit first, change later.** Findings are produced read-only — never modify files during analysis. Fixes happen only after the user has seen the full picture and chosen what to act on. Mixing the two phases robs the user of the chance to redirect.

## Process

### 1. Identify what changed

Run `git diff` (or `git diff HEAD` if there are staged changes) to get the full diff. Also run `git diff --name-only` (and `git diff --cached --name-only`) to get the list of modified files. If the user pointed at specific files or directories, scope to those instead. If there are no git changes, review the most recently modified files that the user mentioned or that were edited earlier in the conversation.

Read each changed file to build full context.

### 2. Discover project skills

Scan for `.claude/skills/*/SKILL.md` files in the project root. For each skill found, read its frontmatter (`name` and `description` fields). Collect these into a skill inventory that will be passed to review agents as context.

If no project skills are found, skip this step — the agents will still perform a thorough generic review.

### 3. Run tool-backed duplication scan

If any `.jscpd-*.json` configs exist at the project root, invoke `cdx:scan` via the Skill tool, passing the changed file list as a comma-separated `args` string. Capture the structured findings as `SCAN_FINDINGS`.

If no configs exist, or `cdx:scan` reports `jscpd not installed`, skip this step and note it for the report. The AI-level reuse review still runs.

`SCAN_FINDINGS` (when present) will be handed to Agent 2 as tool-backed input — deterministic copy-paste already detected, so the agent can focus on semantic reuse instead of re-running grep over the diff.

### 4. Launch three review agents in parallel

Use the Agent tool to launch all three agents concurrently in a single message. Pass each agent:
- The full diff and the list of changed files
- The skill inventory from step 2 (if any)
- `SCAN_FINDINGS` from step 3 (Agent 2 only, when available)

Each agent must ANALYZE only — do NOT edit any files or make changes.

For each issue found, agents must report it as a structured finding with these fields:
- File path and line range
- Category (from the agent's assigned categories)
- Priority: **high** (functional bugs, semantic inconsistencies, data loss risks, security vulnerabilities), **medium** (duplication, unnecessary complexity, missed reuse, convention drift), or **low** (minor cleanup, style-adjacent)
- Description of the issue (1-2 sentences, be specific)
- Recommended action (what concretely should change)

#### Agent 1: Structure & Correctness Review

Categories: **Simplification**, **Over-engineering**, **YAGNI**, **Dead Code**, **Correctness**

```
You are running a code review. Your job is to ANALYZE the code — do NOT edit any files or make changes.

Review the changes for these categories:

**Simplification** — Logic that could be expressed more directly. Unnecessary nesting or indirection. Complex conditionals that could be flattened. Wrapper functions that just call through. Abstractions that add a layer without adding clarity.

**Over-engineering** — Premature abstractions built for flexibility that isn't needed. Config objects for things with one value. Class hierarchies where a function would do. Generic solutions to specific problems. Patterns imported from enterprise codebases that don't fit the project's scale.

**YAGNI** — Code that handles cases that don't exist yet. Feature flags for unrequested features. Defensive validation against impossible states. Parameters, options, or branches that are never exercised. Infrastructure for hypothetical future requirements.

**Dead Code** — Unreachable branches. Unused imports. Functions or variables defined but never called. Commented-out code. Exports with no consumer. Stale type definitions.

**Correctness** — Semantic bugs. Off-by-one errors. Incorrect error handling (swallowed errors, wrong error types, missing error paths). Race conditions. Inconsistent state updates. Logic that doesn't match its documented or apparent intent.

Be thorough but honest. Only flag genuine issues — not stylistic preferences or matters of taste. If a piece of code is already clean and direct, don't invent a finding for it. An empty list is a valid result.
```

#### Agent 2: Reuse & Conventions Review

Category: **Code Reuse**, **Conventions**

```
You are running a code review. Your job is to ANALYZE the code — do NOT edit any files or make changes.

**Tool-backed input**: If `SCAN_FINDINGS` is provided in your context, those are deterministic copy-paste clones already detected by jscpd. Treat them as ground truth — do not re-detect what's already there. Include them in your final findings list verbatim (preserve priority and locations) and focus your own analysis on semantic reuse below.

**Code Reuse** — For each change:
1. Search for existing utilities and helpers that could replace newly written code. Use Grep to find similar patterns elsewhere in the codebase — common locations are utility directories, shared modules, and files adjacent to the changed ones.
2. Flag any new function that duplicates existing functionality. Suggest the existing function to use instead.
3. Flag any inline logic that could use an existing utility — hand-rolled string manipulation, manual path handling, custom environment checks, ad-hoc type guards, and similar patterns are common candidates.

**Conventions** — Examine the changed code against surrounding code in the same files and neighboring files:
1. Look for naming inconsistencies (different conventions for similar things).
2. Look for structural drift (different patterns for similar operations — e.g., one handler uses a helper while a new handler inlines the same logic).
3. Look for error handling inconsistencies (different strategies in the same layer).
4. Do NOT enforce arbitrary rules — only flag deviations from patterns already established in this codebase.

If project skills are provided in context, invoke any that are relevant to the changed code for deeper domain-specific analysis. For example, if a design-system skill exists and CSS files changed, invoke it. If an api-patterns skill exists and API handlers changed, invoke it. Use the Skill tool to invoke them. Only invoke skills whose domain clearly overlaps with the diff — do not invoke skills speculatively.

Be thorough but honest. Only flag genuine duplication or convention drift — not cases where similar-looking code serves a legitimately different purpose. An empty list is a valid result.
```

#### Agent 3: Efficiency & Security Review

Categories: **Efficiency**, **Security**

```
You are running a code review. Your job is to ANALYZE the code — do NOT edit any files or make changes.

**Efficiency** — Review the changes for:
1. Unnecessary work: redundant computations, repeated file reads, duplicate network/API calls, N+1 patterns
2. Missed concurrency: independent operations run sequentially when they could run in parallel
3. Hot-path bloat: new blocking work added to startup or per-request/per-render hot paths
4. Unnecessary existence checks: pre-checking file/resource existence before operating (TOCTOU anti-pattern) — operate directly and handle the error
5. Memory: unbounded data structures, missing cleanup, event listener leaks
6. Overly broad operations: reading entire files when only a portion is needed, loading all items when filtering for one

**Security** — Review the changes for:
1. Injection risks: SQL injection (string concatenation in queries), command injection, XSS (unsanitized user input in output)
2. Sensitive data exposure: secrets in logs, error messages leaking internals, debug info in production responses
3. Auth gaps: missing authentication checks, broken authorization (accessing resources without ownership verification), privilege escalation paths
4. Crypto/secrets: hardcoded credentials, weak hashing, insecure randomness
5. Input validation: missing or insufficient validation at system boundaries (user input, external API responses)

If project skills are provided in context, invoke any that are relevant to the changed code for deeper domain-specific analysis. For example, if a db-review skill exists and database/repository code changed, invoke it. Use the Skill tool to invoke them. Only invoke skills whose domain clearly overlaps with the diff — do not invoke skills speculatively.

Be thorough but honest. Only flag genuine efficiency or security issues — not micro-optimizations that don't matter at the project's scale or theoretical attacks with no realistic vector. An empty list is a valid result.
```

### 5. Compile findings into a report

Wait for all three agents to complete. First, deduplicate: if two agents flagged overlapping file + line ranges, keep the finding with the more specific description and drop the other. When in doubt, prefer the agent whose assigned categories are the better fit.

Organize the remaining findings into a single report. Only include categories that have findings — skip empty categories entirely. Within each category table, sort rows by priority: high first, then medium, then low. Use a single numbering sequence across all categories.

```
## Code Review Report

### [Category Name]
| # | Pri | File | Lines | Finding | Action |
|---|-----|------|-------|---------|--------|

(repeat for each category that has findings)
```

At the end, list any categories with no findings in a single line, e.g.: "No issues found in: Dead Code, YAGNI, Security."

End the report with a summary:
- Total findings count and breakdown by category, with high-priority count highlighted (e.g., "18 findings (3 high)")
- List of affected files
- Project skills leveraged (if any were invoked by agents)
- A one-line overall assessment (e.g., "Generally clean with a few opportunities to flatten conditional logic" or "Several abstractions introduced ahead of need — consider deferring until requirements solidify")

If no issues were found, say so clearly — that's a positive outcome.

### 6. Offer to fix

After presenting the findings, ask the user which ones they'd like to resolve. Offer these options:
- Fix specific findings by number
- Fix all findings in a category
- Fix everything
- Do nothing (just wanted the audit)

For any findings the user wants fixed, apply the changes directly. Each finding already includes the file path, line range, and recommended action — use that to make targeted edits. Keep changes minimal and focused on exactly what the finding describes.

## Operational rules

The Mindset section sets posture; these rules cover concrete process mechanics:

- **Deduplicate across agents.** If two agents flag overlapping file + line ranges, keep the more specific finding and drop the other. Prefer the agent whose assigned categories are the better fit for the issue.
- **Skills are advisory, not mandatory.** If project skills are discovered, agents should invoke them when relevant — but a missing skill never blocks the review. The generic analysis always runs.
- **Tool-backed scans are advisory too.** `cdx:scan` runs only when `.jscpd-*.json` configs are present and jscpd is installed. If either is missing, the AI-level reuse review still produces a complete result.
