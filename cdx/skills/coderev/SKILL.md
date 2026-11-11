---
name: coderev
description: >-
  Pre-PR code review of the current branch, run by an independent reviewer
  subagent in a fresh context; the main agent then triages its findings on its
  own, fixes what is worth fixing in a separate commit, and reports what it
  fixed, skipped and needs the user for. Use proactively, without being asked,
  right before opening a pull request on the user's own branch: before running
  `gh pr create`, or when the user says "open a PR", "ready for review", "ship
  it", "push this up for review". Also invoked manually as `/cdx:coderev`.
user-invocable: true
---

# Code Review

An independent review of the branch, followed by automated triage and fixes, before it becomes a PR.

The value comes from a split of roles. A **reviewer** in a fresh context judges the code without knowing why it was written that way, so it isn't swayed by the reasoning that produced it. You, the main agent, wrote the change and know its intent, so you're the right one to decide what each finding is worth. Keep that split intact: don't do the review yourself, and don't hand the reviewer your rationale.

## 1. Scope

- **Base**: the branch the PR will target. Use the user's stated target if any; otherwise `git merge-base HEAD origin/HEAD` (fall back to `main`, then `master`). If HEAD *is* the base branch, review uncommitted changes against `HEAD`.
- **Clean or dirty**: note whether the working tree has uncommitted changes now. It decides how fixes are committed in step 5.
- **Size**: `git diff --stat <base>`. If nothing changed, say so and stop.
- **Goal**: one to three lines on what the change is for: what problem it solves and the intended behaviour. Write it as you would in a PR description's opening line.
- **Constraints**: only things the *user* explicitly asked for ("keep the old endpoint", "no new dependencies"). Not your own design choices.

Leave out everything else you know: alternatives you considered, why you structured it this way, known shortcuts. If the reviewer has that, it will rationalise the same things you did.

## 2. Review in a fresh context

Spawn one general-purpose subagent with this prompt:

```
Read ${CLAUDE_PLUGIN_ROOT}/skills/coderev/references/reviewer.md and follow it exactly.

Repository: <absolute repo path>
Base ref: <base>
Goal: <goal>
Constraints: <constraints, or "none">
```

Don't paste the diff or file contents. The reviewer pulls them itself, which keeps both contexts lean.

**No subagent tool**: if you can't spawn a subagent, run the same prompt as a separate headless process from the repo root, which is just as fresh a context: `claude -p "<prompt>" --allowedTools "Read Grep Glob Bash"`. If that isn't available either, run the brief yourself, but put `(not independent: reviewed by the author)` on the report's first line, so the user knows the review lost its main safeguard.

**Large changes**: if the diff is several thousand lines across clearly separate areas (e.g. backend and frontend, or independent packages), spawn one reviewer per area in parallel, adding `Area: <paths>` to each prompt. Split by area, never by category: every reviewer should look at everything that matters in its slice.

## 3. Triage

Read every finding against the code before acting on it. The reviewer can be wrong, and so can you. Sort each one into a single bucket:

- **Fix**: the default for high and medium findings that hold up, when the fix stays within the change and doesn't alter behaviour the user asked for. Lows only when trivial and in lines this branch touched.
- **Skip**: give a specific reason in one line: a false positive (cite what makes it safe, e.g. "caller validates at `api/handler.go:88`"), conflicts with a stated constraint, pre-existing code the branch didn't touch, or the cost outweighs the value.
- **Needs the user**: the fix would change requested behaviour, a public API, a schema or migration, or the PR's scope; or it's a security trade-off; or it's a high finding you can't confidently fix or refute.

You're judging your own work, so hold yourself to a standard:
- "I intended it that way" is not a reason. Intent explains the code; it doesn't make a bug fine.
- Skipping a high finding takes evidence at least as concrete as the finding's. When unsure, fix it or put it under "needs the user". Never quietly skip it.
- Out of scope means the branch didn't touch it, not that fixing it is inconvenient.

## 4. Fix and verify

Apply each fix as a minimal, targeted edit. Then run the same checks the reviewer listed under `CHECKS` (plus any obvious project check it missed: CLAUDE.md commands, Makefile, package scripts).

- A check that passed before and fails now means your fix broke it. Correct the fix or revert it, and move the finding to "needs the user" with what happened.
- A check that already failed before isn't yours to fix here. Mention it.

Don't send the fixes back for a second review. One round, then report.

## 5. Commit

- **Tree was clean at step 1 and anything was fixed**: commit the fixes as one separate commit on top, so they're easy to inspect or drop. Subject `Address review findings`, body with one line per fix (`F<n>: <what changed>`). Follow the repo's commit conventions, including any trailers recent commits use.
- **Tree was dirty at step 1**: leave the fixes uncommitted, mixed in with the existing work, and say so. Committing would bundle in work that isn't yours to commit.

## 6. Report

Keep it short; the user reads this after the fact.

```
Code review: <n> findings — <x> fixed, <y> skipped, <z> need you
Fixed (<commit sha> | uncommitted):
- F1 <path:line> — <what changed>
Skipped:
- F3 — <reason>
Needs you:
- F5 <path:line> — <the decision you need, phrased as a question>
Checks: <command> → pass|fail, ...
```

Leave out empty sections. With zero findings, one line saying the review came back clean is the whole report.

Then carry on. If the review ran because you were about to open a PR, open it now, unless something is under "needs you". In that case, wait for the user's answer before publishing anything. If the review ran because the user typed `/cdx:coderev`, stop after the report.

Don't run the review again on the same HEAD in one session unless the user asks.
