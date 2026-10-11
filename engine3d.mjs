// Real-time 3D for the ink style: a model is a list of convex parts. Each frame the parts are posed, back faces culled,
// faces toned by facing, and the parts painted in an order fixed by separating planes between every pair (found once
// per model, in the body frame), so the drawing stays correct at any heading, pitch, bank and camera.

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len3 = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const v3 = { sub, dot, cross, norm, len3 };
const f1 = (n) => { const r = Math.round(n * 10) / 10; return r === 0 ? "0" : String(r); };

// ---------- geometry builders (all return { v, f } with faces as index loops) ----------

// Incremental convex hull. Coplanar triangles are merged back into polygons so boxes keep quad faces.
export function hull(input) {
  const pts = []; const seen = new Set();
  for (const p of input) { const key = `${Math.round(p[0] * 1e4)},${Math.round(p[1] * 1e4)},${Math.round(p[2] * 1e4)}`; if (!seen.has(key)) { seen.add(key); pts.push(p); } }
  if (pts.length < 4) throw new Error("hull needs 4 points");
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p[a]); hi[a] = Math.max(hi[a], p[a]); }
  const tol = len3(sub(hi, lo)) * 1e-7;
  let i0 = 0, i1 = 0;
  for (let i = 0; i < pts.length; i++) { if (pts[i][0] < pts[i0][0]) i0 = i; if (pts[i][0] > pts[i1][0]) i1 = i; }
  if (i0 === i1) i1 = pts.findIndex((_, i) => i !== i0);
  const dirL = norm(sub(pts[i1], pts[i0]));
  let i2 = -1, best = -1;
  for (let i = 0; i < pts.length; i++) { const w = sub(pts[i], pts[i0]); const d = len3(cross(w, dirL)); if (d > best) { best = d; i2 = i; } }
  const nP = norm(cross(sub(pts[i1], pts[i0]), sub(pts[i2], pts[i0])));
  let i3 = -1; best = -1;
  for (let i = 0; i < pts.length; i++) { const d = Math.abs(dot(sub(pts[i], pts[i0]), nP)); if (d > best) { best = d; i3 = i; } }
  if (best <= tol) throw new Error("hull is flat");
  const C = [0, 1, 2].map((a) => (pts[i0][a] + pts[i1][a] + pts[i2][a] + pts[i3][a]) / 4);
  const faces = [];
  const make = (a, b, c) => {
    let n = cross(sub(pts[b], pts[a]), sub(pts[c], pts[a]));
    if (dot(n, sub(C, pts[a])) > 0) { [b, c] = [c, b]; n = cross(sub(pts[b], pts[a]), sub(pts[c], pts[a])); }
    n = norm(n); faces.push({ a, b, c, n, d: dot(n, pts[a]), alive: true });
  };
  make(i0, i1, i2); make(i0, i1, i3); make(i0, i2, i3); make(i1, i2, i3);
  const used = new Set([i0, i1, i2, i3]);
  for (let p = 0; p < pts.length; p++) {
    if (used.has(p)) continue;
    const P = pts[p]; const vis = [];
    for (const f of faces) if (f.alive && dot(f.n, P) - f.d > tol) vis.push(f);
    if (!vis.length) continue;
    const edges = new Set();
    for (const f of vis) { f.alive = false; edges.add(f.a + ">" + f.b); edges.add(f.b + ">" + f.c); edges.add(f.c + ">" + f.a); }
    for (const e of edges) { const [a, b] = e.split(">").map(Number); if (!edges.has(b + ">" + a)) {
      const n = norm(cross(sub(pts[b], pts[a]), sub(P, pts[a]))); faces.push({ a, b, c: p, n, d: dot(n, pts[a]), alive: true }); } }
    for (let i = faces.length - 1; i >= 0; i--) if (!faces[i].alive) faces.splice(i, 1);
  }
  // merge coplanar neighbours
  const tris = faces; const parent = tris.map((_, i) => i); const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const edgeOwner = new Map();
  tris.forEach((t, i) => { for (const [a, b] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) edgeOwner.set(a + ">" + b, i); });
  tris.forEach((t, i) => { for (const [a, b] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) { const j = edgeOwner.get(b + ">" + a); if (j !== undefined && dot(t.n, tris[j].n) > 1 - 1e-7 && Math.abs(t.d - tris[j].d) < tol * 10) parent[find(i)] = find(j); } });
  const groups = new Map(); tris.forEach((t, i) => { const r = find(i); (groups.get(r) || groups.set(r, []).get(r)).push(t); });
  const map = new Map(); const v = []; const idx = (i) => { if (!map.has(i)) { map.set(i, v.length); v.push(pts[i]); } return map.get(i); };
  const f = [];
  for (const list of groups.values()) {
    const next = new Map(); const count = new Map();
    for (const t of list) for (const [a, b] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) { const k = a + ">" + b; count.set(k, 1); }
    for (const t of list) for (const [a, b] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) if (!count.has(b + ">" + a)) next.set(a, b);
    const start = next.keys().next().value; const loop = [start]; let cur = next.get(start); let guard = 0;
    while (cur !== start && guard++ < 10000) { loop.push(cur); cur = next.get(cur); }
    // drop collinear vertices
    const clean = loop.filter((q, i) => { const a = pts[loop[(i + loop.length - 1) % loop.length]], b = pts[q], c = pts[loop[(i + 1) % loop.length]]; return len3(cross(sub(b, a), sub(c, b))) > tol * len3(sub(c, a)) * 10; });
    f.push((clean.length >= 3 ? clean : loop).map(idx));
  }
  return { v, f };
}

