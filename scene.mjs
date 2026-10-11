// The airbase scene: ground, paint, lights, buildings and the pre-rendered vehicle defs. buildScene(P) is pure, so live.js can redraw at any camera.
import * as k from "./kit/iso-kit.mjs";
import * as M from "./model.mjs";
import * as X from "./mesh.mjs";
import { ctx, bucket, rect, rot2, f2, TAU } from "./draw.mjs";
import { defsFor, aircraftMesh, renderDef, yawOf } from "./parts.mjs";
export { M };
export const WIDTH = 1600, HEIGHT = 900;
export const LABEL = "Airport and airbase operations model";
export const HOME = { azimuth: 60, elevation: 32 };
export const ZG = 0.5, ZP = 0.9, ZL = 1.02;             // grass top, pavement top, paint
const { PLATE, RUNWAY, TAXI_A, TAXI_M, APRON_LANE, STUBS, EXITS, PIER, HALL, STANDS, CARGO, HANGAR, FIRE, FUEL, TOWER, ROAD, CARPARK, ROUNDABOUT, RENTAL, MIL, GATE_X, MULTI, RAIL, WATCH } = M;
const seed = (n) => { let s = n * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };

export function fitCamera(cam) {
  const pts = [[PLATE.x0, PLATE.y0, -8], [PLATE.x1, PLATE.y0, -8], [PLATE.x1, PLATE.y1, -8], [PLATE.x0, PLATE.y1, -8], [PLATE.x0, PLATE.y0, 60], [PLATE.x1, PLATE.y1, 60], [PLATE.x1, PLATE.y0, 60], [PLATE.x0, PLATE.y1, 60]];
  return k.fitProjection(pts, WIDTH, HEIGHT, { pad: 4, azimuth: cam.azimuth, elevation: cam.elevation });
}
// routes shared with live.js (world units). Aircraft nose-in at stands face +y (heading index 4).
export const ROUTES = {
  apronLaneY: APRON_LANE.y, taxiY: TAXI_A.y, runwayY: RUNWAY.y, runwayX0: RUNWAY.x0, runwayX1: RUNWAY.x1, stubs: STUBS, exits: EXITS,
  stands: STANDS.map((s) => ({ ...s, y: s.y })), cargoStand: CARGO.stand, serviceY: -8, gseParkX: [-320, 320], bagHallX: [-310, 310],
  milLineY: MIL.line.y, milTaxiY: TAXI_M.y, milLine: Array.from({ length: 6 }, (_, i) => MIL.line.x0 + 40 + i * 44), heli: MIL.heli,
  road: { y: (ROAD.y0 + ROAD.y1) / 2, x0: ROAD.x0, x1: ROAD.x1 }, roundabout: ROUNDABOUT, carpark: CARPARK, kerbY: ROAD.y0 - 3, exitX: ROUNDABOUT.x, southY: PLATE.y1 + 20,
};

