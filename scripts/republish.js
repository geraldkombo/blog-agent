// Re-publish an already-generated article from out/ (no LLM call)
// node scripts/republish.js <out-file.json> [target1,target2]
import "../lib/config.js";
import { readFileSync } from "node:fs";
import { publish } from "../lib/publishers.js";

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/republish.js out/xxx.json [targets]"); process.exit(1); }
const a = JSON.parse(readFileSync(file, "utf8"));
const targets = (process.argv[3] || process.env.PUBLISHERS || "buttondown").split(",").map((s) => s.trim());
for (const name of targets) {
  try {
    const r = await publish(name, a, (k) => process.env[k], { writeLocal: async (p) => p });
    console.log(`OK   ${name} -> ${r.url || r.id}`);
  } catch (e) {
    console.log(`FAIL ${name} -> ${e.message.slice(0, 200)}`);
  }
}