// A loft through sections of equal point count. Correct for sections that keep the solid convex (fuselages, nacelles).
export function loft(sections, { caps = true } = {}) {
  const N = sections[0].length; const v = sections.flat(); const f = [];
  for (let s = 0; s + 1 < sections.length; s++) for (let i = 0; i < N; i++) { const j = (i + 1) % N; f.push([s * N + i, s * N + j, (s + 1) * N + j, (s + 1) * N + i]); }
  if (caps) { f.push(Array.from({ length: N }, (_, i) => i)); f.push(Array.from({ length: N }, (_, i) => (sections.length - 1) * N + i)); }
  return weld({ v, f });
}
// merge coincident vertices (a section that collapses to a point) and drop degenerate faces
function weld(m) {
  const key = (p) => `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)},${Math.round(p[2] * 1e5)}`;
  const map = new Map(); const v = []; const remap = m.v.map((p) => { const k = key(p); if (!map.has(k)) { map.set(k, v.length); v.push(p); } return map.get(k); });
  const f = [];
  for (const face of m.f) { const out = []; for (const i of face) { const r = remap[i]; if (out[out.length - 1] !== r) out.push(r); } if (out.length > 1 && out[0] === out[out.length - 1]) out.pop(); if (out.length >= 3) f.push(out); }
  return { v, f };
}
// a frame along an axis: returns a function (s, a, b) -> point at s along axis, a along u, b along w
export function frame(origin, axis) {
  const A = norm(axis); const ref = Math.abs(A[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const U = norm(cross(ref, A)); const W = cross(A, U);
  return (s, a, b) => [origin[0] + A[0] * s + U[0] * a + W[0] * b, origin[1] + A[1] * s + U[1] * a + W[1] * b, origin[2] + A[2] * s + U[2] * a + W[2] * b];
}
// a solid of revolution: profile [[s, r], ...] along axis from origin, n sides. r=0 ends collapse to a point.
export function revolve(origin, axis, profile, n = 16, { squash = 1, phase = 0 } = {}) {
  const F = frame(origin, axis);
  const sections = profile.map(([s, r]) => Array.from({ length: n }, (_, i) => { const q = phase + (i / n) * Math.PI * 2; return F(s, Math.cos(q) * r, Math.sin(q) * r * squash); }));
  return loft(sections);
}
export function cylinder(a, b, r, n = 12) { const ax = sub(b, a); return revolve(a, ax, [[0, r], [len3(ax), r]], n); }
export function box(cx, cy, cz, lx, ly, lz) {
  const x0 = cx - lx / 2, x1 = cx + lx / 2, y0 = cy - ly / 2, y1 = cy + ly / 2, z1 = cz + lz;
  return { v: [[x0, y0, cz], [x1, y0, cz], [x1, y1, cz], [x0, y1, cz], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], f: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]] };
}

