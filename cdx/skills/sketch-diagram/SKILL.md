---
name: sketch-diagram
description: >-
  Draw an animated, hand-drawn-style technical diagram: ink doodles on beige paper,
  wobbly strokes, faint watercolour regions, doodle icons, number stamps, and dots
  flowing along the edges. Produces one self-contained HTML file (inline SVG + CSS
  animation + embedded fonts) and exports it to a seamlessly looping GIF. Use when
  the user wants an architecture diagram, flow chart, pipeline or workflow picture,
  infographic, comparison, or explainer visual, or asks for something "hand-drawn",
  "sketch style", "doodle style", an "animated diagram" or a "GIF diagram".
user-invocable: true
---

# Sketch diagram

Make a diagram that looks like a senior engineer drew it with a fineliner in a kraft
notebook: beige paper, wobbly ink lines, faint washes, stick figures and paper stacks,
✦ sparkles, small dots flowing along the edges, a few icons gently moving, all on one
seamless loop (3s by default).

**Deliverables**: the GIF (primary) and the self-contained HTML it was rendered from.

**Prerequisites**: `bun`, `ffmpeg`, and a headless Chrome. `render.ts` looks for
`$CHROME_PATH`, then Playwright's headless shell under `~/.cache/ms-playwright` (or
`~/Library/Caches/ms-playwright`), then `chromium` / `chromium-browser` /
`google-chrome` on `PATH`. If none is found it says how to fix it; relay that to the
user rather than installing anything yourself.

Paths below use `SKILL=${CLAUDE_PLUGIN_ROOT}/skills/sketch-diagram`.

## Workflow

### 1. Plan the content, then pick the layout

**The layout follows the content's natural shape, never the reverse.** Decide what the
topic looks like, then choose an archetype:

| Natural shape of the content | Archetype |
|---|---|
| N parallel categories, options or stages, each with its own internal flow | horizontal bands (label on the left, flow canvas on the right) |
| top-down layered architecture (frontend → services → storage) | vertical stack of full-width layers, edges crossing layers vertically |
| one core with satellites (hub and spoke) | radial: big centre circle, nodes around it, spokes |
| two or three things compared dimension by dimension | side-by-side columns or a matrix, one row per dimension |
| a few stages that repeat forever (reconcile, build-measure-learn, lifecycle) | ring of regions (a 2×2 read clockwise works well), edges crossing the gaps, the closing edge back to stage 1 as a strong arc |
| a single main process | no bands; one snaking main axis that fills the canvas |
| evolution over time | horizontal timeline, event cards alternating above and below |

Archetypes can mix (radial inside a band). All of them share the same parts: regions
(washed panels with a number stamp and centred title), inner cards (paper-white, doodle
icon plus handwritten label, 3–6 per region), edges (slightly curved arrows with short
labels), and accents (dashed callout boxes for commands, stick figures, ✦, a slogan).

Content always comes from the user's topic. Do not reuse the template's placeholder
text or structure.

### 2. Choreograph the flow

The animation is not decoration; it tells *what flows*. Answer in one sentence: what
moves through this picture (data, requests, tasks, memory)? Where does it start, what
does it pass through, where does it branch, merge or loop, where does it end? Then turn
that sentence into paths: branch where it branches, merge where it merges, send the dot
back round an arc where it loops. A topic that is a cycle (flywheel, iteration,
lifecycle) gets a cyclic path; a fan-out or fan-in gets one. Looking at the result, the
*shape of the motion* should retell the topic. A single row of same-direction arrows
usually means the flow was not planned, not that the topic is that straight.

### 3. Read the style system

Read `$SKILL/references/style.md` in full: tokens (palette, fonts, strokes, radii,
spacing, density, timing) and SVG/CSS recipes. Use the tokens only; no free colour
choices.

### 4. Assemble and build

1. Copy `$SKILL/assets/template.html` to `<name>.src.html` next to where the user
   wants the output (default: the current directory).
2. Replace every `PLACEHOLDER` block with the planned content, using the recipes. Draw
   every icon yourself as inline SVG doodles (recipe 4); no icon libraries, image APIs
   or downloads.
3. Build the self-contained file:
   ```bash
   bun "$SKILL/scripts/build.ts" <name>.src.html -o <name>.html
   ```
   Always edit the `.src.html` and rebuild; a built file has no placeholders left.

Hard constraints (the GIF export depends on them):
- **CSS animations only** (`@keyframes`, `offset-path`). No SMIL `<animate>`, no
  JS-driven motion: the renderer freezes frames through `document.getAnimations()`.
- Every animation duration divides `--loop` evenly (loop, loop/2, loop/3, loop/4) and
  is `infinite`. `render.ts` warns when one does not; treat that warning as a bug.

### 5. Review loop (mandatory)

```bash
bun "$SKILL/scripts/render.ts" <name>.html <name>.gif --preview 3
```

This writes `<name>-preview-1..3.png`, spread across the loop (spaced so every dot sits
somewhere different in each), at 2× scale. It also prints `note:` lines for dots outside
80–150px/s and for text labels that overlap; fix overlaps, judge speed notes. Read all
three PNGs and check:
- **Clarity**: text crisp and readable at 2×, nothing overflowing its card.
- **Layout**: content fills each region (no wide empty margins), region heights hug the
  content, ink spread evenly when you squint, nothing overlapping.
- **Motion**: dots clearly moved between previews and micro-motion changed.
- **Flow shape**: the motion retells the topic (branches, merges, loops where the topic
  has them), not a row of parallel lines.
- **Style**: wobble applied, arrowheads touch card edges, monochrome ink, one wash per
  region.
- **Content**: every planned node, edge and label present and spelled right.

Anything failing: fix the `.src.html`, rebuild, re-preview. Do at least one full pass of
this loop before rendering the GIF. Delete the preview PNGs when done.

### 6. Render and deliver

```bash
bun "$SKILL/scripts/render.ts" <name>.html <name>.gif
```

Keep the default `--scale 2` (1× GIFs have blurry text). Pass `--loop` only if you
changed the page's `--loop`; the two must match. A full render takes 1–2 minutes,
mostly ffmpeg palette work, so give the command a timeout of at least 5 minutes. Deliver the GIF and the HTML paths with the dimensions,
frame count and file size the script prints. Keep the `.src.html` too, for later edits.

## Quality red lines

- **Dense composition**: regions sized to their content; every region has a non-linear
  element (paper stack, stick figure, loop arc or callout); edges carry labels. A row
  of equal boxes with arrows fails.
- **Spacing**: 24px+ between regions, 36px+ between nodes. Dense is not cramped.
- **Monochrome ink**: colour appears only in region washes and flow dots. All text and
  icons are ink.
- **One wash per region**, neighbouring regions differ.
- **Handwriting fonts for diagram text only**; code and commands use the mono font
  inside callout boxes.
- **Dots are small but visibly moving**: r≈4.5, 80–150px/s; micro-motion is subtle.
