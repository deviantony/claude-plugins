---
name: wrap
description: >-
  Prepare for a context clear: summarize where the work stands, bring any
  written plan up to date, flag anything that would be lost, and print a single
  self-contained oneliner to paste into a fresh session to resume the next
  piece of work. Manually invoked as `/cdx:wrap` or `/cdx:wrap <what's next>`.
user-invocable: true
---

# Wrap

The user is about to clear context. The next session starts with nothing but
the repo on disk and the line you give them, so that line has to carry
everything needed to pick up cleanly.

## 1. Check what would be lost

Run `git status --short` and `git log --oneline -3`. Note:

- Uncommitted or untracked work relevant to the task. Say so; do not commit,
  stash, or delete anything on your own.
- Anything that only exists in this conversation (a decision, a plan, a
  finding, a file in the session scratchpad) that the next session would need.
  If it doesn't fit in the plan file (step 2) or in one line, say so and
  suggest where to put it (a file in the repo, a ticket comment). Let the user
  decide.

## 2. Bring the written plan up to date

Check whether the repo keeps a written plan or progress file: look at
CLAUDE.md for a stated convention, then at common spots (`PLAN.md`, `TODO.md`,
`docs/plans/`, `plans/`, `.claude/plans/`, a task file named in recent
commits). If one tracks the current work, update it before wrapping: tick off
what's done, record decisions made this session, and set the next step so it
matches the oneliner. Edit only the parts this session touched.

Invoking this skill is the go-ahead for that edit; updating the plan is the
point of wrapping. Don't commit it.

If there's no plan convention, skip this step. Don't create one.

## 3. Decide the next piece of work

If the user passed an argument, that's the next step. Otherwise take the open
next step from the conversation. If it's genuinely unclear, ask once.

## 4. Output

Keep it short; the user is about to throw this context away.

**Status**: 2–4 bullets covering what's done, what's in progress, and
decisions that matter.

**Before clearing**: only if something needs action (uncommitted work, the
plan file updated but not committed, context with no home). Omit otherwise.

**Resume with:** followed by one line in a code block, written for an agent
with zero context:

- what the work is and where it lives (paths, branch, ticket)
- current state (e.g. "draft uncommitted", "tests failing in X")
- the specific next step
- any constraint the next agent must not miss

When a plan file exists, point at it and let it carry the detail:
`Continue per docs/plans/auth-rework.md on branch auth-rework — next: step 4 (migrate session store).`

Good: `Continue the cdx:wrap skill on main — SKILL.md drafted at cdx/skills/wrap/ (uncommitted); next: add README entry and bump cdx to 2.5.0 in plugin.json + marketplace.json.`

Bad: `Continue where we left off.` (the next session has no "where")

Never put secrets in the oneliner.
