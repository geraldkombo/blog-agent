import { createServer } from "node:http";
import { runOnce } from "../../lib/pipeline.js";

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/health") return res.end("ok");
  if (url.pathname === "/run") {
    if ((process.env.CRON_SECRET || "") && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      res.statusCode = 401; return res.end("unauthorized");
    }
    try {
      const out = await runOnce({ topic: url.searchParams.get("topic") || undefined, dryRun: url.searchParams.get("dry") === "1" });
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ title: out.article.title, results: out.results }));
    } catch (e) { res.statusCode = 500; return res.end(e.message); }
  }
  res.statusCode = 404; res.end("not found");
}).listen(7860, () => console.log("hf server on 7860"));