// ---------- parts and models ----------

function newell(pts) { const n = [0, 0, 0]; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); } return norm(n); }

// name, mesh {v,f}; opts: cls (theme class), group (explode group), dir (explode direction), decals, crease (cos), gear (hinge point)
export function part(name, mesh, opts = {}) {
  const v = mesh.v; const c = [0, 0, 0]; for (const p of v) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; } c[0] /= v.length; c[1] /= v.length; c[2] /= v.length;
  const faces = mesh.f.map((idx) => {
    let list = idx; let n = newell(idx.map((i) => v[i]));
    const fc = idx.reduce((s, i) => [s[0] + v[i][0] / idx.length, s[1] + v[i][1] / idx.length, s[2] + v[i][2] / idx.length], [0, 0, 0]);
    if (dot(n, sub(fc, c)) < 0) { list = [...idx].reverse(); n = [-n[0], -n[1], -n[2]]; }
    return { i: list, n, d: dot(n, v[list[0]]), cls: opts.faceCls ? opts.faceCls(fc, n) || "" : "", seam: opts.seam ? !!opts.seam(fc, n) : false };
  });
  const emap = new Map();
  faces.forEach((f, fi) => { for (let j = 0; j < f.i.length; j++) { const a = f.i[j], b = f.i[(j + 1) % f.i.length]; const k = a < b ? a * 65536 + b : b * 65536 + a; const e = emap.get(k); if (e) e.push(fi); else emap.set(k, [Math.min(a, b), Math.max(a, b), fi]); } });
  const edges = [...emap.values()].map((e) => [e[0], e[1], e[2], e[3] ?? -1]);
  let r = 0; for (const p of v) r = Math.max(r, len3(sub(p, c)));
  return { name, v, faces, edges, c, r, cls: opts.cls ?? "", group: opts.group ?? "body", dir: opts.dir ?? null, decals: opts.decals ?? [], crease: opts.crease ?? 0.82, gear: opts.gear ?? null, shadow: opts.shadow !== false, tone: opts.tone ?? "hi", info: opts.info ?? name };
}

