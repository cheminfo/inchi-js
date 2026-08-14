import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyError } from 'fastify';
import Fastify from 'fastify';

import { MAX_FILE_SIZE } from './config.ts';
import { ConversionError } from './convert/errors.ts';
import { registerFrontend } from './frontend.ts';
import { convertRoutes } from './routes/convert.ts';
import { healthRoutes } from './routes/health.ts';
import { structureRoutes } from './routes/structure.ts';
import type { FastifyTyped } from './types.ts';

/** Options of {@link buildApp}. */
export interface BuildAppOptions {
  /**
   * Whether the Fastify request logger is enabled.
   * @default true
   */
  logger?: boolean;
}

/**
 * Build the Fastify application: CORS, multipart uploads, Swagger UI on
 * `/documentation`, every route under the `/v1` prefix, and the built
 * playground served statically from the same origin.
 * @param options - Whether requests are logged.
 * @returns The ready-to-listen Fastify instance.
 */
export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyTyped> {
  const app = Fastify({
    logger: options.logger ?? true,
    bodyLimit: MAX_FILE_SIZE,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(cors, { origin: true });
  await app.register(multipart, {
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'inchi-api',
        description:
          'Convert structures to InChI and InChIKey, and enrich CSV, TSV, XLSX, or SDF files with them.',
        version: '1.0.0',
      },
      tags: [
        { name: 'structure', description: 'Single structure conversions' },
        { name: 'file', description: 'File conversions' },
        { name: 'service', description: 'Service metadata' },
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/documentation' });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ConversionError) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
        columns: error.columns,
      });
    }
    request.log.error(error);
    return reply
      .status(error.statusCode ?? 500)
      .send({ error: error.name, message: error.message });
  });

  await app.register(healthRoutes);
  await app.register(structureRoutes, { prefix: '/v1' });
  await app.register(convertRoutes, { prefix: '/v1' });
  await registerFrontend(app);

  return app;
}
