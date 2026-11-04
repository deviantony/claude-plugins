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

Deliver a seamlessly looping GIF plus the self-contained HTML it was rendered from.
Needs `bun`, `ffmpeg` and a headless Chrome; if `render.ts` cannot find one it prints
the fix. Relay it to the user rather than installing anything.

`SKILL=${CLAUDE_PLUGIN_ROOT}/skills/sketch-diagram`

## 1. Pick the layout from the content's shape

| Content | Layout |
|---|---|
| parallel categories or stages, each with an inner flow | horizontal bands |
| layered architecture (frontend → services → storage) | vertical stack of full-width layers |
| a core with satellites | radial: centre node, satellites, spokes |
| two or three things compared | side-by-side columns or a matrix |
| stages that repeat forever (reconcile, lifecycle) | ring of regions (a 2×2 read clockwise), closing arc back to stage 1 |
| one main process | a single snaking axis filling the canvas |
| change over time | timeline, cards alternating above and below |

Layouts can nest. Content comes from the user's topic, never from the template's
placeholders.

## 2. Choreograph the flow

The animation tells *what flows*. In one sentence: what moves (data, requests, tasks),
where it starts, where it branches, merges or loops, where it ends. Draw exactly that:
branches branch, loops loop back with a dot running round. The shape of the motion
should retell the topic. A row of same-direction arrows means this step was skipped.

## 3. Read `$SKILL/references/style.md` in full

Tokens, layout and motion rules, SVG recipes, pitfalls. Use its values only.

## 4. Assemble and build

Copy `$SKILL/assets/template.html` to `<name>.src.html` (in the user's chosen directory,
default the current one), replace every `PLACEHOLDER` block, and draw every icon
yourself. Then:

```bash
bun "$SKILL/scripts/build.ts" <name>.src.html -o <name>.html
```

Always edit the `.src.html` and rebuild. Animate with CSS only (no SMIL, no JS motion):
the renderer freezes frames through `document.getAnimations()`.

## 5. Preview and fix (mandatory, at least once)

```bash
bun "$SKILL/scripts/render.ts" <name>.html <name>.gif --preview 3
```

Read the three PNGs it writes. Any `warn:` line (a duration that breaks the loop) is a
bug. `note:` lines flag overlapping text (fix) and dot speeds (judge). Check:

- text readable, nothing overflowing or overlapping
- the layout and density rules in `style.md` hold
- dots moved between frames, and their paths retell the step 2 sentence
- wobble applied, monochrome ink, one wash per region
- every planned node, edge and label present and spelled right

Fix the `.src.html`, rebuild, re-preview until clean. Delete the preview PNGs.

## 6. Render and deliver

```bash
bun "$SKILL/scripts/render.ts" <name>.html <name>.gif
```

Takes 1–2 minutes; give the command a timeout of at least 5 minutes. Keep the default `--scale 2`, and pass
`--loop` only if you changed the page's `--loop`. Report the GIF and HTML paths with
the size, frame count and file size it prints. Keep the `.src.html` for later edits.
