// AWS Lambda (free tier: 1M req/mo forever) + EventBridge schedule (free)
// Deploy:
//   cd deploy/lambda && zip -r ../../fn.zip . -x "*.md" && cd ../..
//   (zip must include lib/, run entry, package.json)
//   aws lambda create-function --function-name blog-agent --runtime nodejs22.x \
//     --handler deploy/lambda/index.handler --zip-file fileb://fn.zip --timeout 300 --memory-size 512 \
//     --role <lambda-exec-role-arn>
//   aws lambda put-function-event-invoke-config --function-name blog-agent --maximum-retry-attempts 1
//   aws events put-rule --name blog-daily --schedule-expression "cron(30 5 * * ? *)"
//   aws events put-targets --rule blog-daily --targets Id=1,Arn=<function-arn>
// Env vars: set on the function (LLM keys, publisher keys, PUBLISHERS).
import { runOnce } from "../../lib/pipeline.js";

export const handler = async (event) => {
  const out = await runOnce({ topic: event?.topic || undefined });
  return { title: out.article.title, results: out.results };
};
