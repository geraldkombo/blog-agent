FROM node:22-alpine
WORKDIR /app
COPY package.json run.js ./
COPY lib ./lib
COPY topics.txt ./
EXPOSE 8080
CMD ["node", "deploy/cloudrun/server.js"]
