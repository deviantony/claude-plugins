---
name: annotate-report
description: >-
  Inject a PR-style review/comment layer into an existing house-style HTML
  report, producing a non-destructive `.annotated.html` copy a reviewer can
  mark up and hand back. Manually invoked.
user-invocable: true
---

# Annotate a report for review

Turn a finished HTML report into one a reviewer can mark up — highlight a phrase,
attach a comment, resolve it, and send the result back — all in a single
self-contained `.html` file with no server, account, or build step. It's the
GitHub PR-review experience for a document you'd otherwise review as flat prose.

This is a **post-processor**, kept separate from `html-report` on purpose: that
skill's promise is "no JavaScript, single file," so a normal report stays
script-free, and this layer can be added to *any* existing house-style report —
including ones already shipped — only when review is the goal.

## Adding the layer

One command — it copies the report and injects the layer before `</body>`:

```bash
python ${CLAUDE_PLUGIN_ROOT}/skills/annotate-report/scripts/annotate.py path/to/report.html
# → path/to/report.annotated.html   (original untouched)
```

A second argument overrides the output path. The script is **non-destructive**
(never edits the input, refuses an output path equal to the input) and
**idempotent** (refuses a file that already carries the layer). Don't hand-edit
the injected block or paste the runtime in by hand — the JS builds all its UI at
runtime by design (static markup would crash a re-opened export), so always
inject via the script. Afterwards, tell the user the output path and offer to
open it in a browser.

## What the reviewer gets

A docked **sidebar**, hidden by default behind a "💬 Review" pill in the
top-right. It holds the reviewer's name, an open/resolved count, the actions, and
the comment cards. Inside the report:

- **Select text** → a floating "Comment" button → a card; the selection is
  highlighted and linked to it.
- **The faint `+`** in the left margin of a paragraph/heading adds a whole-block
  note (selection-based comments work everywhere, including list items and table
  cells).
- Each card has author, time, and **Edit / Resolve / Delete**; clicking a card
  scrolls the document to its target.

Two ways out, both in the sidebar header:

- **Share review** downloads `<name>.reviewed.html` — the same file with comments
  baked into an embedded JSON island. The reviewer sends that one file back;
  opening it re-hydrates every highlight and note. Work also autosaves to
  `localStorage` between sessions.
- **Export to AI** copies the *open* comments (resolved ones excluded) to the
  clipboard as XML — quote/context + note per item, with a preamble — to paste
  into an AI so it can act on the feedback.

## Theming

The layer carries no palette of its own: every colour derives from the report's
`:root` design tokens (`--accent`, `--con`, `--pro`, …) via `color-mix`, so it
matches the report's house style and follows the design system if it changes. The
runtime self-disables on any document without a `.page` container, so injecting
into a non-house-style file is a harmless no-op.

## Scope (v1)

Single reviewer, flat notes, last-write-wins merge by comment id. Reply threads
and merging several reviewers' returned files onto one master copy are out of
scope — the boundary is marked in the asset so it's a known limit. Extend
`${CLAUDE_PLUGIN_ROOT}/skills/annotate-report/assets/review-layer.html` if a real
need shows up.
