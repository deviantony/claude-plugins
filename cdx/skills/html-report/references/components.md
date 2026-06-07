# Component reference

Every component below lives in `assets/report-template.html` already styled. This
file is a quick index: what each one is *for*, so you pick the right one instead
of defaulting to plain paragraphs. Copy the markup from the template — don't
retype the CSS.

Reach for a component when it earns its place. A report that is all prose is hard
to skim; a report that is all cards is noise. The good ones alternate: prose to
argue, a component to crystallize.

## Masthead — always

`.eyebrow` + `<h1>` + `.title-rule` + `.lede`. The eyebrow is a small context
tag (`portainer-mcp · security assessment`). The lede is one paragraph that tells
a reviewer what the document is before they commit to reading it.

## Verdict band — when there's a bottom line

`.verdict` (with `.v-label`). Put the conclusion up top so a busy reviewer can
read only this and know the recommendation. Variants:
- default — clean card, accent-colored label, neutral / positive conclusion
- `.verdict warn` — faint amber tint, proceed with caution
- `.verdict bad` — faint red tint, recommend against

(The conclusion's tone reads from the tinted card + label color, not a vertical bar.)

Lead with the decision in **bold**; name the pivotal trade-off in *italics*.

## Section — the backbone

`section.body-section` with a numbered `.section-eyebrow` (`01 — Goal`), an
`<h2>`, prose `<p>`, optional `<h3>` subheads and `<ul>`. Number sections when the
document is meant to be read top to bottom; drop the numbers for a loose
collection of notes.

## Comparison table — options across axes

`<table>` with `.cell-good` (green) / `.cell-bad` (deep amber) / `td.dim`
(neutral) cells and `.axis` row labels. Best when two or three options differ
along several named dimensions and you want the pattern of strengths visible at a
glance. If you have one option, you don't need a table.

## Pros / cons two-up — auditing each option

`.audit` grid of `.audit-card`s, each with `.pc-list pro` (+ markers) and
`.pc-list con` (− markers). Complements the comparison table: the table shows
options *against each other*, the cards show each option *on its own terms*. Using
both is common and good — table for the head-to-head, cards for the depth.

## Findings — assessments and reviews

`.finding` cards tagged `high` / `med` / `low`. `high` and `med` carry a colored
left bar (red / amber) because severity is the signal worth seeing at a glance;
`low` uses a neutral bar — it's for accepted trade-offs and strengths, which
shouldn't shout. The `.sev` label text is free-form — "High", "Medium", "By
design", "Strength". `.f-id` is an optional stable identifier (e.g. `RA-3`) so prose can
cross-reference a finding. Use these for security reviews, risk assessments, audit
output — anywhere items have severity.

## Callout — asides

`.callout` (neutral tinted card) for supporting context; `.callout warn` (amber) for a
caution. Keep them short — one idea. They break up long prose and flag the thing
you don't want missed.

## Recommendations — ordered next steps

`.rec-list` renders auto-numbered circles. Use for "here's what to do," in
priority order, each item leading with a **bold** action. If the steps aren't
ordered, a plain `<ul>` is better.

## CSS diagram — flows and topologies

`.diagram` (grid of `.box` nodes) + `.arrow` (the line between rows). Add
`.cols-2` / `.cols-4` to change the column count. Box variants: `.box.dim` for
external/passive actors, `.box.hl` for the component under discussion, plain for
in-scope-but-not-the-focus. Use `.role` for the small uppercase label on top of
each box.

This is the house style for diagrams — pure CSS, no mermaid, no SVG, no image
files — so the report stays a single self-contained file. It's ideal for request
flows, system topology, layer stacks, and pipelines (4–6 boxes). For anything
genuinely graph-shaped (many crossing edges, a state machine), prose plus a small
table usually reads better than forcing it into boxes — don't fight the medium.

## Footnote — provenance

`.footnote` at the end. State what the document is (proposal vs committed plan)
and the sources it was built from — code paths, PRs, other docs. This is what
makes a report trustworthy to someone who wasn't in the conversation.
