import { buildScene, fitCamera, HOME } from "../scene.mjs";
const s = buildScene(fitCamera(HOME));
const parts = (s.body.join("").match(/data-part="/g) || []).length;
console.log("parts", parts, "distinct names", s.count);
if (parts >= 300 && s.count >= 45) console.log("parts ok"); else process.exit(1);
