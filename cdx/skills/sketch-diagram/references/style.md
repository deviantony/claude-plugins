# Sketch diagram style and recipes

<!--
Derived from OLDyade/animated-sketch-diagram (https://github.com/OLDyade/animated-sketch-diagram),
commit cfc0061, MIT License, Copyright (c) 2026 animated-sketch-diagram contributors.
Translated from references/style-guide.md and references/svg-recipes.md and merged;
CJK font handling removed and the Python asset injection replaced by scripts/build.ts.
Bundled rough.js 4.6.6 is MIT, Copyright (c) Preet Shihn. Fonts are OFL-1.1, see assets/fonts/OFL.txt.
-->

The look: black-ink doodles on beige paper with faint watercolour washes, like a system
diagram drawn with a fineliner in a kraft notebook. It only works when these tokens are
used exactly. Do not improvise colours. Coordinates and text in the recipes are
placeholders.

## Part 1: Tokens and rules

### Colour

| Token | Value | Use |
|---|---|---|
| paper | `#f8f5e8` | background; never pure white |
| ink | `#212020` | every stroke, all text, all icons; never `#000` |
| card | `#faf7eb` | every inner card, document, callout; never a wash |
| kraft | `#e9dac1` | container metaphors only: box, banner, archive |
| muted text | ink at `opacity="0.65"` | subtitles, notes |

A *region* is a first-level division (band, layer, sector, column). One wash per
region, neighbours differ, 3–5 washes per diagram alternating warm and cool. Dots take
their region's dot colour (an edge between regions: the source region's). Colour appears nowhere else: the drawing is monochrome ink.

| Name | Wash | Deeper (strip inside a region) | Dot |
|---|---|---|---|
| sage | `#f0f1e0` | `#e8ebd5` | `#5f7a4a` |
| butter | `#f9f3d1` | `#f4ecc0` | `#b8912a` |
| peach | `#f8e9d9` | `#f3ddc8` | `#bf7350` |
| lavender | `#e9e1ea` | `#ded2e0` | `#7d6a99` |
| mist | `#eef2f4` | `#e2e9ee` | `#5b7d94` |

### Type

Two bundled faces: Kalam (bold only) for `.t-title` / `.t-strong`, Patrick Hand
(regular only) for everything else. Never set body text bold. Code and commands use
`.mono`, only inside callout boxes. Latin script only.

| Level | Class / size |
|---|---|
| main title | `t-title` 52–64px, in a corner, swept underline, one ✦ |
| slogan | `t-title` 26–32px, in a natural gap, ✦ each side |
| region title | `t-strong` 24–25px, centred at the region's top |
| region subtitle | body 14–15px @ 0.65, centred under the title (optional) |
| card label | body 15–16px (key word `t-strong`) |
| edge label | body 13–14px, a few words |

### Shapes

Every static shape gets `data-rough` (roughness 1.6–2.2; panels 1.8). Elements with a
CSS animation never do.

| Element | Spec |
|---|---|
| region panel | rx 18, ink 2.2px, wash fill; number stamp top-left (ink circle r15, paper digit) when there is an order |
| inner card | rx 8, ink 1.7px, card fill; *stack* = 1–2 copies offset +4,+4 behind |
| document | dog-ear top-right, two or three short lines inside as "content" shorthand |
| icon | ink doodle, 2px stroke, 24–40px |
| edge | ink 2.0px, shallow curve (never straight); end the path 2px short of the target, the arrowhead tip sits at its end |
| big loop | ink 2.2px long arc around the outside of the layout |
| weak link | ink 1.6px dashed `7 6`; only for fallbacks and weak relations, never a core loop |
| callout | rx 8, ink 1.4px dashed `4 4`, card fill |

Accents: ✦ 3–6 per diagram (title, slogan, key regions); stick figures 1–3 wherever a
person or agent acts. No mascots, highlighter or coloured bars.

### Layout and density

- 24px+ between regions, 20px padding inside, 36px+ between nodes. Dense, not cramped.
- **Fill the width**: a row of nodes runs from the left padding to the right padding
  with equal gaps; wide gaps hold arrows and edge labels.
- **Height follows content**: add up header (~70px) + main row + attachment row +
  padding. Never pick a height and fill it.
- **Every region has a non-linear element**: paper stack, stick figure, kraft banner,
  callout or loop arc. A row of boxes and arrows fails. Attachments go in the gaps
  around the main axis.
