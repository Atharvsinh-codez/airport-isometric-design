// A small polygon-mesh renderer that emits the kit's paths object so solidSvg draws it with the house four-tone style.
import * as k from "./kit/iso-kit.mjs";
import { f2, TAU } from "./draw.mjs";
export const mesh = () => ({ v: [], f: [] });
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export function newell(pts) { let n = [0, 0, 0]; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); } return norm(n); }
function centroid(pts) { const c = [0, 0, 0]; for (const p of pts) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; } return c.map((x) => x / pts.length); }
// add a closed convex-ish part: faces as index lists into `pts`; winding is fixed so normals point away from the part centroid
export function addPart(m, pts, faces, opts = {}) {
  const base = m.v.length; m.v.push(...pts); const c = centroid(pts);
  for (const idx of faces) {
    const poly = idx.map((i) => pts[i]); let n = newell(poly);
    const out = sub(centroid(poly), c);
    const list = (opts.fix !== false && dot(n, out) < 0) ? [...idx].reverse() : idx;
    m.f.push({ i: list.map((i) => i + base), soft: !!opts.soft, cls: opts.cls, open: !!opts.open });
  }
  return m;
}
// loft: sections[] each an array of N points; closes ends with caps when asked
export function loft(m, sections, { caps = true, soft = true, cls } = {}) {
  const N = sections[0].length; const pts = sections.flat(); const faces = [];
  for (let s = 0; s + 1 < sections.length; s++) for (let i = 0; i < N; i++) { const j = (i + 1) % N; faces.push([s * N + i, s * N + j, (s + 1) * N + j, (s + 1) * N + i]); }
  if (caps) { faces.push(Array.from({ length: N }, (_, i) => i)); faces.push(Array.from({ length: N }, (_, i) => (sections.length - 1) * N + i)); }
  return addPart(m, pts, faces, { soft, cls });
}
// prism: polygon (3D points, planar-ish) swept by vector d
export function prism(m, poly, d, opts = {}) {
  const N = poly.length; const pts = [...poly, ...poly.map((p) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]])]; const faces = [Array.from({ length: N }, (_, i) => i), Array.from({ length: N }, (_, i) => N + i)];
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; faces.push([i, j, N + j, N + i]); }
  return addPart(m, pts, faces, opts);
}
// slanted slab: top polygon and bottom polygon given separately (same count)
export function skin(m, top, bottom, opts = {}) {
  const N = top.length; const pts = [...top, ...bottom]; const faces = [Array.from({ length: N }, (_, i) => i), Array.from({ length: N }, (_, i) => N + i)];
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; faces.push([i, j, N + j, N + i]); }
  return addPart(m, pts, faces, opts);
}
export function box(m, cx, cy, cz, lx, ly, lz, opts = {}) {
  const poly = [[cx - lx / 2, cy - ly / 2, cz], [cx + lx / 2, cy - ly / 2, cz], [cx + lx / 2, cy + ly / 2, cz], [cx - lx / 2, cy + ly / 2, cz]];
  return prism(m, poly, [0, 0, lz], opts);
}
export const circleAt = (x, cy, cz, r, n, sy = 1, sz = 1) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return [x, cy + Math.cos(a) * r * sy, cz + Math.sin(a) * r * sz]; });
// a tube along +x from x0 to x1 with radius function r(t) and centre z function cz(t)
export function tubeX(m, x0, x1, stations, r, cz, n = 10, opts = {}) {
  const sections = []; for (let s = 0; s <= stations; s++) { const t = s / stations; const x = x0 + (x1 - x0) * t; sections.push(circleAt(x, opts.cy ?? 0, cz(t), Math.max(0.02, r(t)), n, opts.sy ?? 1, opts.sz ?? 1)); }
  return loft(m, sections, { caps: true, soft: true, cls: opts.cls });
}
export function sphere(m, c, r, n = 8, rows = 5, opts = {}) {
  const sections = []; for (let s = 0; s <= rows; s++) { const ph = -Math.PI / 2 + (Math.PI * s) / rows; const rr = Math.max(0.02, Math.cos(ph) * r); sections.push(Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr, c[2] + Math.sin(ph) * r]; })); }
  return loft(m, sections, { caps: false, soft: true, cls: opts.cls });
}
export function transform(m, fn) { return { v: m.v.map(fn), f: m.f }; }
export const yawPitch = (yaw, pitch = 0, dx = 0, dy = 0, dz = 0) => ([x, y, z]) => {
  const cp = Math.cos(pitch), sp = Math.sin(pitch); const x1 = x * cp + z * sp, z1 = -x * sp + z * cp;   // nose up for positive pitch
  const cy = Math.cos(yaw), sy = Math.sin(yaw); return [x1 * cy - y * sy + dx, x1 * sy + y * cy + dy, z1 + dz];
};
export const scale3 = (s) => ([x, y, z]) => [x * s, y * s, z * s];
// render to the kit paths object (fill, shades[4], top, outline, crease)
export function meshPaths(m, P, { creaseAngle = 0.55 } = {}) {
  const V = [k.depthOf([1, 0, 0], P), k.depthOf([0, 1, 0], P), k.depthOf([0, 0, 1], P)];
  const [vx, vy] = k.towardViewer(P); const light = [-vy, vx];
  const pr = m.v.map((p) => k.iso(p, P).map((c) => Math.round(c * 10) / 10));
  const faces = m.f.map((f) => { const pts = f.i.map((i) => m.v[i]); const n = newell(pts); return { ...f, n, vis: dot(n, V) > 1e-6, d: pts.map((p) => k.depthOf(p, P)).reduce((a, b) => a + b, 0) / pts.length }; });
  const pathOf = (idx) => idx.map((i, j) => (j ? "L" : "M") + pr[i][0] + " " + pr[i][1]).join("") + "Z";
  const shades = ["", "", "", ""]; let top = "", fill = "";
  const order = faces.filter((f) => f.vis).sort((a, b) => a.d - b.d);
  for (const f of order) {
    const d = pathOf(f.i); fill += d;
    if (f.n[2] > 0.62) top += d;
    else { const l = Math.hypot(f.n[0], f.n[1]) || 1; let lit = ((f.n[0] / l) * light[0] + (f.n[1] / l) * light[1] + 1) / 2; if (f.n[2] < -0.25) lit *= 0.35; else if (f.n[2] > 0.25) lit = lit * 0.6 + 0.4; shades[Math.min(3, Math.max(0, Math.floor(lit * 4)))] += d; }
  }
  const edges = new Map();
  faces.forEach((f, fi) => { for (let j = 0; j < f.i.length; j++) { const a = f.i[j], b = f.i[(j + 1) % f.i.length]; const key = a < b ? a + ":" + b : b + ":" + a; (edges.get(key) || edges.set(key, []).get(key)).push(fi); } });
  let outline = "", crease = "";
  for (const [key, list] of edges) {
    const [a, b] = key.split(":").map(Number); const seg = `M${pr[a][0]} ${pr[a][1]}L${pr[b][0]} ${pr[b][1]}`;
    const vis = list.filter((i) => faces[i].vis);
    if (list.length === 1) { if (vis.length) outline += seg; continue; }
    if (vis.length === 1) outline += seg;
    else if (vis.length >= 2 && !(faces[list[0]].soft && faces[list[1]].soft && dot(faces[list[0]].n, faces[list[1]].n) > 0.3) && dot(faces[list[0]].n, faces[list[1]].n) < Math.cos(creaseAngle)) crease += seg;
  }
  return { fill, shades, top, outline, crease };
}
// flat ground shadow of a mesh: hull of the plan points
export function shadowPath(m, P, z = 0) {
  const pts = m.v.map(([x, y]) => [x, y]); const hull = hull2(pts);
  return hull.map((p, i) => (i ? "L" : "M") + k.iso([p[0], p[1], z], P).map(f2).join(" ")).join("") + "Z";
}
export function hull2(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (pts.length < 3) return pts;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = []; for (const p of pts) { while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  const upper = []; for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
