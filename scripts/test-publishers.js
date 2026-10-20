import "../lib/config.js"; // loads .env into process.env
import { publish } from "../lib/publishers.js";

const article = {
  title: "blog-agent publisher test",
  subtitle: "Automated end-to-end test of the blog-agent publishing adapters.",
  slug: "blog-agent-publisher-test",
  tags: ["test"],
  body: "This is a test post created by the blog-agent pipeline.\n\n## What this proves\n\n- The publishing adapters work\n- Markdown converts to HTML\n\nIf you can read this, the platform accepted the post.",
};

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ["telegraph", "writeas"];
for (const name of targets) {
  try {
    const r = await publish(name, article, (k) => process.env[k], { writeLocal: async (p, c) => p });
    console.log(`OK   ${name} -> ${r.url || r.id}`);
  } catch (e) {
    console.log(`FAIL ${name} -> ${e.message.slice(0, 200)}`);
  }
}
