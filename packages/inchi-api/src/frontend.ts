import { existsSync } from 'node:fs';
import { join } from 'node:path';

import fastifyStatic from '@fastify/static';

import type { FastifyTyped } from './types.ts';

/** Prefixes owned by the API and the docs — a miss there is a JSON 404. */
const NON_SPA_PREFIXES = ['/v1', '/health', '/documentation'];

/** Location of the built playground, relative to this file. */
const FRONTEND_DIST = join(
  import.meta.dirname,
  '..',
  '..',
  'inchi.cheminfo.org',
  'dist',
);

/**
 * Serve the built playground from the same origin as the API, so the site and
 * `/documentation` live under one hostname. When the site has not been built
 * (development, where Vite serves it), `/` redirects to the API documentation.
 * @param app - The Fastify instance.
 */
export async function registerFrontend(app: FastifyTyped): Promise<void> {
  if (!existsSync(FRONTEND_DIST)) {
    app.get('/', { schema: { hide: true } }, (_request, reply) =>
      reply.redirect('/documentation'),
    );
    return;
  }

  await app.register(fastifyStatic, { root: FRONTEND_DIST, wildcard: false });

  app.setNotFoundHandler((request, reply) => {
    if (NON_SPA_PREFIXES.some((prefix) => request.url.startsWith(prefix))) {
      return reply
        .code(404)
        .send({ statusCode: 404, error: 'Not Found', message: 'Not Found' });
    }
    return reply.sendFile('index.html');
  });
}
