# syntax=docker/dockerfile:1
# One image serving everything on a single origin: the playground as static
# files, the HTTP API under /v1, and its documentation under /documentation.

FROM node:24-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_IGNORE_SCRIPTS=true

# Copy workspace manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY packages/inchi-js/package.json ./packages/inchi-js/
COPY packages/inchi-api/package.json ./packages/inchi-api/
COPY packages/inchi.cheminfo.org/package.json ./packages/inchi.cheminfo.org/

RUN npm ci

# Copy the rest and build the library, then the static site.
COPY . .
RUN npm run build-lib && npm run build -w inchi.cheminfo.org

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NPM_CONFIG_IGNORE_SCRIPTS=true

COPY package.json package-lock.json ./
COPY packages/inchi-js/package.json ./packages/inchi-js/
COPY packages/inchi-api/package.json ./packages/inchi-api/
COPY packages/inchi.cheminfo.org/package.json ./packages/inchi.cheminfo.org/

RUN npm ci --omit=dev --workspace inchi-api --include-workspace-root

COPY --from=build /app/packages/inchi-js/lib ./packages/inchi-js/lib
COPY --from=build /app/packages/inchi.cheminfo.org/dist ./packages/inchi.cheminfo.org/dist
COPY packages/inchi-api/src ./packages/inchi-api/src

USER node
EXPOSE 10523
ENV PORT=10523
CMD ["node", "packages/inchi-api/src/index.ts"]