// best separating direction u for a pair (i before j when the viewer is on u's side means j is nearer)
const DIRS = (() => { const out = []; for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) if (x || y || z) out.push(norm([x, y, z])); return out; })();
function span(part, u) { let lo = Infinity, hi = -Infinity; for (const p of part.v) { const s = p[0] * u[0] + p[1] * u[1] + p[2] * u[2]; if (s < lo) lo = s; if (s > hi) hi = s; } return [lo, hi]; }
function separate(A, B) {
  let bestU = norm(sub(B.c, A.c)), bestG = -Infinity;
  const tryU = (u) => { const [al, ah] = span(A, u), [bl, bh] = span(B, u); const g1 = bl - ah, g2 = al - bh; if (g1 > bestG) { bestG = g1; bestU = u; } if (g2 > bestG) { bestG = g2; bestU = [-u[0], -u[1], -u[2]]; } };
  tryU(bestU); for (const u of DIRS) tryU(u);
  const toward = sub(B.c, A.c);
  for (const f of A.faces) if (dot(f.n, toward) > 0) tryU(f.n);
  for (const f of B.faces) if (dot(f.n, toward) < 0) tryU(f.n);
  return { u: bestU, gap: bestG };
}
export function model(name, parts, meta = {}) {
  return { name, parts, meta, pairs: null };
}
export function prepare(M) {
  if (M.pairs) return M;
  const N = M.parts.length; const pairs = new Array(N * N);
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const A = M.parts[i], B = M.parts[j];
    if (len3(sub(A.c, B.c)) > A.r + B.r + 1e-6) { pairs[i * N + j] = { u: norm(sub(B.c, A.c)), gap: len3(sub(A.c, B.c)) - A.r - B.r }; continue; }
    pairs[i * N + j] = separate(A, B);
  }
  // seams: an edge between a side face and a join face of one part meets the same edge of the neighbouring part.
  // The pair is drawn once, as an outline of the union, when exactly one of the two side faces faces the viewer.
  const key = (p) => `${Math.round(p[0] * 1e3)},${Math.round(p[1] * 1e3)},${Math.round(p[2] * 1e3)}`;
  const open = new Map();
  M.parts.forEach((pt, pi) => pt.edges.forEach(([a, b, fa, fb]) => {
    if (fb < 0) return; const sa = pt.faces[fa].seam, sb = pt.faces[fb].seam; if (sa === sb) return;
    const k = [key(pt.v[a]), key(pt.v[b])].sort().join("|"); const side = sa ? fb : fa; const seamF = sa ? fa : fb;
    (open.get(k) || open.set(k, []).get(k)).push({ p: pi, a, b, side, seamF });
  }));
  M.links = []; for (const list of open.values()) { if (list.length === 2 && list[0].p !== list[1].p) M.links.push(list); else for (const e of list) M.links.push([e]); }
  M.pairs = pairs; return M;
}

// ---------- posing and drawing ----------

export function rotation(yaw = 0, pitch = 0, roll = 0) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  // R = Rz(yaw) * Ry(pitch, nose up) * Rx(roll, right wing down); body x forward, y right, z up
  const Rp = [[cp, 0, -sp], [0, 1, 0], [sp, 0, cp]];
  const Rr = [[1, 0, 0], [0, cr, sr], [0, -sr, cr]];
  const Rz = [[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]];
  const mul = (A, B) => A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
  return mul(Rz, mul(Rp, Rr));
}
const apply = (R, p) => [R[0][0] * p[0] + R[0][1] * p[1] + R[0][2] * p[2], R[1][0] * p[0] + R[1][1] * p[1] + R[1][2] * p[2], R[2][0] * p[0] + R[2][1] * p[1] + R[2][2] * p[2]];
const applyT = (R, p) => [R[0][0] * p[0] + R[1][0] * p[1] + R[2][0] * p[2], R[0][1] * p[0] + R[1][1] * p[1] + R[2][1] * p[2], R[0][2] * p[0] + R[1][2] * p[1] + R[2][2] * p[2]];