export function buildScene(P, { detail = 1 } = {}) {
  const c = ctx(P); const { at, S, L, slab, box, cyl, paint, dash, floorText, dot, line3, poly } = c;
  const B = bucket(); const names = new Set();
  const put = (name, p, svg, bias = 0) => { names.add(name.replace(/ [\d.-]+$/, "")); B.put(name, p, svg, bias); };
  const use = (id, p, extra = "") => { const o = at([0, 0, 0]); const q = at(p); return `<use href="#${id}" transform="translate(${f2(q[0] - o[0])} ${f2(q[1] - o[1])})"${extra}/>`; };
  const lamp = (p, cls = "", r = 0.7) => dot(p, r, `ab-lamp ${cls}`);
  const glow = (p, r) => dot(p, r, "ab-glow");
  const flat = []; const base = [];

  // ---- ground: plinth, grass, pavements
  base.push(box(PLATE.x0, PLATE.y0, PLATE.x1, PLATE.y1, -8, 8, { className: "ab-ground" }));
  base.push(box(PLATE.x0, PLATE.y0, PLATE.x1, PLATE.y1, 0, ZG, { className: "ab-grass", crease: "none" }));
  const pave = (plan, cls = "ab-pave") => base.push(slab(plan, ZG, ZP - ZG, { className: cls, crease: "none" }, 2));
  pave(rect(RUNWAY.x0 - 4, RUNWAY.y - RUNWAY.w / 2, RUNWAY.x1 + 4, RUNWAY.y + RUNWAY.w / 2), "ab-rwy");
  for (const x of [RUNWAY.x0 - 30, RUNWAY.x1 + 4]) pave(rect(x, RUNWAY.y - RUNWAY.w / 2, x + 26, RUNWAY.y + RUNWAY.w / 2));   // blast pads
  pave(rect(RUNWAY.x0 - 10, TAXI_A.y - TAXI_A.w / 2, RUNWAY.x1 + 10, TAXI_A.y + TAXI_A.w / 2));
  for (const x of STUBS) pave(rect(x - 4, RUNWAY.y, x + 4, TAXI_A.y));
  for (const x of EXITS) pave([[x, RUNWAY.y + 4], [x + 8, RUNWAY.y + 4], [x + 8 + 56, TAXI_A.y], [x + 56, TAXI_A.y]]);
  pave(rect(-330, APRON_LANE.y - 14, 330, PIER.y0 + 2));                                           // main apron
  pave(rect(-300, TAXI_A.y, -280, APRON_LANE.y), "ab-pave"); pave(rect(280, TAXI_A.y, 300, APRON_LANE.y));   // apron links
  pave(rect(CARGO.shed.x0 - 20, APRON_LANE.y - 14, CARGO.shed.x1 + 10, CARGO.shed.y0));             // cargo apron
  pave(rect(CARGO.shed.x0 - 10, CARGO.shed.y1, CARGO.shed.x1 + 10, CARGO.shed.y1 + 36)); pave(rect(MULTI.x0, MULTI.y0, MULTI.x1, MULTI.y1)); pave(rect(RAIL.x0, RAIL.y - 4, RAIL.x1, RAIL.y + 4), "ab-rwy"); pave(rect(RAIL.plat.x0 - 30, 294, RAIL.plat.x1 + 30, RAIL.plat.y0)); pave(rect(GATE_X - 10, 92, GATE_X + 10, ROAD.y0));
  pave(rect(HANGAR.x0 - 6, APRON_LANE.y - 14, FIRE.x1 + 6, HANGAR.y0 + 2));                         // hangar + fire apron
  pave(rect(TAXI_M.x0 - 10, TAXI_M.y - TAXI_M.w / 2, TAXI_M.x1, TAXI_M.y + TAXI_M.w / 2)); pave(rect(296, RUNWAY.y, 304, TAXI_M.y));   // military taxiway + crossing
  pave(rect(MIL.line.x0, MIL.line.y - 22, MIL.line.x1 + 20, TAXI_M.y)); pave(rect(MIL.shelters[0] - 30, MIL.y1 - 4, MIL.shelters[3] + 30, MIL.y1 + 30)); for (const x of MIL.shelters) pave(rect(x - 14, MIL.y1 - 2, x + 14, TAXI_M.y));
  base.push(cyl(MIL.heli.x, MIL.heli.y, 16, ZG, ZP - ZG, { className: "ab-pave", crease: "none" }, 36));
  pave(rect(ROAD.x0 - 20, ROAD.y0, ROAD.x1 + 20, ROAD.y1)); pave(rect(ROAD.x0 - 20, ROAD.y1 - 2, ROAD.x0 - 8, 300)); pave(rect(ROUNDABOUT.x - 6, ROAD.y1 - 2, ROUNDABOUT.x + 6, PLATE.y1));
  pave(rect(ROAD.x0 - 20, 288, ROUNDABOUT.x + 6, 300)); base.push(cyl(ROUNDABOUT.x, ROUNDABOUT.y, ROUNDABOUT.r + 7, ZG, ZP - ZG, { className: "ab-pave", crease: "none" }, 40)); base.push(cyl(ROUNDABOUT.x, ROUNDABOUT.y, ROUNDABOUT.r - 4, ZP, 0.3, { className: "ab-grass", crease: "none" }, 40));
  pave(rect(CARPARK.x0, CARPARK.y0, CARPARK.x1, CARPARK.y1)); pave(rect(RENTAL.x0, RENTAL.y0, RENTAL.x1, RENTAL.y1)); pave(rect(ROUNDABOUT.x - 6, ROUNDABOUT.y, 620, ROUNDABOUT.y + 12));
  pave(rect(-280, ROAD.y1, -100, 126)); pave(rect(-60, ROAD.y1, 60, 126));                            // bus bays and taxi rank
  pave(rect(HALL.x0 - 40, 92, HALL.x1 + 40, ROAD.y0)); pave(rect(-330, PIER.y0 - 1, 330, PIER.y1 + 8));   // forecourt pavement, pier service strip

  // ---- paint
  const rw = RUNWAY.w / 2, ry = RUNWAY.y;
  flat.push(paint([[RUNWAY.x0, ry - rw + 0.4], [RUNWAY.x1, ry - rw + 0.4]], "ab-paint ab-w", ZL), paint([[RUNWAY.x0, ry + rw - 0.4], [RUNWAY.x1, ry + rw - 0.4]], "ab-paint ab-w", ZL));
  flat.push(dash([RUNWAY.x0 + 60, ry], [RUNWAY.x1 - 60, ry], 10, 6, "ab-paint ab-w", ZL));
  for (const [x, s] of [[RUNWAY.x0 + 4, 1], [RUNWAY.x1 - 4, -1]]) { for (let i = 0; i < 12; i++) { const yy = ry - rw + 1 + i * 1.12; if (i === 5 || i === 6) continue; flat.push(paint([[x, yy], [x + s * 14, yy]], "ab-paint ab-w ab-fat", ZL)); } flat.push(floorText(x + s * 30, ry, ZL, s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? "09" : "27", 9, "middle", "ab-rwnum")); for (const yy of [ry - 4, ry + 4]) flat.push(paint([[x + s * 44, yy - 0.8], [x + s * 60, yy - 0.8]], "ab-paint ab-w ab-fat", ZL), paint([[x + s * 44, yy + 0.8], [x + s * 60, yy + 0.8]], "ab-paint ab-w ab-fat", ZL)); for (const yy of [ry - 5.5, ry - 3, ry + 3, ry + 5.5]) flat.push(paint([[x + s * 100, yy], [x + s * 112, yy]], "ab-paint ab-w", ZL)); }
  flat.push(paint([[RUNWAY.x0 - 10, TAXI_A.y], [RUNWAY.x1 + 10, TAXI_A.y]], "ab-paint ab-y", ZL), paint([[TAXI_M.x0 - 10, TAXI_M.y], [TAXI_M.x1 - 4, TAXI_M.y]], "ab-paint ab-y", ZL));
  for (const x of STUBS) { flat.push(paint([[x, ry + 2], [x, TAXI_A.y]], "ab-paint ab-y", ZL)); const hy = ry + rw + 7; flat.push(paint([[x - 4, hy], [x + 4, hy]], "ab-paint ab-y ab-fat", ZL), paint([[x - 4, hy + 1.3], [x + 4, hy + 1.3]], "ab-paint ab-y ab-fat", ZL), dash([x - 4, hy + 2.6], [x + 4, hy + 2.6], 1, 0.8, "ab-paint ab-y ab-fat", ZL), dash([x - 4, hy + 3.9], [x + 4, hy + 3.9], 1, 0.8, "ab-paint ab-y ab-fat", ZL)); flat.push(floorText(x - 6.5, hy + 2, ZL, 0, `A${STUBS.indexOf(x) + 1}`, 3.2, "middle")); }
  for (const x of EXITS) flat.push(paint([[x + 4, ry + 1], [x + 60, TAXI_A.y]], "ab-paint ab-y", ZL));
  flat.push(paint([[-300, TAXI_A.y + 3], [-300, APRON_LANE.y], [300, APRON_LANE.y], [300, TAXI_A.y + 3]], "ab-paint ab-y", ZL));
  flat.push(paint([[300, APRON_LANE.y], [CARGO.shed.x1, APRON_LANE.y]], "ab-paint ab-y", ZL), paint([[-300, APRON_LANE.y], [HANGAR.x0 + 10, APRON_LANE.y]], "ab-paint ab-y", ZL));
  flat.push(paint([[300, ry - 2], [300, TAXI_M.y]], "ab-paint ab-y", ZL), paint([[300 - 3.5, ry - rw - 7], [303.5, ry - rw - 7]], "ab-paint ab-y ab-fat", ZL), paint([[296.5, ry - rw - 8.3], [303.5, ry - rw - 8.3]], "ab-paint ab-y ab-fat", ZL));
  for (const s of STANDS) { flat.push(paint([[s.x, APRON_LANE.y + 6], [s.x, s.y + 8]], "ab-paint ab-y", ZL), paint([[s.x - 2.5, s.y + 8], [s.x + 2.5, s.y + 8]], "ab-paint ab-y ab-fat", ZL), floorText(s.x, APRON_LANE.y + 10, ZL, Math.PI / 2, String(s.id), 3.6), paint([[s.x - 30, s.y - 32], [s.x - 30, PIER.y0 - 10], [s.x + 30, PIER.y0 - 10], [s.x + 30, s.y - 32]], "ab-paint ab-fat", ZL)); }
  flat.push(paint([[CARGO.stand.x, APRON_LANE.y + 6], [CARGO.stand.x, CARGO.stand.y + 10]], "ab-paint ab-y", ZL), floorText(CARGO.stand.x, APRON_LANE.y + 10, ZL, Math.PI / 2, "C1", 3.6));
  flat.push(dash([-330, -12], [330, -12], 3, 2.4, "ab-paint", ZL), dash([-330, -4], [330, -4], 3, 2.4, "ab-paint", ZL), dash([330, -8], [CARGO.shed.x0, -8], 3, 2.4, "ab-paint", ZL), dash([-330, -8], [FIRE.x1, -8], 3, 2.4, "ab-paint", ZL));
  for (const x of MIL.line.slice ? [] : []) x; for (let i = 0; i < 6; i++) { const x = ROUTES.milLine[i]; flat.push(paint([[x, TAXI_M.y - 4], [x, MIL.line.y - 6]], "ab-paint ab-y", ZL)); }
  flat.push(c.ringL(MIL.heli.x, MIL.heli.y, 12, ZL, { className: "ab-paint ab-w ab-fat" }, 40), floorText(MIL.heli.x, MIL.heli.y, ZL, Math.PI / 2, "H", 12, "middle"));
  flat.push(dash([ROAD.x0 - 20, (ROAD.y0 + ROAD.y1) / 2], [ROUNDABOUT.x - 24, (ROAD.y0 + ROAD.y1) / 2], 4, 3, "ab-paint", ZL), dash([ROUNDABOUT.x, ROUNDABOUT.y + 26], [ROUNDABOUT.x, PLATE.y1], 4, 3, "ab-paint", ZL), dash([ROUNDABOUT.x + 26, ROUNDABOUT.y + 6], [620, ROUNDABOUT.y + 6], 4, 3, "ab-paint", ZL));
  for (let i = 0; i < 10; i++) flat.push(paint([[HALL.x0 + 60 + i * 1.3, ROAD.y0], [HALL.x0 + 60 + i * 1.3, ROAD.y1]], "ab-paint ab-w ab-fat", ZL), paint([[HALL.x1 - 60 - i * 1.3, ROAD.y0], [HALL.x1 - 60 - i * 1.3, ROAD.y1]], "ab-paint ab-w ab-fat", ZL));
  const bays = []; for (let row = 0; row < 4; row++) { const y0 = CARPARK.y0 + 10 + row * 34; for (let i = 0; i <= 31; i++) { const x = CARPARK.x0 + 8 + i * 6.8; flat.push(paint([[x, y0], [x, y0 + 7]], "ab-paint", ZL), paint([[x, y0 + 9], [x, y0 + 16]], "ab-paint", ZL)); if (i < 31) { bays.push([x + 3.4, y0 + 3.5, 12]); bays.push([x + 3.4, y0 + 12.5, 4]); } } }
  for (let i = 0; i <= 18; i++) { const x = RENTAL.x0 + 5 + i * 7; flat.push(paint([[x, RENTAL.y0 + 6], [x, RENTAL.y0 + 14]], "ab-paint", ZL), paint([[x, RENTAL.y1 - 14], [x, RENTAL.y1 - 6]], "ab-paint", ZL)); if (i < 18) { bays.push([x + 3.5, RENTAL.y0 + 10, 12, 1]); bays.push([x + 3.5, RENTAL.y1 - 10, 4, 1]); } }
  flat.push(paint([[-280, 126], [-100, 126]], "ab-paint ab-y", ZL), floorText(-190, 119, ZL, 0, "BUS", 4), paint([[-60, 126], [60, 126]], "ab-paint ab-y", ZL), floorText(0, 119, ZL, 0, "TAXI", 4));

  // ---- lights (flat layer): runway edge, threshold, taxiway, PAPI, approach
  for (let x = RUNWAY.x0; x <= RUNWAY.x1; x += 30) { flat.push(lamp([x, ry - rw - 1.2, ZL]), lamp([x, ry + rw + 1.2, ZL])); }
  for (let i = -5; i <= 5; i++) { flat.push(lamp([RUNWAY.x0 - 1, ry + i * 1.4, ZL], "ab-green", 0.55), lamp([RUNWAY.x1 + 1, ry + i * 1.4, ZL], "ab-red", 0.55)); }
  for (let x = RUNWAY.x0 - 8; x <= RUNWAY.x1 + 8; x += 24) flat.push(lamp([x, TAXI_A.y - TAXI_A.w / 2 - 1, ZL], "ab-blue", 0.45), lamp([x, TAXI_A.y + TAXI_A.w / 2 + 1, ZL], "ab-blue", 0.45));
  for (let x = TAXI_M.x0; x <= TAXI_M.x1; x += 24) flat.push(lamp([x, TAXI_M.y - 4.5, ZL], "ab-blue", 0.45), lamp([x, TAXI_M.y + 4.5, ZL], "ab-blue", 0.45));
  for (let i = 0; i < 14; i++) { const x = RUNWAY.x0 - 10 - i * 9; flat.push(paint([[x, ry - 5], [x, ry + 5]], "ab-paint", ZL)); for (let j = -2; j <= 2; j++) flat.push(lamp([x, ry + j * 2.5, ZL], "", 0.5)); if (i === 4) for (let j = -9; j <= 9; j += 1.6) flat.push(lamp([x, ry + j, ZL], "", 0.4)); }
  for (let i = 0; i < 6; i++) { const x = RUNWAY.x1 + 12 + i * 9; for (let j = -1; j <= 1; j++) flat.push(lamp([x, ry + j * 2.5, ZL], "ab-red", 0.5)); }

  // ---- sorted solids
  const papiX = RUNWAY.x0 + 110; for (let i = 0; i < 4; i++) { const y = ry - rw - 12 - i * 5; put(`PAPI box ${i}`, [papiX, y, ZG], box(papiX - 1.6, y - 1, papiX + 1.6, y + 1, ZG, 1.6, { className: "ab-bld" }) + lamp([papiX + 1.7, y, ZG + 1], i < 2 ? "" : "ab-red", 0.6)); }
  put("windsock", [RUNWAY.x0 + 40, ry + rw + 24, ZG], cyl(RUNWAY.x0 + 40, ry + rw + 24, 0.3, ZG, 9, {}, 6) + S(X.meshPaths(X.loft(X.mesh(), [X.circleAt(0, 0, 0, 1.3, 8), X.circleAt(5, 0, -0.4, 0.6, 8)].map((r) => r.map(([x, y, z]) => [RUNWAY.x0 + 40 + x, ry + rw + 24 + y, ZG + 9 + z])), { caps: true }), P), { className: "ab-vis" }));
  put("glide slope mast", [RUNWAY.x0 + 95, ry + rw + 40, ZG], box(RUNWAY.x0 + 94, ry + rw + 39, RUNWAY.x0 + 96, ry + rw + 41, ZG, 14) + box(RUNWAY.x0 + 93.5, ry + rw + 38.5, RUNWAY.x0 + 96.5, ry + rw + 41.5, ZG + 7, 0.5) + box(RUNWAY.x0 + 93.5, ry + rw + 38.5, RUNWAY.x0 + 96.5, ry + rw + 41.5, ZG + 13, 0.5) + box(RUNWAY.x0 + 92, ry + rw + 36, RUNWAY.x0 + 98, ry + rw + 44, ZG, 1.4, { className: "ab-bld" }));
  for (let i = 0; i < 12; i++) { const y = ry - 16 + i * 2.9; put(`localizer element ${i}`, [RUNWAY.x1 + 90, y, ZG], box(RUNWAY.x1 + 89.6, y - 0.4, RUNWAY.x1 + 90.4, y + 0.4, ZG, 2.4) + box(RUNWAY.x1 + 89.2, y - 1.3, RUNWAY.x1 + 90.8, y + 1.3, ZG + 2.4, 0.4)); }
  put("localizer hut", [RUNWAY.x1 + 100, ry + 24, ZG], box(RUNWAY.x1 + 96, ry + 21, RUNWAY.x1 + 104, ry + 27, ZG, 3, { className: "ab-bld" }));

  // pier (8 segments) with glass band and roof plant; jet bridges
  for (let i = 0; i < 8; i++) {
    const x0 = PIER.x0 + i * ((PIER.x1 - PIER.x0) / 8), x1 = x0 + (PIER.x1 - PIER.x0) / 8, cx = (x0 + x1) / 2;
    const inner = box(x0, PIER.y0 + 1, x1, PIER.y1 - 1, ZP + 2.6, 2.8, { className: "ab-glass", crease: "none" });
    put(`pier segment ${i}`, [cx, PIER.y1, ZP], box(x0, PIER.y0, x1, PIER.y1, ZP, 2.6, { className: "ab-bld" }) + inner + box(x0 - 0.4, PIER.y0 - 0.6, x1 + 0.4, PIER.y1 + 0.6, ZP + 5.4, 1.2, { className: "ab-bld" }) + box(cx - 3, PIER.y0 + 8, cx + 3, PIER.y0 + 14, ZP + 7, 1.6, { className: "ab-bld" }) + dash([x0 + 2, PIER.y0 - 0.1], [x1 - 2, PIER.y0 - 0.1], 2.2, 1.2, "iso-line", ZP + 4.5));
    const s = STANDS[i]; const doorX = s.x + 12, doorY = s.y + (s.big ? 40 : 21);     // L1 door of a nose-in aircraft
    const rotX = s.x + 16, rotY = PIER.y0 - 3;
    const ang = Math.atan2(doorY - rotY, doorX - rotX); const len = Math.hypot(doorX - rotX, doorY - rotY) - 3;
    const tun = (l0, l1, w, z, h) => [[rotX + Math.cos(ang) * l0 - Math.sin(ang) * w, rotY + Math.sin(ang) * l0 + Math.cos(ang) * w], [rotX + Math.cos(ang) * l1 - Math.sin(ang) * w, rotY + Math.sin(ang) * l1 + Math.cos(ang) * w], [rotX + Math.cos(ang) * l1 + Math.sin(ang) * w, rotY + Math.sin(ang) * l1 - Math.cos(ang) * w], [rotX + Math.cos(ang) * l0 + Math.sin(ang) * w, rotY + Math.sin(ang) * l0 - Math.cos(ang) * w]];
    put(`jet bridge ${i}`, [doorX, doorY, ZP], cyl(rotX, rotY, 2.6, ZP, 5.2, { className: "ab-bld" }, 16) + slab(tun(2, len * 0.55, 1.7, 0, 0), ZP + 3.2, 2.4, { className: "ab-bld" }) + slab(tun(len * 0.5, len, 1.5, 0, 0), ZP + 3.0, 2.2, { className: "ab-glass" }) + slab(tun(len - 2.5, len + 1.2, 2.2, 0, 0), ZP + 3.0, 2.6, { className: "ab-bld" }) + box(rotX + Math.cos(ang) * len * 0.8 - 0.4, rotY + Math.sin(ang) * len * 0.8 - 0.4, rotX + Math.cos(ang) * len * 0.8 + 0.4, rotY + Math.sin(ang) * len * 0.8 + 0.4, ZP, 3.1) + box(rotX + Math.cos(ang) * len * 0.8 - 1.4, rotY + Math.sin(ang) * len * 0.8 - 1.4, rotX + Math.cos(ang) * len * 0.8 + 1.4, rotY + Math.sin(ang) * len * 0.8 + 1.4, ZP, 0.7), 1);
    put(`stand equipment ${i}`, [s.x + 16, s.y + 14, ZP], box(s.x + 15, s.y + 13, s.x + 17.5, s.y + 15, ZP, 1.4, { className: "ab-vis" }) + box(s.x + 20, PIER.y0 - 6, s.x + 21.5, PIER.y0 - 4.5, ZP, 0.6) + c.ringL(s.x + 6, s.y - 2, 0.9, ZL, { tone: "mid" }, 12));
  }
  // main hall: two floors, curtain wall, roof trusses, skylights, HVAC, canopy over the kerb
  const hallSeg = 6; for (let i = 0; i < hallSeg; i++) {
    const x0 = HALL.x0 + i * ((HALL.x1 - HALL.x0) / hallSeg), x1 = x0 + (HALL.x1 - HALL.x0) / hallSeg, cx = (x0 + x1) / 2;
    let g = box(x0, HALL.y0, x1, HALL.y1, ZP, HALL.h, { className: "ab-bld" });
    g += box(x0 + 0.3, HALL.y1 - 0.4, x1 - 0.3, HALL.y1 + 0.5, ZP + 1, HALL.h - 2.2, { className: "ab-glass", crease: "none" });
    for (let m = 1; m < 7; m++) g += line3([[x0 + (m / 7) * (x1 - x0), HALL.y1 + 0.55, ZP + 1], [x0 + (m / 7) * (x1 - x0), HALL.y1 + 0.55, ZP + HALL.h - 1.2]], { tone: "faint" });
    g += line3([[x0 + 0.3, HALL.y1 + 0.55, ZP + 5.6], [x1 - 0.3, HALL.y1 + 0.55, ZP + 5.6]], { tone: "mid" });
    g += box(x0 - 0.6, HALL.y0 - 0.6, x1 + 0.6, HALL.y1 + 0.8, ZP + HALL.h, 1.2, { className: "ab-bld" });
    for (const t of [0.3, 0.7]) g += slab([[x0 + 4, HALL.y0 + 6], [x1 - 4, HALL.y0 + 6], [x1 - 4, HALL.y0 + 16], [x0 + 4, HALL.y0 + 16]].map(([x, y]) => [x, y + (t - 0.3) * 60]), ZP + HALL.h + 1.2, 2.4, { className: "ab-glass" }, 2, 0.8);
    g += box(cx - 4, HALL.y0 + 24, cx + 4, HALL.y0 + 32, ZP + HALL.h + 1.2, 2.2, { className: "ab-bld" }) + cyl(cx, HALL.y0 + 28, 1.6, ZP + HALL.h + 3.4, 0.5, {}, 12);
    put(`terminal hall ${i}`, [cx, HALL.y1, ZP], g);
    put(`kerb canopy ${i}`, [cx, ROAD.y0 - 2, ZP], box(x0 + 1, HALL.y1 + 1, x1 - 1, ROAD.y0 - 1, ZP + 6.2, 0.5, { className: "ab-bld" }) + cyl(x0 + 4, ROAD.y0 - 3, 0.35, ZP, 6.2, {}, 8) + cyl(x1 - 4, ROAD.y0 - 3, 0.35, ZP, 6.2, {}, 8) + (i % 2 ? "" : `${lamp([cx, ROAD.y0 - 3, ZP + 6.1], "", 0.6)}`), 1);
  }
  put("hall connector", [0, PIER.y1 + 4, ZP], box(-24, PIER.y1 - 1, 24, HALL.y0 + 1, ZP, 6, { className: "ab-bld" }) + box(-22, PIER.y1 + 0.5, 22, HALL.y0, ZP + 2.4, 2.8, { className: "ab-glass", crease: "none" }));
  for (const s of [1, -1]) put(`baggage hall ${s}`, [s * 310, 10, ZP], box(s * 300 - 22 * (s > 0 ? -1 : 1) * 0 + (s > 0 ? 2 : -46), 2, s > 0 ? 346 : -302, 24, ZP, 5.5, { className: "ab-bld" }) + dash([s > 0 ? 304 : -344, 1.9], [s > 0 ? 344 : -304, 1.9], 4, 2.4, "iso-line", ZP + 3.6) + box(s > 0 ? 300 : -346, 2, s > 0 ? 346 : -300, 24, ZP + 5.5, 0.8, { className: "ab-bld" }));
  // control tower
  { const t = TOWER; let g = box(t.x - 18, t.y - 12, t.x + 18, t.y + 12, ZP, 7, { className: "ab-bld" }) + box(t.x - 17, t.y + 11.6, t.x + 17, t.y + 12.5, ZP + 1, 5, { className: "ab-glass", crease: "none" });
    g += cyl(t.x, t.y, 6.4, ZP + 7, t.h - 14, { className: "ab-bld" }, 24) + cyl(t.x, t.y, 8.2, ZP + t.h - 20, 0.9, { className: "ab-bld" }, 24) + cyl(t.x, t.y, 9.4, ZP + t.h - 7, 1.6, { className: "ab-bld" }, 24) + cyl(t.x, t.y, 10.2, ZP + t.h - 5.4, 4.2, { className: "ab-glass" }, 24, 0.6) + cyl(t.x, t.y, 10.6, ZP + t.h - 1.2, 1.2, { className: "ab-bld" }, 24, 0.5);
    for (let m = 0; m < 12; m++) { const a = (m / 12) * TAU; g += line3([[t.x + Math.cos(a) * 10.25, t.y + Math.sin(a) * 10.25, ZP + t.h - 5.4], [t.x + Math.cos(a) * 10.25, t.y + Math.sin(a) * 10.25, ZP + t.h - 1.2]], { tone: "faint" }); }
    g += cyl(t.x, t.y, 0.35, ZP + t.h, 7, {}, 6) + S(X.meshPaths(X.sphere(X.mesh(), [t.x + 6.5, t.y - 4, ZP + t.h + 1.8], 2.0, 10, 5), P), { className: "ab-bld" }) + dot([t.x, t.y, ZP + t.h + 7], 1.1, "ab-beacon") + lamp([t.x, t.y, ZP + t.h + 7], "", 0.5);
    put("control tower", [t.x, t.y + 8, ZP], g); }
  // hangar with arched roof, half-open doors and an aircraft inside
  { const h = HANGAR; const w = h.x1 - h.x0; const arch = []; const N = 10; for (let i = 0; i <= N; i++) { const a = Math.PI * (i / N); arch.push([h.x0 + (w / 2) * (1 - Math.cos(a)), 0, ZP + h.h - 8 + Math.sin(a) * 8]); }
    const roof = X.prism(X.mesh(), [[h.x0, h.y0, ZP + h.h - 8], ...arch.slice(1, -1).map(([x, , z]) => [x, h.y0, z]), [h.x1, h.y0, ZP + h.h - 8]], [0, h.y1 - h.y0, 0]);
    let g = box(h.x0, h.y0, h.x1, h.y1, ZP, h.h - 8, { className: "ab-bld" }) + S(X.meshPaths(roof, P), { className: "ab-bld" });
    for (let i = 1; i < 5; i++) g += line3(arch.map(([x, , z]) => [x, h.y0 + (i / 5) * (h.y1 - h.y0), z + 0.05]), { tone: "faint" });
    g += use("ac-a320-12", [h.x0 + w / 2, h.y0 + 38, ZP]);
    g += box(h.x0 - 1, h.y0 - 1.2, h.x0 + w * 0.28, h.y0 - 0.2, ZP, h.h - 8.5, { className: "ab-bld" }) + box(h.x1 - w * 0.28, h.y0 - 1.2, h.x1 + 1, h.y0 - 0.2, ZP, h.h - 8.5, { className: "ab-bld" }) + box(h.x0 - 2, h.y0 - 1.6, h.x1 + 2, h.y0 + 0.2, ZP + h.h - 8.5, 1.2, { className: "ab-bld" });
    g += box(h.x0 + 2, h.y1 + 1, h.x0 + 40, h.y1 + 14, ZP, 5, { className: "ab-bld" }) + floorText(h.x0 + w / 2, h.y0 - 8, ZL, 0, "MAINTENANCE", 4.2);
    put("hangar", [h.x0 + w / 2, h.y1, ZP], g); }
  // fire station: three bays, tenders, hose tower
  { const f = FIRE; let g = box(f.x0, f.y0, f.x1, f.y1, ZP, f.h, { className: "ab-bld" }) + box(f.x0 - 0.5, f.y0 - 0.5, f.x1 + 0.5, f.y1 + 0.5, ZP + f.h, 0.8, { className: "ab-bld" }) + box(f.x1 - 6, f.y1 - 6, f.x1 - 1, f.y1 - 1, ZP + f.h, 9, { className: "ab-bld" });
    for (let i = 0; i < 3; i++) { const x = f.x0 + 8 + i * 16; g += poly([[x, f.y0 - 0.05, ZP + 0.1], [x, f.y0 - 0.05, ZP + 5.2], [x + 10, f.y0 - 0.05, ZP + 5.2], [x + 10, f.y0 - 0.05, ZP + 0.1]], { tone: "mid" }); }
    g += floorText((f.x0 + f.x1) / 2, f.y0 - 6, ZL, 0, "FIRE", 4.2) + dot([f.x1 - 3.5, f.y1 - 3.5, ZP + f.h + 9.2], 0.8, "ab-beacon");
    put("fire station", [(f.x0 + f.x1) / 2, f.y1, ZP], g);
    for (let i = 0; i < 2; i++) put(`crash tender ${i}`, [f.x0 + 13 + i * 16, f.y0 - 9, ZP], use("ge-firetruck-12", [f.x0 + 13 + i * 16, f.y0 - 9, ZP])); }
  // fuel farm: tanks with stairs and a bund wall, pump house, hydrant pipe
  { const f = FUEL; const cx = (f.x0 + f.x1) / 2; put("fuel bund wall", [cx, f.y1, ZG], S(k.extrude([[f.x0, f.y0], [f.x1, f.y0], [f.x1, f.y1], [f.x0, f.y1], [f.x0, f.y0 + 1], [f.x1 - 1, f.y0 + 1], [f.x1 - 1, f.y1 - 1], [f.x0 + 1, f.y1 - 1], [f.x0 + 1, f.y0 + 1], [f.x0, f.y0 + 1]], ZG, 1.6, P, { convex: false }), { className: "ab-bld" }), -3);
    [[f.x0 + 20, f.y0 + 20], [f.x0 + 20, f.y1 - 20], [f.x1 - 24, f.y0 + 20], [f.x1 - 24, f.y1 - 20]].forEach(([x, y], i) => { let g = cyl(x, y, 13, ZG, 9, { className: "ab-bld" }, 36) + cyl(x, y, 13.4, ZG + 8.6, 0.6, { className: "ab-bld" }, 36) + cyl(x, y, 1.2, ZG + 9.2, 0.8, {}, 10);
      for (let s = 0; s <= 10; s++) { const a0 = -1 + s * 0.22, a1 = a0 + 0.22; g += line3([[x + Math.cos(a0) * 13.6, y + Math.sin(a0) * 13.6, ZG + 0.4 + s * 0.86], [x + Math.cos(a1) * 13.6, y + Math.sin(a1) * 13.6, ZG + 0.4 + (s + 1) * 0.86]], { tone: "mid" }); }
      g += c.ringL(x, y, 13, ZG + 3, { tone: "faint" }, 36) + c.ringL(x, y, 13, ZG + 6, { tone: "faint" }, 36);
      put(`fuel tank ${i}`, [x, y + 13, ZG], g); });
    put("fuel pump house", [cx, f.y1 + 6, ZG], box(cx - 8, f.y1 + 2, cx + 8, f.y1 + 10, ZG, 3.6, { className: "ab-bld" }) + cyl(cx + 5, f.y1 + 6, 0.5, ZG + 3.6, 3, {}, 8));
    put("hydrant main", [f.x1 + 5, 20, ZG], line3([[f.x1 + 1, f.y0 + 20, ZG + 1.2], [f.x1 + 6, f.y0 + 20, ZG + 1.2], [f.x1 + 6, -8, ZG + 1.2], [f.x1 + 20, -8, ZG + 1.2]], { tone: "mid" }) + line3([[f.x1 + 1, f.y0 + 20, ZG + 2], [f.x1 + 6, f.y0 + 20, ZG + 2], [f.x1 + 6, -8, ZG + 2], [f.x1 + 20, -8, ZG + 2]], { tone: "mid" }) + dash([f.x1 + 20, -8], [330, -8], 0.1, 60, "ab-paint", ZL)); }
  // cargo shed, dock doors, ULDs, freighter and its highloader
  { const s = CARGO.shed; let g = box(s.x0, s.y0, s.x1, s.y1, ZP, s.h, { className: "ab-bld" }) + box(s.x0 - 0.6, s.y0 - 0.6, s.x1 + 0.6, s.y1 + 0.6, ZP + s.h, 0.9, { className: "ab-bld" });
    for (let i = 0; i < 7; i++) { const x = s.x0 + 8 + i * 17; g += line3([[x, s.y0 - 0.05, ZP + 0.1], [x, s.y0 - 0.05, ZP + 4], [x + 8, s.y0 - 0.05, ZP + 4], [x + 8, s.y0 - 0.05, ZP + 0.1]], { tone: "mid" }); }
    g += box(s.x0 + 4, s.y0 - 3, s.x1 - 4, s.y0, ZP, 1.2, { className: "ab-bld" }) + floorText((s.x0 + s.x1) / 2, s.y0 - 7, ZL, 0, "CARGO", 4.2);
    put("cargo shed", [(s.x0 + s.x1) / 2, s.y1, ZP], g);
    const rnd = seed(7); for (let i = 0; i < 14; i++) { const x = s.x0 + 6 + i * 9.6, y = s.y0 - 12 - (i % 2) * 5; put(`ULD container ${i}`, [x, y, ZP], box(x - 2.2, y - 1.6, x + 2.2, y + 1.6, ZP + 0.4, 2.2 + rnd() * 0.6, { className: "ab-ge" }, 0.4) + box(x - 2.6, y - 2, x + 2.6, y + 2, ZP, 0.4)); }
    put("freighter 747", [CARGO.stand.x, CARGO.stand.y + 10, ZP], use("ac-b747f-4", [CARGO.stand.x, CARGO.stand.y, ZP]));
    put("highloader", [CARGO.stand.x - 36, CARGO.stand.y + 2, ZP], box(CARGO.stand.x - 40, CARGO.stand.y - 1, CARGO.stand.x - 31, CARGO.stand.y + 3.4, ZP, 1.2, { className: "ab-ge" }) + box(CARGO.stand.x - 39, CARGO.stand.y - 0.6, CARGO.stand.x - 32, CARGO.stand.y + 3, ZP + 5.5, 0.6, { className: "ab-ge" }) + line3([[CARGO.stand.x - 39, CARGO.stand.y + 3.5, ZP + 1.2], [CARGO.stand.x - 32, CARGO.stand.y + 3.5, ZP + 5.5]], { tone: "mid" }) + line3([[CARGO.stand.x - 32, CARGO.stand.y + 3.5, ZP + 1.2], [CARGO.stand.x - 39, CARGO.stand.y + 3.5, ZP + 5.5]], { tone: "mid" }) + box(CARGO.stand.x - 37.5, CARGO.stand.y - 0.2, CARGO.stand.x - 33.5, CARGO.stand.y + 2.6, ZP + 6.1, 2.4, { className: "ab-ge" })); }
  // military: shelters, fighters, helipad, bunker, radar, blast fence
  for (const [i, x] of MIL.shelters.entries()) { const w = 26, d = MIL.y1 - MIL.y0; const N = 10; const arch = []; for (let j = 0; j <= N; j++) { const a = Math.PI * (j / N); arch.push([x - w / 2 + (w / 2) * (1 - Math.cos(a)), MIL.y1, ZG + Math.sin(a) * 9]); }
    const shell = X.prism(X.mesh(), arch, [0, -d, 0]); let g = S(X.meshPaths(shell, P), { className: "ab-bld" }) + box(x - w / 2 - 3, MIL.y0 - 2, x + w / 2 + 3, MIL.y0 + 3, ZG, 2, { className: "ab-bld" }, 1);
    g += line3([[x - 5, MIL.y1 + 0.05, ZG + 0.2], [x - 5, MIL.y1 + 0.05, ZG + 7.5]], { tone: "mid" }) + line3([[x + 5, MIL.y1 + 0.05, ZG + 0.2], [x + 5, MIL.y1 + 0.05, ZG + 7.5]], { tone: "mid" }) + box(x - w / 2 - 4, MIL.y1 - 2, x - 5, MIL.y1 + 0.8, ZG, 7.4, { className: "ab-bld" }) + box(x + 5, MIL.y1 - 2, x + w / 2 + 4, MIL.y1 + 0.8, ZG, 7.4, { className: "ab-bld" });
    put(`hardened shelter ${i}`, [x, MIL.y1, ZG], g); if (i % 2 === 0) put(`sheltered fighter ${i}`, [x, MIL.y1 + 4, ZP], use("ac-f16-4", [x, MIL.y1 - 10, ZP])); }
  for (let i = 0; i < 6; i++) { if (i === 1 || i === 4) continue; const x = ROUTES.milLine[i]; put(`fighter on line ${i}`, [x, MIL.line.y + 2, ZP], use("ac-f16-4", [x, MIL.line.y, ZP]) + box(x + 7, MIL.line.y + 5, x + 9, MIL.line.y + 7, ZP, 1.1, { className: "ab-mil" }) + use("pp-stand-4", [x + 5, MIL.line.y + 7, ZP])); }
  put("blast fence", [MIL.line.x1 + 14, MIL.line.y, ZG], S(k.extrude([[MIL.line.x1 + 12, MIL.line.y - 24], [MIL.line.x1 + 16, MIL.line.y - 24], [MIL.line.x1 + 16, MIL.line.y + 12], [MIL.line.x1 + 12, MIL.line.y + 12]], ZG, 5, P, {}), { className: "ab-bld" }));
  put("helicopter on pad", [MIL.heli.x, MIL.heli.y + 2, ZP], use("ac-uh60-14", [MIL.heli.x, MIL.heli.y, ZP]) + use("pp-stand-0", [MIL.heli.x - 12, MIL.heli.y + 8, ZP]) + use("ge-tug-0", [MIL.heli.x - 20, MIL.heli.y + 10, ZP]));
  for (let i = 0; i < 4; i++) put(`helipad floodlight ${i}`, [MIL.heli.x + Math.cos(i * 1.57 + 0.78) * 18, MIL.heli.y + Math.sin(i * 1.57 + 0.78) * 18, ZG], cyl(MIL.heli.x + Math.cos(i * 1.57 + 0.78) * 18, MIL.heli.y + Math.sin(i * 1.57 + 0.78) * 18, 0.25, ZG, 2.4, {}, 6) + lamp([MIL.heli.x + Math.cos(i * 1.57 + 0.78) * 18, MIL.heli.y + Math.sin(i * 1.57 + 0.78) * 18, ZG + 2.5], "", 0.5));
  { const b = MIL.bunker; put("ammunition bunker", [b.x, b.y + 14, ZG], slab({ x: b.x - 22, y: b.y - 14, w: 44, d: 28, r: 5 }, ZG, 6, { className: "ab-grass" }, 6, 0) + box(b.x - 5, b.y + 12, b.x + 5, b.y + 15, ZG, 3.6, { className: "ab-bld" }) + poly([[b.x - 3, b.y + 15.05, ZG + 0.2], [b.x - 3, b.y + 15.05, ZG + 2.8], [b.x + 3, b.y + 15.05, ZG + 2.8], [b.x + 3, b.y + 15.05, ZG + 0.2]], { tone: "mid" }) + line3([[b.x - 26, b.y - 18, ZG + 1.2], [b.x + 26, b.y - 18, ZG + 1.2], [b.x + 26, b.y + 20, ZG + 1.2]], { tone: "faint" }) + dot([b.x - 26, b.y - 18, ZG + 1.2], 0.35) + dot([b.x + 26, b.y + 20, ZG + 1.2], 0.35)); for (let i = -26; i <= 26; i += 6.5) put(`bunker fence post ${i}`, [b.x + i, b.y - 18, ZG], cyl(b.x + i, b.y - 18, 0.18, ZG, 1.3, {}, 5)); }
  { const r = MIL.radar; let g = ""; for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g += line3([[r.x + sx * 5, r.y + sy * 5, ZG], [r.x + sx * 1.6, r.y + sy * 1.6, ZG + 16]], { tone: "hi" }) + dot([r.x + sx * 5, r.y + sy * 5, ZG], 0.5) + dot([r.x + sx * 1.6, r.y + sy * 1.6, ZG + 16], 0.4); for (const z of [5, 10]) { const w = 5 - (z / 16) * 3.4; g += poly([[r.x - w, r.y - w, ZG + z], [r.x + w, r.y - w, ZG + z], [r.x + w, r.y + w, ZG + z], [r.x - w, r.y + w, ZG + z]], { tone: "faint" }); }
    g += box(r.x - 2.2, r.y - 2.2, r.x + 2.2, r.y + 2.2, ZG + 16, 0.6, { className: "ab-bld" }) + cyl(r.x, r.y, 0.5, ZG + 16.6, 1.6, {}, 8) + S(X.meshPaths(X.prism(X.mesh(), [[r.x - 5, r.y - 0.3, ZG + 18.2], [r.x + 5, r.y - 0.3, ZG + 18.2], [r.x + 4, r.y - 0.3, ZG + 21.4], [r.x - 4, r.y - 0.3, ZG + 21.4]], [0, 0.6, 0]), P), { className: "ab-bld" }) + box(r.x + 6, r.y - 6, r.x + 14, r.y, ZG, 3, { className: "ab-bld" }) + lamp([r.x, r.y, ZG + 21.6], "ab-red", 0.5);
    put("surveillance radar", [r.x, r.y + 5, ZG], g); }
  // apron floodlight masts, lamp posts, fence, gatehouse, trees
  for (const x of [-300, -150, 0, 150, 300, 390]) put(`apron mast ${x}`, [x, APRON_LANE.y - 18, ZP], cyl(x, APRON_LANE.y - 18, 0.45, ZP, 22, {}, 8) + box(x - 1.6, APRON_LANE.y - 18.6, x + 1.6, APRON_LANE.y - 17.4, ZP + 22, 0.8, { className: "ab-bld" }) + lamp([x, APRON_LANE.y - 18, ZP + 22.6], "", 0.9) + glow([x, APRON_LANE.y - 18, ZP + 22.6], 3.5), 2);
  const post = (x, y, z = ZP, arm = 1) => cyl(x, y, 0.2, z, 7, {}, 6) + line3([[x, y, z + 7], [x, y + arm * 1.6, z + 7.3]], { tone: "hi" }) + lamp([x, y + arm * 1.6, z + 7.2], "", 0.55) + glow([x, y + arm * 1.6, z + 7.2], 2);
  for (let x = -320; x <= 360; x += 40) put(`road lamp ${x}`, [x, ROAD.y1 + 1.5, ZP], post(x, ROAD.y1 + 1.5, ZP, -1), 1);
  for (let x = CARPARK.x0 + 20; x < CARPARK.x1; x += 48) for (const y of [CARPARK.y0 + 36, CARPARK.y0 + 104]) put(`car park lamp ${x}-${y}`, [x, y, ZP], post(x, y, ZP, 0), 1);
  for (let x = PLATE.x0 + 6; x <= PLATE.x1 - 6; x += 12) { put(`fence post N ${x}`, [x, PLATE.y0 + 6, ZG], cyl(x, PLATE.y0 + 6, 0.16, ZG, 1.6, {}, 5)); if (x < HALL.x0 - 30 || x > TOWER.x + 30) put(`fence post S ${x}`, [x, 92, ZG], cyl(x, 92, 0.16, ZG, 1.6, {}, 5)); }
  for (const [a, b] of [[[PLATE.x0 + 6, PLATE.y0 + 6, ZG + 1.4], [PLATE.x1 - 6, PLATE.y0 + 6, ZG + 1.4]], [[PLATE.x0 + 6, 92, ZG + 1.4], [HALL.x0 - 30, 92, ZG + 1.4]], [[TOWER.x + 30, 92, ZG + 1.4], [PLATE.x1 - 6, 92, ZG + 1.4]]]) base.push(line3([a, b], { tone: "faint" }), dot(a, 0.4), dot(b, 0.4));
  put("gatehouse", [GATE_X + 60, 92, ZG], box(GATE_X + 56, 86, GATE_X + 64, 92, ZG, 3.2, { className: "ab-bld" }) + box(GATE_X + 64, 90.6, GATE_X + 76, 91.4, ZG + 1.2, 0.3, { className: "ab-vis" }) + floorText(GATE_X + 70, 97, ZL, 0, "AIRSIDE GATE", 2.8));
  const rnd = seed(3); const trees = [];
  for (let x = PLATE.x0 + 14; x < RAIL.plat.x0 - 40 || (x > RAIL.plat.x1 + 40 && x < PLATE.x1 - 10); x += 16 + rnd() * 10) if (x < RAIL.plat.x0 - 40 || x > RAIL.plat.x1 + 40) trees.push([x, 300 + rnd() * 3, 2]);
  for (let y = 120; y < PLATE.y1 - 20; y += 18 + rnd() * 10) trees.push([PLATE.x0 + 14 + rnd() * 14, y, Math.floor(rnd() * 3)]), trees.push([PLATE.x1 - 14 - rnd() * 14, y, Math.floor(rnd() * 3)]);
  for (let x = CARPARK.x0 + 10; x < CARPARK.x1; x += 30) trees.push([x, CARPARK.y0 + 88 + rnd() * 2, 2]), trees.push([x, CARPARK.y1 + 10, Math.floor(rnd() * 2)]);
  for (let i = 0; i < 5; i++) trees.push([ROUNDABOUT.x + Math.cos(i * 1.26) * 7, ROUNDABOUT.y + Math.sin(i * 1.26) * 7, 2]);
  trees.forEach(([x, y, kd], i) => put(`tree ${i}`, [x, y, ZG], use(`tr-${kd}`, [x, y, ZG])));
  // parked cars, kerb traffic, buses, people
  const r2 = seed(11); const mix = ["car", "suv", "hatch", "van", "pickup", "car", "suv", "hatch"]; bays.forEach(([x, y, h, rental], i) => { if (r2() < (rental ? 0.75 : 0.66)) put(`parked car ${i}`, [x, y, ZP], use(`ge-${rental ? ["car", "suv", "hatch"][i % 3] : mix[Math.floor(r2() * mix.length)]}-${h}`, [x, y, ZP])); });
  [[-250, 120, 0], [-190, 120, 0], [-130, 120, 0]].forEach(([x, y, h], i) => put(`coach ${i}`, [x, y + 2, ZP], use(`ge-coach-${h}`, [x, y, ZP])));
  [[-50, 120], [-30, 120], [-10, 120], [10, 120], [30, 120]].forEach(([x, y], i) => put(`taxi ${i}`, [x, y + 1, ZP], use("ge-car-0", [x, y, ZP]) + box(x - 0.6, y - 0.4, x + 0.6, y + 0.4, ZP + 1.2, 0.3, { className: "ab-vis" })));
  const r3 = seed(5); for (let i = 0; i < 46; i++) { const x = HALL.x0 - 20 + r3() * (HALL.x1 - HALL.x0 + 40), y = 93 + r3() * 6; put(`traveller ${i}`, [x, y, ZP], use(`pp-${r3() < 0.5 ? "walk" : "stand"}-${[0, 4, 8, 12][Math.floor(r3() * 4)]}`, [x, y, ZP])); }
  for (let i = 0; i < 10; i++) { const x = -200 + r3() * 400, y = PIER.y1 + 2 + r3() * 4; put(`apron staff ${i}`, [x, y, ZP], use(`pp-${r3() < 0.5 ? "walk" : "stand"}-${[0, 4, 8, 12][Math.floor(r3() * 4)]}`, [x, y, ZP])); }
  for (let i = 0; i < 8; i++) { const x = CARGO.shed.x0 + 10 + r3() * 110, y = CARGO.shed.y0 - 20 - r3() * 10; put(`cargo handler ${i}`, [x, y, ZP], use(`pp-walk-${[0, 4, 8, 12][i % 4]}`, [x, y, ZP])); }
  for (let i = 0; i < 4; i++) put(`fire crew ${i}`, [FIRE.x0 + 40 + i * 3, FIRE.y0 - 4, ZP], use("pp-stand-12", [FIRE.x0 + 40 + i * 3, FIRE.y0 - 4, ZP]));
  for (let i = 0; i < 6; i++) put(`cargo dolly ${i}`, [CARGO.shed.x0 + 20 + i * 12, CARGO.shed.y0 - 26, ZP], use("ge-bagtrain-0", [CARGO.shed.x0 + 20 + i * 12, CARGO.shed.y0 - 26, ZP]));
  for (const [i, x] of ROUTES.gseParkX.entries()) { for (let j = 0; j < 4; j++) put(`GSE parking ${i}-${j}`, [x + (i ? 1 : -1) * j * 7, -22, ZP], use(["ge-tug-4", "ge-belt-4", "ge-stairs-4", "ge-bowser-4"][j], [x + (i ? 1 : -1) * j * 7, -22, ZP])); }
  // ---- v2: multi-storey car park, watch towers, rail link, cargo trucks, area labels
  { const q = MULTI; const kinds = ["car", "suv", "hatch", "van", "pickup", "car", "suv"]; const r4 = seed(21); const cx = (q.x0 + q.x1) / 2;
    for (let k = 0; k <= q.decks; k++) { const z = ZP + k * q.dh; let g = k ? box(q.x0, q.y0, q.x1, q.y1, z - 0.7, 0.7, { className: "ab-bld" }) : "";
      if (k) for (const [x0, y0, x1, y1] of [[q.x0, q.y0, q.x1, q.y0 + 0.6], [q.x0, q.y1 - 0.6, q.x1, q.y1], [q.x0, q.y0, q.x0 + 0.6, q.y1], [q.x1 - 0.6, q.y0, q.x1, q.y1]]) g += box(x0, y0, x1, y1, z, 1.1, { className: "ab-bld" });
      if (k < q.decks) for (let x = q.x0 + 5; x < q.x1 - 2; x += 17) for (const y of [q.y0 + 3, q.y0 + 48, q.y0 + 92, q.y1 - 3]) g += cyl(x, y, 0.55, z, q.dh - 0.7, { className: "ab-bld" }, 6);
      { for (let row = 0; row < 6; row++) { const y = q.y0 + 9 + row * 22 + (row % 2 ? 0 : 4); const h = row % 2 ? 4 : 12; for (let x = q.x0 + 7; x < q.x1 - 26; x += 6.8) { g += paint([[x - 3.4, y - 3.6], [x - 3.4, y + 3.6]], "ab-paint", z + 0.05); if (r4() < (k === q.decks ? 0.45 : 0.72)) g += use(`ge-${kinds[Math.floor(r4() * kinds.length)]}-${h}`, [x, y, z]); } } }
      g += cyl(q.x1 - 12, q.y0 + 70, 11, z, k < q.decks ? q.dh : 1.4, { className: k < q.decks ? "ab-bld" : "ab-glass" }, 28) + box(q.x0 + 1, q.y0 + 60, q.x0 + 9, q.y0 + 80, z, k < q.decks ? q.dh : 3.2, { className: "ab-bld" });
      if (k === q.decks) g += floorText(cx, q.y0 + 70, z + 1.2, 0, "P", 24, "middle") + floorText(q.x1 - 12, q.y0 + 70, z + 1.5, 0, "RAMP", 4, "middle");
      put(`car park deck ${k}`, [cx, q.y1 - 1, z], g); }
    flat.push(paint([[q.x1 - 1, q.y0 + 62], [q.x1 + 10, q.y0 + 62]], "ab-paint ab-y", ZL), paint([[q.x1 - 1, q.y0 + 78], [q.x1 + 10, q.y0 + 78]], "ab-paint ab-y", ZL), floorText(q.x1 + 5, q.y0 + 70, ZL, 0, "IN", 3, "middle"));
  }
  const watch = (name, t) => { let g = ""; for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g += cyl(t.x + sx * 2.2, t.y + sy * 2.2, 0.26, ZG, t.h, { className: "ab-bld" }, 6);
    for (let k = 1; k < 4; k++) g += box(t.x - 2.5, t.y - 2.5, t.x + 2.5, t.y + 2.5, ZG + (k * t.h) / 4, 0.3, { className: "ab-bld" });
    g += box(t.x - 3.6, t.y - 3.6, t.x + 3.6, t.y + 3.6, ZG + t.h, 0.5, { className: "ab-bld" }) + box(t.x - 2.9, t.y - 2.9, t.x + 2.9, t.y + 2.9, ZG + t.h + 0.5, 2.8, { className: "ab-glass", crease: "none" }) + box(t.x - 3.8, t.y - 3.8, t.x + 3.8, t.y + 3.8, ZG + t.h + 3.3, 0.5, { className: "ab-bld" });
    g += cyl(t.x, t.y, 0.14, ZG + t.h + 3.8, 1.6, {}, 4) + dot([t.x, t.y, ZG + t.h + 5.4], 0.7, "ab-beacon") + box(t.x - 3.6, t.y - 3.6, t.x + 3.6, t.y - 3.3, ZG + t.h + 0.5, 1.0, { className: "ab-bld" });
    put(name, [t.x, t.y + 3.6, ZG], g); put(`${name} guard`, [t.x + 1, t.y + 1, ZG + t.h + 0.5], use("pp-stand-4", [t.x + 1, t.y + 1, ZG + t.h + 0.5])); };
  watch("watch tower", WATCH); watch("gate watch tower", { x: GATE_X + 16, y: 82, h: 11 });
  flat.push(floorText(WATCH.x, WATCH.y + 10, ZL, 0, "WATCH TOWER", 3.2, "middle"), floorText(TOWER.x, TOWER.y + 22, ZL, 0, "CONTROL TOWER", 4, "middle"));
  { const rl = RAIL; flat.push(paint([[rl.x0, rl.y - 1.4], [rl.x1, rl.y - 1.4]], "ab-paint ab-w", ZL), paint([[rl.x0, rl.y + 1.4], [rl.x1, rl.y + 1.4]], "ab-paint ab-w", ZL)); for (let x = rl.x0 + 3; x < rl.x1; x += 5) flat.push(paint([[x, rl.y - 2.2], [x, rl.y + 2.2]], "ab-paint", ZL));
    for (const s of [-1, 1]) flat.push(paint([[ROUNDABOUT.x - 9, rl.y + s * 5], [ROUNDABOUT.x + 9, rl.y + s * 5]], "ab-paint ab-w ab-fat", ZL), dash([ROUNDABOUT.x - 9, rl.y + s * 3.2], [ROUNDABOUT.x + 9, rl.y + s * 3.2], 1.5, 1.2, "ab-paint ab-y", ZL));
    const pl = rl.plat; let g = box(pl.x0, pl.y0, pl.x1, pl.y1, ZP, 1.1, { className: "ab-pave" }) + paint([[pl.x0 + 1, pl.y1 - 0.8], [pl.x1 - 1, pl.y1 - 0.8]], "ab-paint ab-y", ZP + 1.15);
    for (let x = pl.x0 + 10; x < pl.x1; x += 20) g += cyl(x, (pl.y0 + pl.y1) / 2, 0.3, ZP + 1.1, 5.2, { className: "ab-bld" }, 6);
    g += box(pl.x0 + 4, pl.y0 - 1.5, pl.x1 - 4, pl.y1 + 1.5, ZP + 6.3, 0.5, { className: "ab-bld" }) + box(pl.x0 + 36, pl.y0 - 1, pl.x0 + 54, pl.y0 + 1, ZP + 1.1, 5.2, { className: "ab-glass", crease: "none" });
    put("rail platform", [(pl.x0 + pl.x1) / 2, pl.y1, ZP], g);
    for (let i = 0; i < 14; i++) { const x = pl.x0 + 6 + i * 8 + (i % 3), y = pl.y0 + 1.5 + (i % 2) * 2.5; put(`rail passenger ${i}`, [x, y, ZP + 1.1], use(`pp-${i % 4 === 0 ? "walk" : "stand"}-${[12, 12, 4, 8][i % 4]}`, [x, y, ZP + 1.1])); }
    [-50, -16, 18].forEach((x, i) => put(`train car ${i}`, [x + 2, rl.y + 2, ZP], use("ge-train-0", [x, rl.y, ZP])));
    for (let i = 0; i < 2; i++) put(`footbridge stair ${i}`, [pl.x0 + 44, i ? 302 : 288, ZP], box(pl.x0 + 40, i ? 300 : 286, pl.x0 + 48, i ? 306 : 294, ZP, 2.2, { className: "ab-bld" }));
    flat.push(floorText(pl.x1 + 26, pl.y0 + 3, ZL, 0, "RAIL LINK", 3.4, "middle")); }
  [340, 372, 404].forEach((x, i) => put(`cargo truck ${i}`, [x, CARGO.shed.y1 + 14, ZP], use("ge-truck-12", [x, CARGO.shed.y1 + 16, ZP])));
  put("road truck", [ROAD.x1 - 60, ROAD.y0 + 3, ZP], use("ge-truck-8", [ROAD.x1 - 60, ROAD.y0 + 3, ZP]));
  put("police car", [GATE_X - 6, 97, ZP], use("ge-police-0", [GATE_X - 6, 97, ZP]));
  for (const [t, x, y, sz] of [["MILITARY AREA", 330, MIL.y0 - 16, 5], ["CARGO", 385, CARGO.shed.y1 + 40, 4], ["FUEL FARM", -520, FUEL.y1 + 10, 4], ["FIRE STATION", -390, FIRE.y1 + 8, 3.4], ["HANGAR", -505, HANGAR.y1 + 7, 4], ["PARKING", -55, CARPARK.y1 + 8, 4], ["RENTAL CARS", 180, RENTAL.y0 - 7, 3.4], ["GATE", GATE_X, 110 - 14, 3], ["HELIPAD", MIL.heli.x, MIL.heli.y + 20, 3.4], ["RADAR", MIL.radar.x, MIL.radar.y + 14, 3.4], ["AMMO BUNKER", MIL.bunker.x, MIL.bunker.y + 18, 3.4]]) flat.push(floorText(x, y, ZL, 0, t, sz, "middle"));
  put("terminal roof sign", [0, HALL.y1 - 10, ZP + HALL.h], floorText(0, HALL.y0 + 30, ZP + HALL.h + 0.3, 0, "TERMINAL 1", 9, "middle"));
  const sortedLayer = B.render(c.depth);
  const defs = detail >= 1 ? `<defs>${defsFor(P, detail)}</defs>` : "";
  return {
    body: [defs, `<g data-layer="base">${base.join("")}</g>`, `<g data-layer="flat">${flat.join("")}</g>`, `<g data-layer="sorted">${sortedLayer}</g>`, `<g data-layer="air" class="ab-air"></g>`],
    count: names.size,
  };
}
