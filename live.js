// live.js — orbit, clock, aircraft cycle, ground support, landside traffic, people, readout.
const R = AB.ROUTES, MD = AB.M, ZP = AB.ZP;
const stage = document.querySelector(".iso-stage"); const svg = stage.querySelector("svg"); const sceneRoot = svg.querySelector("[data-scene]");
const readout = document.querySelector(".iso-readout, [data-readout], .readout");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const camera = { azimuth: HOME.azimuth, elevation: HOME.elevation };
for (const [k, v] of new URLSearchParams(location.hash.slice(1))) { if (k === "az") camera.azimuth = +v; if (k === "el") camera.elevation = +v; }
const TAU = Math.PI * 2, H = MD.HEADINGS; const KT = MD.KT_TO_U;
const isoP = (p) => AB_iso(p); let O = [0, 0];
function AB_iso([x, y, z]) { const { origin, scale: k, azimuth, elevation } = P; const a = azimuth * Math.PI / 180, e = elevation * Math.PI / 180; const sinA = Math.sin(a), cosA = Math.cos(a), sinE = Math.sin(e), cosE = Math.cos(e); return [origin[0] + (x * sinA - y * cosA) * k, origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * k]; }
function depthP([x, y, z]) { const a = P.azimuth * Math.PI / 180, e = P.elevation * Math.PI / 180; return (x * Math.cos(a) + y * Math.sin(a)) * Math.cos(e) + z * Math.sin(e); }
let sortedLayer, airLayer, staticKeys = [], staticNodes = [];
function bindScene() {
  sortedLayer = svg.querySelector('[data-layer="sorted"]'); airLayer = svg.querySelector('[data-layer="air"]');
  staticNodes = [...sortedLayer.children].filter((n) => n.hasAttribute("data-k")); staticKeys = staticNodes.map((n) => +n.dataset.k); O = isoP([0, 0, 0]);
}
function successorOf(key) { let lo = 0, hi = staticKeys.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (staticKeys[mid] > key) hi = mid; else lo = mid + 1; } return staticNodes[lo] ?? null; }
// ---- entities
const ents = [];
function makeEnt(kind, extra) { const node = document.createElementNS("http://www.w3.org/2000/svg", "g"); node.setAttribute("class", "it dyn"); const use = document.createElementNS("http://www.w3.org/2000/svg", "use"); node.append(use); const e = { kind, node, use, x: 0, y: 0, z: 0, heading: 0, href: "", hidden: false, inAir: false, ...extra }; ents.push(e); return e; }
function setHref(e, href) { if (e.href !== href) { e.href = href; e.use.setAttribute("href", "#" + href); } }
const hIndex = (rad, step = 2) => { const i = Math.round(((rad / TAU) * H) / step) * step; return ((i % H) + H) % H; };
function place(e) {
  const hidden = e.dead || e.x < MD.PLATE.x0 - 420 || e.x > MD.PLATE.x1 + 420;
  if (hidden !== e.hidden) { e.hidden = hidden; e.node.style.display = hidden ? "none" : ""; }
  if (hidden) return;
  const q = isoP([e.x, e.y, ZP + e.z]); e.use.setAttribute("transform", `translate(${(q[0] - O[0]).toFixed(1)} ${(q[1] - O[1]).toFixed(1)})`);
  e.key = depthP([e.x, e.y, ZP]) + (e.bias ?? 0.3);
  const air = e.z > 3; if (air !== e.inAir) { e.inAir = air; (air ? airLayer : sortedLayer).append(e.node); }
  if (e.shadow) { const s = isoP([e.x, e.y, ZP]); e.shadow.setAttribute("transform", `translate(${(s[0] - O[0]).toFixed(1)} ${(s[1] - O[1]).toFixed(1)})`); e.shadow.style.opacity = Math.max(0, 1 - e.z / 80).toFixed(2); }
}
function sortDyn() {
  const list = ents.filter((e) => !e.hidden && !e.inAir).sort((a, b) => a.key - b.key);
  for (let i = list.length - 1; i >= 0; i--) { const e = list[i]; const succ = successorOf(e.key); const next = i + 1 < list.length && list[i + 1].key < (succ ? +succ.dataset.k : Infinity) ? list[i + 1].node : succ; if (e.node.nextSibling !== next) sortedLayer.insertBefore(e.node, next); }
}
// ---- paths: follow a polyline of [x, y, speed] with acceleration and smooth heading
function mover(e, pts, { accel = 2, turn = 1.2 } = {}) { e.path = pts; e.seg = 0; e.accel = accel; e.turn = turn; e.arrived = false; }
function stepMover(e, dt) {
  if (!e.path || e.arrived) return;
  const target = e.path[e.seg][2] ?? e.speed ?? 0; const floor = e.seg === e.path.length - 1 ? 0.9 : 0;
  e.speed = e.speed ?? 0; e.speed = e.speed < target ? Math.min(target, e.speed + e.accel * dt) : Math.max(Math.max(target, floor), e.speed - e.accel * 2.2 * dt);
  let left = e.speed * dt;
  while (left > 0 && e.seg < e.path.length) {
    const [tx, ty] = e.path[e.seg]; const dx = tx - e.x, dy = ty - e.y; const d = Math.hypot(dx, dy);
    if (d > 0.05) { const want = Math.atan2(dy, dx); let diff = ((want - e.heading + Math.PI) % TAU + TAU) % TAU - Math.PI; const maxTurn = e.turn * dt; e.heading += Math.abs(diff) < maxTurn ? diff : Math.sign(diff) * maxTurn; e.heading = ((e.heading + Math.PI) % TAU + TAU) % TAU - Math.PI; }
    if (d <= left) { e.x = tx; e.y = ty; left -= d; e.seg++; if (e.seg >= e.path.length) { e.arrived = true; if ((e.path[e.path.length - 1][2] ?? 1) === 0) e.speed = 0; break; } }
    else { e.x += (dx / d) * left; e.y += (dy / d) * left; left = 0; }
  }
}
// ---- aircraft
const CIVIL = ["a320", "b737", "b777", "atr72", "b737", "a320"];
let runwayBusy = null; let simT = 0, paused = false, slow = false;
const standBusy = new Map(); let follow = null, hoverFollow = null;
function spawnAircraft(type, extra) {
  const e = makeEnt("ac", { type, spec: MD.AIRCRAFT[type], speed: 0, mode: "gnd", phase: "idle", gse: [], ...extra });
  e.shadow = document.createElementNS("http://www.w3.org/2000/svg", "use"); e.node.prepend(e.shadow); e.bias = 0.6; return e;
}
const freeStands = () => R.stands.filter((s) => !standBusy.has(s.id));
function parkAt(e, s) { standBusy.set(s.id, e); e.stand = s; e.x = s.x; e.y = s.y; e.z = 0; e.heading = Math.PI / 2; e.phase = "park"; e.timer = 90 + Math.random() * 90; e.speed = 0; e.path = null; spawnGse(e); }
function startPush(e) { const s = e.stand; e.phase = "push"; e.timer = 0; e.pushTo = R.apronLaneY + 2; const tug = e.gse.find((g) => g.type === "tug"); if (tug) tug.attached = e; }
function taxiOut(e) { const s = e.stand; standBusy.delete(s.id); e.stand = null; const T = KT(16); e.phase = "taxi"; e.mode = "gnd";
  mover(e, [[-300, R.apronLaneY, T], [-300, R.taxiY, T], [-420, R.taxiY, T], [-420, R.runwayY + 16, KT(6)]], { accel: 1.5, turn: 0.9 }); }
