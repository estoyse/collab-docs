FROM node:22-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --filter @collab-docs/server...
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN pnpm --filter @collab-docs/server build
RUN pnpm --filter @collab-docs/server deploy --prod --legacy /out

FROM node:22-slim
ENV NODE_ENV=production PORT=8000
WORKDIR /app
COPY --from=build /out ./
RUN mkdir data && chown node:node data
USER node
EXPOSE 8000
CMD ["node", "dist/index.js"]
