import { config } from "./config.js";

// ---- OpenAI-compatible chat ----
async function openaiCompat({ baseUrl, key, model, prompt, extraHeaders = {} }) {
  const r = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}`, ...extraHeaders },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.7 }),
  });
  if (!r.ok) throw new Error(`${model} @ ${baseUrl}: HTTP ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

// ---- Google Gemini REST ----
async function gemini({ key, model, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!r.ok) throw new Error(`gemini HTTP ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
}

// ---- Ollama local ----
async function ollama({ host, model, prompt }) {
  const r = await fetch(`${host}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
  });
  if (!r.ok) throw new Error(`ollama HTTP ${r.status} ${await r.text()}`);
  return (await r.json()).response ?? "";
}

const PROVIDERS = {
  gemini: {
    needs: (k) => k.gemini,
    model: "gemini-3.8-flash",
    run: (o) => gemini(o),
  },
  groq: {
    needs: (k) => k.groq,
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    run: (o) => openaiCompat(o),
  },
  cerebras: {
    needs: (k) => k.cerebras,
    baseUrl: "https://api.cerebras.ai/v1",
    model: "gpt-oss-120b",
    run: (o) => openaiCompat(o),
  },
  openrouter: {
    needs: (k) => k.openrouter,
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    run: (o) => openaiCompat({ ...o, extraHeaders: { "HTTP-Referer": "https://github.com/blog-agent", "X-Title": "blog-agent" } }),
  },
  mistral: {
    needs: (k) => k.mistral,
    baseUrl: "https://api.mistral.ai/v1",
    model: "mistral-small-latest",
    run: (o) => openaiCompat(o),
  },
  together: {
    needs: (k) => k.together,
    baseUrl: "https://api.together.xyz/v1",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    run: (o) => openaiCompat(o),
  },
  github: {
    needs: (k) => k.github,
    baseUrl: "https://models.inference.ai.azure.com",
    model: "gpt-4o-mini",
    run: (o) => openaiCompat(o),
  },
  gmi: {
    needs: (k) => k.gmi,
    baseUrl: "https://api.gmi-serving.com/v1",
    model: "Qwen/Qwen3.8-Max",
    run: (o) => openaiCompat(o),
  },
  "openai-compat": {
    needs: () => true,
    baseUrl: config.llm.openaiCompatBase,
    model: config.llm.openaiCompatModel,
    run: (o) => openaiCompat({ ...o, key: o.key || config.llm.keys.openaiCompat || config.llm.keys.gmi }),
  },
  ollama: {
    needs: () => true,
    host: config.llm.ollamaHost,
    model: "llama3.2",
    run: (o) => ollama(o),
  },
};

export function providerStatus() {
  const out = {};
  for (const [name, p] of Object.entries(PROVIDERS)) {
    out[name] = { configured: Boolean(p.needs(config.llm.keys)), model: config.llm.provider === name && config.llm.model ? config.llm.model : p.model };
  }
  return out;
}

export async function generate(prompt, providerName) {
  const name = providerName || config.llm.provider;
  const p = PROVIDERS[name];
  if (!p) throw new Error(`unknown LLM provider "${name}". Available: ${Object.keys(PROVIDERS).join(", ")}`);
  const key = config.llm.keys[name === "openai-compat" ? "openaiCompat" : name] || config.llm.keys.gmi;
  const model = config.llm.model || p.model;
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const text = await p.run({ baseUrl: p.baseUrl, host: p.host, key, model, prompt });
      if (!text.trim()) throw new Error(`${name} returned empty text`);
      return text;
    } catch (e) {
      lastErr = e;
      const transient = /HTTP (429|500|502|503|504|524)|high demand|Rate limit|timeout|fetch failed/i.test(e.message);
      if (!transient || attempt === 3) break;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastErr;
}
