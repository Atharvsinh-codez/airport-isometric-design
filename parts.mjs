// Aircraft, ground vehicles, people and trees as meshes, plus the pre-rendered <defs> for every heading.
import * as M from "./model.mjs";
import * as X from "./mesh.mjs";
import { ctx, TAU, f2 } from "./draw.mjs";
const U = M.U;
const ss = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const H = M.HEADINGS;
export const yawOf = (i) => (i / H) * TAU;

function wheelY(m, cx, cy, cz, r, w, n = 8) {
  const ring = (y) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]; });
  return X.loft(m, [ring(cy - w / 2), ring(cy + w / 2)], { caps: true, soft: true });
}
function wingPair(m, { xr, c0, tip, sweep, half, zr, dih, thick, y0 = 0, taperBack = 1 }) {
  for (const s of [1, -1]) {
    const le = [[xr + c0, s * y0, zr], [xr + c0 - sweep, s * half, zr + dih]];
    const te = [[xr + c0 - sweep - tip * taperBack, s * half, zr + dih], [xr, s * y0, zr]];
    const top = [le[0], le[1], te[0], te[1]].map((p) => [p[0], p[1], p[2] + thick / 2]);
    const bot = [le[0], le[1], te[0], te[1]].map((p, i) => [p[0], p[1], p[2] - thick / 2 + (i === 1 || i === 2 ? thick * 0.35 : 0)]);
    X.skin(m, top, bot, {});
  }
}
function fin(m, { x0, c0, z0, z1, tip, sweep, thick, y = 0 }) {
  const poly = [[x0 + c0, y, z0], [x0 + c0 - sweep, y, z1], [x0 + c0 - sweep - tip, y, z1], [x0, y, z0]].map((p) => [p[0], p[1] - thick / 2, p[2]]);
  return X.prism(m, poly, [0, thick, 0]);
}
function gearLeg(m, x, y, z0, z1, r, twin = true, big = false) {
  X.box(m, x, y, z0 + r, 0.22, 0.22, Math.max(0.1, z1 - z0 - r));
  const w = big ? 0.5 : 0.36;
  if (twin) { wheelY(m, x, y - w * 0.6, z0 + r, r, w * 0.6); wheelY(m, x, y + w * 0.6, z0 + r, r, w * 0.6); if (big) { wheelY(m, x - r * 2.2, y - w * 0.6, z0 + r, r, w * 0.6); wheelY(m, x - r * 2.2, y + w * 0.6, z0 + r, r, w * 0.6); } }
  else wheelY(m, x, y, z0 + r, r, w);
}

