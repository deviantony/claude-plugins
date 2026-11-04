# Sketch diagram style system and recipes

<!--
Derived from OLDyade/animated-sketch-diagram (https://github.com/OLDyade/animated-sketch-diagram),
commit cfc0061, MIT License, Copyright (c) 2026 animated-sketch-diagram contributors.
Translated from references/style-guide.md and references/svg-recipes.md and merged;
CJK font handling removed and the Python asset injection replaced by scripts/build.ts.
Bundled rough.js 4.6.6 is MIT, Copyright (c) Preet Shihn. Fonts are OFL-1.1, see assets/fonts/OFL.txt.
-->

The look: **black-ink doodles on beige paper with faint watercolour washes**, like a
system diagram a senior engineer drew with a fineliner in a kraft notebook and then
lightly washed a few regions with watercolour. The style is recognisable only when
these tokens are used together and exactly. Do not improvise colours.

Part 1 is the token reference. Part 2 is copy-paste SVG/CSS recipes. All coordinates
and text in the recipes are placeholders; recompute them for your content.

---

## Part 1: Tokens

### Canvas

| Token | Value | Notes |
|---|---|---|
| paper | `#f8f5e8` | warm beige; never pure white |
| canvas width | `1200px` | height follows content |
| ink | `#212020` | every stroke and all text; near-black, slightly warm; never `#000` |
| muted text | ink at `opacity="0.65"` | subtitles, notes |
| paper grain | faint `feTurbulence` (recipe 0) | optional, makes it read as paper |

### Region wash palette

A *region* is a first-level division of the layout (a horizontal band, a vertical layer,
a radial sector, a comparison column). Each region gets one wash; neighbouring regions
differ. Use 3 to 5 washes per diagram, alternating warm and cool.

| Name | Region wash | Deeper (strips, banners inside a region) | Flow dot |
|---|---|---|---|
| sage | `#f0f1e0` | `#e8ebd5` | `#5f7a4a` |
| butter | `#f9f3d1` | `#f4ecc0` | `#b8912a` |
| peach | `#f8e9d9` | `#f3ddc8` | `#bf7350` |
| lavender | `#e9e1ea` | `#ded2e0` | `#7d6a99` |
| mist | `#eef2f4` | `#e2e9ee` | `#5b7d94` |

Kraft brown `#e9dac1` (ink stroke) is reserved for container metaphors: a cardboard box,
a banner, an archive box.

- Inner cards (small cards, documents, sheets inside a region) are always paper white
  `#faf7eb`, never a wash colour.
- Washes appear only on region backgrounds and the odd accent strip. The overall
  impression is ink line on paper.

### Accents (sparing; they carry the hand-made feel)

- **Number stamp**: solid ink circle, 30px diameter, paper-coloured handwritten digit,
  at a region's top-left corner.
- **Sparkle ✦**: small four-point star path near the title, the slogan and key regions.
  3 to 6 per diagram.
- **Stick figure**: round head plus arc body, wherever "a person or agent does
  something". 1 to 3 per diagram.
- **Slogan**: one short handwritten phrase in a natural gap, a ✦ on each side.
- No colourful mascots, no highlighter marks, no coloured footer bar. Focus comes from
  ✦ and the slogan; the drawing is essentially monochrome ink.

### Fonts

All fonts are bundled and inlined by `build.ts`, so the result looks the same on
every machine.

| Role | Stack | Used for |
|---|---|---|
| `--font-title` | `'Kalam', cursive` **700** | main title, slogan, region titles, key words in nodes |
| `--font-body` | `'PatrickHand', cursive` **400** | notes, card labels, edge labels, subtitles |
| `.mono` | `ui-monospace, 'DejaVu Sans Mono', Menlo, monospace` | code and commands, only inside callout boxes |

Only these two faces are bundled: Kalam is bold only, Patrick Hand regular only, so
never set body text bold or title text regular. **All text is ink.** Latin script
only: there is no CJK font.

#### Type scale

| Level | Font / size | Notes |
|---|---|---|
| main title | title / 52–64px bold | swept underline, one ✦ beside it |
| slogan | title / 26–32px bold | ✦ on both sides |
| region title | title / 24–25px bold | **centred** at the top of the region |
| region subtitle | body / 14–15px @ 0.65 | centred under the title (optional) |
| card label | body / 15–16px | below or beside the card's icon |
| edge label | body / 13–14px | keep the words short |

### Shapes and strokes (rougher than usual)

| Element | Spec |
|---|---|
| region panel | radius 18px, ink **2.2px**, roughness 1.8, fill = wash |
| region header | number stamp top-left, centred title; optional wobbly 1.4px divider below |
| inner card | radius 8px, ink 1.7px, fill `#faf7eb`; a *stack* is 1–2 copies offset (+4,+4) behind |
| document card | dog-ear at top-right (two short lines), reads more like paper than a rounded rect |
| icon | monochrome ink doodle, 2px: person, document, folder, box, magnifier, laptop, moon, gear, tick, cross |
| main edge | ink **2.0px**, **slight curve** (shallow Q arc, never straight), small solid arrowhead |
| big loop edge | ink 2.2px long arc around the outside of the layout; dashed arcs only for weak links (1.6px, `7 6`) |
| callout / command box | radius 8px, ink 1.4px dashed `4 4`, fill paper white |

**The hand-drawn wobble is mandatory**: every static shape gets `data-rough` (this
style uses roughness 1.6–2.2, rougher than rough.js' default). `sketchify()` replaces
them at load time. Elements that carry a CSS animation are the exception (recipe 0).

### Layout

The layout archetype comes from the content (SKILL.md step 1). Common to all:

- Main title in a corner (top-left or top-right), signature-style with a swept
  underline. It does not take a full row.
- 24px+ between regions, 20px padding inside a region, 36px+ between nodes.
- Region label = number stamp (when there is an order) + centred title. Numbers let
  readers find the reading order, so fewer cross-region edges are needed.
- The main axis (left to right, say) is only the default reading direction, not a cage
  for the flow. Branches, merges, round trips, cross-region loops and orbits are drawn
  wherever the content needs them; loops run through the gaps above, below or outside
  the main axis. When the whole topic is a cycle, one big arc around the outside of the
  layout states it, with dots running along it.
- Solid versus dashed means strong versus weak: a core iteration loop is solid; an
  occasional fallback or weak link is dashed.
- Natural gaps hold the slogan and ✦. Do not force-fill them.

### Composition density

Layout is driven by **how much there is to draw**. Count nodes, attachments and notes
first, then derive the geometry.

- **Fill the width**: a row of nodes spans the region's usable width. First node at the
  left padding, last at the right padding, gaps equal:
  gap = (usable width − Σ node widths) / number of gaps. Do not huddle in the middle
  with empty margins; wide gaps are where arrows and edge labels breathe.
- **Height follows content**: region height = header (title + subtitle, about 70px) +
  main row + attachment row (callouts, how far loop arcs dip) + padding, added up item
  by item. Never pick a height first and then fill it. The canvas height is the sum of
  the regions' natural heights.
- Attachments (callouts, stick figures, paper stacks) go into the gaps above and below
  the main axis. They are filler: put them where there is space, not at a fixed spot.
- Every region needs at least one **non-linear element**: a paper stack, a stick
  figure, a kraft banner, a callout or a loop arc. A region that is only a row of boxes
  and arrows fails.
- "Icon + two or three short lines" inside a card says "list" or "document". Use this
  shorthand often.
- Label edges where you can (what happens, what passes).
- Final check: squint at the whole picture. Ink should be spread evenly. An area that
  reads as empty either needs to shrink or is missing an attachment.

### Animation timing

| Token | Value |
|---|---|
| global loop `--loop` | default `3000ms`. Every duration ∈ {loop, loop/2, loop/3, loop/4}, all `infinite`: this is what makes the GIF seamless. **If the whole thing feels too fast or slow, change this one value (2400–3600ms)**; everything scales with it. |
| dot speed | **set by pixel speed, not one lap per loop**: target **80–150px/s**. Estimate the path length L and pick the loop/k closest to L / 110 px/s. Short edges (<150px) at least loop/3; long arcs loop or loop/2. A dot that takes 3s to crawl 50px looks dead. |
| dot form | r=4.5, fill = the region's dot colour, 2.5px paper halo, plus a `scale` breathe (loop/4, 1 → 1.35). Stagger lines with negative delays. |
| where dots go | **every path that means flow**: main flow, loops, branches, cross-region arcs, orbits. Loops especially: a dot running back round the arc is what makes it feel like a cycle. Only pure annotation leaders get no dot. The flow should have out-and-back and turns; all parallel same-direction lines fails. |
| micro-motion | 2–4 places per diagram: gear or moon slowly turning, tick drawing itself, blinking cursor, ✦ pulse |
| easing | dot travel `linear`; breathe and micro-motion `ease-in-out` |

Test: watch the GIF for two seconds. You should immediately feel that things are
moving. If you have to lean in to find a moving dot, speed or density is too low.

---

## Part 2: Recipes

Assembly: one HTML file, one `.canvas` element in `<body>`, one inline
`<svg viewBox="0 0 1200 H">`. Everything is laid out by hand with the tokens above.
Start from `assets/template.html`, which already contains recipe 0, the arrow marker
and the CSS for recipes 6 and 7.

**Where the hand-drawn feel comes from**: put `data-rough` on every static shape
(`data-roughness="1.8"` by default in this style). At load, the bundled rough.js and
sketchify.js replace each one with a wobbly hand-drawn copy. Write clean
`<rect>/<path>/<circle>/<line>/<ellipse>` and never fake the wobble yourself.
Exception: **elements with a CSS animation** (flow dots, a turning gear, a tick that
draws itself) **must not** have `data-rough`. The rough copy is static, and an animation
class on the hidden original would be invisible.

### 0. File skeleton, asset slots and paper grain

`assets/template.html` has three placeholders, each exactly once: `__FONTS__` inside
`<style>`, `__ROUGH__` and `__SKETCHIFY__` inside `<script>` tags. Never paste fonts or
scripts by hand; `scripts/build.ts` fills them:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/skills/sketch-diagram/scripts/build.ts" diagram.src.html -o diagram.html
```

Keep the `.src.html` as the file you edit; a built file has no placeholders left and
`build.ts` refuses to build it again.

The skeleton itself (paper grain filter, `.canvas`, base CSS, the arrow marker, and
all the CSS for recipes 6 and 7) is already in the template; edit it there.

The `viewBox` height, the `height` attribute and both background rects must agree.

### 1. Main title (signature-style), swept underline, ✦

```html
<text class="t-title" x="880" y="80" font-size="62">MyTitle</text>
<!-- wobbly underline sweeping under the title, end flicking up -->
<path data-rough data-roughness="2.2" d="M878 96 Q1030 106 1180 92" fill="none"
      stroke="var(--ink)" stroke-width="3"/>
<!-- four-point star ✦ (add class="pulse" for micro-motion) -->
<path d="M1186 118 l3.5 8.5 8.5 3.5 -8.5 3.5 -3.5 8.5 -3.5 -8.5 -8.5 -3.5 8.5 -3.5 z" fill="var(--ink)"/>
```

Slogan in a natural gap:

```html
<text class="t-title" x="600" y="360" font-size="30" text-anchor="middle">Every run becomes a better next start</text>
<!-- one ✦ on each side: the same path, translated -->
```

### 2. Region panel: number stamp and centred title (horizontal band shown)

Vertical layers, radial sectors and comparison columns follow the same tokens.

```html
<g class="region">
  <rect data-rough data-roughness="1.8" x="240" y="250" width="360" height="170" rx="18"
        fill="#f0f1e0" stroke="var(--ink)" stroke-width="2.2"/>
  <!-- number stamp: solid ink circle, paper digit -->
  <circle data-rough cx="272" cy="278" r="15" fill="var(--ink)" stroke="none"/>
  <!-- the digit's colour MUST be inline style=: the CSS rule svg text {fill: ink}
       beats a fill attribute, and black on black is invisible -->
  <text class="t-strong" x="272" y="286" font-size="20" style="fill:var(--paper)" text-anchor="middle">2</text>
  <!-- centred title and an optional divider -->
  <text class="t-strong" x="435" y="286" font-size="25" text-anchor="middle">Memory Extraction</text>
  <path data-rough d="M258 300 H582" fill="none" stroke="var(--ink)" stroke-width="1.4"/>
</g>
```

### 3. Inner cards: plain card, paper stack, dog-eared document

```html
<!-- plain card: icon + label -->
<rect data-rough x="260" y="316" width="150" height="34" rx="8"
      fill="#faf7eb" stroke="var(--ink)" stroke-width="1.7"/>
<text x="300" y="338" font-size="15">User Messages</text>

<!-- paper stack: 1–2 offset copies behind, drawn first -->
<rect data-rough x="496" y="308" width="86" height="98" rx="6" fill="#faf7eb" stroke="var(--ink)" stroke-width="1.5"/>
<rect data-rough x="490" y="303" width="86" height="98" rx="6" fill="#faf7eb" stroke="var(--ink)" stroke-width="1.5"/>
<rect data-rough x="484" y="298" width="86" height="98" rx="6" fill="#faf7eb" stroke="var(--ink)" stroke-width="1.7"/>

<!-- dog-eared document: folded top-right corner, two or three short lines as content shorthand -->
<path data-rough d="M484 298 h66 l20 20 v78 h-86 z" fill="#faf7eb" stroke="var(--ink)" stroke-width="1.7"/>
<path d="M550 298 v20 h20" fill="none" stroke="var(--ink)" stroke-width="1.7"/>
<line x1="496" y1="340" x2="556" y2="340" stroke="var(--ink)" stroke-width="1.6"/>
<line x1="496" y1="352" x2="548" y2="352" stroke="var(--ink)" stroke-width="1.6"/>
<line x1="496" y1="364" x2="552" y2="364" stroke="var(--ink)" stroke-width="1.6"/>
```

### 4. Doodle icons (monochrome ink, 2px)

Draw each icon in place from a few `line/circle/path` elements. No icon libraries, no
downloaded SVGs, no generated images. Keep them about 24–40px and simple enough to
draw with a pen in two seconds.

```html
<!-- stick figure (round head + arc body): "a person or agent doing something" -->
<circle data-rough cx="400" cy="330" r="11" fill="#faf7eb" stroke="var(--ink)" stroke-width="2"/>
<path data-rough d="M384 372 q16 -22 32 0 z" fill="#faf7eb" stroke="var(--ink)" stroke-width="2"/>
<!-- magnifier (next to the figure's hand: searching) -->
<circle cx="424" cy="352" r="7" fill="none" stroke="var(--ink)" stroke-width="2"/>
<line x1="429" y1="358" x2="437" y2="366" stroke="var(--ink)" stroke-width="2.4" stroke-linecap="round"/>

<!-- folder -->
<path data-rough d="M700 340 h16 l5 6 h23 v26 h-44 z" fill="#faf7eb" stroke="var(--ink)" stroke-width="1.8"/>
<!-- cardboard box (kraft fill) -->
<path data-rough d="M760 350 l30 -8 30 8 v24 l-30 8 -30 -8 z" fill="#e9dac1" stroke="var(--ink)" stroke-width="1.8"/>
<line x1="790" y1="342" x2="790" y2="374" stroke="var(--ink)" stroke-width="1.4"/>
<!-- moon (night jobs, "dream"; class="spin" for a slow turn) -->
<path d="M900 330 a12 12 0 1 0 10 18 a9 9 0 0 1 -10 -18 z" fill="var(--ink)"/>
<!-- gear = circle + 4 short teeth; tick = polyline; cross = two diagonals;
     laptop = trapezoid base + screen rect; robot = rounded square head, antenna, two dot eyes;
     scissors = two crossing lines + two small rings; cylinder (database) = ellipse top + sides + arc bottom -->
```

### 5. Edges: gentle curves, big loops, dashed weak links

One arrowhead marker in `<defs>` (small solid ink triangle):

```html
<defs>
  <marker id="arr" viewBox="0 0 10 8" refX="9" refY="4"
          markerWidth="8" markerHeight="6.5" orient="auto-start-reverse">
    <path d="M0 0 L10 4 L0 8 Z" fill="var(--ink)"/>
  </marker>
</defs>

<!-- main flow: a shallow arc, never straight (nothing is straight in a hand drawing) -->
<path data-rough id="e1" d="M410 333 Q447 328 486 334" fill="none" stroke="var(--ink)"
      stroke-width="2.0" marker-end="url(#arr)"/>
<text x="448" y="320" font-size="14" text-anchor="middle">edge label</text>

<!-- big loop: a long arc around the outside of the layout that lands the point
     ("Better Next Run"), with a dot running along it -->
<path data-rough data-roughness="2" d="M300 760 C120 700 100 260 300 120" fill="none"
      stroke="var(--ink)" stroke-width="2.2" marker-end="url(#arr)"/>

<!-- core iteration loop: solid (when the loop IS the main flow, don't weaken it with dashes) -->
<path data-rough d="M900 420 Q760 500 620 430" fill="none" stroke="var(--ink)"
      stroke-width="2.0" marker-end="url(#arr)"/>

<!-- occasional fallback or weak link: only then dashed -->
<path data-rough d="M900 300 Q780 350 660 310" fill="none" stroke="var(--ink)"
      stroke-width="1.6" stroke-dasharray="7 6" marker-end="url(#arr)"/>

<!-- branch, one to two: two arcs from one start, each with arrow, label and dot -->
<path data-rough d="M420 330 Q470 300 520 292" fill="none" stroke="var(--ink)" stroke-width="2.0" marker-end="url(#arr)"/>
<path data-rough d="M420 336 Q470 366 520 374" fill="none" stroke="var(--ink)" stroke-width="2.0" marker-end="url(#arr)"/>
<!-- merge, two to one: two arcs ending at different anchor points on the same node edge -->

<!-- orbit: nodes arranged on a ring, one closed elliptical arc as a conveyor belt,
     2–3 staggered dots running on it -->
<path data-rough id="orbit" d="M600 470 a170 90 0 1 0 0.1 0" fill="none"
      stroke="var(--ink)" stroke-width="2.2"/>
```

- Arrowheads stop 2px outside the target's edge; never stab into a card.
- **Flow topology follows content**: branches, merges, round trips, cross-region arcs
  and orbits are all normal. If every edge is a same-direction parallel line, suspect
  the topology, not the content.

### 6. Flow dots (the soul of the animation)

A dot is its own `<circle>` that runs along **the exact same `d` string** as its edge
via CSS `offset-path`. On a black ink line it needs a paper-coloured halo to be seen:

```html
<!-- pick --t by path length: 80–150px/s (short edge loop/3, medium loop/2, long arc loop) -->
<circle class="dot" r="4.5" fill="#5f7a4a" stroke="var(--paper)" stroke-width="2.5"
        style="offset-path: path('M410 333 Q447 328 486 334'); --t: calc(var(--loop) / 3)"/>
```

The `.dot` / `travel` / `breathe` CSS is in the template. Stagger dots that share or
neighbour an edge with `.d2`, `.d3` (a third, two thirds) or `.dh` (a half). The
offsets are fractions of the dot's **own** `--t`, so they work at any speed.

- **Durations must still be a whole fraction of the loop** (loop/2, loop/3, loop/4) or
  the GIF has a seam. Within that constraint, pick the one closest to the target speed.
- Dot colour = the region's dot token.
- **Every path that means flow gets a dot**: main flow, loops (a dot running back round
  the arc is what makes it a cycle), both arms of a branch, cross-region arcs, orbits
  (2–3 staggered). Only callout leader lines go without.
- Reverse flow needs no new path: the same `d` plus class `.rev` (for example, an out
  and a back dot on a two-way sync).
- The `offset-path` `d` must match the edge's `d` character for character. Change both
  together.

### 7. Icon micro-motion (pick 2–4)

The template defines four classes; put one on an un-roughed element:

| Class | Effect | Period |
|---|---|---|
| `.spin` | full turn (gear, moon, ↻) | loop |
| `.tick` | stroke draws in, holds, wipes out; needs `stroke-dasharray` ≥ path length (26 by default) | loop |
| `.blink` | on/off (cursor, status light) | loop/4 |
| `.pulse` | scale and tilt (✦) | loop/2 |

Delete the unused ones from the template. New ones: animate only `transform`,
`opacity` or `stroke-dashoffset`, with a period that divides the loop.

### 8. Callout / command box

```html
<rect data-rough x="330" y="430" width="640" height="40" rx="8" fill="#faf7eb"
      stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="4 4"/>
<text class="mono" x="650" y="456" font-size="16" text-anchor="middle">$ command --example</text>
```

### 9. Pitfalls seen in practice

- Text colour set with the `fill` attribute is overridden by `svg text { fill: ink }`.
  Use `style="fill:..."` for the rare non-ink text (number stamps).
- A `data-rough` element with an animation class renders nothing visible. Keep
  animated elements un-roughed.
- Long labels overflow their card. Handwriting fonts run wide; measure with the
  preview, not by guessing.
- A dot whose `offset-path` differs from its edge's `d` drifts off the line.
- Small shapes (circles r ≤ 8, icon details) turn into blobs at roughness 1.8. Use
  `data-roughness="0.6"` on them, or leave them un-roughed.
- A ✦ at a fixed x beside the title collides with a longer title. Place it after
  measuring the title in the preview, and keep it clear of the slogan's ✦ pair when
  both sit in the top row.
- Count micro-motion by distinct places: the same `.tick` on two cards is two.
- `render.ts` prints `note:` lines for dots outside 80–150px/s and for overlapping
  text. A short edge may not reach 80px/s even at loop/4; that note is acceptable.
