import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import * as k from "./kit/iso-kit.mjs";
import { kitScript } from "./scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { buildScene, fitCamera, LABEL, WIDTH, HEIGHT, HOME } from "./scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const P = fitCamera(HOME);
const scene = buildScene(P);
const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: ["<g data-scene>", ...scene.body, "</g>"] });
const sceneBundle = esbuild.buildSync({ entryPoints: [join(HERE, "scene.mjs")], bundle: true, format: "iife", globalName: "AB", write: false, minify: true, target: "es2020" }).outputFiles[0].text;
const live = `let P = ${JSON.stringify(P)};\nconst HOME = ${JSON.stringify(HOME)};\n${readFileSync(join(HERE, "live.js"), "utf8")}`;
const body = k.plateHtml({
  fig: "Fig 1",
  title: "How an airport works",
  hint: "Drag to orbit · hover or ← → to follow an aircraft · S slow · Space pause · O colour · T time",
  readout: "",
  keys: [
    { mark: "lit", label: "the followed aircraft" },
    { mark: "raised", label: "lit at night: runway edge, PAPI, apron masts, beacon" },
    { mark: "flat", label: "painted lines: centreline, hold-short, stand lead-in" },
  ],
  caption: `A relief model of a joint civil–military airfield at about 1:3,100 in plan, with every aircraft, truck and person drawn ${M.OVER}× over scale so they read. Runway 09/27 is ${M.RUNWAY.len_m.toLocaleString()} m × 45 m; a parallel taxiway with hold-short bars feeds eight nose-in stands on a pier, a cargo apron with a 747 freighter, a maintenance hangar, fuel farm, fire station and tower. North of the runway the air-force side has hardened shelters, a fighter line, a helipad and a radar. Departures push back, taxi, hold, roll and climb out; arrivals fly the glide slope, flare, roll out and taxi in, while catering, fuel, baggage and buses turn each stand around.`,
  body: `<div class="iso-stage" tabindex="0" data-plain role="group" aria-roledescription="interactive figure" aria-label="Airport and airbase operations model" style="position:relative">${svg}</div>`,
});
const page = k.pageHtml({ title: "How an airport works", theme, body, width: WIDTH + 60, script: kitScript() + "\n" + sceneBundle + "\n" + live })
  .replace("</style>", readFileSync(join(HERE, "style.css"), "utf8") + "</style>");
writeFileSync(join(HERE, theme === "light" ? "airbase-light.html" : "airbase.html"), page);
console.log("wrote", theme, "bytes", page.length, "parts", scene.count);
