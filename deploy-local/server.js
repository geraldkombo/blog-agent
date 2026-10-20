// Local always-on option (your PC, or the free Oracle VM)
// node deploy-local/server.js  -> http://localhost:8787
// GET /health  GET /run?key=<LOCAL_KEY>&topic=...&dry=1
import { createServer } from "node:http";
import { runOnce } from "../lib/pipeline.js";

const port = process.env.PORT || 8787;
createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/health") return res.end("ok");
  if (url.pathname === "/run") {
    if ((process.env.LOCAL_KEY || "") && url.searchParams.get("key") !== process.env.LOCAL_KEY) {
      res.statusCode = 401; return res.end("unauthorized");
    }
    try {
      const out = await runOnce({ topic: url.searchParams.get("topic") || undefined, dryRun: url.searchParams.get("dry") === "1" });
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ title: out.article.title, results: out.results }, null, 2));
    } catch (e) { res.statusCode = 500; return res.end(e.message); }
  }
  res.statusCode = 404; res.end("GET /health or /run");
}).listen(port, () => console.log(`blog-agent local server on http://localhost:${port}`));
