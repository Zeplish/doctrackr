FROM node:24-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/doctrackr/package.json ./artifacts/doctrackr/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY lib/ ./lib/
COPY artifacts/doctrackr/ ./artifacts/doctrackr/
COPY tsconfig.base.json tsconfig.json ./
ARG BASE_PATH=/
ARG PORT=80
ENV BASE_PATH=${BASE_PATH}
ENV PORT=${PORT}
RUN pnpm --filter @workspace/doctrackr run build

FROM nginx:alpine AS runner
COPY artifacts/doctrackr/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/artifacts/doctrackr/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
