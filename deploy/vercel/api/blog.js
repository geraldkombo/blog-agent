// Vercel — Hobby (free) plan supports cron at most once/day.
// 1) vercel link && vercel env add CRON_SECRET (+ LLM/publisher keys)
// 2) `vercel cron add deploy/vercel/api/blog.js "30 5 * * *" --scope <you>` OR use vercel.json crons
// Deploy: vercel --prod
import { runOnce } from "../../../lib/pipeline.js";

export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const out = await runOnce({
      topic: req.query?.topic || undefined,
      dryRun: req.query?.dry === "1",
    });
    res.status(200).json({ title: out.article.title, results: out.results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
