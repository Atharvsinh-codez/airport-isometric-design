# Airbase — Anatomy Epic (framework-free SVG, orbitable, B&W ink)

Pattern copied from ~/repos/golden-gate: `scene.mjs` exports WIDTH/HEIGHT/HOME/MODEL/fitCamera/buildScene(P,{detail});
`build.mjs` renders once + bundles scene.mjs (esbuild iife global `AB`) into the page so `live.js` can redraw at any camera;
`live.js` = orbit drag (A/D/W/X/R), day clock, traffic, readout, pointer response. `style.css` tokens. Light theme via --light.
Tools: `export PATH=/home/ubuntu/tools/node/bin:$PATH CHROME_PATH=/home/ubuntu/.local/bin/google-chrome`
  node build.mjs [--light]; node scripts/capture.mjs airbase.html --out shots/x.png [--zoom x,y,w,h --zoom-scale 4 --width 1920 --height 1080];
  node scripts/lines.mjs airbase.html --out shots/lines.png (expect `line ends: 0`); node --experimental-websocket scripts/record.mjs ... --out clip.mp4

## Scale & world
1 unit ≈ 3.1 m (runway 2,800 m → 900 u). Plate 1120 × 640 u, z up. Aircraft drawn 2.2× over scale so they read; people ~1.3 u tall.
Camera HOME az 38 el 30 (orbit any az, el 10–72). Card 1200 × 700 viewBox.

## Layout (x east, y south/near)
- Runway 09/27: x −450..450, y 150..165 (45 m → 15 u). Taxiway A parallel y 190..198; stub taxiways every 150 u; hold-short bars; runway numbers "09"/"27" engraved, threshold stripes, centreline dashes, aiming blocks, PAPI boxes, approach lights beyond ends, edge lights (white), taxi edge lights (blue, data-lamp), wind sock, glide-slope antenna, localizer array.
- Apron y 215..330: 8 gates on a Y pier terminal (y 330..380 x −260..260), jet bridges (telescoping, hinged), stand lead-in lines, stand numbers, GPU boxes, fuel hydrant pits.
- Terminal: main hall (glass curtain wall lines, roof trusses, skylights, HVAC units), pier, control tower (shaft + cab + radar dome) at x 300 y 400, hangar (x −480..−330, y 240..340, sliding doors half open, aircraft inside), cargo shed + ULD dollies, fire station (3 crash tenders), fuel farm (4 tanks with stair + bund wall), radar tower, apron floodlight masts (6).
- Landside y 400..600: car park (grid 300 cars), bus lane, taxi rank, access road loop with roundabout, kerb drop-off with people, car rental lot, trees, fence line with gate posts.
- Military side ("airbase") x 330..520 y 170..330: hardened aircraft shelters ×4 (arched), fighter line (6 jets), helipad with H, blast fence, ammo bunker.

## Live
- Aircraft cycle: gate (doors/bridge) → pushback (tug) → taxi A → hold → line up → roll → rotate → climb (fade). Arrival: descend on glide path → flare → touchdown → rollout → exit → taxi → gate. 3–5 airborne/taxiing at once, 6–8 at gates. Types: A320, B737, B777, B747F (cargo), ATR72, F-16 (military), helicopter.
- GSE per occupied gate: tug, belt loader, catering truck (lifted), fuel bowser, baggage train (3 carts), stairs, GPU, lav truck. They drive on service roads (dashed) between gates and cargo shed.
- Landside: cars loop road/park; buses; people on kerb, in pier (through glass), on apron (hi-vis marshaller with wands).
- Day clock 90 s: edge lights, PAPI, beacon on tower (rotating), apron masts, car headlights at night.
- Readout: followed aircraft (type · phase · speed kt · alt ft) else movement counts · hour. Hover follows nearest aircraft; ← → steps; S slow; Space pauses; O colour (runway markings yellow/white, hi-vis).
- Pointer: nearest people turn to look (spring), apron lights brighten near pointer.

## Parts budget (≥ 300 distinct parts). Checklist by area in GATES.md.

## STATE (2026-10-11 ~08:10 UTC)
- Written: model.mjs, draw.mjs (ctx helpers; slab takes point-array via k.extrude or {x,y,w,d,r} via slabOf), mesh.mjs (own polygon renderer → kit paths), parts.mjs (aircraft/GSE/people/trees meshes, defsFor(P) ids: ac-<type>-<h> h∈{0,2,..,14} (+ -up/-app/-air for h 0/8; uh60 -fly h 0/4/8/12), sh-<type>-<h> shadows, ge-<type>-<h> h even (+ -up for catering/belt/stairs), pp-<stand|walk|marsh>-<0|4|8|12>, tr-0..2), scene.mjs (buildScene → body [defs, base, flat, sorted, air]; exports ROUTES, M, ZP=0.9), build.mjs, style.css, scripts/count.mjs.
- Defs are built at world origin; place with translate(at(p) − at([0,0,0])). Heading index i → yaw i·2π/16, 0 = +x (east); stands nose +y (index 4). Dynamic nodes must be inserted among sorted layer `data-k` keys (depthOf) like golden-gate.
- v2 build: 3.9 MB page, 777 parts, 49 kinds, console clean. live.js is still a placeholder — NEXT: write live.js, then audit/captures/light theme/MP4.

- live.js written (entities: ac/ge/pp/car; phases park→push→taxi→hold→lineup→roll→climb, final→rollout→taxi-in; fighters, heli, GSE per stand, cars+kerb walkers, follow-me; window.__ab debug with step(s), hour). Fixed name clash with kit's global `iso` (use isoP/depthP).

- 08:45 UTC: all mechanical checks pass informally (lines 0/670 both themes, cycle ok, console clean home/orbit/light/phone). Deliverables in shots/. Waiting on Atharv's 'run gates' to execute gate-check --approve; then blueprint update.
- v2.1: full-bleed page (.iso-page 100%), figure 1600x900 viewBox with pad 4 so the plate fills a 16:9 screen; capture 1080 stills with --scale 1; record.mjs full view = --zoom 0,0,1424,801 at the 1440 viewport.