- Label edges (what happens, what passes).
- The main axis is only a reading direction. Branches, merges, round trips,
  cross-region arcs and orbits go wherever the content needs them.
- Squint test: ink spread evenly. An empty-looking area should shrink or gain an
  attachment.

### Motion

- `--loop` is 3000ms. Every duration is loop, loop/2, loop/3 or loop/4, all
  `infinite`; that is what makes the GIF seamless. To speed up or slow down
  everything, change `--loop` (2400–3600ms) and nothing else.
- **Every path that means flow gets a dot**, loops especially. Only callout leaders go
  without. The motion should turn, branch and come back where the topic does.
- **Dot speed 80–150px/s**: pick the loop/k closest to path length ÷ 110px/s. Short
  edges below 80 at loop/4 and a long outer loop above 150 at loop are both fine.
- Micro-motion in 2–4 distinct places (the same class on two cards counts twice).
- Test: in two seconds of the GIF, motion should be obvious without leaning in.

## Part 2: Recipes

Start from `assets/template.html`. It already has the page skeleton, paper grain,
arrow marker (`#arr`), and the CSS for dots and micro-motion. Keep its `viewBox`
height, `height` attribute and two background rects equal. Write clean shapes and let
`sketchify()` add the wobble; never fake it.

### 1. Title and slogan

```html
<text class="t-title" x="880" y="80" font-size="62">MyTitle</text>
<path data-rough data-roughness="2.2" d="M878 96 Q1030 106 1180 92" fill="none" stroke="var(--ink)" stroke-width="3"/>
<!-- ✦: reuse this path anywhere (translate it), class="pulse" to animate -->
<path d="M1186 118 l3.5 8.5 8.5 3.5 -8.5 3.5 -3.5 8.5 -3.5 -8.5 -8.5 -3.5 8.5 -3.5 z" fill="var(--ink)"/>
<text class="t-title" x="600" y="360" font-size="30" text-anchor="middle">Every run becomes a better next start</text>
```

### 2. Region panel

```html
<g>
  <rect data-rough data-roughness="1.8" x="240" y="250" width="360" height="170" rx="18"
        fill="#f0f1e0" stroke="var(--ink)" stroke-width="2.2"/>
  <circle data-rough cx="272" cy="278" r="15" fill="var(--ink)" stroke="none"/>
  <text class="t-strong" x="272" y="286" font-size="20" style="fill:var(--paper)" text-anchor="middle">2</text>
  <text class="t-strong" x="435" y="286" font-size="25" text-anchor="middle">Memory Extraction</text>
  <path data-rough d="M258 300 H582" fill="none" stroke="var(--ink)" stroke-width="1.4"/> <!-- optional divider -->
</g>
```

### 3. Cards

```html
<!-- plain card -->
<rect data-rough x="260" y="316" width="150" height="34" rx="8" fill="#faf7eb" stroke="var(--ink)" stroke-width="1.7"/>
<text x="300" y="338" font-size="15">User Messages</text>
<!-- stack: back copies first -->
<rect data-rough x="490" y="303" width="86" height="98" rx="6" fill="#faf7eb" stroke="var(--ink)" stroke-width="1.5"/>
<rect data-rough x="484" y="298" width="86" height="98" rx="6" fill="#faf7eb" stroke="var(--ink)" stroke-width="1.7"/>
<!-- dog-eared document with content lines -->
<path data-rough d="M484 298 h66 l20 20 v78 h-86 z" fill="#faf7eb" stroke="var(--ink)" stroke-width="1.7"/>
<path d="M550 298 v20 h20" fill="none" stroke="var(--ink)" stroke-width="1.7"/>
<line x1="496" y1="340" x2="556" y2="340" stroke="var(--ink)" stroke-width="1.6"/>
<line x1="496" y1="352" x2="548" y2="352" stroke="var(--ink)" stroke-width="1.6"/>
```

### 4. Doodle icons

Draw every icon in place from a few lines, circles and paths, simple enough to draw
with a pen in two seconds. No icon libraries, downloads or generated images.