function holdShort(e) { e.phase = "hold"; }
function lineUp(e) { e.phase = "lineup"; runwayBusy = e; mover(e, [[-420, R.runwayY + 2, KT(10)], [-412, R.runwayY, KT(8)]], { accel: 1.2, turn: 0.8 }); }
function roll(e) { e.phase = "roll"; e.heading = 0; mover(e, [[R.runwayX1 + 2000, R.runwayY, KT(e.spec.vr + 60)]], { accel: KT(e.spec.vr) / 34, turn: 2 }); }
function spawnArrival(type, s) { const e = spawnAircraft(type); e.x = -1100; e.y = R.runwayY; e.z = 150; e.heading = 0; e.speed = KT(150); e.mode = "app"; e.phase = "final"; e.toStand = s; standBusy.set(s.id, e); e.shadow.setAttribute("href", `#sh-${type}-0`); return e; }
function exitRunway(e) { runwayBusy = runwayBusy === e ? null : runwayBusy; const T = KT(16); e.phase = "taxi-in"; const s = e.toStand;
  mover(e, [[R.exits[1] + 56, R.taxiY, T], [300, R.taxiY, T], [300, R.apronLaneY, T], [s.x + 12, R.apronLaneY, KT(8)], [s.x, R.apronLaneY - 1, KT(5)], [s.x, s.y + 8, KT(4)], [s.x, s.y, 0]], { accel: 1.5, turn: 0.9 }); }
