FROM node:22-alpine AS builder
WORKDIR /workspace

FROM node:22-alpine AS runner

EXPOSE 3000
CMD ["node", "dist/index.mjs"]
