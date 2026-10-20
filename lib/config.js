import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ROOT is "" on platforms without a filesystem URL (Cloudflare Workers); fs ops are guarded.
export const ROOT = (() => {
  try {
    return import.meta.url ? dirname(fileURLToPath(import.meta.url)) + "/.." : "";
  } catch {
    return "";
  }
})();

export const HAS_FS = Boolean(ROOT);

// minimal .env loader (no deps)
const envPath = HAS_FS ? join(ROOT, ".env") : "";
if (envPath && existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

const E = (k, d = "") => process.env[k] || d;

export const config = {
  llm: {
    provider: E("LLM_PROVIDER", "gemini"),
    model: E("LLM_MODEL", ""),
    keys: {
      gemini: E("GEMINI_API_KEY") || E("GOOGLE_GENERATIVE_AI_API_KEY"),
      groq: E("GROQ_API_KEY"),
      cerebras: E("CEREBRAS_API_KEY"),
      openrouter: E("OPENROUTER_API_KEY"),
      mistral: E("MISTRAL_API_KEY"),
      together: E("TOGETHER_API_KEY"),
      github: E("GITHUB_TOKEN"),
      gmi: E("GMI_API_KEY"),
      openaiCompat: E("OPENAI_COMPAT_KEY"),
    },
    openaiCompatBase: E("OPENAI_COMPAT_BASE", "https://api.gmi-serving.com/v1"),
    openaiCompatModel: E("OPENAI_COMPAT_MODEL", "Qwen/Qwen3.8-Max"),
    ollamaHost: E("OLLAMA_HOST", "http://127.0.0.1:11434"),
  },
  topic: E("BLOG_TOPIC", ""),
  words: parseInt(E("WORDS", "900"), 10),
  publishMode: E("PUBLISH_MODE", "draft"),
  publishers: E("PUBLISHERS", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  env: (k) => E(k),
};

export function loadTopics() {
  if (!HAS_FS) return [];
  const p = join(ROOT, "topics.txt");
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"));
}

export function nextTopic() {
  if (config.topic) return config.topic;
  const topics = loadTopics();
  if (!topics.length) return null;
  // day-of-year rotation
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = Math.floor((now - start) / 86400000);
  return topics[day % topics.length];
}
