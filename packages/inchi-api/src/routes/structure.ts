import { Type } from '@sinclair/typebox';
import { inchikeyFromInchi, molfileFromInchi } from 'inchi-js';

import type { StructureToInchiResult } from '../convert/structureToInchi.ts';
import { structureToInchi } from '../convert/structureToInchi.ts';
import type { FastifyTyped } from '../types.ts';

/**
 * Drop the AuxInfo layer unless the caller asked for it.
 *
 * It is always computed — it comes back from the same C API call as the InChI
 * — so `auxinfo` selects what the response carries, nothing more.
 * @param result - The conversion result.
 * @param auxinfo - Whether the caller asked for the AuxInfo layer.
 * @returns The result to send back.
 */
function selectAuxinfo(
  result: StructureToInchiResult,
  auxinfo: boolean | undefined,
): StructureToInchiResult {
  return auxinfo ? result : { ...result, auxinfo: '' };
}

const KIND = Type.Optional(
  Type.Union([Type.Literal('smiles'), Type.Literal('molfile')], {
    description:
      'Kind of the structure. Guessed from its content when omitted.',
  }),
);

const OPTIONS = Type.Optional(
  Type.String({
    description:
      'Raw InChI option string forwarded to the C API, e.g. "-FixedH -SNon".',
  }),
);

const AUXINFO = Type.Optional(
  Type.Boolean({ description: 'Return the AuxInfo layer.' }),
);

const INCHI_RESULT = Type.Object({
  molfile: Type.String(),
  inchi: Type.String(),
  inchikey: Type.String(),
  auxinfo: Type.String(),
  message: Type.String(),
  returnCode: Type.Number(),
});

/**
 * Register the single-structure conversion routes under `/v1`.
 * @param fastify - The Fastify instance.
 */
export async function structureRoutes(fastify: FastifyTyped): Promise<void> {
  fastify.get(
    '/inchi',
    {
      schema: {
        tags: ['structure'],
        summary: 'InChI and InChIKey of one structure',
        querystring: Type.Object({
          structure: Type.String({
            description: 'A SMILES, or a molfile when `kind` is `molfile`.',
          }),
          kind: KIND,
          options: OPTIONS,
          auxinfo: Type.Optional(Type.Boolean()),
        }),
        response: { 200: INCHI_RESULT },
      },
    },
    async (request) => {
      const { structure, kind, options, auxinfo } = request.query;
      return selectAuxinfo(
        await structureToInchi(structure, { kind, inchiOptions: options }),
        auxinfo,
      );
    },
  );

  fastify.post(
    '/inchi',
    {
      schema: {
        tags: ['structure'],
        summary: 'InChI and InChIKey of one structure',
        body: Type.Object({
          structure: Type.String(),
          kind: KIND,
          options: OPTIONS,
          auxinfo: AUXINFO,
        }),
        response: { 200: INCHI_RESULT },
      },
    },
    async (request) => {
      const { structure, kind, options, auxinfo } = request.body;
      return selectAuxinfo(
        await structureToInchi(structure, { kind, inchiOptions: options }),
        auxinfo,
      );
    },
  );

  fastify.post(
    '/inchi/batch',
    {
      schema: {
        tags: ['structure'],
        summary: 'InChI and InChIKey of a list of structures',
        body: Type.Object({
          structures: Type.Array(Type.String(), { maxItems: 10_000 }),
          kind: KIND,
          options: OPTIONS,
          auxinfo: AUXINFO,
        }),
        response: { 200: Type.Object({ results: Type.Array(INCHI_RESULT) }) },
      },
    },
    async (request) => {
      const { structures, kind, options, auxinfo } = request.body;
      const results = [];
      /* eslint-disable no-await-in-loop -- one WASM instance: structures convert sequentially. */
      for (const structure of structures) {
        results.push(
          selectAuxinfo(
            await structureToInchi(structure, { kind, inchiOptions: options }),
            auxinfo,
          ),
        );
      }
      /* eslint-enable no-await-in-loop */
      return { results };
    },
  );

  fastify.post(
    '/inchikey',
    {
      schema: {
        tags: ['structure'],
        summary: 'InChIKey of an InChI',
        body: Type.Object({ inchi: Type.String() }),
        response: {
          200: Type.Object({
            inchikey: Type.String(),
            message: Type.String(),
            returnCode: Type.Number(),
          }),
        },
      },
    },
    async (request) => inchikeyFromInchi(request.body.inchi),
  );

  fastify.post(
    '/molfile',
    {
      schema: {
        tags: ['structure'],
        summary: 'Molfile reconstructed from an InChI',
        body: Type.Object({ inchi: Type.String(), options: OPTIONS }),
        response: {
          200: Type.Object({
            molfile: Type.String(),
            message: Type.String(),
            log: Type.String(),
            returnCode: Type.Number(),
          }),
        },
      },
    },
    async (request) => {
      const { inchi, options } = request.body;
      return molfileFromInchi(inchi, { options });
    },
  );
}
