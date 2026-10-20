#!/usr/bin/env node
import { runOnce, publisherStatus, config } from "./lib/pipeline.js";
import { providerStatus } from "./lib/llm.js";

const [, , cmd, ...rest] = process.argv;
const arg = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i !== -1 ? rest[i + 1] : undefined;
};
const flag = (name) => rest.includes(`--${name}`);

function status() {
  console.log("== LLM providers ==");
  const ps = providerStatus();
  for (const [n, s] of Object.entries(ps)) {
    console.log(`  ${s.configured ? "[x]" : "[ ]"} ${n.padEnd(14)} ${s.model}${config.llm.provider === n ? "  <- default" : ""}`);
  }
  console.log("\n== Publishers ==");
  const pubs = publisherStatus((k) => process.env[k]);
  for (const [n, s] of Object.entries(pubs)) {
    console.log(`  ${s.ready ? "[x]" : "[ ]"} ${n.padEnd(12)} ${s.label}`);
  }
  console.log(`\n  PUBLISHERS env: ${config.publishers.join(", ") || "(none)"}`);
  console.log(`  PUBLISH_MODE:   ${config.publishMode}`);
  console.log(`  BLOG_TOPIC:     ${config.topic || "(none -> topics.txt rotation)"}`);
}

try {
  if (cmd === "status" || !cmd) {
    status();
  } else if (cmd === "once") {
    const r = await runOnce({
      topic: arg("topic"),
      words: arg("words") ? parseInt(arg("words"), 10) : undefined,
      provider: arg("provider"),
      targets: arg("targets") ? arg("targets").split(",").map((s) => s.trim()) : undefined,
      dryRun: flag("dry-run"),
    });
    const failed = r.results.filter((x) => !x.ok);
    if (failed.length) process.exitCode = 1;
    console.log("\nDone.", JSON.stringify({ results: r.results.map(({ name, ok, url, error }) => ({ name, ok, url, error })) }, null, 2));
  } else if (cmd === "gen") {
    const r = await runOnce({ topic: arg("topic"), provider: arg("provider"), dryRun: true });
    console.log(r.article.body);
  } else {
    console.log(`usage: node run.js <command>
  status                              show configured providers/publishers
  once [--topic X] [--targets a,b] [--provider p] [--words n] [--dry-run]
  gen  [--topic X]                    generate + save locally only`);
    process.exitCode = 1;
  }
} catch (e) {
  console.error("ERROR:", e.message);
  process.exitCode = 1;
}
