// Shared drawing helpers: a tiny context around the kit for one projection P.
import * as k from "./kit/iso-kit.mjs";
export const TAU = Math.PI * 2;
export const rot2 = ([x, y], a, cx = 0, cy = 0) => { const c = Math.cos(a), s = Math.sin(a); return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; };
export const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
export const f2 = (n) => (Math.round(n * 100) / 100).toString();
export function ctx(P) {
  const at = (p) => k.iso(p, P);
  const depth = (p) => k.depthOf(p, P);
  const S = (paths, style = {}) => k.solidSvg(paths, style);
  const L = (d, style = {}) => k.lineSvg(d, style);
  const slab = (plan, z, h, style = {}, steps = 4, bevel = 0) => S(Array.isArray(plan) ? k.extrude(plan, z, h, P, { convex: true, bevel }) : k.slabOf(plan, z, h, P, steps, bevel), style);
  const box = (x0, y0, x1, y1, z, h, style = {}, bevel = 0) => bevel ? slab({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: bevel }, z, h, style, 4, 0) : slab(rect(x0, y0, x1, y1), z, h, style, 4, 0);
  const cyl = (cx, cy, r, z, h, style = {}, steps = 24, bevel = 0) => S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), style);
  const line3 = (pts, style = {}) => L(pts.map((p, i) => (i ? "L" : "M") + at(p).map(f2).join(" ")).join(""), style);
  const poly = (pts, style = {}) => L(pts.map((p, i) => (i ? "L" : "M") + at(p).map(f2).join(" ")).join("") + "Z", style);
  const outline = (plan, z, style = {}) => L(k.planOutline(plan, z, P, 4), style);
  const ringL = (cx, cy, r, z, style = {}, steps = 40) => L(k.ring(cx, cy, r, z, P, steps), style);
  // paint on the ground: a stroked path in world coords (z slightly above the surface)
  const paint = (pts, cls = "ab-paint", z = 0.08, closed = false) => `<path class="${cls}" d="${pts.map((p, i) => (i ? "L" : "M") + at([p[0], p[1], p[2] ?? z]).map(f2).join(" ")).join("")}${closed ? "Z" : ""}"/>`;
  const dash = (a, b, len, gap, cls, z = 0.08) => { const out = []; const dx = b[0] - a[0], dy = b[1] - a[1]; const n = Math.hypot(dx, dy); for (let s = 0; s + len <= n + 1e-6; s += len + gap) { const t0 = s / n, t1 = (s + len) / n; out.push(paint([[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]], cls, z)); } return out.join(""); };
  // text lying on the floor plane, rotated by `a` radians, anchored at (x,y)
  const floorText = (x, y, z, a, text, size = 4, anchor = "middle", cls = "") => {
    const o = at([x, y, z]); const ex = at([x + Math.cos(a), y + Math.sin(a), z]); const ey = at([x - Math.sin(a), y + Math.cos(a), z]);
    return `<text class="iso-face-text ${cls}" data-tone="mid" transform="matrix(${f2(ex[0] - o[0])} ${f2(ex[1] - o[1])} ${f2(ey[0] - o[0])} ${f2(ey[1] - o[1])} ${f2(o[0])} ${f2(o[1])})" font-size="${size}" text-anchor="${anchor}" dominant-baseline="middle">${text}</text>`;
  };
  const dot = (p, r, cls) => { const q = at(p); return `<circle class="${cls}" cx="${f2(q[0])}" cy="${f2(q[1])}" r="${r}"/>`; };
  const translate = (p) => { const q = at(p); return `translate(${f2(q[0])} ${f2(q[1])})`; };
  return { P, k, at, depth, S, L, slab, box, cyl, line3, poly, outline, ringL, paint, dash, floorText, dot, translate };
}
// A sortable item list: items paint far → near (ascending depth key).
export function bucket() {
  const items = [];
  return {
    items,
    put(name, p, svg, bias = 0) { if (!svg) return; items.push({ name, key: (Array.isArray(p) ? p : [0, 0, 0]), svg, bias }); },
    render(depth) { const list = items.map((it) => ({ ...it, d: depth(it.key) + it.bias })).sort((a, b) => a.d - b.d); return list.map((it) => `<g data-part="${it.name}" data-k="${f2(it.d)}">${it.svg}</g>`).join(""); },
  };
}
