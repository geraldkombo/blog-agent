# Hugging Face Spaces — free CPU container, runs 24/7 while the space is awake.
# 1. Create a Space: https://huggingface.co/new-space > SDK: Docker > blank
# 2. Upload this blog-agent folder contents to the space root (keep deploy/hf/).
#    Replace the space's Dockerfile with deploy/hf/Dockerfile (or copy its contents to root Dockerfile).
# 3. Space > Settings > Variables and secrets: add GEMINI_API_KEY, BUTTONDOWN_API_KEY, PUBLISHERS, CRON_SECRET.
# 4. Container loops: runs the pipeline daily at 05:30 UTC and serves /health + /run on 7860.
FROM node:22-alpine
WORKDIR /app
COPY package.json run.js topics.txt ./
COPY lib ./lib
COPY deploy ./deploy
RUN chmod +x deploy/hf/loop.sh
EXPOSE 7860
CMD ["/bin/sh", "-c", "./deploy/hf/loop.sh & node deploy/hf/server.js"]