export function aircraftMesh(type, { gear = true, pitch = 0 } = {}) {
  const a = M.AIRCRAFT[type]; const m = X.mesh(); const dec = [];
  const len = U(a.len), span = U(a.span), dia = U(a.dia), h = U(a.h); const R = dia / 2;
  if (a.tail === "heli") return heliMesh(m, dec, a, len, span, dia, h, gear);
  if (a.tail === "fighter") return fighterMesh(m, dec, a, len, span, dia, h, gear);
  const big = a.len > 60; const n = big ? 14 : 11;
  const gz = R * 0.75;                                   // belly height above the ground on its gear
  const rOf = (t) => t > 0.86 ? R * Math.pow(Math.max(0, 1 - Math.pow((t - 0.86) / 0.14, 2)), 0.55) : t < 0.32 ? R * (0.16 + 0.84 * ss(t / 0.32)) : R;
  const czOf = (t) => gz + R + (t < 0.32 ? Math.pow(1 - t / 0.32, 1.6) * R * 0.95 : 0) - (t > 0.9 ? ((t - 0.9) / 0.1) * R * 0.22 : 0);
  X.tubeX(m, 0, len, 22, rOf, czOf, n);
  X.tubeX(m, -R * 0.25, len * 0.03, 3, (t) => R * (0.05 + 0.1 * t), (t) => czOf(0.02) + R * 0.1, 6);
  for (const ax of [0.36, 0.62, 0.74]) X.box(m, len * ax, 0, czOf(ax) + rOf(ax) - 0.05, R * 0.25, 0.08, R * 0.14);
  if (a.hump) X.tubeX(m, len * 0.55, len * 0.93, 8, (t) => R * 0.62 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.35) / 0.65, 2) * (t > 0.35 ? 1 : 0))) * (t < 0.1 ? t / 0.1 : 1), () => gz + R * 1.75, 8, { sz: 0.8 });
  const xr = len * 0.4, c0 = len * (big ? 0.2 : 0.18), half = span / 2, sweep = Math.tan(0.47) * half * 0.9, tip = c0 * 0.3;
  const zw = a.highWing ? gz + 2 * R - 0.08 : gz + R * 0.45;
  wingPair(m, { xr, c0, tip, sweep, half, zr: zw, dih: a.highWing ? -half * 0.03 : half * 0.1, thick: Math.max(0.25, len * 0.012), y0: R * 0.7 });
  for (const s of [1, -1]) { const wx = xr + c0 - sweep; X.prism(m, [[wx + tip * 0.95, s * half, zw + half * 0.1], [wx + tip * 0.2, s * half, zw + half * 0.1 + span * 0.045], [wx - tip * 0.1, s * half, zw + half * 0.1 + span * 0.045], [wx, s * half, zw + half * 0.1]].map((p) => [p[0], p[1] - 0.06, p[2]]), [0, 0.12, 0]); }
  const zt = czOf(0.06) + rOf(0.06) * 0.6;
  fin(m, { x0: len * 0.025, c0: len * 0.17, z0: zt - 0.1, z1: h, tip: len * 0.06, sweep: len * 0.11, thick: Math.max(0.2, len * 0.01) });
  const stabZ = a.tail === "T" ? h - 0.05 : czOf(0.08) + 0.1;
  wingPair(m, { xr: a.tail === "T" ? len * 0.005 : len * 0.02, c0: len * 0.09, tip: len * 0.03, sweep: len * 0.07, half: span * 0.19, zr: stabZ, dih: span * 0.01, thick: Math.max(0.18, len * 0.008), y0: a.tail === "T" ? 0 : rOf(0.08) * 0.6 });
  const fr = a.engines === 4 ? [0.33, 0.62] : [0.36];
  for (const f of fr) for (const s of [1, -1]) {
    const y = s * half * f; const wle = xr + c0 - sweep * f; const zwy = zw + half * 0.1 * f;
    if (a.prop) {
      const er = R * 0.45; const ex0 = wle - c0 * 0.3, ex1 = wle + c0 * 0.55;
      X.tubeX(m, ex0, ex1, 5, (t) => er * (t > 0.8 ? 1 - (t - 0.8) / 0.25 : 1), () => zwy + er * 0.2, 8, { cy: y });
      const disc = Array.from({ length: 20 }, (_, i) => { const q = (i / 20) * TAU; return [ex1 + 0.1, y + Math.cos(q) * span * 0.07, zwy + er * 0.2 + Math.sin(q) * span * 0.07]; });
      dec.push({ pts: disc, cls: "ab-prop iso-line", closed: true });
      for (let b = 0; b < 6; b++) { const q = (b / 6) * TAU; dec.push({ pts: [[ex1 + 0.1, y, zwy + er * 0.2], [ex1 + 0.1, y + Math.cos(q) * span * 0.07, zwy + er * 0.2 + Math.sin(q) * span * 0.07]], cls: "iso-line ab-prop" }); }
    } else {
      const er = R * (big ? 0.42 : 0.5); const ex1 = wle + c0 * 0.35, ex0 = ex1 - len * 0.1; const ez = zwy - er * 1.05;
      X.tubeX(m, ex0, ex1, 6, (t) => er * (t < 0.15 ? 0.8 + t : t > 0.85 ? 0.98 : 1), () => ez, 10, { cy: y });
      X.prism(m, [[ex0 + len * 0.03, y - 0.1, ez + er * 0.5], [ex1 - len * 0.01, y - 0.1, ez + er * 0.5], [ex1 - len * 0.01, y - 0.1, zwy + 0.1], [ex0 + len * 0.06, y - 0.1, zwy + 0.1]], [0, 0.2, 0]);
      const fan = Array.from({ length: 14 }, (_, i) => { const q = (i / 14) * TAU; return [ex1 + 0.02, y + Math.cos(q) * er * 0.86, ez + Math.sin(q) * er * 0.86]; });
      dec.push({ pts: fan, cls: "iso-line", closed: true, tone: "faint" });
      X.tubeX(m, ex0 - len * 0.03, ex0 + 0.01, 3, (t) => er * (0.18 + 0.2 * t), () => ez, 8, { cy: y });
      dec.push({ pts: Array.from({ length: 12 }, (_, i) => { const q = (i / 12) * TAU; return [ex0 - 0.02, y + Math.cos(q) * er * 0.4, ez + Math.sin(q) * er * 0.4]; }), cls: "iso-line", closed: true, tone: "faint" });
    }
  }
  if (gear) { const wr = big ? 0.42 : 0.3; gearLeg(m, len * 0.84, 0, 0, gz + 0.2, wr * 0.8); gearLeg(m, xr + c0 * 0.35, R * 1.15, 0, zw, wr, true, big); gearLeg(m, xr + c0 * 0.35, -R * 1.15, 0, zw, wr, true, big); }
  for (const s of [1, -1]) {
    const yy = s * (R + 0.05); const zz = (t) => czOf(t) + R * 0.3;
    dec.push({ pts: [[len * 0.3, yy, zz(0.3)], [len * 0.8, yy, zz(0.8)]], cls: "iso-line ab-dash", tone: "mid" });
    for (const t of [0.34, 0.8]) dec.push({ pts: [[len * t, yy, czOf(t) - R * 0.5], [len * t, yy, czOf(t) + R * 0.55]], cls: "iso-line", tone: "mid" });
    dec.push({ pts: [[len * 0.905, yy * 0.9, czOf(0.9) + R * 0.3], [len * 0.95, yy * 0.6, czOf(0.95) + R * 0.2], [len * 0.95, yy * 0.6, czOf(0.95) + R * 0.5], [len * 0.905, yy * 0.9, czOf(0.9) + R * 0.6]], cls: "iso-line", closed: true, tone: "hi" });
  }
  if (!a.highWing) X.tubeX(m, xr - c0 * 0.35, xr + c0 * 1.15, 6, (t) => R * 0.62 * Math.sin(Math.PI * t) ** 0.35, () => gz + R * 0.42, 8, { sz: 0.55 });
  for (const s of [1, -1]) for (const f of [0.32, 0.58]) { const tex = xr + f * (c0 - sweep - tip), tey = s * (R * 0.7 + f * (half - R * 0.7)), tez = zw + (a.highWing ? -half * 0.03 : half * 0.1) * f; X.box(m, tex - c0 * 0.05, tey, tez - 0.3, c0 * 0.32, 0.34, 0.5); }
  for (const s of [1, -1]) { const yy = s * (R + 0.06); dec.push({ pts: [0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9].map((t) => [len * t, yy * (t > 0.88 ? 0.92 : 1), czOf(t) - R * 0.12]), cls: "iso-line ab-livery", tone: "hi" }); }
  { const fz0 = zt + (h - zt) * 0.35, fz1 = zt + (h - zt) * 0.8; const fx = (z) => len * 0.025 + len * 0.17 - ((z - zt) / (h - zt)) * len * 0.11; const th = Math.max(0.2, len * 0.01) / 2 + 0.03; for (const s of [1, -1]) dec.push({ pts: [[fx(fz0) - len * 0.02, s * th, fz0], [fx(fz1) - len * 0.015, s * th, fz1], [fx(fz1) - len * 0.045, s * th, fz1], [fx(fz0) - len * 0.07, s * th, fz0]], cls: "ab-livery iso-line", closed: true, tone: "hi" }); }
  return finish(m, dec, pitch, xr + c0 * 0.35);
}
function fighterMesh(m, dec, a, len, span, dia, h, gear) {
  const R = dia / 2, gz = R * 1.1; const n = 8;
  X.tubeX(m, 0, len, 14, (t) => t > 0.78 ? R * Math.pow(Math.max(0, 1 - Math.pow((t - 0.78) / 0.22, 2)), 0.7) : R * (t < 0.1 ? 0.8 : 1), (t) => gz + R + (t > 0.78 ? (t - 0.78) * R * 0.3 : 0), n);
  X.tubeX(m, len * 0.5, len * 0.75, 6, (t) => R * 0.7 * Math.sin(Math.PI * Math.min(1, t * 1.05)), () => gz + 2 * R - 0.05, 8, { sy: 0.8, sz: 0.9 });
  X.box(m, len * 0.56, 0, gz - R * 0.1, len * 0.18, R * 1.1, R * 0.9);
  wingPair(m, { xr: len * 0.22, c0: len * 0.42, tip: len * 0.12, sweep: Math.tan(0.7) * span / 2, half: span / 2, zr: gz + R * 1.1, dih: 0, thick: 0.18, y0: R * 0.8 });
  wingPair(m, { xr: len * 0.02, c0: len * 0.16, tip: len * 0.05, sweep: len * 0.11, half: span * 0.27, zr: gz + R * 0.9, dih: -span * 0.02, thick: 0.14, y0: R * 0.6 });
  fin(m, { x0: len * 0.06, c0: len * 0.26, z0: gz + 2 * R - 0.1, z1: h, tip: len * 0.1, sweep: len * 0.17, thick: 0.14 });
  for (const s of [1, -1]) X.box(m, len * 0.4, s * span / 2, gz + R * 1.1, len * 0.2, 0.2, 0.2);
  if (gear) { gearLeg(m, len * 0.62, 0, 0, gz + 0.1, 0.22, false); gearLeg(m, len * 0.4, R * 1.3, 0, gz + 0.1, 0.26, false); gearLeg(m, len * 0.4, -R * 1.3, 0, gz + 0.1, 0.26, false); }
  dec.push({ pts: [[len * 0.5, 0, gz + 2 * R - 0.02], [len * 0.66, 0, gz + 2 * R + R * 0.55], [len * 0.8, 0, gz + 2 * R + R * 0.35], [len * 0.9, 0, gz + 2 * R - 0.02]], cls: "iso-line", closed: true, tone: "hi" });
  dec.push({ pts: Array.from({ length: 12 }, (_, i) => { const q = (i / 12) * TAU; return [0.02, Math.cos(q) * R * 0.55, gz + R + Math.sin(q) * R * 0.55]; }), cls: "iso-line", closed: true, tone: "mid" });
  for (const s of [1, -1]) X.tubeX(m, len * 0.28, len * 0.6, 6, (t) => R * 0.34 * Math.pow(Math.sin(Math.PI * t), 0.45), () => gz + R * 0.7, 8, { cy: s * span * 0.3 });
  return finish(m, dec, 0, len * 0.42);
}
function heliMesh(m, dec, a, len, span, dia, h, gear) {
  const R = dia / 2, gz = R * 0.7;
  X.tubeX(m, len * 0.3, len, 10, (t) => t > 0.75 ? R * Math.pow(Math.max(0, 1 - Math.pow((t - 0.75) / 0.25, 2)), 0.6) : R * (t < 0.2 ? 0.55 + 0.45 * ss(t / 0.2) : 1), (t) => gz + R - (t > 0.75 ? (t - 0.75) * R * 0.5 : 0), 8, { sz: 0.92 });
  X.tubeX(m, 0, len * 0.32, 5, (t) => R * (0.14 + 0.2 * t), (t) => gz + R * 1.3 - t * R * 0.2, 6);
  fin(m, { x0: 0, c0: len * 0.08, z0: gz + R * 1.2, z1: gz + R * 2.6, tip: len * 0.05, sweep: len * 0.02, thick: 0.12 });
  for (const s of [1, -1]) X.box(m, len * 0.07, s * len * 0.09, gz + R * 1.2, len * 0.06, len * 0.1, 0.1);
  X.box(m, len * 0.62, 0, gz + 2 * R - 0.1, len * 0.22, R * 1.1, R * 0.5);
  X.box(m, len * 0.62, 0, gz + 2 * R + R * 0.3, 0.3, 0.3, R * 0.6);
  const rz = gz + 2 * R + R * 0.9; const rr = span / 2;
  for (let b = 0; b < 4; b++) { const q = (b / 4) * TAU + 0.4; const dx = Math.cos(q), dy = Math.sin(q); X.prism(m, [[len * 0.62 + dx * 0.4 - dy * 0.14, dy * 0.4 + dx * 0.14, rz], [len * 0.62 + dx * rr - dy * 0.1, dy * rr + dx * 0.1, rz + 0.05], [len * 0.62 + dx * rr + dy * 0.1, dy * rr - dx * 0.1, rz + 0.05], [len * 0.62 + dx * 0.4 + dy * 0.14, dy * 0.4 - dx * 0.14, rz]], [0, 0, 0.06]); }
  dec.push({ pts: Array.from({ length: 36 }, (_, i) => { const q = (i / 36) * TAU; return [len * 0.62 + Math.cos(q) * rr, Math.sin(q) * rr, rz + 0.03]; }), cls: "iso-line ab-rotor", closed: true, tone: "faint" });
  dec.push({ pts: Array.from({ length: 16 }, (_, i) => { const q = (i / 16) * TAU; return [len * 0.02, -0.2, gz + R * 2.1 + Math.cos(q) * len * 0.07 + 0 * Math.sin(q)].map((v, j) => j === 0 ? v + Math.sin(q) * len * 0.07 : v); }), cls: "iso-line ab-rotor", closed: true, tone: "faint" });
  if (gear) { gearLeg(m, len * 0.82, 0, 0, gz, 0.22, false); gearLeg(m, len * 0.45, R * 1.2, 0, gz, 0.26, false); gearLeg(m, len * 0.45, -R * 1.2, 0, gz, 0.26, false); }
  for (const s of [1, -1]) dec.push({ pts: [[len * 0.78, s * (R + 0.04), gz + R * 1.1], [len * 0.9, s * (R + 0.04) * 0.8, gz + R * 1.0], [len * 0.9, s * (R + 0.04) * 0.8, gz + R * 1.6], [len * 0.78, s * (R + 0.04), gz + R * 1.7]], cls: "iso-line", closed: true, tone: "hi" });
  return finish(m, dec, 0, len * 0.6);
}
function finish(m, dec, pitch, shift = 0) {
  const fn = X.yawPitch(0, pitch, -shift); return { m: X.transform(m, fn), dec: dec.map((d) => ({ ...d, pts: d.pts.map(fn) })) };
}

