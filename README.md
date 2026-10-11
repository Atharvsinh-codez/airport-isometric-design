# How an Airport Works

An interactive isometric model of a joint civil–military airfield, drawn entirely in SVG and running live in the browser. You can orbit the camera and follow any aircraft. Watch a whole day of operations: pushbacks, taxiing, take-offs, approaches, landings and stand turnarounds.

Made by Atharv [ https://x.com/athrix_codes ]

Made with FactoryAI

---

## What's in the model

- **Runway 09/27**: 2,800 m × 45 m, with edge lights, threshold bars, PAPI, an approach lighting system and a glide-slope mast.
- **Taxiways**: a parallel taxiway with hold-short bars, high-speed exits, and a separate military taxiway.
- **Terminal**: a two-floor hall, an eight-stand pier with jet bridges, baggage halls, a kerb canopy, bus bays and a taxi rank.
- **Airside support**: a cargo shed with a Boeing 747-8F freighter, a maintenance hangar, a fuel farm, a fire station and the control tower.
- **Military side**: hardened aircraft shelters, an F-16 flight line, a UH-60 helipad, a surveillance radar and an ammunition bunker.
- **Landside**: a multi-storey car park, rental cars, a roundabout, a rail link with platform and trains, and travellers walking the kerb.
- **A day clock**: lights come on at night, and beacons and strobes flash.

Every aircraft, truck and person is drawn 4.4× over scale so they stay readable against the 1:3,100 ground plan.

## Live operations

The simulation runs the full aircraft cycle:

1. **At the stand**: tug, belt loader, catering truck, fuel bowser, baggage train, stairs and a marshaller service the aircraft.
2. **Pushback**, then **taxi** to the runway hold.
3. **Hold short**, **line up**, **take-off roll** and **climb-out**.
4. **Final approach**, **landing roll**, runway exit and **taxi-in** to a free stand.

Fighters taxi and launch from the military line, a helicopter flies circuits from the helipad, and cars and coaches loop the terminal road.

The model includes the Airbus A320, Boeing 737-800, Boeing 777-300ER, Boeing 747-8F, ATR 72-600, F-16C and UH-60 Black Hawk.

## Controls

| Input | Action |
| --- | --- |
| Drag | Orbit the camera |
| Hover an aircraft | Show its type, phase, speed and altitude |
| `←` / `→` | Follow the previous / next aircraft |
| `Esc` | Stop following |
| `A` / `D` | Turn the camera left / right |
| `W` / `X` | Raise / lower the camera |
| `R` | Reset the camera |
| `S` | Slow motion |
| `Space` | Pause |
| `T` | Jump the clock forward 3 hours |
| `O` | Toggle colour on/off |

You can also set the camera from the URL, for example `#az=120&el=40`.

## Run it locally

You need Node.js 18 or newer.

```bash
npm install
npm run build
```

This writes two pages:

- `dist/index.html`: the dark theme
- `dist/light.html`: the light theme

Each page is a single self-contained file. Open it directly in a browser; no server is needed.

## Deploy to Vercel

The repo is ready for Vercel as-is. Import it, and `vercel.json` runs `npm run build` and serves the `dist/` folder:

- `/` loads the dark theme
- `/light.html` loads the light theme

## Project layout

| Path | Purpose |
| --- | --- |
| `model.mjs` | World layout and real dimensions: runway, stands, buildings, aircraft and vehicle specs |
| `scene.mjs` | Builds the static scene (ground, paint, lights, buildings) for any camera angle |
| `parts.mjs` | Aircraft, ground vehicles, people and trees as 3D meshes |
| `mesh.mjs`, `draw.mjs` | Mesh helpers and the drawing context |
| `engine3d.mjs` | Real-time 3D renderer for convex-part models, built for the next generation of aircraft |
| `live.js` | Browser runtime: camera orbit, simulation, day clock, follow mode and readout |
| `style.css` | Colours for both themes, liveries, night lighting |
| `build.mjs` | Bundles everything into the pages in `dist/` |
| `scripts/` | Headless-Chrome capture, interaction and cycle-check tools |

## Roadmap

- Rebuild every aircraft at true dimensions on the real-time 3D renderer: tapered swept wings, winglets, engines on pylons, retracting gear, doors, windows and airline liveries.
- Zoom and pan in the main figure.
- A 3D fleet viewer with turntable, gear toggle, exploded view and part-by-part info.

---

Made by Atharv [ https://x.com/athrix_codes ] · Made with FactoryAI
