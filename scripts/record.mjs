// Record a deterministic clip of the figure: virtual clock, one screenshot per frame, ffmpeg to mp4.
// node --experimental-websocket scripts/record.mjs <html#hash> --out clip.mp4 --zoom x,y,w,h --size 1920x1080 --seconds 5 --fps 30 [--key o] [--warm 2]
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = { out: "clip.mp4", seconds: 5, fps: 30, size: [1920, 1080], keys: [], warm: 2 };
for (let i = 0; i < args.length; i++) {
  const a = args[i], next = () => args[++i];
  if (a === "--out") opt.out = next();
  else if (a === "--zoom") opt.zoom = next().split(",").map(Number);
  else if (a === "--size") opt.size = next().split("x").map(Number);
  else if (a === "--seconds") opt.seconds = Number(next());
  else if (a === "--fps") opt.fps = Number(next());
  else if (a === "--key") opt.keys = next().split(",");
  else if (a === "--warm") opt.warm = Number(next());
  else opt.target = a;
}
const url = /^file:|^https?:/.test(opt.target) ? opt.target : pathToFileURL(resolve(opt.target)).href;
const profile = mkdtempSync(join(tmpdir(), "iso-record-"));
const chrome = spawn(process.env.CHROME_PATH || "google-chrome", ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "--allow-file-access-from-files", "about:blank"]);
const port = await new Promise((done) => {
  let text = "";
  chrome.stderr.on("data", (c) => { text += c; const m = text.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//); if (m) done(Number(m[1])); });
});
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const problems = [];
socket.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  else if (d.method === "Runtime.exceptionThrown") problems.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
};
await new Promise((r) => (socket.onopen = r));
const send = (method, params = {}) => new Promise((done) => { const c = ++id; pending.set(c, done); socket.send(JSON.stringify({ id: c, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await send("Runtime.enable");
await send("Page.enable");
// virtual clock: the page only advances when __step is called
await send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
  let t = 0, queue = [], n = 0;
  performance.now = () => t;
  window.requestAnimationFrame = (cb) => { queue.push([++n, cb]); return n; };
  window.cancelAnimationFrame = (h) => { queue = queue.filter((q) => q[0] !== h); };
  window.__step = (ms) => { t += ms; const run = queue; queue = []; for (const [, cb] of run) cb(t); return run.length; };
})();` });
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url });
await sleep(1500);
const box = await evaluate(`(()=>{const el=document.querySelector(".iso-plate")||document.querySelector(".iso-stage");el.scrollIntoView({block:"center"});const r=el.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY}})()`);
await sleep(300);
const frameMs = 1000 / opt.fps;
for (let i = 0; i < 4; i++) await evaluate(`__step(${frameMs})`);
if (opt.keys.length) {
  await evaluate(`(()=>{const f=document.querySelector('[tabindex="0"]');if(f)f.focus()})()`);
  for (const key of opt.keys) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key, code: `Key${key.toUpperCase()}`, text: key });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key, code: `Key${key.toUpperCase()}` });
  }
}
for (let i = 0; i < opt.warm * opt.fps; i++) await evaluate(`__step(${frameMs})`);
const [zx, zy, zw] = opt.zoom;
const zh = (zw * opt.size[1]) / opt.size[0];
const clip = { x: box.x + zx, y: box.y + zy, width: zw, height: zh, scale: opt.size[0] / zw };
const dir = mkdtempSync(join(tmpdir(), "iso-frames-"));
const total = Math.round(opt.seconds * opt.fps);
for (let f = 0; f < total; f++) {
  const shot = await send("Page.captureScreenshot", { format: "png", clip });
  writeFileSync(join(dir, `f${String(f).padStart(4, "0")}.png`), Buffer.from(shot.result.data, "base64"));
  await evaluate(`__step(${frameMs})`);
}
const out = resolve(opt.out);
const ff = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(opt.fps), "-i", join(dir, "f%04d.png"),
  "-vf", `scale=${opt.size[0]}:${opt.size[1]}:flags=lanczos`, "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: "inherit" });
console.log(`frames ${total} · ${ff.status === 0 ? "wrote " + out : "ffmpeg failed"} · exceptions: ${problems.length ? problems.join(" | ") : "none"}`);
chrome.kill("SIGKILL");
try { rmSync(profile, { recursive: true, force: true }); } catch {}
rmSync(dir, { recursive: true, force: true });
process.exit(0);
