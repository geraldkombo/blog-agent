// Azure Functions (free: 1M req/mo) — Node timer trigger
// Layout for a v4 programming-model function app:
//   copy this file to <function-app>/src/functions/blog.js
// Deploy: func azure functionapp publish <app-name>
// Env vars in Function App > Settings > Configuration.
import { app } from "@azure/functions";
import { runOnce } from "../../lib/pipeline.js";

app.timer("blogAgent", {
  schedule: "0 30 5 * * *", // Azure uses 6-field cron (sec first): 05:30 UTC daily
  handler: async (myTimer, context) => {
    const out = await runOnce({});
    context.log(JSON.stringify({ title: out.article.title, results: out.results }));
  },
});
