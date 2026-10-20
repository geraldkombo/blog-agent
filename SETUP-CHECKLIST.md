# SETUP CHECKLIST — everything not done automatically

Done for you (verified 2026-10-19):
- [x] blog-agent project + all deploy configs written
- [x] `.env` created with working keys (Gemini, GMI, beehiiv, Buttondown, Cerebras)
- [x] End-to-end test passed: LLM article -> Buttondown draft + Telegraph + Write.as
- [x] Article saved: `out/2026-10-19-free-tier-cloud-platforms-side-projects.*`
- [x] Live URLs: buttondown.com/THE254REPORT/archive/free-tier-cloud-platforms-support-side-projects/
      telegra.ph/Free-tier-cloud-platforms-support-side-projects-10-19 | write.as/d2p3oc022rwxn

## DONE SINCE (2026-10-20 session 2)
- [x] GitHub: token generated via browser automation, repo geraldkombo/blog-agent (public), secrets set, Actions GREEN
- [x] GitHub Pages LIVE: https://geraldkombo.github.io/blog-agent/
- [x] Full pipeline verified in Actions: MCP article -> Buttondown + Telegraph + Write.as drafts
- [x] Cloudflare Worker live with cron: https://blog-agent.shikunyi.workers.dev

## Needs YOUR accounts (free, ~2 min each)

### LLM keys (at least one working at all times)
- [ ] **Groq** — console.groq.com -> API Keys -> `GROQ_API_KEY` (fastest free tier)
- [ ] **OpenRouter** — openrouter.ai/keys -> `OPENROUTER_API_KEY` (`:free` models)
- [ ] **Google AI Studio** — your key works but the free endpoint throws 503 "high demand"
      often; get a fresh one at aistudio.google.com/apikey if it persists
- [ ] **Cerebras** — key present but account needs billing top-up (HTTP 402); cloud.cerebras.ai
- [ ] **GitHub Models** — needs a GitHub PAT (`GITHUB_TOKEN`)
- [ ] **Mistral / Together** — keys tested were invalid; regenerate if you want them
- [x] **GMI (Qwen)** — working; use `LLM_MODEL=Qwen/Qwen3.8-Flash` on slow connections
      (the Max model hits HTTP 524 gateway timeouts on ~2 Mbps links)

### Publishers
- [x] **Buttondown** — working (THE254REPORT)
- [x] **Telegraph / Write.as** — working, zero signup
- [ ] **beehiiv** — write API is Pro-plan only (403). Options: keep using the CDP
      browser method (`..\BEEHIIV-ARTICLE-METHOD.md`), or upgrade to Grow ($39+/mo)
- [ ] **Dev.to** — dev.to/settings/extensions -> API key -> `DEVTO_API_KEY`
- [ ] **Hashnode** — hashnode.com -> Developer -> API key + publication id
- [ ] **WordPress** — you already have the 3 WP MCPs; for direct REST set
      `WORDPRESS_URL/USERNAME/APP_PASSWORD` (Users -> Profile -> Application Passwords)
- [ ] **Ghost** — free only self-hosted (Oracle free VM below); needs `GHOST_ADMIN_KEY` (id:secret)
- [ ] **Medium** — integration tokens are restricted for new apps since 2023; skip or use pipepost MCP
- [ ] **Blogger** — create blog at blogger.com, get OAuth token with blogger scope
- [ ] **GitHub Pages static blog** — create a public repo, push this folder,
      enable Pages (Settings -> Pages -> GitHub Actions), set `GITHUB_TOKEN` PAT + `GITHUB_REPO`

### GitHub (needed for Actions = the recommended free host)
- [ ] `gh auth login` (gh CLI installed, not logged in)
- [ ] Create repo, push blog-agent, add secrets: `GEMINI_API_KEY`, `BUTTONDOWN_API_KEY`,
      `PUBLISHERS=buttondown,telegraph,writeas`, `PUBLISH_MODE=draft`,
      `OPENAI_COMPAT_KEY`/`OPENAI_COMPAT_BASE`/`OPENAI_COMPAT_MODEL` (for GMI)

### Other free hosts (only if you want redundancy)
- [ ] **Deno Deploy** — deno.com/deploy (GitHub login), `deno deploy` from repo root
- [ ] **Cloudflare Workers** — you have wrangler auth (`.wrangler` exists): `npx wrangler deploy`
      then `npx wrangler secret put` for each key
- [ ] **Vercel** — vercel.com (GitHub login) -> import repo -> add env -> `vercel --prod`
- [ ] **Cloud Run** — GCP project + billing acct (card required even for free tier)
- [ ] **Lambda** — AWS account (card required)
- [ ] **Azure Functions** — Azure free account (card required)
- [ ] **Oracle Always Free VM** — cloud.oracle.com signup (card verified, never charged);
      follow `deploy/oracle/README.md`
- [ ] **HF Space** — huggingface.co/new-space (Docker); upload repo + `deploy/hf/Dockerfile`
- [ ] **PythonAnywhere** — pythonanywhere.com free; Tasks tab -> daily task (see deploy/pythonanywhere)
- [ ] **Val Town** — val.town signup; paste `deploy/valtown/blogAgent.val.js`
- [ ] **n8n** — self-host free (Docker/Oracle VM) or n8n cloud trial; import `deploy/n8n/blog-agent-workflow.json`
- [ ] **Render** — cron needs paid starter ($7/mo) — skip unless you pay
- [ ] **Zapier/Make** — visual builders, free tiers too small for daily (Zapier 100 tasks/mo);
      Make.com 1000 ops/mo is viable — rebuild the n8n flow there manually

## Recommended daily-driver config (all $0)

1. **GitHub Actions** runs `node run.js once` daily 05:30 UTC
2. LLM: **GMI Qwen3.8-Flash** primary, Gemini fallback (chain is built in)
3. Publish targets: **Buttondown draft** + **GitHub Pages commit** + Telegraph mirror
4. Review drafts in the morning, publish manually (PUBLISH_MODE=draft keeps you safe)

## Housekeeping

- [ ] Delete test posts when convenient: write.as/sb7a61qs4m4ow,
      telegra.ph/blog-agent-publisher-test-10-19 (anonymous posts — just leave them)
- [ ] `.env` is gitignored — never commit it
