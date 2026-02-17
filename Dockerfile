# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo build --filter=@traek/web... --no-daemon

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/apps/web/build ./build

EXPOSE 3000

CMD ["node", "build/index.js"]
