# blog-agent

Zero-dependency Node.js blogging agent: **topic -> LLM article -> multi-platform publish**.
Built to run on every free tier listed in `deploy/`.

## Quick start (local, Windows)

```powershell
cd "C:\Users\HP\Documents\Default Project\blog-agent"
copy .env.example .env   # fill keys
node run.js status       # what's configured
node run.js once --dry-run --topic "your topic"   # generate + save to out/ only
node run.js once --targets buttondown,telegraph   # generate + publish drafts
```

## Architecture

```
topics.txt / BLOG_TOPIC / --topic
        |
   lib/llm.js      gemini | cerebras | groq | openrouter | mistral | together
                   github | gmi | openai-compat | ollama   (auto-fallback chain)
        |
   lib/pipeline.js  prompt -> JSON {title, subtitle, slug, tags, body} -> out/
        |
   lib/publishers.js
     beehiiv*  buttondown  devto  hashnode  ghost  wordpress
     medium  writeas  telegraph  blogger  github (Pages static blog)
```

`*` beehiiv post-creation API is **Pro plan only**. On Free plan use the CDP
browser method documented in `..\BEEHIIV-ARTICLE-METHOD.md`, or keep beehiiv
out of PUBLISHERS.

## Deploy targets (all free) — see `deploy/`

| Platform | Folder | Schedule | Notes |
|---|---|---|---|
| GitHub Actions | `.github/workflows/blog-agent.yml` | daily 05:30 UTC | **recommended**, 2000 min/mo free |
| GitHub Pages | `static-site/` + `pages.yml` | on push | free Jekyll blog, agent commits posts |
| Deno Deploy | `deploy/deno/` | `Deno.cron` built in | 1M req/mo free |
| Cloudflare Workers | `wrangler.jsonc` + `deploy/cloudflare/` | cron trigger | 100k req/day free |
| Vercel | `deploy/vercel/` | vercel.json crons (1/day on Hobby) | |
| Google Cloud Run | `Dockerfile` + `deploy/cloudrun/` | Cloud Scheduler (3 free jobs) | 2M req/mo free |
| AWS Lambda | `deploy/lambda/` | EventBridge | 1M req/mo free forever |
| Azure Functions | `deploy/azure/` | timer trigger | 1M req/mo free |
| Oracle Cloud VM | `deploy/oracle/` | systemd timer | always-free VM, 24/7 |
| Hugging Face Space | `deploy/hf/` | internal loop | free Docker container |
| PythonAnywhere | `deploy/pythonanywhere/` | 1 daily task (free) | Node or pure-Python path |
| Val Town | `deploy/valtown/` | Interval val | single-file version |
| n8n | `deploy/n8n/blog-agent-workflow.json` | schedule node | import into n8n (cloud trial or self-host free) |
| Render | `deploy/render/` | cron | free tier lacks cron — paid starter needed |
| Local server | `deploy-local/server.js` | your own scheduler | `npm run serve` -> localhost:8787/run |

## Env vars

See `.env.example`. Minimum working set:

```
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
PUBLISHERS=buttondown
BUTTONDOWN_API_KEY=...
```

## Verified 2026-10-19

- writeas   -> https://write.as/sb7a61qs4m4ow  (OK)
- telegraph -> https://telegra.ph/blog-agent-publisher-test-10-19 (OK)
- buttondown-> draft created on THE254REPORT (OK)
- beehiiv   -> 403 (write API = Pro plan; browser method still works)
- Gemini free tier: intermittent 503 "high demand" (retry chain handles it)
- Cerebras: key needs billing top-up (402)
- Full pipeline (LLM -> 3 publishers): OK with `LLM_PROVIDER=gmi`,
  `LLM_MODEL=Qwen/Qwen3.8-Flash` (Max times out with HTTP 524 on slow links)

## Useful scripts

- `node scripts/test-publishers.js [names...]` — send a canned test post
- `node scripts/republish.js out/<file>.json buttondown,telegraph` — republish a
  saved article without calling the LLM again (handy on this flaky connection)

See `SETUP-CHECKLIST.md` for what still needs your accounts/keys.
