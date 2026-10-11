# Gates: airbase website with real-time 3D aircraft

OWNS: **

Scope: a Vercel-ready static website (dist/) around the orbitable airbase figure, with every aircraft rebuilt as true-dimension 3D convex-part models drawn in the Anatomy ink style, a 3D fleet viewer, and fast camera moves.

- [ ] G1: the site builds into dist/ with every section, meta tag and asset, inside its size budget
  CHECK: node scripts/check-build.mjs
  EXPECT: site build ok
  EVIDENCE: pending

- [ ] G2: every aircraft model is closed, convex part by part, ordered by separating planes, and measures its true length, span and height
  CHECK: node scripts/check-planes.mjs
  EXPECT: planes ok
  EVIDENCE: pending

- [ ] G3: the painter's order of every aircraft agrees with a ray-cast depth test across 24 headings and 3 elevations
  CHECK: node scripts/check-order.mjs
  EXPECT: order ok
  EVIDENCE: pending

- [ ] G4: the built page runs clean in headless Chrome through orbit, zoom, theme, fleet tabs, gear, explode and a phone viewport
  CHECK: node scripts/check-browser.mjs
  EXPECT: browser ok
  EVIDENCE: pending

- [ ] G5: no texture line ends in mid-air in the live figure
  CHECK: node scripts/lines.mjs dist/index.html --out shots/web-lines.png
  EXPECT: line ends: 0
  EVIDENCE: pending

- [ ] G6: no texture line ends in mid-air in the fleet viewer
  CHECK: node scripts/lines.mjs dist/index.html --select "#fleet .iso-plate" --out shots/web-lines-fleet.png
  EXPECT: line ends: 0
  EVIDENCE: pending

- [ ] G7: aircraft still complete the full ground-air cycle on the built page
  CHECK: node scripts/cycle-check.mjs
  EXPECT: cycle ok
  EVIDENCE: pending

- [ ] G8: orbit redraws, aircraft renders and simulation frames stay inside their time budgets in the browser
  CHECK: node scripts/check-perf.mjs
  EXPECT: perf ok
  EVIDENCE: pending

- [ ] G9: the Vercel config and every local link in dist/ resolve
  CHECK: node scripts/check-vercel.mjs
  EXPECT: vercel ok
  EVIDENCE: pending

- [ ] G10: every aircraft type read at 4x in the fleet viewer and in the scene, in both themes (manual: PNGs read and faults fixed)
  EVIDENCE: pending

- [ ] G11: full page read at 1440 and 390 wide in both themes (manual: PNGs read and faults fixed)
  EVIDENCE: pending
