FROM node:24-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY tsconfig.base.json tsconfig.json ./
RUN pnpm --filter @workspace/api-server run build

FROM node:24-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY lib/db/src/schema/ ./lib/db/src/schema/
COPY lib/db/drizzle.config.ts ./lib/db/
EXPOSE 5000
CMD ["node", "artifacts/api-server/dist/index.js"]
