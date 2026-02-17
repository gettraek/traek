# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo build --filter=@traek/mcp... --no-daemon

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/servers/mcp/dist ./dist
COPY --from=builder /app/servers/mcp/package.json ./package.json
RUN npm install --omit=dev --ignore-scripts

EXPOSE 3010

CMD ["node", "dist/index.js"]
