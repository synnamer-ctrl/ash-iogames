// Little Wonder World — illustration toolkit.
//
// Every asset in the game is authored with these helpers so the whole world
// shares one art bible: organic outlines (jittered, smoothed polygons), a
// warm pastel palette, a painted shade crescent, colored-pencil hatching,
// soft highlights and a slightly "sketchy" double ink line. Everything is
// deterministic: the same seed always produces the same drawing.

export const P = {
  cream: '#FFF7E8',
  paper: '#F7ECD6',
  paperDeep: '#EBDDBF',
  sky: '#9EDDF5',
  skyLight: '#CDEFFB',
  skyDeep: '#7CC6E6',
  leaf: '#9BCF8A',
  leafDeep: '#72B26C',
  leafDark: '#5A9A5E',
  grass: '#B9DD93',
  grassLight: '#D2EAAE',
  sun: '#FFD66B',
  sunDeep: '#F7B84B',
  coral: '#F58F83',
  coralDeep: '#E2706A',
  pink: '#F9BCC8',
  lavender: '#C5B5F0',
  lavDeep: '#A391DD',
  ink: '#38454A',
  inkSoft: '#5B6A6F',
  wood: '#DDAE74',
  woodDeep: '#B9844F',
  woodDark: '#8F6340',
  teal: '#86D3C6',
  tealDeep: '#5DB5A8',
  water: '#93D5EA',
  waterDeep: '#6BBAD7',
  stone: '#CFC8BA',
  stoneDeep: '#A9A193',
  brick: '#EDA987',
  white: '#FFFDF7',
  peach: '#FFC9A3',
  skin1: '#F6CDAA',
  skin2: '#D39A6F',
  skin3: '#9A6545',
  orange: '#F9A85A',
  mint: '#BFE8C9',
  night: '#4B5C86',
};

// Line weights (in world pixels — assets are authored 1:1 with the world).
export const LINE = { main: 3.4, detail: 2.4, fine: 1.6 };

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => (Math.round(n * 10) / 10).toString();

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
/** Darken toward a warm ink rather than black, so shadows stay friendly. */
export function darken(hex, amt = 0.14) {
  const [r, g, b] = hexToRgb(hex);
  const [ir, ig, ib] = [70, 60, 90];
  return rgbToHex([r + (ir - r) * amt, g + (ig - g) * amt, b + (ib - b) * amt]);
}
export function lighten(hex, amt = 0.3) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r + (255 - r) * amt, g + (253 - g) * amt, b + (247 - b) * amt]);
}

/** Catmull-Rom spline through points, emitted as cubic Béziers. */
export function smoothPath(pts, closed = true, tension = 1) {
  if (pts.length < 2) return '';
  const n = pts.length;
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}