function camera(P) {
  const a = (P.azimuth * Math.PI) / 180, e = (P.elevation * Math.PI) / 180; const k = P.scale * Math.sqrt(1.6);
  const sinA = Math.sin(a), cosA = Math.cos(a), sinE = Math.sin(e), cosE = Math.cos(e);
  const V = [cosA * cosE, sinA * cosE, sinE];
  const L = norm([-sinA * 0.55 + cosA * 0.3, cosA * 0.55 + sinA * 0.3, 0.78]);
  return { k, sinA, cosA, sinE, cosE, V, L, ox: P.origin[0], oy: P.origin[1] };
}
function hull2(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  const up = []; for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const poly2 = (pts) => pts.length ? "M" + pts.map((q) => f1(q[0]) + " " + f1(q[1])).join("L") + "Z" : "";
export const TONES = 9;

// pose: { at: [x,y,z] world, yaw, pitch, roll, gear 0..1, explode 0..1, scale (units per model unit), lit: part index, hide: Set of groups }
// returns { svg, shadow, picks: [{ i, hull }] in paint order, order }
export function render(M, pose, P, opts = {}) {
  prepare(M);
  const cam = camera(P); const R = rotation(pose.yaw ?? 0, pose.pitch ?? 0, pose.roll ?? 0); const S = pose.scale ?? 1; const at = pose.at ?? [0, 0, 0];
  const Vb = applyT(R, cam.V); const Lb = applyT(R, cam.L);
  const gear = pose.gear ?? 1; const explode = pose.explode ?? 0;
  const parts = M.parts; const N = parts.length;
  const proj = (p) => { const x = at[0] + p[0] * S, y = at[1] + p[1] * S, z = at[2] + p[2] * S; return [cam.ox + (x * cam.sinA - y * cam.cosA) * cam.k, cam.oy + ((x * cam.cosA + y * cam.sinA) * cam.sinE - z * cam.cosE) * cam.k]; };
  const world = (q) => apply(R, q);
  const live = []; const screen = new Array(N); const bbox = new Array(N); const depth = new Array(N); const posed = new Array(N);
  for (let i = 0; i < N; i++) {
    const pt = parts[i];
    if (pose.hide && pose.hide.has(pt.group)) continue;
    if (pt.gear && gear <= 0.02) continue;
    const off = pt.dir && explode > 0 ? [pt.dir[0] * explode, pt.dir[1] * explode, pt.dir[2] * explode] : null;
    const g = pt.gear && gear < 1 ? gear : 1; const h = pt.gear;
    const local = (p) => { let q = p; if (g < 1) q = [h[0] + (q[0] - h[0]) * g, h[1] + (q[1] - h[1]) * g, h[2] + (q[2] - h[2]) * g]; if (off) q = [q[0] + off[0], q[1] + off[1], q[2] + off[2]]; return q; };
    const wv = pt.v.map((p) => world(local(p)));
    const sv = wv.map(proj);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const q of sv) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
    const wc = world(local(pt.c));
    screen[i] = sv; bbox[i] = [x0, y0, x1, y1]; depth[i] = dot(wc, cam.V); posed[i] = { wv, local }; live.push(i);
  }
  // order: edges from separating planes for screen-overlapping pairs, then a depth-guided topological sort
  const succ = new Map(live.map((i) => [i, []])); const indeg = new Map(live.map((i) => [i, 0]));
  for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
    const i = live[a], j = live[b]; const A = bbox[i], B = bbox[j];
    if (A[2] < B[0] || B[2] < A[0] || A[3] < B[1] || B[3] < A[1]) continue;
    const pr = M.pairs[i * N + j]; const s = dot(pr.u, Vb);
    if (Math.abs(s) < 1e-9) continue;
    const [first, second] = s > 0 ? [i, j] : [j, i];
    succ.get(first).push(second); indeg.set(second, indeg.get(second) + 1);
  }
  const order = []; const ready = live.filter((i) => indeg.get(i) === 0); const left = new Set(live);
  while (left.size) {
    let pick = -1;
    if (ready.length) { let bi = 0; for (let q = 1; q < ready.length; q++) if (depth[ready[q]] < depth[ready[bi]]) bi = q; pick = ready.splice(bi, 1)[0]; }
    else { for (const i of left) if (pick < 0 || depth[i] < depth[pick]) pick = i; }
    if (!left.has(pick)) continue;
    left.delete(pick); order.push(pick);
    for (const j of succ.get(pick)) { if (!left.has(j)) continue; const d = indeg.get(j) - 1; indeg.set(j, d); if (d === 0) ready.push(j); }
  }
  // draw
  const out = []; const picks = []; const shadowSub = [];
  const sun = opts.sun ?? [0.22, 0.14, -1]; const ground = opts.ground ?? at[2];
  const pxm = S * cam.k * (opts.zoom ?? 1);
  const visOf = new Array(N); for (const i of live) visOf[i] = parts[i].faces.map((f) => dot(f.n, Vb) > 1e-6);
  const seg = (sv, a, b) => `M${f1(sv[a][0])} ${f1(sv[a][1])}L${f1(sv[b][0])} ${f1(sv[b][1])}`;
  const rank = new Array(N).fill(-1); order.forEach((i, r) => { rank[i] = r; });
  const extra = new Array(N).fill("");
  for (const L of M.links) {
    const [A, B] = L; if (rank[A.p] < 0) continue;
    if (B && rank[B.p] >= 0) { if (visOf[A.p][A.side] !== visOf[B.p][B.side]) { const W = rank[A.p] > rank[B.p] ? A : B; extra[W.p] += seg(screen[W.p], W.a, W.b); } }
    else if (visOf[A.p][A.side] !== visOf[A.p][A.seamF]) extra[A.p] += seg(screen[A.p], A.a, A.b);
  }
  const up = applyT(R, [0, 0, 1]);
  for (const i of order) {
    const pt = parts[i]; const sv = screen[i]; const vis = visOf[i];
    const tones = new Map();
    pt.faces.forEach((f, fi) => {
      if (!vis[fi]) return;
      const nz = dot(f.n, up);
      let t = 0.5 + 0.5 * dot(f.n, Lb); if (nz > 0.93) t = Math.max(t, 0.97); if (nz < -0.3) t *= 0.75;
      const lv = Math.max(0, Math.min(TONES - 1, Math.round(t * (TONES - 1))));
      const key = f.cls + "|" + lv;
      tones.set(key, (tones.get(key) ?? "") + "M" + f.i.map((q) => f1(sv[q][0]) + " " + f1(sv[q][1])).join("L") + "Z");
    });
    let outline = extra[i], crease = "";
    for (const [a, b, fa, fb] of pt.edges) {
      if (fb >= 0 && (pt.faces[fa].seam || pt.faces[fb].seam)) continue;
      const va = vis[fa], vb = fb >= 0 ? vis[fb] : false;
      if (va !== vb) outline += seg(sv, a, b);
      else if (va && vb && dot(pt.faces[fa].n, pt.faces[fb].n) < pt.crease) crease += seg(sv, a, b);
    }
    const h2 = hull2(sv); picks.push({ i, hull: h2 });
    let g = `<path class="iso-fill" d="${poly2(h2)}"/>`;
    for (const [key, d] of tones) { const [cls, lv] = key.split("|"); g += `<path class="e3t${cls ? " " + cls : ""}" data-t="${lv}" d="${d}"/>`; }
    if (crease) g += `<path class="iso-line iso-crease" data-tone="faint" d="${crease}"/>`;
    g += decalsSvg(pt, posed[i].local, Vb, proj, world, pxm);
    if (outline) g += `<path class="iso-line iso-edge" data-tone="${pose.lit === i ? "lit" : pt.tone}" d="${outline}"/>`;
    out.push(`<g class="e3${pt.cls ? " " + pt.cls : ""}"${pose.lit === i ? " data-lit" : ""}${opts.tag ? ` data-p="${i}"` : ""}>${g}</g>`);
    if (opts.shadow !== false && pt.shadow) {
      const k2 = (ground - at[2]) / S;
      const gp = posed[i].wv.map((w) => { const zb = w[2]; const t = (zb - k2) / -sun[2]; return proj([w[0] + sun[0] * t, w[1] + sun[1] * t, k2]); });
      shadowSub.push(poly2(hull2(gp)));
    }
  }
  return { svg: out.join(""), shadow: shadowSub.join(""), picks, order };
}

