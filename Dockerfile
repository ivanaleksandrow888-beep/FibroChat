FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false

COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY --chown=node:node . .

USER node
EXPOSE 3000

CMD ["node", "server/server.js"]