export function gseMesh(type, { up = false } = {}) {
  const g = M.GSE[type]; const m = X.mesh(); const dec = []; const L = U(g.len), W = U(g.wid), Hh = U(g.h); const wr = Math.min(0.32, Hh * 0.18); const z0 = wr * 0.9;
  const wheels = (xs, w = W) => { for (const x of xs) { wheelY(m, x, -w / 2 + 0.1, wr, wr, 0.22, 6); wheelY(m, x, w / 2 - 0.1, wr, wr, 0.22, 6); } };
  const cab = (x0, x1, hh) => { X.box(m, (x0 + x1) / 2, 0, z0, x1 - x0, W, hh - z0); dec.push({ pts: [[x1 + 0.01, -W / 2 + 0.15, z0 + hh * 0.45], [x1 + 0.01, W / 2 - 0.15, z0 + hh * 0.45], [x1 + 0.01, W / 2 - 0.15, z0 + hh * 0.85], [x1 + 0.01, -W / 2 + 0.15, z0 + hh * 0.85]], cls: "iso-line", closed: true, tone: "hi" }); };
  switch (type) {
    case "car": case "follow": case "police": case "suv": case "hatch": case "van": case "pickup": {
      const k = type === "car" || type === "follow" || type === "police" ? "sedan" : type;
      const hb = z0 + Hh * (k === "van" ? 0.96 : k === "suv" ? 0.5 : 0.46);
      const rect = (x0, x1, w, z) => [[x1, -w / 2, z], [x1, w / 2, z], [x0, w / 2, z], [x0, -w / 2, z]];
      if (k === "van") { X.skin(m, rect(-L * 0.5, L * 0.22, W * 0.96, hb), rect(-L * 0.5, L * 0.3, W, z0 + 0.1)); X.skin(m, rect(L * 0.22, L * 0.42, W * 0.9, z0 + Hh * 0.52), rect(L * 0.22, L * 0.5, W, z0 + 0.1)); }
      else { X.skin(m, rect(-L * 0.49, L * 0.44, W * 0.98, hb), rect(-L * 0.5, L * 0.5, W, z0 + 0.1)); }
      const cab = k === "hatch" ? [-0.47, 0.16, 0.02, 0.17] : k === "suv" ? [-0.46, 0.2, 0.04, 0.14] : k === "pickup" ? [-0.12, 0.22, 0.03, 0.13] : k === "van" ? [-0.5, 0.22, 0.0, 0.0] : [-0.32, 0.2, 0.08, 0.15];
      if (k !== "van") X.skin(m, rect(L * (cab[0] + cab[2]), L * (cab[1] - cab[3]), W * 0.82, z0 + Hh), rect(L * cab[0], L * cab[1], W * 0.94, hb));
      const roofZ = z0 + Hh; const wz = k === "van" ? [z0 + Hh * 0.55, z0 + Hh * 0.88] : [hb + 0.04, roofZ - 0.06];
      for (const s of [1, -1]) { const y0 = s * (W * 0.47 + 0.02), y1 = s * (W * 0.41 + 0.02); const xa = k === "van" ? -L * 0.48 : L * (cab[0] + 0.02), xb = k === "van" ? L * 0.2 : L * (cab[1] - 0.02); const xa2 = k === "van" ? xa : L * (cab[0] + cab[2]), xb2 = k === "van" ? xb : L * (cab[1] - cab[3]); dec.push({ pts: [[xa, y0, wz[0]], [xb, y0, wz[0]], [xb2, y1, wz[1]], [xa2, y1, wz[1]]], cls: "iso-line", closed: true, tone: "hi" }); const xm = (xa + xb) / 2; dec.push({ pts: [[xm, y0, wz[0]], [xm * 0.98 + xa2 * 0.02, y1, wz[1]]], cls: "iso-line", tone: "mid" }); if (k !== "van") X.box(m, L * (cab[1] - 0.01), s * (W / 2 + 0.12), hb + 0.18, 0.22, 0.24, 0.16); }
      { const fx = k === "van" ? L * 0.5 : L * 0.5 + 0.01; for (const s of [1, -1]) dec.push({ pts: [[fx, s * W * 0.42, hb - 0.3], [fx, s * W * 0.22, hb - 0.3], [fx, s * W * 0.22, hb - 0.1], [fx, s * W * 0.42, hb - 0.1]], cls: "iso-line ab-lamp-dec", closed: true, tone: "hi" }); const bx = -L * 0.5 - 0.01; for (const s of [1, -1]) dec.push({ pts: [[bx, s * W * 0.44, hb - 0.28], [bx, s * W * 0.28, hb - 0.28], [bx, s * W * 0.28, hb - 0.1], [bx, s * W * 0.44, hb - 0.1]], cls: "iso-line", closed: true, tone: "mid" }); }
      if (k === "pickup") { X.box(m, -L * 0.31, W * 0.46, hb, L * 0.38, 0.1, Hh * 0.22); X.box(m, -L * 0.31, -W * 0.46, hb, L * 0.38, 0.1, Hh * 0.22); X.box(m, -L * 0.49, 0, hb, 0.1, W * 0.92, Hh * 0.22); }
      if (k === "suv") for (const s of [1, -1]) X.box(m, -L * 0.14, s * W * 0.3, roofZ, L * 0.5, 0.08, 0.12);
      if (type === "police") { X.box(m, -0.1, 0, roofZ, L * 0.16, W * 0.6, 0.22); dec.push({ pts: [[-0.1 - L * 0.08, -W * 0.3, roofZ + 0.23], [-0.1 + L * 0.08, -W * 0.3, roofZ + 0.23]], cls: "ab-strobe iso-line" }); }
      wheels([L * 0.33, -L * 0.33]);
      if (type === "follow") { X.box(m, -0.1, 0, roofZ, L * 0.4, 0.2, 0.5); dec.push({ pts: [[L * 0.1, -0.11, roofZ + 0.25], [-L * 0.3, -0.11, roofZ + 0.25]], cls: "iso-line ab-dash", tone: "hi" }); }
    } break;
    case "tug": X.box(m, 0, 0, z0, L, W, Hh * 0.45); cab(-L * 0.45, -L * 0.1, Hh); X.box(m, L * 0.45, 0, z0 + Hh * 0.2, L * 0.1, W * 0.5, Hh * 0.3); wheels([L * 0.32, -L * 0.3]); break;
    case "belt": X.box(m, -L * 0.05, 0, z0, L * 0.7, W, Hh * 0.35); cab(-L * 0.5, -L * 0.25, Hh * 0.75); X.prism(m, [[-L * 0.3, -W * 0.22, z0 + Hh * 0.35], [L * 0.5, -W * 0.22, up ? Hh * 1.4 : Hh * 0.8], [L * 0.5, -W * 0.22, (up ? Hh * 1.4 : Hh * 0.8) + 0.18], [-L * 0.3, -W * 0.22, z0 + Hh * 0.35 + 0.18]], [0, W * 0.44, 0]); dec.push({ pts: [[-L * 0.3, 0, z0 + Hh * 0.35 + 0.19], [L * 0.5, 0, (up ? Hh * 1.4 : Hh * 0.8) + 0.19]], cls: "iso-line ab-dash", tone: "mid" }); wheels([L * 0.2, -L * 0.3]); break;
    case "catering": cab(L * 0.22, L * 0.5, Hh * 0.7); { const lift = up ? Hh * 0.9 : 0; X.box(m, -L * 0.15, 0, z0 + Hh * 0.1 + lift, L * 0.68, W, Hh * 0.9 - z0); if (up) { for (const s of [1, -1]) { dec.push({ pts: [[-L * 0.45, s * W * 0.5, z0 + 0.1], [L * 0.15, s * W * 0.5, z0 + Hh * 0.1 + lift]], cls: "iso-line", tone: "mid" }); dec.push({ pts: [[L * 0.15, s * W * 0.5, z0 + 0.1], [-L * 0.45, s * W * 0.5, z0 + Hh * 0.1 + lift]], cls: "iso-line", tone: "mid" }); } X.box(m, -L * 0.15, 0, z0, L * 0.68, W * 0.9, Hh * 0.1); } wheels([L * 0.3, -L * 0.3]); } break;
    case "bowser": cab(L * 0.3, L * 0.5, Hh * 0.75); X.box(m, -L * 0.1, 0, z0, L * 0.8, W, Hh * 0.2); X.tubeX(m, -L * 0.48, L * 0.2, 5, (t) => W * 0.5 * (t < 0.08 || t > 0.92 ? 0.85 : 1), () => z0 + Hh * 0.2 + W * 0.5, 10, { sz: 0.9 }); X.box(m, -L * 0.44, 0, z0 + Hh * 0.2, L * 0.08, W * 0.6, Hh * 0.25); wheels([L * 0.35, -L * 0.2, -L * 0.36]); break;
    case "bagtrain": { X.box(m, L * 0.4, 0, z0, L * 0.18, W, Hh * 0.4); cab(L * 0.3, L * 0.38, Hh); wheels([L * 0.45, L * 0.32]); for (let i = 0; i < 3; i++) { const cx = L * 0.14 - i * L * 0.27; X.box(m, cx, 0, z0, L * 0.22, W, Hh * 0.25); X.box(m, cx, 0, z0 + Hh * 0.25 + Hh * 0.55, L * 0.22, W, 0.08); for (const sx of [1, -1]) for (const sy of [1, -1]) X.box(m, cx + sx * L * 0.1, sy * (W / 2 - 0.05), z0 + Hh * 0.25, 0.08, 0.08, Hh * 0.55); wheels([cx - L * 0.06, cx + L * 0.06], W); dec.push({ pts: [[cx + L * 0.11, 0, z0 + Hh * 0.6], [cx + L * 0.16, 0, z0 + Hh * 0.6]], cls: "iso-line", tone: "mid" }); } } break;
    case "stairs": X.box(m, -L * 0.1, 0, z0, L * 0.6, W, Hh * 0.2); cab(-L * 0.5, -L * 0.3, Hh * 0.45); { const top = up ? Hh : Hh * 0.6; X.prism(m, [[-L * 0.25, -W * 0.4, z0 + Hh * 0.2], [L * 0.45, -W * 0.4, top], [L * 0.5, -W * 0.4, top], [L * 0.5, -W * 0.4, top - 0.2], [-L * 0.25, -W * 0.4, z0 + Hh * 0.2 - 0.2]], [0, W * 0.8, 0]); for (const s of [1, -1]) { dec.push({ pts: [[-L * 0.25, s * W * 0.4, z0 + Hh * 0.2 + 0.9], [L * 0.5, s * W * 0.4, top + 0.9]], cls: "iso-line", tone: "hi" }); for (const t of [0, 0.5, 1]) { const x = -L * 0.25 + t * L * 0.75, z = z0 + Hh * 0.2 + t * (top - z0 - Hh * 0.2); dec.push({ pts: [[x, s * W * 0.4, z], [x, s * W * 0.4, z + 0.9]], cls: "iso-line", tone: "mid" }); } } } wheels([L * 0.1, -L * 0.3]); break;
    case "bus": case "coach": { const coach = type === "coach"; const fl = coach ? Hh * 0.42 : Hh * 0.28;
      X.skin(m, [[L * 0.48, -W / 2, Hh], [L * 0.48, W / 2, Hh], [-L * 0.49, W / 2, Hh], [-L * 0.49, -W / 2, Hh]], [[L * 0.5, -W / 2, z0 + 0.1], [L * 0.5, W / 2, z0 + 0.1], [-L * 0.5, W / 2, z0 + 0.1], [-L * 0.5, -W / 2, z0 + 0.1]]);
      X.box(m, -L * 0.1, 0, Hh, L * 0.22, W * 0.5, 0.35); X.box(m, L * 0.25, 0, Hh, L * 0.12, W * 0.45, 0.25);
      const n = Math.max(4, Math.round(L / 2.4)); const seg = (L * 0.9) / n;
      for (const s of [1, -1]) { const y = s * (W / 2 + 0.01); for (let i = 0; i < n; i++) { const x0 = -L * 0.45 + i * seg + 0.12, x1 = x0 + seg - 0.24; if (s === 1 && i === n - 1) { dec.push({ pts: [[x0, y, z0 + 0.15], [x1, y, z0 + 0.15], [x1, y, Hh * 0.9], [x0, y, Hh * 0.9]], cls: "iso-line", closed: true, tone: "hi" }); continue; } dec.push({ pts: [[x0, y, fl + 0.3], [x1, y, fl + 0.3], [x1, y, Hh * 0.9], [x0, y, Hh * 0.9]], cls: "iso-line", closed: true, tone: "hi" }); if (coach) dec.push({ pts: [[x0, y, z0 + 0.25], [x1, y, z0 + 0.25], [x1, y, fl - 0.1], [x0, y, fl - 0.1]], cls: "iso-line", closed: true, tone: "faint" }); } }
      dec.push({ pts: [[L / 2 + 0.01, -W * 0.44, fl + 0.1], [L / 2 + 0.01, W * 0.44, fl + 0.1], [L / 2 + 0.01, W * 0.44, Hh * 0.92], [L / 2 + 0.01, -W * 0.44, Hh * 0.92]], cls: "iso-line", closed: true, tone: "hi" });
      dec.push({ pts: [[L / 2 + 0.01, -W * 0.4, Hh * 0.93], [L / 2 + 0.01, W * 0.4, Hh * 0.93], [L / 2 + 0.01, W * 0.4, Hh * 0.99], [L / 2 + 0.01, -W * 0.4, Hh * 0.99]], cls: "iso-line ab-lamp-dec", closed: true, tone: "hi" });
      for (const s of [1, -1]) { X.box(m, L * 0.47, s * (W / 2 + 0.16), Hh * 0.62, 0.16, 0.3, 0.4); dec.push({ pts: [[L / 2 + 0.01, s * W * 0.4, z0 + 0.5], [L / 2 + 0.01, s * W * 0.22, z0 + 0.5], [L / 2 + 0.01, s * W * 0.22, z0 + 0.75], [L / 2 + 0.01, s * W * 0.4, z0 + 0.75]], cls: "iso-line ab-lamp-dec", closed: true, tone: "hi" }); }
      wheels([L * 0.34, -L * 0.3]); if (coach) wheels([-L * 0.4]); } break;
    case "truck": { cab(L * 0.3, L * 0.5, Hh * 0.92); X.box(m, L * 0.33, 0, Hh * 0.92, L * 0.1, W * 0.9, 0.5); X.box(m, -L * 0.14, 0, z0 + Hh * 0.22, L * 0.72, W, Hh * 0.78 - z0); X.box(m, 0.0, 0, z0, L * 0.98, W * 0.5, Hh * 0.2);
      for (const s of [1, -1]) { const y = s * (W / 2 + 0.01); dec.push({ pts: [[-L * 0.49, y, z0 + Hh * 0.3], [L * 0.21, y, z0 + Hh * 0.3]], cls: "iso-line", tone: "faint" }); dec.push({ pts: [[-L * 0.49, y, z0 + Hh * 0.9], [L * 0.21, y, z0 + Hh * 0.9]], cls: "iso-line", tone: "faint" }); dec.push({ pts: [[L * 0.3 - 0.01, y, z0 + Hh * 0.5], [L * 0.3 - 0.01, y, z0 + Hh * 0.85]], cls: "iso-line", tone: "mid" }); }
      X.box(m, L * 0.27, W * 0.44, Hh * 0.2, 0.18, 0.18, Hh * 0.72); X.box(m, L * 0.1, 0, z0, 0.3, W * 0.4, Hh * 0.22);
      wheels([L * 0.42, L * 0.14, -L * 0.3, -L * 0.4]); } break;
    case "train": { X.box(m, -L * 0.02, 0, z0 + 0.3, L * 0.9, W, Hh * 0.72); X.skin(m, [[L * 0.42, -W * 0.4, Hh], [L * 0.42, W * 0.4, Hh], [-L * 0.45, W * 0.4, Hh], [-L * 0.45, -W * 0.4, Hh]], [[L * 0.44, -W / 2, z0 + 0.3 + Hh * 0.72], [L * 0.44, W / 2, z0 + 0.3 + Hh * 0.72], [-L * 0.47, W / 2, z0 + 0.3 + Hh * 0.72], [-L * 0.47, -W / 2, z0 + 0.3 + Hh * 0.72]]);
      X.skin(m, [[L * 0.5, -W * 0.3, z0 + 0.3 + Hh * 0.5], [L * 0.5, W * 0.3, z0 + 0.3 + Hh * 0.5], [L * 0.43, W * 0.4, Hh], [L * 0.43, -W * 0.4, Hh]], [[L * 0.5, -W * 0.4, z0 + 0.3], [L * 0.5, W * 0.4, z0 + 0.3], [L * 0.43, W / 2, z0 + 0.3], [L * 0.43, -W / 2, z0 + 0.3]]);
      X.box(m, -L * 0.1, 0, Hh, L * 0.2, W * 0.5, 0.3); X.box(m, L * 0.15, 0, Hh, 0.1, 0.1, 0.9); X.box(m, L * 0.15, 0, Hh + 0.9, L * 0.06, W * 0.4, 0.08);
      const n = 7, seg = (L * 0.8) / n; for (const s of [1, -1]) { const y = s * (W / 2 + 0.01); for (let i = 0; i < n; i++) { const x0 = -L * 0.44 + i * seg + 0.2, x1 = x0 + seg - 0.4; const door = i === 1 || i === 5; dec.push({ pts: [[x0, y, door ? z0 + 0.4 : z0 + 0.3 + Hh * 0.38], [x1, y, door ? z0 + 0.4 : z0 + 0.3 + Hh * 0.38], [x1, y, z0 + 0.3 + Hh * 0.66], [x0, y, z0 + 0.3 + Hh * 0.66]], cls: "iso-line", closed: true, tone: door ? "mid" : "hi" }); } }
      dec.push({ pts: [[L * 0.5 + 0.01, -W * 0.25, z0 + 0.3 + Hh * 0.3], [L * 0.5 + 0.01, W * 0.25, z0 + 0.3 + Hh * 0.3], [L * 0.49, W * 0.3, z0 + 0.3 + Hh * 0.5], [L * 0.49, -W * 0.3, z0 + 0.3 + Hh * 0.5]], cls: "iso-line", closed: true, tone: "hi" });
      for (const x of [L * 0.33, -L * 0.33]) { X.box(m, x, 0, 0, L * 0.12, W * 0.8, z0 + 0.3); wheelY(m, x - 0.8, -W * 0.38, wr, wr, 0.2, 6); wheelY(m, x + 0.8, -W * 0.38, wr, wr, 0.2, 6); wheelY(m, x - 0.8, W * 0.38, wr, wr, 0.2, 6); wheelY(m, x + 0.8, W * 0.38, wr, wr, 0.2, 6); } } break;
    case "firetruck": cab(L * 0.2, L * 0.5, Hh * 0.8); X.box(m, -L * 0.15, 0, z0, L * 0.68, W, Hh - z0); X.box(m, 0.2, 0, Hh, 0.5, 0.5, 0.5); dec.push({ pts: [[0.2, 0, Hh + 0.5], [L * 0.35, 0, Hh + 1.2]], cls: "iso-line", tone: "hi" }); dec.push({ pts: [[L * 0.3, -W * 0.3, Hh * 0.98], [L * 0.3, W * 0.3, Hh * 0.98]], cls: "ab-strobe iso-line" }); wheels([L * 0.32, -L * 0.18, -L * 0.36]); break;
  }
  return { m, dec };
}
export function personMesh(pose = "stand") {
  const m = X.mesh(); const dec = []; const hgt = U(1.75); const s = hgt / 1.75;
  const legs = pose === "walk" ? [[0.12, 0], [-0.12, 0]] : [[0, 0.09], [0, -0.09]];
  for (const [dx, dy] of legs) X.box(m, dx * s, dy * s, 0, 0.14 * s, 0.14 * s, 0.8 * s);
  X.box(m, 0, 0, 0.8 * s, 0.26 * s, 0.42 * s, 0.65 * s);
  X.sphere(m, [0, 0, 1.58 * s], 0.15 * s, 6, 3);
  if (pose === "marsh") { X.box(m, 0.1 * s, 0.3 * s, 0.9 * s, 0.1 * s, 0.1 * s, 0.8 * s); X.box(m, 0.1 * s, -0.3 * s, 0.9 * s, 0.1 * s, 0.1 * s, 0.8 * s); dec.push({ pts: [[0.1 * s, 0.3 * s, 1.7 * s], [0.1 * s, 0.3 * s, 2.1 * s]], cls: "iso-line ab-wand", tone: "hi" }); dec.push({ pts: [[0.1 * s, -0.3 * s, 1.7 * s], [0.1 * s, -0.3 * s, 2.1 * s]], cls: "iso-line ab-wand", tone: "hi" }); }
  else { X.box(m, 0, 0.27 * s, 0.85 * s, 0.1 * s, 0.1 * s, 0.6 * s); X.box(m, 0, -0.27 * s, 0.85 * s, 0.1 * s, 0.1 * s, 0.6 * s); }
  return { m, dec };
}
export function treeMesh(kind = 0) {
  const m = X.mesh(); const hgt = U([9, 12, 6][kind]); const rr = U([3, 2.4, 2.2][kind]);
  X.loft(m, [X.circleAt(0, 0, 0, 0.001, 6).map(([, y, z]) => [y, z, 0]), X.circleAt(0, 0, 0, 0.001, 6).map(([, y, z]) => [y, z, hgt * 0.4])], { caps: false });
  m.v = []; m.f = [];
  X.box(m, 0, 0, 0, 0.3, 0.3, hgt * 0.42);
  if (kind === 1) { X.sphere(m, [0, 0, hgt * 0.68], rr, 8, 5); m.v = m.v.map((p, i) => i < 8 ? p : [p[0], p[1], hgt * 0.68 + (p[2] - hgt * 0.68) * 1.6]); }
  else X.sphere(m, [0, 0, hgt * 0.42 + rr], rr, kind === 0 ? 9 : 7, 5);
  return { m, dec: [] };
}

