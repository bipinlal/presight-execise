# ---- Install all dependencies (workspaces) ----
FROM node:22-bookworm-slim AS deps
# Toolchain in case better-sqlite3 has to compile from source.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json yarn.lock lerna.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN yarn install --frozen-lockfile --network-timeout 600000

# ---- Build client and server ----
FROM deps AS build
COPY client client
COPY server server
RUN yarn build

# ---- Production-only dependencies ----
FROM deps AS prod-deps
RUN yarn install --frozen-lockfile --production --network-timeout 600000

# ---- Runtime ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_PATH=/app/data/users.db \
    STATIC_DIR=/app/client/dist
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 4000
VOLUME ["/app/data"]
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
# Seeds the database automatically on first start if it is empty.
CMD ["node", "server/dist/index.js"]