function decalsSvg(pt, local, Vb, proj, world, pxm) {
  let s = "";
  for (const d of pt.decals) {
    if (d.n && dot(d.n, Vb) <= (d.kind === "dot" ? 0.12 : 0.02)) continue;
    if ((d.min && pxm < d.min) || (d.max && pxm >= d.max)) continue;
    if (d.kind === "dot") { const q = proj(world(local(d.pts[0]))); s += `<circle class="${d.cls}" cx="${f1(q[0])}" cy="${f1(q[1])}" r="${f1(Math.max(0.3, (d.r ?? 0.2) * pxm))}"/>`; continue; }
    if (d.kind === "ring") {
      const P = d.pts, Ns = d.ns, n = P.length; const w = Ns.map((m) => dot(m, Vb));
      let start = w.findIndex((x, i) => x >= 0 && w[(i + n - 1) % n] < 0);
      if (start < 0) { if (w[0] >= 0) s += `<path class="iso-line" data-tone="${d.tone ?? "lo"}" d="${poly2(P.map((p) => proj(world(local(p)))))}"/>`; continue; }
      let path = ""; let i = start; let guard = 0;
      while (guard++ < n * 2) {
        if (w[i] >= 0 && w[(i + n - 1) % n] < 0) { const j = (i + n - 1) % n; const t = w[j] / (w[j] - w[i]); const p = P[j].map((c, a) => c + (P[i][a] - c) * t); const q = proj(world(local(p))); path += `M${f1(q[0])} ${f1(q[1])}`; }
        if (w[i] >= 0) { const q = proj(world(local(P[i]))); path += `L${f1(q[0])} ${f1(q[1])}`; const j = (i + 1) % n; if (w[j] < 0) { const t = w[i] / (w[i] - w[j]); const p = P[i].map((c, a) => c + (P[j][a] - c) * t); const r = proj(world(local(p))); path += `L${f1(r[0])} ${f1(r[1])}`; } }
        i = (i + 1) % n; if (i === start) break;
      }
      s += `<path class="iso-line" data-tone="${d.tone ?? "lo"}" d="${path}"/>`; continue;
    }
    const pts = d.pts.map((p) => proj(world(local(p))));
    const dd = "M" + pts.map((q) => f1(q[0]) + " " + f1(q[1])).join("L") + (d.closed ? "Z" : "");
    if (d.kind === "fill") s += `<path class="${d.cls ?? "e3-dark"}" d="${dd}"/>`;
    else s += `<path class="iso-line${d.cls ? " " + d.cls : ""}" data-tone="${d.tone ?? "lo"}" d="${dd}"/>`;
  }
  return s;
}