const SEEN = new Set(); const OUTBOUND = new Set(["push", "taxi", "hold", "lineup", "lined"]); const INBOUND = new Set(["final", "rollout", "taxi-in"]);
function stepAircraft(e, dt) {
  const sp = e.spec; SEEN.add(e.phase);
  switch (e.phase) {
    case "park": e.timer -= dt; if (e.timer <= 0 && e.gse.every((g) => g.kind !== "ge" || g.arrived || g.type === "tug") && !ents.some((a) => a.kind === "ac" && OUTBOUND.has(a.phase))) { startPush(e); } break;
    case "push": { e.timer += dt; const v = 1.6; e.y -= v * dt; if (e.y <= e.pushTo) { e.y = e.pushTo; e.timer2 = (e.timer2 ?? 0) + dt; const want = Math.PI; let diff = want - e.heading; e.heading += Math.min(Math.abs(diff), 0.35 * dt) * Math.sign(diff); if (Math.abs(diff) < 0.02) { for (const g of e.gse) if (g.type === "tug") { g.attached = null; sendHome(g); } taxiOut(e); } } else { const tug = e.gse.find((g) => g.type === "tug"); if (tug) { tug.x = e.x; tug.y = e.y + sp.lenU * 0.56 + 3; tug.heading = -Math.PI / 2; } } break; }
    case "taxi": stepMover(e, dt); if (e.arrived) holdShort(e); break;
    case "hold": { const arrivalNear = ents.some((a) => a.kind === "ac" && a.phase === "final" && a.x > -900); if (!runwayBusy && !arrivalNear) lineUp(e); break; }
    case "lineup": stepMover(e, dt); if (e.arrived) { e.timer = 2; e.phase = "lined"; } break;
    case "lined": e.timer -= dt; if (e.timer <= 0) roll(e); break;
    case "roll": stepMover(e, dt); if (e.speed >= KT(sp.vr) * 0.92) { e.phase = "climb"; e.vz = 0; } break;
    case "climb": stepMover(e, dt); e.vz = Math.min(e.vz + 6 * dt, 14); e.z = Math.min(160, e.z + e.vz * dt); e.mode = e.z < 4 ? "gnd" : e.z < 70 ? "up" : "air"; if (e.z > 25 && runwayBusy === e) runwayBusy = null; if (e.x > 1300) { kill(e); } break;
    case "final": { const td = R.runwayX0 + 100; e.x += e.speed * dt; const t = Math.min(1, Math.max(0, (e.x + 1100) / (td + 1100))); e.z = 150 * (1 - t) * (1 - t * 0.15); e.mode = "app"; if (e.x > -700 && !runwayBusy) runwayBusy = e; if (e.x >= td) { e.z = 0; e.mode = "gnd"; e.phase = "rollout"; mover(e, [[R.exits[1] - 30, R.runwayY, KT(40)], [R.exits[1] + 2, R.runwayY, KT(22)]], { accel: KT(60) / 10, turn: 2 }); } break; }
    case "rollout": stepMover(e, dt); if (e.arrived) exitRunway(e); break;
    case "taxi-in": stepMover(e, dt); if (e.arrived) { const s = e.toStand; e.toStand = null; parkAt(e, s); } break;
  }
  const hi = hIndex(e.heading);
  const suffix = e.mode === "gnd" ? "" : e.mode === "app" ? "-app" : e.mode === "up" ? "-up" : "-air";
  setHref(e, `ac-${e.type}-${suffix ? (e.heading > Math.PI / 2 && e.heading < 3 * Math.PI / 2 ? 8 : 0) : hi}${suffix}`);
  e.shadow.setAttribute("href", `#sh-${e.type}-${suffix ? (Math.cos(e.heading) < 0 ? 8 : 0) : hi}`);
}
function kill(e) { e.dead = true; e.node.remove(); const i = ents.indexOf(e); if (i >= 0) ents.splice(i, 1); if (follow === e) follow = null; }
// ---- military and helicopter
function spawnFighter(i) { const x = R.milLine[i]; const e = spawnAircraft("f16"); e.x = x; e.y = R.milLineY; e.heading = Math.PI / 2; e.phase = "mil-wait"; e.timer = 20 + i * 40; e.lineX = x; e.shadow.setAttribute("href", "#sh-f16-4"); return e; }
function stepFighter(e, dt) {
  switch (e.phase) {
    case "mil-wait": e.timer -= dt; if (e.timer <= 0) { e.phase = "mil-taxi"; mover(e, [[e.lineX, R.milTaxiY, KT(18)], [300, R.milTaxiY, KT(18)], [300, R.runwayY + 1, KT(8)], [296, R.runwayY, KT(6)]], { accel: 2, turn: 1 }); } break;
    case "mil-taxi": stepMover(e, dt); if (e.arrived) e.phase = "mil-hold"; break;
    case "mil-hold": if (!runwayBusy && !ents.some((a) => a.kind === "ac" && a.phase === "final" && a.x > -950)) { runwayBusy = e; e.phase = "mil-roll"; e.heading = Math.PI; mover(e, [[-3000, R.runwayY, KT(260)]], { accel: KT(160) / 16, turn: 2 }); } break;
    case "mil-roll": stepMover(e, dt); if (e.speed > KT(150)) { e.phase = "mil-climb"; e.vz = 0; } break;
    case "mil-climb": stepMover(e, dt); e.vz = Math.min(e.vz + 14 * dt, 30); e.z = Math.min(160, e.z + e.vz * dt); e.mode = e.z < 3 ? "gnd" : e.z < 60 ? "up" : "air"; if (e.z > 20 && runwayBusy === e) runwayBusy = null; if (e.x < -1300) { e.phase = "mil-away"; e.timer = 60 + Math.random() * 40; e.z = 150; } break;
    case "mil-away": e.timer -= dt; if (e.timer <= 0) { e.x = -1150; e.y = R.runwayY; e.heading = 0; e.speed = KT(170); e.mode = "app"; e.phase = "mil-final"; } break;
    case "mil-final": { const td = R.runwayX0 + 60; e.x += e.speed * dt; const t = Math.min(1, Math.max(0, (e.x + 1150) / (td + 1150))); e.z = 150 * (1 - t); if (e.x > -750 && !runwayBusy) runwayBusy = e; if (e.x >= td) { e.z = 0; e.mode = "gnd"; e.phase = "mil-rollout"; mover(e, [[260, R.runwayY, KT(40)], [300, R.runwayY, KT(10)], [300, R.milTaxiY, KT(14)], [e.lineX, R.milTaxiY, KT(14)], [e.lineX, R.milLineY, 0]], { accel: KT(60) / 10, turn: 1.2 }); } break; }
    case "mil-rollout": stepMover(e, dt); if (e.x > 250 && runwayBusy === e) runwayBusy = null; if (e.arrived) { e.heading = Math.PI / 2; e.phase = "mil-wait"; e.timer = 90 + Math.random() * 60; } break;
  }
  const suffix = e.mode === "gnd" ? "" : e.mode === "app" ? "-app" : e.mode === "up" ? "-up" : "-air"; const hi = hIndex(e.heading);
  setHref(e, `ac-f16-${suffix ? (Math.cos(e.heading) < 0 ? 8 : 0) : hi}${suffix}`); e.shadow.setAttribute("href", `#sh-f16-${suffix ? (Math.cos(e.heading) < 0 ? 8 : 0) : hi}`);
}
function spawnHeli() { const e = spawnAircraft("uh60"); e.x = R.heli.x + 40; e.y = R.heli.y + 36; e.heading = 0; e.phase = "heli-wait"; e.timer = 10; e.shadow.setAttribute("href", "#sh-uh60-0"); return e; }
function stepHeli(e, dt) {
  switch (e.phase) {
    case "heli-wait": e.timer -= dt; if (e.timer <= 0) { e.phase = "heli-up"; } break;
    case "heli-up": e.z = Math.min(28, e.z + 4 * dt); if (e.z >= 28) { e.phase = "heli-fly"; mover(e, [[320, e.y, 14], [320, -300, 14], [-100, -300, 14], [-100, e.y, 14], [R.heli.x + 40, e.y, 0]], { accel: 3, turn: 0.5 }); } break;
    case "heli-fly": stepMover(e, dt); if (e.arrived) e.phase = "heli-down"; break;
    case "heli-down": e.z = Math.max(0, e.z - 3 * dt); if (e.z <= 0) { e.phase = "heli-wait"; e.timer = 60; } break;
  }
  const hi = hIndex(e.heading, 2); setHref(e, e.phase === "heli-fly" ? `ac-uh60-${hIndex(e.heading, 4)}-fly` : `ac-uh60-${hi}`); e.shadow.setAttribute("href", `#sh-uh60-${hi}`);
}
// ---- ground support equipment per stand
function spawnGse(ac) {
  const s = ac.stand; const L = ac.spec.lenU; const side = s.x < 0 ? 0 : 1; const park = R.gseParkX[side];
  const plan = [["tug", s.x, s.y + L * 0.56 + 3, -Math.PI / 2, false], ["belt", s.x - 9, s.y + L * 0.18, 0, true], ["catering", s.x - 13, s.y + L * 0.36, 0, true], ["bowser", s.x + 16, s.y - 3, -Math.PI / 2, false], ["bagtrain", s.x - 14, s.y - L * 0.1, Math.PI / 2, false]];
  if (ac.spec.len < 30) plan.push(["stairs", s.x + 8, s.y - L * 0.2, Math.PI, true]);
  for (const [type, tx, ty, th, up] of plan) {
    const g = makeEnt("ge", { type, up, speed: 0, x: park + (side ? 1 : -1) * Math.random() * 20, y: R.serviceY, heading: side ? Math.PI : 0, finalHeading: th, home: [park + (side ? 1 : -1) * Math.random() * 16, R.serviceY] });
    mover(g, [[tx, R.serviceY, 4], [tx, ty, 2.5]], { accel: 3, turn: 2.5 }); g.owner = ac; ac.gse.push(g); g.bias = 0.3;
    if (type === "bagtrain") g.shuttle = { stand: [tx, ty], hall: [R.bagHallX[side], -16], timer: 8 };
  }
  const m = makeEnt("pp", { pose: "marsh", x: s.x, y: s.y + L * 0.56 + 10, heading: -Math.PI / 2, timer: 25 }); m.owner = ac; ac.gse.push(m); m.bias = 0.2;
  for (let i = 0; i < 3; i++) { const p = makeEnt("pp", { pose: i ? "stand" : "walk", x: s.x - 12 + i * 3, y: s.y + L * 0.1 + i * 2, heading: Math.random() * TAU }); p.owner = ac; ac.gse.push(p); p.bias = 0.2; }
}
function sendHome(g) { g.goingHome = true; mover(g, [[g.x, R.serviceY, 3], [g.home[0], g.home[1], 4]], { accel: 3, turn: 2.5 }); }
function stepGse(g, dt) {
  if (g.attached) return;
  if (g.owner && g.owner.phase !== "park" && g.owner.phase !== "push" && !g.goingHome) { if (g.kind === "pp") { kill(g); return; } sendHome(g); }
  if (g.goingHome && g.arrived) { kill(g); return; }
  if (g.shuttle && g.arrived && !g.goingHome) { g.shuttle.timer -= dt; if (g.shuttle.timer <= 0) { g.shuttle.timer = 10; const to = g.shuttle.at === "hall" ? g.shuttle.stand : g.shuttle.hall; g.shuttle.at = g.shuttle.at === "hall" ? "stand" : "hall"; mover(g, [[g.x, R.serviceY, 4], [to[0], R.serviceY, 4], [to[0], to[1], 2.5]], { accel: 3, turn: 2.5 }); } }
  stepMover(g, dt);
  if (g.arrived && !g.goingHome && g.finalHeading !== undefined) { let diff = ((g.finalHeading - g.heading + Math.PI) % TAU + TAU) % TAU - Math.PI; g.heading += Math.min(Math.abs(diff), 2.5 * dt) * Math.sign(diff); }
  if (g.kind === "pp") { setHref(g, `pp-${g.pose}-${hIndex(g.heading, 4)}`); return; }
  const up = g.up && g.arrived && !g.goingHome && Math.abs(((g.finalHeading - g.heading + Math.PI) % TAU + TAU) % TAU - Math.PI) < 0.1;
  setHref(g, `ge-${g.type}-${hIndex(g.heading, 2)}${up ? "-up" : ""}`);
}
// ---- landside: cars and coaches loop the road, people cross the kerb
function spawnCar(type = "car") {
  const e = makeEnt("car", { type, speed: 0, x: R.exitX - 2, y: R.southY + 20, heading: -Math.PI / 2, bias: 0.2 });
  const stopX = -120 + Math.random() * 260; const v = type === "coach" ? 6.5 : 9;
  mover(e, [[R.exitX - 2, R.roundabout.y + 24, v], [R.roundabout.x - 2, R.road.y + 3, v * 0.6], [stopX + 8, R.road.y + 3, v], [stopX, R.kerbY + 4, 0]], { accel: 4, turn: 1.6 }); e.stage = 0; e.dwell = 5 + Math.random() * 5; return e;
}
function stepCar(e, dt) {
  stepMover(e, dt);
  if (e.arrived && e.stage === 0) { e.dwell -= dt; if (e.dwell > 4.5 && e.dwell < 4.7) { const p = makeEnt("pp", { pose: "walk", x: e.x, y: e.y - 3, heading: -Math.PI / 2, bias: 0.2 }); mover(p, [[e.x + 2, 93, 1.4], [e.x + 2, 91.5, 0]], { accel: 2, turn: 3 }); p.dieAt = simT + 14; }
    if (e.dwell <= 0) { e.stage = 1; const v = e.type === "coach" ? 6.5 : 9; mover(e, [[R.road.x0 - 12, R.road.y + 3, v], [R.road.x0 - 14, 298, v], [R.exitX - 2, 298, v], [R.exitX - 2, R.southY + 30, v]], { accel: 4, turn: 1.6 }); } }
  if (e.arrived && e.stage === 1) { kill(e); return; }
  setHref(e, `ge-${e.vis ? "follow" : e.type}-${hIndex(e.heading, 2)}`);
}
function stepWalker(p, dt) { stepMover(p, dt); if (p.dieAt && simT > p.dieAt) { kill(p); return; } setHref(p, `pp-${p.pose}-${hIndex(p.heading, 4)}`); }
// ---- follow-me car on the service road
const followMe = makeEnt("car", { type: "car", vis: true, speed: 0, x: -100, y: R.serviceY, heading: 0, bias: 0.3 });
function stepFollowMe(e, dt) { if (!e.path || e.arrived) { const tx = -320 + Math.random() * 640; mover(e, [[tx, R.serviceY, 6]], { accel: 3, turn: 2 }); e.arrived = false; } stepMover(e, dt); setHref(e, `ge-follow-${hIndex(e.heading, 2)}`); }
// ---- initial population
for (const t of Object.values(MD.AIRCRAFT)) t.lenU = MD.U(t.len);
for (const [i, s] of R.stands.entries()) { if (i === 1 || i === 6) continue; const type = s.big ? "b777" : CIVIL[i % CIVIL.length]; const e = spawnAircraft(type); parkAt(e, s); e.timer = 15 + i * 30; }
for (const t of Object.values(MD.AIRCRAFT)) t.lenU = MD.U(t.len);
spawnArrival("b737", R.stands[1]).x = -600;
const taxiing = spawnAircraft("atr72"); taxiing.x = 200; taxiing.y = R.apronLaneY; taxiing.heading = Math.PI; taxiing.speed = KT(12); taxiing.phase = "taxi"; taxiing.mode = "gnd"; mover(taxiing, [[-300, R.apronLaneY, KT(16)], [-300, R.taxiY, KT(16)], [-420, R.taxiY, KT(16)], [-420, R.runwayY + 16, KT(6)]], { accel: 1.5, turn: 0.9 });
spawnFighter(1); spawnFighter(4); spawnHeli();
for (let i = 0; i < 6; i++) { const c = spawnCar(i === 5 ? "coach" : "car"); c.x = R.exitX - 2; c.y = R.southY - i * 30; }
let arrivalTimer = 40;
function stepWorld(dt) {
  simT += dt; arrivalTimer -= dt;
  if (arrivalTimer <= 0) { arrivalTimer = 70 + Math.random() * 50; const free = freeStands(); if (free.length && !ents.some((a) => a.kind === "ac" && INBOUND.has(a.phase))) { const s = free[Math.floor(Math.random() * free.length)]; spawnArrival(s.big ? "b777" : CIVIL[Math.floor(Math.random() * CIVIL.length)], s); } }
  if (ents.filter((e) => e.kind === "car").length < 7 && Math.random() < dt * 0.12) spawnCar(["car", "suv", "hatch", "van", "coach", "car", "pickup", "truck"][Math.floor(Math.random() * 8)]);
  for (const e of [...ents]) {
    if (e.kind === "ac") { if (e.type === "f16") stepFighter(e, dt); else if (e.type === "uh60") stepHeli(e, dt); else stepAircraft(e, dt); }
    else if (e.kind === "ge") stepGse(e, dt); else if (e.kind === "pp") { if (e.owner) stepGse(e, dt); else stepWalker(e, dt); }
    else if (e === followMe) stepFollowMe(e, dt); else if (e.kind === "car") stepCar(e, dt);
  }
  for (const e of ents) place(e); sortDyn();
}
// ---- day clock
let dayT = 0.42; const DAY_SECONDS = 150;
function stepDay(dt) { dayT = (dayT + dt / DAY_SECONDS) % 1; const hour = dayT * 24; const night = hour < 6.2 || hour > 18.8; if (night !== stage.hasAttribute("data-night")) { if (night) stage.setAttribute("data-night", ""); else stage.removeAttribute("data-night"); } return hour; }
const fmt = (h) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")}`;
const PH = { park: "at the stand, turnaround", push: "pushback", taxi: "taxiing to 09", hold: "holding short of 09", lineup: "lining up", lined: "cleared for take-off", roll: "take-off roll", climb: "climbing out", final: "on final for 09", rollout: "landing roll", "taxi-in": "taxiing to the stand", "mil-wait": "on the flight line", "mil-taxi": "taxiing", "mil-hold": "holding short", "mil-roll": "take-off roll, 27", "mil-climb": "climbing out", "mil-away": "on patrol", "mil-final": "on final for 09", "mil-rollout": "landing roll", "heli-wait": "on the helipad", "heli-up": "lifting off", "heli-fly": "circuit", "heli-down": "landing" };
function updateReadout(hour) {
  if (!readout) return; const f = follow ?? hoverFollow;
  let text;
  if (f && !f.dead) { const kt = Math.round((f.speed ?? 0) / KT(1)); const ft = Math.round(f.z * MD.UNIT_M / MD.OVER * 3.28 * 4); text = `${f.spec.name} · ${PH[f.phase] ?? f.phase} · ${kt} kt · ${f.phase === "mil-away" ? "—" : ft + " ft"} · ${fmt(hour)}`; }
  else { const ac = ents.filter((e) => e.kind === "ac"); const moving = ac.filter((e) => (e.speed ?? 0) > 0.1 || e.z > 0).length; text = `${ac.length} aircraft · ${moving} moving · ${standBusy.size}/8 stands · ${ents.filter((e) => e.kind === "ge").length} vehicles on the apron · ${fmt(hour)}`; }
  if (readout.textContent !== text) readout.textContent = text;
  for (const e of ents) { const on = e === f; if (on !== e.lit) { e.lit = on; if (on) e.node.setAttribute("data-follow", ""); else e.node.removeAttribute("data-follow"); } }
}
// ---- camera redraw
let drawnDetail = 1, redrawCost = 0;
function redraw(detail = 1) {
  const t0 = performance.now(); P = AB.fitCamera(camera); const scene = AB.buildScene(P, { detail });
  sceneRoot.innerHTML = scene.body.join(""); bindScene(); drawnDetail = detail;
  if (detail >= 1) { for (const e of ents) { e.inAir = false; e.hidden = false; sortedLayer.append(e.node); place(e); } sortDyn(); }
  redrawCost = performance.now() - t0;
  svg.querySelector('[data-layer="air"]').style.display = detail >= 1 ? "" : "none";
}
let drag = null, wantRedraw = 0, lastCoarse = 0;
stage.addEventListener("pointerdown", (e) => { if (e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, az: camera.azimuth, el: camera.elevation, moved: false }; stage.setPointerCapture(e.pointerId); });
stage.addEventListener("pointermove", (e) => {
  if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 3) { drag.moved = true; stage.setAttribute("data-orbiting", ""); } camera.azimuth = drag.az - dx * 0.35; camera.elevation = Math.max(12, Math.min(72, drag.el + dy * 0.3)); wantRedraw = 1; return; }
  const r = svg.getBoundingClientRect(); const sx = (e.clientX - r.left) * (AB.WIDTH / r.width), sy = (e.clientY - r.top) * (AB.HEIGHT / r.height);
  let best = null, bd = 42; for (const a of ents) { if (a.kind !== "ac" || a.hidden) continue; const q = isoP([a.x, a.y, ZP + a.z]); const d = Math.hypot(q[0] - sx, q[1] - sy); if (d < bd) { bd = d; best = a; } } hoverFollow = best;
});
const endDrag = () => { if (!drag) return; drag = null; stage.removeAttribute("data-orbiting"); wantRedraw = 2; };
stage.addEventListener("pointerup", endDrag); stage.addEventListener("pointercancel", endDrag); stage.addEventListener("pointerleave", () => { hoverFollow = null; });
stage.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase(); const acs = ents.filter((a) => a.kind === "ac");
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const i = acs.indexOf(follow); follow = acs[(i + (e.key === "ArrowRight" ? 1 : acs.length - 1) + (i < 0 ? 1 : 0)) % acs.length]; e.preventDefault(); }
  else if (k === "s") slow = !slow; else if (k === " ") { paused = !paused; e.preventDefault(); } else if (k === "o") stage.toggleAttribute("data-plain"); else if (k === "t") { dayT = (dayT + 3 / 24) % 1; }
  else if (k === "escape") follow = null; else if (k === "r") { camera.azimuth = HOME.azimuth; camera.elevation = HOME.elevation; wantRedraw = 2; }
  else if ("adwx".includes(k)) { if (k === "a") camera.azimuth += 6; if (k === "d") camera.azimuth -= 6; if (k === "w") camera.elevation = Math.min(72, camera.elevation + 6); if (k === "x") camera.elevation = Math.max(12, camera.elevation - 6); wantRedraw = 2; }
  else return; e.preventDefault();
});
// ---- main loop
bindScene(); for (const e of ents) { sortedLayer.append(e.node); }
let last = performance.now(), visible = true;
new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(stage);
if (camera.azimuth !== HOME.azimuth || camera.elevation !== HOME.elevation) redraw(1);
stepWorld(0.001); updateReadout(stepDay(0));
function frame(now) {
  const real = Math.min(0.1, (now - last) / 1000); last = now;
  if (wantRedraw === 1 && now - lastCoarse > 90) { redraw(0.5); lastCoarse = now; wantRedraw = drag ? 1 : 2; }
  else if (wantRedraw === 2 && !drag) { redraw(1); wantRedraw = 0; }
  if (visible && !paused && !reduced && drawnDetail >= 1) { const dt = real * MD.SIM_RATE * (slow ? 0.3 : 1); stepWorld(dt); updateReadout(stepDay(real)); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__ab = { camera, redraw, ents, seen: SEEN, get runwayBusy() { return runwayBusy && runwayBusy.type; }, get P() { return P; }, get cost() { return redrawCost; }, set hour(h) { dayT = h / 24; stepDay(0); }, step: (s) => { for (let i = 0; i < s * 10; i++) stepWorld(0.1); }, get follow() { return follow; }, set follow(e) { follow = e; } };
