// Deno Deploy — free tier (1M req/mo, built-in cron)
// Deploy: `deno deploy` (or drag this project into deno.com/deploy dashboard)
// Set env vars in the dashboard: LLM_PROVIDER, *_API_KEY, PUBLISHERS, ...
import { runOnce } from "../lib/pipeline.js";

async function handler(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") || "";
  const secret = Deno.env.get("CRON_SECRET") || "";
  // Deno Deploy cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set
  if (secret && auth !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  if (url.pathname === "/health") return new Response("ok");
  const topic = url.searchParams.get("topic") || undefined;
  const out = await runOnce({ topic, dryRun: url.searchParams.get("dry") === "1" });
  return Response.json({ title: out.article.title, results: out.results });
}

// fires daily at 05:30 UTC on Deno Deploy
Deno.cron("30 5 * * *", async () => {
  await runOnce({});
});

Deno.serve(handler);
