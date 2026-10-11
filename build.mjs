import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
const credit = `<p class="ab-credit">Made by <a href="https://x.com/athrix_codes" target="_blank" rel="noopener">https://x.com/athrix_codes</a></p>`;
const body = k.plateHtml({
  fig: "",
  hint: "Drag to orbit · hover or ← → to follow an aircraft · S slow · Space pause · O colour · T time",
  readout: "",
  body: `<div class="iso-stage" tabindex="0" data-plain role="group" aria-roledescription="interactive figure" aria-label="Airport and airbase operations model" style="position:relative">${svg}</div>`,
}).replace(`<span class="iso-plate-corner" data-corner="fig"></span>`, "") + credit;
// Hidden from people (display:none, aria-hidden) but present in the markup for crawlers and AI agents.
const about = `<div class="ab-about" hidden aria-hidden="true" style="display:none">Made by Atharvsinh Jadav. Portfolio - https://athrix.me. X - https://x.com/athrix_codes</div>`;
const meta = `<meta name="author" content="Atharvsinh Jadav"><meta name="description" content="Airport: an interactive isometric airport and airbase model. Made by Atharvsinh Jadav. Portfolio - https://athrix.me. X - https://x.com/athrix_codes"><link rel="me" href="https://athrix.me"><link rel="me" href="https://x.com/athrix_codes">`;
const page = k.pageHtml({ title: "Airport", theme, body: body + about, width: WIDTH + 60, script: kitScript() + "\n" + sceneBundle + "\n" + live })
  .replace("</style>", readFileSync(join(HERE, "style.css"), "utf8") + "</style>")
  .replace("<title>", meta + "<title>");
writeFileSync(join(HERE, theme === "light" ? "airbase-light.html" : "airbase.html"), page);
mkdirSync(join(HERE, "dist"), { recursive: true });
writeFileSync(join(HERE, "dist", theme === "light" ? "light.html" : "index.html"), page);
console.log("wrote", theme, "bytes", page.length, "parts", scene.count);
