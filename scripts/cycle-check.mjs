// Runs the live model for ~12 simulated minutes in headless Chrome and checks every aircraft phase occurred.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const actions = [["wait", 800], ["eval", "(()=>{__ab.step(720); return 'SEEN=' + [...__ab.seen].join(',') + ' COST=' + Math.round(__ab.cost) + ' ENTS=' + __ab.ents.length})()"]];
writeFileSync("shots/_cycle.json", JSON.stringify(actions));
const r = spawnSync(process.execPath, ["scripts/drive.mjs", "airbase.html", "--actions", "shots/_cycle.json"], { encoding: "utf8" });
const out = r.stdout + r.stderr; const m = out.match(/SEEN=([^ ]*) COST=(\d+) ENTS=(\d+)/);
if (!m) { console.log(out.slice(-600)); process.exit(1); }
const seen = new Set(m[1].split(",")); const need = ["park", "push", "taxi", "hold", "lineup", "lined", "roll", "climb", "final", "rollout", "taxi-in"];
const missing = need.filter((p) => !seen.has(p));
console.log("phases seen:", [...seen].join(" "), "· redraw cost ms:", m[2], "· entities:", m[3]);
if (/exception|error/i.test(out)) console.log(out.match(/.*(exception|error).*/gi).slice(0, 3).join("\n"));
if (missing.length) { console.log("missing:", missing.join(" ")); process.exit(1); }
console.log("cycle ok");
