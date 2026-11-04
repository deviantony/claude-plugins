// sketchify.js — replace SVG elements marked with data-rough by rough.js hand-drawn versions.
// Supports rect (including rx), line, circle, ellipse and path. The original element is kept
// (stroke hidden) so marker arrowheads and offset-path references keep working.
// From OLDyade/animated-sketch-diagram (MIT, (c) 2026 animated-sketch-diagram contributors),
// commit cfc0061; only the comments were translated.
function sketchify(root = document) {
  root.querySelectorAll('svg').forEach(svg => {
    const rc = rough.svg(svg);
    let seed = 7; // fixed seed: same wobble on every load, so GIF frames don't flicker
    svg.querySelectorAll('[data-rough]').forEach(el => {
      const attr = n => el.getAttribute(n);
      const stroke = attr('stroke') || 'none';
      const fill = attr('fill');
      const o = {
        roughness: +(el.dataset.roughness || 1.1),
        bowing: 0.9,
        seed: seed++,
        stroke,
        strokeWidth: +(attr('stroke-width') || 1.5),
        fill: fill && fill !== 'none' ? fill : undefined,
        fillStyle: 'solid',
        strokeLineDash: (attr('stroke-dasharray') || '').split(/[ ,]+/).filter(Boolean).map(Number),
      };
      const num = n => +attr(n);
      let node;
      switch (el.tagName) {
        case 'rect': {
          const x = num('x'), y = num('y'), w = num('width'), h = num('height');
          const r = Math.min(num('rx') || 0, w / 2, h / 2);
          node = r > 0
            ? rc.path(`M${x + r} ${y} h${w - 2 * r} a${r} ${r} 0 0 1 ${r} ${r} v${h - 2 * r} a${r} ${r} 0 0 1 -${r} ${r} h${-(w - 2 * r)} a${r} ${r} 0 0 1 -${r} -${r} v${-(h - 2 * r)} a${r} ${r} 0 0 1 ${r} -${r} z`, o)
            : rc.rectangle(x, y, w, h, o);
          break;
        }
        case 'line': node = rc.line(num('x1'), num('y1'), num('x2'), num('y2'), o); break;
        case 'circle': node = rc.circle(num('cx'), num('cy'), 2 * num('r'), o); break;
        case 'ellipse': node = rc.ellipse(num('cx'), num('cy'), 2 * num('rx'), 2 * num('ry'), o); break;
        case 'path': node = rc.path(attr('d'), o); break;
        default: return;
      }
      el.parentNode.insertBefore(node, el); // original stays on top: marker arrowheads draw over the hand-drawn line
      el.setAttribute('fill', 'none');
      el.setAttribute('stroke', 'transparent'); // transparent, not none: markers still render
    });
  });
}