function bboxOf(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** A drawing context for one SVG file. */
export class Ctx {
  constructor(key) {
    this.key = key;
    this.r = rng(hashSeed(key));
    this.n = 0;
    this.defs = [];
  }
  uid(p = 'i') {
    this.n += 1;
    return `${p}${this.n}`;
  }
  rand(a = 0, b = 1) {
    return a + (b - a) * this.r();
  }
  jit(j) {
    return (this.r() * 2 - 1) * j;
  }

  /** Organic ellipse-ish blob. */
  blob(cx, cy, rx, ry, { n = 12, j = 0.045, rot = 0 } = {}) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      const k = 1 + this.jit(j);
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return { d: smoothPath(pts), pts, bbox: bboxOf(pts) };
  }

  /** Rounded polygon with gently wobbling edges. */
  poly(verts, { r = 10, step = 28, j = 1.1, rr = null } = {}) {
    const pts = [];
    const n = verts.length;
    const corner = [];
    for (let i = 0; i < n; i++) {
      const v = verts[i], pv = verts[(i - 1 + n) % n], nv = verts[(i + 1) % n];
      const lp = Math.hypot(pv[0] - v[0], pv[1] - v[1]);
      const ln = Math.hypot(nv[0] - v[0], nv[1] - v[1]);
      const rad = Math.min(rr ? rr[i] : r, lp / 2.2, ln / 2.2);
      const a = [v[0] + ((pv[0] - v[0]) / lp) * rad, v[1] + ((pv[1] - v[1]) / lp) * rad];
      const b = [v[0] + ((nv[0] - v[0]) / ln) * rad, v[1] + ((nv[1] - v[1]) / ln) * rad];
      corner.push({ a, b, v });
    }
    for (let i = 0; i < n; i++) {
      const { a, b, v } = corner[i];
      const q = (t) => [
        (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * v[0] + t * t * b[0],
        (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * v[1] + t * t * b[1],
      ];
      pts.push(a, q(0.5), b);
      const nb = corner[(i + 1) % n].a;
      const len = Math.hypot(nb[0] - b[0], nb[1] - b[1]);
      const steps = Math.floor(len / step);
      const nx = -(nb[1] - b[1]) / (len || 1), ny = (nb[0] - b[0]) / (len || 1);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const off = this.jit(j);
        pts.push([b[0] + (nb[0] - b[0]) * t + nx * off, b[1] + (nb[1] - b[1]) * t + ny * off]);
      }
    }
    return { d: smoothPath(pts), pts, bbox: bboxOf(pts) };
  }

  rect(x, y, w, h, r = 10, j = 1.1) {
    return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { r, j });
  }

  /** Wobbly open line through points. */
  line(points, { j = 0.8, step = 22 } = {}) {
    const pts = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const steps = Math.max(1, Math.floor(len / step));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const off = s === 0 ? 0 : this.jit(j);
        const nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1);
        pts.push([a[0] + (b[0] - a[0]) * t + nx * off, a[1] + (b[1] - a[1]) * t + ny * off]);
      }
    }
    pts.push(points[points.length - 1]);
    return { d: smoothPath(pts, false), pts, bbox: bboxOf(pts) };
  }

  /** Colored-pencil texture strokes inside a bbox (to be clipped by caller). */
  pencil(bbox, { color = '#fff', opacity = 0.22, density = 1, angle = -35, width = 1.5 } = {}) {
    const area = bbox.w * bbox.h;
    const count = Math.min(70, Math.max(3, Math.round((area / 700) * density)));
    let s = '';
    for (let i = 0; i < count; i++) {
      const x = bbox.x + this.r() * bbox.w;
      const y = bbox.y + this.r() * bbox.h;
      const len = 8 + this.r() * 18;
      const a = ((angle + this.jit(9)) * Math.PI) / 180;
      const dx = Math.cos(a) * len, dy = Math.sin(a) * len;
      s += `<path d="M${f(x)} ${f(y)}q${f(dx / 2 + this.jit(2))} ${f(dy / 2 + this.jit(2))} ${f(dx)} ${f(dy)}" stroke="${color}" stroke-width="${f(width * (0.7 + this.r() * 0.6))}" stroke-linecap="round" fill="none" opacity="${f(opacity * (0.5 + this.r()))}"/>`;
    }
    return s;
  }

  /**
   * Paint a filled shape in the house style.
   * shape: {d, bbox}; returns SVG markup.
   */
  paint(shape, fill, o = {}) {
    const { d, bbox } = shape;
    const id = this.uid('c');
    const shade = o.shade ?? darken(fill, 0.16);
    const sw = o.sw ?? LINE.main;
    const sx = o.shadeOff?.[0] ?? Math.min(7, Math.max(2.5, bbox.w * 0.05));
    const sy = o.shadeOff?.[1] ?? Math.min(9, Math.max(3, bbox.h * 0.06));
    const tex = o.texture === false ? '' : this.pencil(bbox, { color: o.pencilColor ?? '#ffffff', opacity: o.pencilOpacity ?? 0.2, density: o.density ?? 1 });
    // watercolour pooled edge: pigment gathers just inside the outline
    const poolW = Math.max(3, Math.min(10, Math.min(bbox.w, bbox.h) * 0.07));
    const pool = o.pool === false ? '' : `<path d="${d}" fill="none" stroke="${darken(fill, 0.22)}" stroke-width="${f(poolW)}" opacity="0.32" transform="translate(${f(-sx)} ${f(-sy)})"/>`;
    const dark = o.texture === false ? '' : this.pencil(
      { x: bbox.x + bbox.w * 0.45, y: bbox.y + bbox.h * 0.5, w: bbox.w * 0.55, h: bbox.h * 0.5 },
      { color: P.ink, opacity: 0.05, density: 0.6 },
    );
    const hl = o.highlight === false ? '' : `<ellipse cx="${f(bbox.x + bbox.w * 0.3)}" cy="${f(bbox.y + bbox.h * 0.24)}" rx="${f(bbox.w * 0.16)}" ry="${f(bbox.h * 0.1)}" fill="#fff" opacity="${o.hlOpacity ?? 0.28}" transform="rotate(-18 ${f(bbox.x + bbox.w * 0.3)} ${f(bbox.y + bbox.h * 0.24)})"/>`;
    const stroke = o.stroke === false ? '' :
      `<path d="${d}" fill="none" stroke="${o.strokeColor ?? P.ink}" stroke-width="${f(sw)}" stroke-linejoin="round" stroke-linecap="round" opacity="${o.strokeOpacity ?? 0.92}"/>` +
      (o.sketch === false ? '' : `<path d="${d}" fill="none" stroke="${o.strokeColor ?? P.ink}" stroke-width="${f(sw * 0.4)}" stroke-linejoin="round" opacity="0.28" transform="translate(${f(this.jit(1.2))} ${f(this.jit(1.2))})"/>`);
    return `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
      `<path d="${d}" fill="${shade}"/>` +
      `<g clip-path="url(#${id})"><path d="${d}" fill="${fill}" transform="translate(${f(-sx)} ${f(-sy)})"/>${pool}${tex}${dark}${hl}${o.inner ?? ''}</g>` +
      stroke;
  }

  /** Plain ink stroke line (open path). */
  ink(shapeOrD, { w = LINE.detail, color = P.ink, opacity = 0.92, fill = 'none' } = {}) {
    const d = typeof shapeOrD === 'string' ? shapeOrD : shapeOrD.d;
    return `<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;
  }

  /** Flat fill, no outline (for details & patterns). */
  flat(shapeOrD, fill, opacity = 1) {
    const d = typeof shapeOrD === 'string' ? shapeOrD : shapeOrD.d;
    return `<path d="${d}" fill="${fill}" opacity="${opacity}"/>`;
  }

  groundShadow(cx, cy, rx, ry, opacity = 0.13) {
    return this.flat(this.blob(cx, cy, rx, ry, { n: 10, j: 0.03 }), P.ink, opacity);
  }

  /** Friendly face: two eyes, cheeks, smile. */
  face(cx, cy, s = 1, { smile = true, cheeks = true, eyes = 'open', mouth = 'smile' } = {}) {
    const ex = 11 * s, ey = 0;
    let out = '';
    if (eyes === 'open') {
      for (const sx of [-1, 1]) {
        out += `<ellipse cx="${f(cx + sx * ex)}" cy="${f(cy + ey)}" rx="${f(3.6 * s)}" ry="${f(4.6 * s)}" fill="${P.ink}"/>`;
        out += `<circle cx="${f(cx + sx * ex + 1.2 * s)}" cy="${f(cy + ey - 1.6 * s)}" r="${f(1.3 * s)}" fill="#fff"/>`;
      }
    } else if (eyes === 'closed') {
      for (const sx of [-1, 1]) {
        out += this.ink(`M${f(cx + sx * ex - 4 * s)} ${f(cy)} q${f(4 * s)} ${f(3.5 * s)} ${f(8 * s)} 0`, { w: 2.2 * s });
      }
    } else if (eyes === 'happy') {
      for (const sx of [-1, 1]) {
        out += this.ink(`M${f(cx + sx * ex - 4 * s)} ${f(cy + 1)} q${f(4 * s)} ${f(-5 * s)} ${f(8 * s)} 0`, { w: 2.2 * s });
      }
    }
    if (cheeks) {
      for (const sx of [-1, 1]) {
        out += `<ellipse cx="${f(cx + sx * ex * 1.65)}" cy="${f(cy + 7 * s)}" rx="${f(4.8 * s)}" ry="${f(3 * s)}" fill="${P.coral}" opacity="0.45"/>`;
      }
    }
    if (smile) {
      if (mouth === 'smile') out += this.ink(`M${f(cx - 5 * s)} ${f(cy + 8 * s)} q${f(5 * s)} ${f(5 * s)} ${f(10 * s)} 0`, { w: 2.2 * s });
      else if (mouth === 'o') out += `<ellipse cx="${f(cx)}" cy="${f(cy + 10 * s)}" rx="${f(3.2 * s)}" ry="${f(4 * s)}" fill="${P.ink}"/>`;
      else if (mouth === 'grin') out += this.paint(this.blob(cx, cy + 10 * s, 6 * s, 4.2 * s, { n: 8, j: 0.02 }), P.coralDeep, { sw: 2 * s, texture: false, highlight: false, sketch: false });
    }
    return out;
  }

  /** Small sparkle accent (decorative crayon tick). */
  sparkle(cx, cy, s = 8, color = P.white, opacity = 0.9) {
    return this.ink(`M${f(cx)} ${f(cy - s)}L${f(cx)} ${f(cy + s)}M${f(cx - s)} ${f(cy)}L${f(cx + s)} ${f(cy)}`, { w: 2.4, color, opacity });
  }

  star(cx, cy, ro, ri, points = 5, rot = -Math.PI / 2) {
    const v = [];
    for (let i = 0; i < points * 2; i++) {
      const rad = i % 2 === 0 ? ro : ri;
      const a = rot + (i * Math.PI) / points;
      v.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    return this.poly(v, { r: ro * 0.12, j: 0.4, step: 40 });
  }

  /**
   * A pen-like stroke: a filled outline whose width swells and tapers along the
   * path (like real pressure), with per-point wobble. `pts` are [x, y] pairs.
   */
  pen(pts, { w = 3, color = P.inkSoft, opacity = 0.8, taper = 0.45, wobble = 0.5, overshoot = 0 } = {}) {
    if (pts.length < 2) return '';
    // optional overshoot: extend both ends a little past the drawn line
    let p = pts.map(([x, y]) => [x + this.jit(wobble), y + this.jit(wobble)]);
    if (overshoot) {
      const [a, b] = [p[0], p[1]], [c, d] = [p[p.length - 2], p[p.length - 1]];
      const ex = (a[0] - b[0]) * overshoot, ey = (a[1] - b[1]) * overshoot;
      const fx = (d[0] - c[0]) * overshoot, fy = (d[1] - c[1]) * overshoot;
      p = [[a[0] + ex, a[1] + ey], ...p, [d[0] + fx, d[1] + fy]];
    }
    const n = p.length;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const prev = p[Math.max(0, i - 1)], next = p[Math.min(n - 1, i + 1)];
      let tx = next[0] - prev[0], ty = next[1] - prev[1];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l; ty /= l;
      // pressure: fat in the middle, thin at both ends, with a little random bite
      const t = n === 1 ? 0.5 : i / (n - 1);
      const press = 1 - taper + taper * Math.sin(Math.PI * t) ** 0.6;
      const hw = (w / 2) * press * (0.85 + this.r() * 0.3);
      left.push([p[i][0] - ty * hw, p[i][1] + tx * hw]);
      right.push([p[i][0] + ty * hw, p[i][1] - tx * hw]);
    }
    const outline = [...left, ...right.reverse()];
    const d = smoothPath(outline, true, 0.6);
    return `<path d="${d}" fill="${color}" opacity="${opacity}"/>`;
  }

  /** Sample a closed or open shape into a wobbly polyline for pen(). */
  penPath(points, { closed = false, steps = 6 } = {}) {
    const out = [];
    const n = points.length;
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = points[i], b = points[(i + 1) % n];
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    if (!closed) out.push(points[n - 1]);
    else out.push(out[0]);
    return out;
  }

  /**
   * Hand-drawn doodle marks, built from pen() strokes so they have pressure,
   * overshoot and a second, lighter pass like real doodling.
   */
  doodle(kind, x, y, s = 1, { color = P.inkSoft, w = 3, opacity = 0.7, rot = 0 } = {}) {
    let strokes = [];
    const pass = (pts, o = {}) => strokes.push(this.pen(pts, { w, color, opacity, overshoot: 0.08, ...o }));
    switch (kind) {
      case 'squiggle': {
        const pts = [];
        for (let i = 0; i <= 40; i++) pts.push([-44 * s + i * (88 * s / 40), Math.sin(i / 3.5) * 7 * s]);
        pass(pts, { wobble: 0.8 });
        break;
      }
      case 'spiral': {
        const pts = [];
        for (let i = 0; i <= 52; i++) {
          const a = i * 0.42 + this.jit(0.05), r = (1.6 + 0.9 * a) * s;
          pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.92]);
        }
        pass(pts, { wobble: 0.6, taper: 0.7 });
        break;
      }
      case 'arrow': {
        pass([[-30 * s, 2 * s], [-2 * s, -2 * s], [30 * s, -4 * s]], { wobble: 0.7 });
        pass([[30 * s, -4 * s], [18 * s, -13 * s]], { wobble: 0.5 });
        pass([[30 * s, -4 * s], [20 * s, 8 * s]], { wobble: 0.5 });
        break;
      }
      case 'loop': {
        const pts = [];
        for (let i = 0; i <= 30; i++) {
          const a = (i / 30) * Math.PI * 2 * 1.08;
          pts.push([Math.cos(a) * 24 * s, Math.sin(a) * 13 * s - 2 * s]);
        }
        pass(pts, { wobble: 0.9, taper: 0.5 });
        break;
      }
      default:
        break;
    }
    // a faint second pass, offset, makes the line look re-traced by hand
    const first = strokes.join('');
    const second = `<g transform="translate(${f(this.jit(1.4))} ${f(this.jit(1.4))}) scale(${f(1 + this.jit(0.03))})" opacity="0.45">${strokes.join('').replace(/opacity="[^"]+"/g, '')}</g>`;
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">${second}${first}</g>`;
  }

  heart(cx, cy, s) {
    const pts = [];
    for (let i = 0; i < 28; i++) {
      const t = (i / 28) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push([cx + (x / 17) * s + this.jit(0.4), cy + (y / 17) * s + this.jit(0.4)]);
    }
    return { d: smoothPath(pts), pts, bbox: bboxOf(pts) };
  }
}

export function svgDoc(w, h, body, { defs = '' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    (defs ? `<defs>${defs}</defs>` : '') + body + `</svg>\n`;
}

/** Paper grain filter used by backgrounds and cards. */
export function paperGrainDefs(id = 'grain', opacity = 0.09) {
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0 0.15  0 0 0 ${opacity} 0"/></filter>`;
}

export const fmt = f;