// CSS for 3D parts: nine tones mixed from the theme's four shades and top, seamless so faces never show cracks
export const E3_CSS = `
.e3t{stroke-width:.45;stroke-linejoin:round}
.e3t[data-t="0"]{fill:var(--anatomy-shade-0);stroke:var(--anatomy-shade-0)}
.e3t[data-t="1"]{--c:color-mix(in srgb,var(--anatomy-shade-0) 50%,var(--anatomy-shade-1));fill:var(--c);stroke:var(--c)}
.e3t[data-t="2"]{fill:var(--anatomy-shade-1);stroke:var(--anatomy-shade-1)}
.e3t[data-t="3"]{--c:color-mix(in srgb,var(--anatomy-shade-1) 50%,var(--anatomy-shade-2));fill:var(--c);stroke:var(--c)}
.e3t[data-t="4"]{fill:var(--anatomy-shade-2);stroke:var(--anatomy-shade-2)}
.e3t[data-t="5"]{--c:color-mix(in srgb,var(--anatomy-shade-2) 50%,var(--anatomy-shade-3));fill:var(--c);stroke:var(--c)}
.e3t[data-t="6"]{fill:var(--anatomy-shade-3);stroke:var(--anatomy-shade-3)}
.e3t[data-t="7"]{--c:color-mix(in srgb,var(--anatomy-shade-3) 50%,var(--anatomy-top));fill:var(--c);stroke:var(--c)}
.e3t[data-t="8"]{fill:var(--anatomy-top);stroke:var(--anatomy-top)}
.e3[data-lit] .e3t{fill:var(--anatomy-lit-shade);stroke:var(--anatomy-lit-shade)}
.e3[data-lit] .e3t[data-t="7"],.e3[data-lit] .e3t[data-t="8"]{fill:var(--anatomy-lit-top);stroke:var(--anatomy-lit-top)}
.e3[data-lit] .iso-fill{fill:var(--anatomy-face)}
`;
