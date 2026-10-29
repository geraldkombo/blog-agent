// Cloudflare Workers free tier — 100k req/day + free cron triggers
// Deploy: npx wrangler deploy  (from blog-agent root, using this config)
// Secrets: npx wrangler secret put LLM_PROVIDER / GEMINI_API_KEY / BUTTONDOWN_API_KEY / ...
import { runOnce } from "../../lib/pipeline.js";

// Workers have no topics.txt, so rotate the same list by day-of-year.
const TOPICS = [
  "AI tools for Kenyan small businesses in 2026",
  "How newsletter creators make their first $1,000",
  "Free-tier cloud platforms compared for side projects",
  "Building an automated content pipeline with open-source tools",
  "SEO basics for newsletters: titles, slugs and schema",
  "The rise of MCP: connecting AI agents to real services",
  "Digital journalism in East Africa: trends and funding",
  "How to fact-check AI-generated articles before publishing",
];

function todaysTopic() {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = Math.floor((now - start) / 86400000);
  return TOPICS[day % TOPICS.length];
}

// Replace the bound process object rather than mutating process.env, which may be
// a read-only getter under nodejs_compat. config.js reads process.env at call time.
function bindEnv(env) {
  globalThis.process = { ...(globalThis.process || {}), env };
  return env;
}

export default {
  async scheduled(event, env, ctx) {
    bindEnv(env);
    ctx.waitUntil(runOnce({ topic: todaysTopic() }));
  },
  async fetch(request, env, ctx) {
    bindEnv(env);
    const url = new URL(request.url);
    if (url.pathname === "/health") return new Response("ok");
    const hasKey = Boolean(env.CRON_SECRET) && url.searchParams.get("key") === env.CRON_SECRET;
    if (url.pathname === "/" && !hasKey) {
      return new Response(
        `<!doctype html><meta charset="utf-8"><title>blog-agent</title>
<body style="font-family:system-ui;max-width:640px;margin:4rem auto;padding:0 1rem">
<h1>blog-agent</h1>
<p>Autonomous blogging pipeline. Runs daily at 05:30 UTC (cron) and on demand.</p>
<p><b>Manual run</b> (requires key):</p>
<pre>/run?key=YOUR_KEY&amp;topic=Your+topic+here&amp;targets=buttondown&amp;dry=1</pre>
<ul>
<li><code>topic</code> — optional, defaults to topics.txt rotation</li>
<li><code>targets</code> — optional, defaults to PUBLISHERS env</li>
<li><code>words</code> — optional, defaults to WORDS env</li>
<li><code>dry=1</code> — generate only, don't publish</li>
</ul>
<p><a href="/health">/health</a></p>`,
        { headers: { "content-type": "text/html; charset=utf-8" } }
      );
    }
    if (!hasKey) return new Response("unauthorized — add ?key=YOUR_KEY", { status: 401 });
    const out = await runOnce({
      topic: url.searchParams.get("topic") || todaysTopic(),
      targets: url.searchParams.get("targets") ? url.searchParams.get("targets").split(",") : undefined,
      words: url.searchParams.get("words") ? parseInt(url.searchParams.get("words")) : undefined,
      dryRun: url.searchParams.get("dry") === "1",
    });
    return Response.json({ title: out.article.title, provider: out.article.provider, results: out.results });
  },
};
