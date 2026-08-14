import { Type } from '@sinclair/typebox';
import { INCHI_C_VERSION } from 'inchi-js';

import type { FastifyTyped } from '../types.ts';

/**
 * Register the unversioned service routes.
 * @param fastify - The Fastify instance.
 */
export async function healthRoutes(fastify: FastifyTyped): Promise<void> {
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['service'],
        summary: 'Liveness probe',
        response: {
          200: Type.Object({
            status: Type.Literal('ok'),
            inchiVersion: Type.String(),
          }),
        },
      },
    },
    () => ({ status: 'ok' as const, inchiVersion: INCHI_C_VERSION }),
  );
}
