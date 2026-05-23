# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_IGNORE_SCRIPTS=true

# Copy workspace manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY packages/inchi-js/package.json ./packages/inchi-js/
COPY packages/inchi.cheminfo.org/package.json ./packages/inchi.cheminfo.org/

RUN npm ci

# Copy the rest and build the static site.
COPY . .
RUN npm run build-lib && npm run build -w inchi.cheminfo.org

FROM joseluisq/static-web-server:2 AS runtime
COPY --from=build /app/packages/inchi.cheminfo.org/dist /public

EXPOSE 80
ENV SERVER_PORT=80
ENV SERVER_ROOT=/public
ENV SERVER_LOG_LEVEL=info
ENV SERVER_PAGE_FALLBACK=/public/index.html
