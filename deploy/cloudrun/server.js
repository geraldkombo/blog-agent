// Google Cloud Run (free tier: 2M req/mo) + Cloud Scheduler (free: 3 jobs)
// Build & deploy:
//   gcloud run deploy blog-agent --source . --region us-central1 --allow-unauthenticated=no
//   gcloud scheduler jobs create http blog-agent-daily \
//     --schedule="30 5 * * *" --uri="https://blog-agent-<hash>.us-central1.run.app/run" \
//     --http-method=GET --headers="Authorization=Bearer <CRON_SECRET>" \
//     --oidc-service-account-email=<your-sa>@<project>.iam.gserviceaccount.com
import { createServer } from "node:http";
import { runOnce } from "../lib/pipeline.js";

const port = process.env.PORT || 8080;
createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/health") return res.end("ok");
  if (url.pathname !== "/run") { res.statusCode = 404; return res.end("not found"); }
  const secret = process.env.CRON_SECRET || "";
  if (secret && req.headers.authorization !== `Bearer ${secret}`) { res.statusCode = 401; return res.end("unauthorized"); }
  try {
    const out = await runOnce({ topic: url.searchParams.get("topic") || undefined, dryRun: url.searchParams.get("dry") === "1" });
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ title: out.article.title, results: out.results }));
  } catch (e) {
    res.statusCode = 500; res.end(JSON.stringify({ error: e.message }));
  }
}).listen(port, () => console.log(`blog-agent listening on ${port}`));
