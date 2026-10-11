import { buildScene, fitCamera, HOME } from "../scene.mjs";
import { gzipSync } from "node:zlib";
const P = fitCamera(HOME);
for (const detail of [0.5, 1]) {
  const t0 = performance.now();
  const s = buildScene(P, { detail });
  const t1 = performance.now();
  const body = s.body.join("");
  const parts = s.body.map((b) => b.length);
  console.log(`detail ${detail}: ${(t1 - t0).toFixed(0)} ms, ${body.length} bytes, gz ${gzipSync(body).length}, layers ${parts.join(",")}`);
}