export function renderDef(id, mdl, P, cls = "", shadow = false) {
  const c = ctx(P); const paths = X.meshPaths(mdl.m, P);
  const decs = mdl.dec.map((d) => `<path class="${d.cls}" data-tone="${d.tone ?? "lo"}" d="${d.pts.map((p, i) => (i ? "L" : "M") + c.at(p).map(f2).join(" ")).join("")}${d.closed ? "Z" : ""}"/>`).join("");
  return `<g id="${id}">${shadow ? `<path class="ab-shadow" d="${X.shadowPath(mdl.m, P)}"/>` : ""}${c.S(paths, { className: cls })}${decs}</g>`;
}
const rot = (mdl, yaw) => { const fn = X.yawPitch(yaw); return { m: X.transform(mdl.m, fn), dec: mdl.dec.map((d) => ({ ...d, pts: d.pts.map(fn) })) }; };
export function defsFor(P, detail = 1) {
  const out = [];
  if (detail < 1) return "";
  for (const type of Object.keys(M.AIRCRAFT)) {
    const base = aircraftMesh(type); const cls = type === "f16" || type === "uh60" ? "ab-mil" : "ab-ac";
    for (let i = 0; i < H; i += 2) out.push(renderDef(`ac-${type}-${i}`, rot(base, yawOf(i)), P, cls, true));
    if (type === "uh60") { const fly = aircraftMesh(type, { gear: true, pitch: -0.1 }); for (const i of [0, 4, 8, 12]) out.push(renderDef(`ac-${type}-${i}-fly`, rot(fly, yawOf(i)), P, cls)); continue; }
    const up = aircraftMesh(type, { gear: false, pitch: 0.17 }), app = aircraftMesh(type, { gear: true, pitch: 0.06 }), air = aircraftMesh(type, { gear: false, pitch: 0.02 });
    for (const i of [0, 8]) { out.push(renderDef(`ac-${type}-${i}-up`, rot(up, yawOf(i)), P, cls)); out.push(renderDef(`ac-${type}-${i}-app`, rot(app, yawOf(i)), P, cls)); out.push(renderDef(`ac-${type}-${i}-air`, rot(air, yawOf(i)), P, cls)); }
    for (let i = 0; i < H; i += 2) out.push(`<g id="sh-${type}-${i}"><path class="ab-shadow" d="${X.shadowPath(rot(base, yawOf(i)).m, P)}"/></g>`);
  }
  for (const type of Object.keys(M.GSE)) {
    const base = gseMesh(type); const cls = type === "firetruck" ? "ab-fire" : type === "follow" || type === "police" ? "ab-vis" : type === "train" ? "ab-train" : "ab-ge";
    for (let i = 0; i < H; i += 2) out.push(renderDef(`ge-${type}-${i}`, rot(base, yawOf(i)), P, cls));
    if (type === "catering" || type === "belt" || type === "stairs") { const up = gseMesh(type, { up: true }); for (let i = 0; i < H; i += 2) out.push(renderDef(`ge-${type}-${i}-up`, rot(up, yawOf(i)), P, cls)); }
  }
  for (const pose of ["stand", "walk", "marsh"]) { const base = personMesh(pose); for (let i = 0; i < H; i += 4) out.push(renderDef(`pp-${pose}-${i}`, rot(base, yawOf(i)), P, pose === "marsh" ? "ab-vis" : "ab-pp")); }
  for (let kd = 0; kd < 3; kd++) out.push(renderDef(`tr-${kd}`, treeMesh(kd), P, "ab-tree"));
  return out.join("");
}
