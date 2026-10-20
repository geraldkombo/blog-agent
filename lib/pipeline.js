import { generate } from "./llm.js";
import { publish, publisherStatus, mdToHtml } from "./publishers.js";
import { config, nextTopic, HAS_FS } from "./config.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./config.js";

const SYSTEM_STYLE = `You are a professional blog writer. Write factual, specific, engaging prose.
No hype, no filler intros ("In today's fast-paced world..."), no AI cliches.
Use short paragraphs, concrete numbers where possible, and clear H2 sections.`;

export function buildPrompt(topic, words) {
  return `${SYSTEM_STYLE}

Write a complete blog article about: ${topic}

Target length: ~${words} words.

Respond with ONLY a JSON object (no markdown fences) with exactly these keys:
{
  "title": "SEO title, 6-12 words, entity first, active voice, no date",
  "subtitle": "one standalone factual sentence with the key entity + claim",
  "slug": "lowercase-hyphenated-4-to-8-words",
  "tags": ["2-4 lowercase tags"],
  "body": "the article in Markdown: an intro paragraph, 3-5 H2 sections (## ...), at least one bullet list, a short conclusion"
}`;
}

export function parseArticle(text) {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("LLM did not return JSON: " + t.slice(0, 200));
  const a = JSON.parse(t.slice(start, end + 1));
  if (!a.title || !a.body) throw new Error("missing title/body in LLM JSON");
  a.slug = a.slug || a.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  a.tags = Array.isArray(a.tags) ? a.tags : [];
  a.html = mdToHtml(a.body);
  return a;
}

const FALLBACKS = ["gemini", "cerebras", "groq", "openrouter", "gmi", "github", "mistral", "together"];

export async function generateArticle({ topic, words, provider }) {
  const t = topic || nextTopic();
  if (!t) throw new Error("No topic. Set BLOG_TOPIC env var, pass --topic, or create topics.txt");
  const prompt = buildPrompt(t, words || config.words);
  const order = [provider || config.llm.provider, ...FALLBACKS].filter((v, i, arr) => arr.indexOf(v) === i);
  let lastErr;
  for (const name of order) {
    try {
      const raw = await generate(prompt, name);
      const a = parseArticle(raw);
      a.topic = t;
      a.provider = name;
      return a;
    } catch (e) {
      lastErr = e;
      console.log(`[llm] ${name} failed: ${e.message.slice(0, 120)}`);
    }
  }
  throw lastErr;
}

function saveLocal(a) {
  if (!HAS_FS) return "(no filesystem on this platform)";
  const dir = join(ROOT, "out");
  mkdirSync(dir, { recursive: true });
  const f = join(dir, `${new Date().toISOString().slice(0, 10)}-${a.slug}.json`);
  writeFileSync(f, JSON.stringify(a, null, 2));
  const mdf = join(dir, `${new Date().toISOString().slice(0, 10)}-${a.slug}.md`);
  writeFileSync(mdf, `# ${a.title}\n\n*${a.subtitle || ""}*\n\n${a.body}\n`);
  return f;
}

const helpers = {
  writeLocal: async (rel, content) => {
    if (!HAS_FS) return "(no filesystem)";
    const f = join(ROOT, rel);
    mkdirSync(join(f, ".."), { recursive: true });
    writeFileSync(f, content);
    return f;
  },
};

export async function runOnce({ topic, words, provider, targets, dryRun, log = console.log } = {}) {
  log(`[pipeline] generating article...`);
  const a = await generateArticle({ topic, words, provider });
  log(`[pipeline] title: ${a.title} (${a.body.split(/\s+/).length} words)`);
  const saved = saveLocal(a);
  log(`[pipeline] saved: ${saved}`);
  if (dryRun) return { article: a, saved, results: [] };

  const list = targets?.length ? targets : config.publishers;
  if (!list.length) { log("[pipeline] no publishers configured (set PUBLISHERS)"); return { article: a, saved, results: [] }; }
  const results = [];
  for (const name of list) {
    try {
      const r = await publish(name, a, (k) => process.env[k], helpers);
      log(`[publish] ${name}: OK ${r.url || r.id || ""}`);
      results.push({ name, ok: true, ...r });
    } catch (err) {
      log(`[publish] ${name}: FAILED ${err.message}`);
      results.push({ name, ok: false, error: err.message });
    }
  }
  return { article: a, saved, results };
}

export { publisherStatus, config };
