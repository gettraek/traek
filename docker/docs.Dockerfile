# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo build --filter=@traek/docs... --no-daemon

# Production stage
FROM nginx:alpine

COPY --from=builder /app/apps/docs/dist /usr/share/nginx/html

EXPOSE 80