```html
<!-- stick figure -->
<circle data-rough cx="400" cy="330" r="11" fill="#faf7eb" stroke="var(--ink)" stroke-width="2"/>
<path data-rough d="M384 372 q16 -22 32 0 z" fill="#faf7eb" stroke="var(--ink)" stroke-width="2"/>
<!-- magnifier -->
<circle cx="424" cy="352" r="7" fill="none" stroke="var(--ink)" stroke-width="2"/>
<line x1="429" y1="358" x2="437" y2="366" stroke="var(--ink)" stroke-width="2.4" stroke-linecap="round"/>
<!-- folder -->
<path data-rough d="M700 340 h16 l5 6 h23 v26 h-44 z" fill="#faf7eb" stroke="var(--ink)" stroke-width="1.8"/>
<!-- cardboard box -->
<path data-rough d="M760 350 l30 -8 30 8 v24 l-30 8 -30 -8 z" fill="#e9dac1" stroke="var(--ink)" stroke-width="1.8"/>
<line x1="790" y1="342" x2="790" y2="374" stroke="var(--ink)" stroke-width="1.4"/>
<!-- moon -->
<path d="M900 330 a12 12 0 1 0 10 18 a9 9 0 0 1 -10 -18 z" fill="var(--ink)"/>
<!-- also: gear = circle + short teeth; tick = polyline; cross = two diagonals;
     laptop = screen rect + trapezoid base; robot = rounded head, antenna, dot eyes;
     database = ellipse top + sides + arc bottom -->
```

### 5. Edges

```html
<!-- main flow -->
<path data-rough d="M410 333 Q447 328 486 334" fill="none" stroke="var(--ink)" stroke-width="2" marker-end="url(#arr)"/>
<text x="448" y="320" font-size="14" text-anchor="middle">edge label</text>
<!-- big loop around the outside -->
<path data-rough data-roughness="2" d="M300 760 C120 700 100 260 300 120" fill="none" stroke="var(--ink)" stroke-width="2.2" marker-end="url(#arr)"/>
<!-- weak link -->
<path data-rough d="M900 300 Q780 350 660 310" fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-dasharray="7 6" marker-end="url(#arr)"/>
<!-- branch: two arcs from one start; merge: two arcs into different points of one edge -->
<path data-rough d="M420 330 Q470 300 520 292" fill="none" stroke="var(--ink)" stroke-width="2" marker-end="url(#arr)"/>
<path data-rough d="M420 336 Q470 366 520 374" fill="none" stroke="var(--ink)" stroke-width="2" marker-end="url(#arr)"/>
<!-- orbit: closed ellipse as a conveyor, 2–3 staggered dots on it -->
<path data-rough d="M600 470 a170 90 0 1 0 0.1 0" fill="none" stroke="var(--ink)" stroke-width="2.2"/>
```

### 6. Flow dots

A dot is its own `<circle>` whose `offset-path` is **character for character** its
edge's `d`. Change both together.

```html
<circle class="dot" r="4.5" fill="#5f7a4a" stroke="var(--paper)" stroke-width="2.5"
        style="offset-path: path('M410 333 Q447 328 486 334'); --t: calc(var(--loop) / 3)"/>
```

Template classes: `.d2`, `.d3`, `.dh` offset a dot by a third, two thirds or half of
its own `--t` (stagger dots sharing an edge or orbit); `.rev` runs it backwards on the
same path (two-way flows).

### 7. Micro-motion

Put a template class on an un-roughed element, and delete unused ones from the
template. New ones animate only `transform`, `opacity` or `stroke-dashoffset`.

| Class | Effect | Period |
|---|---|---|
| `.spin` | full turn (gear, moon, ↻) | loop |
| `.tick` | stroke draws in, holds, wipes; draw the tick ≤ 26px long (the keyframe length) | loop |
| `.blink` | on/off (cursor, status light) | loop/4 |
| `.pulse` | scale and tilt (✦) | loop/2 |

### 8. Callout

```html
<rect data-rough x="330" y="430" width="640" height="40" rx="8" fill="#faf7eb" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="4 4"/>
<text class="mono" x="650" y="456" font-size="16" text-anchor="middle">$ command --example</text>
```

## Pitfalls

- `svg text { fill: ink }` beats a `fill` attribute. Non-ink text (stamp digits) needs
  `style="fill:..."`, or it is black on black.
- An animation class on a `data-rough` element is invisible: the rough copy is static.
- Small shapes (r ≤ 8, icon details) blob at roughness 1.8. Use `data-roughness="0.6"`
  or no `data-rough`.
- Edges between regions, and their dots, go after **all** region panels in the file;
  otherwise the next panel's wash covers them.
- SVG collapses repeated spaces; use `·` or separate `<text>` elements to align.
- Handwriting runs wide: labels overflow cards and a fixed-x ✦ hits a long title.
  Check in the preview; keep the title's ✦ clear of the slogan's pair.
