import { Type } from '@sinclair/typebox';
import type { FastifyRequest } from 'fastify';

import { convertFile } from '../convert/convertFile.ts';
import { detectStructureColumn } from '../convert/detectStructureColumn.ts';
import { ConversionError, asConversion } from '../convert/errors.ts';
import { detectInputFormat } from '../convert/formats.ts';
import { readSdf } from '../convert/readSdf.ts';
import { readTable } from '../convert/readTable.ts';
import type { Table } from '../convert/types.ts';
import type { FastifyTyped } from '../types.ts';

const UPLOAD_DESCRIPTION =
  'Send the file either as `multipart/form-data` (field name `file`) or as a raw body — `curl --data-binary @compounds.csv`. Pass `filename` in the query string when the raw body carries no name.';

const QUERY = Type.Object({
  filename: Type.Optional(
    Type.String({
      description: 'Name of the uploaded file, used to detect its format.',
    }),
  ),
  column: Type.Optional(
    Type.String({
      description: 'Structure column; auto-detected when omitted.',
    }),
  ),
  kind: Type.Optional(
    Type.Union([Type.Literal('smiles'), Type.Literal('molfile')]),
  ),
});

const CONVERT_QUERY = Type.Intersect([
  QUERY,
  Type.Object({
    output: Type.Optional(
      Type.Union(
        [
          Type.Literal('same'),
          Type.Literal('csv'),
          Type.Literal('tsv'),
          Type.Literal('xlsx'),
          Type.Literal('sdf'),
          Type.Literal('json'),
        ],
        {
          description: 'Format of the returned file. `same` mirrors the input.',
        },
      ),
    ),
    options: Type.Optional(
      Type.String({
        description: 'Raw InChI option string forwarded to the C API.',
      }),
    ),
    smiles: Type.Optional(
      Type.Boolean({
        description:
          'Append a SMILES column derived from the structure. Ignored unless the file holds molfiles and has no SMILES column.',
        default: false,
      }),
    ),
    inchi: Type.Optional(
      Type.Boolean({ description: 'Append the InChI column.', default: true }),
    ),
    inchikey: Type.Optional(
      Type.Boolean({
        description: 'Append the InChIKey column.',
        default: true,
      }),
    ),
    auxinfo: Type.Optional(Type.Boolean()),
  }),
]);

const ERROR_RESPONSE = Type.Object({
  error: Type.String(),
  message: Type.String(),
  columns: Type.Optional(Type.Array(Type.String())),
});

/**
 * Register the file conversion routes under `/v1`.
 * @param fastify - The Fastify instance.
 */
export async function convertRoutes(fastify: FastifyTyped): Promise<void> {
  fastify.addContentTypeParser(
    '*',
    { parseAs: 'buffer' },
    (request, body, done) => done(null, body),
  );

  fastify.post(
    '/convert',
    {
      schema: {
        tags: ['file'],
        summary:
          'Append InChI and/or InChIKey to a CSV, TSV, XLSX, or SDF file',
        description: UPLOAD_DESCRIPTION,
        consumes: ['multipart/form-data', 'application/octet-stream'],
        querystring: CONVERT_QUERY,
      },
    },
    async (request, reply) => {
      const upload = await readUpload(request);
      const {
        output,
        options,
        smiles,
        inchi,
        inchikey,
        auxinfo,
        column,
        kind,
        filename,
      } = request.query;
      const result = await convertFile(upload.content, {
        filename: filename || upload.filename,
        output,
        column,
        kind,
        inchiOptions: options,
        smiles,
        inchi,
        inchikey,
        auxinfo,
      });
      return reply
        .type(result.contentType)
        .header(
          'content-disposition',
          `attachment; filename="${result.filename}"`,
        )
        .header('x-structure-column', result.detection.column)
        .header('x-structure-kind', result.detection.kind)
        .header('x-rows-total', String(result.stats.total))
        .header('x-rows-converted', String(result.stats.converted))
        .header('x-rows-failed', String(result.stats.failed))
        .header('x-rows-skipped', String(result.stats.skipped))
        .send(result.body);
    },
  );

  fastify.post(
    '/detect',
    {
      schema: {
        tags: ['file'],
        summary: 'Report the structure column detected in a file',
        description: UPLOAD_DESCRIPTION,
        consumes: ['multipart/form-data', 'application/octet-stream'],
        querystring: QUERY,
        response: {
          200: Type.Object({
            format: Type.String(),
            columns: Type.Array(Type.String()),
            rowCount: Type.Number(),
            detection: Type.Object({
              column: Type.String(),
              kind: Type.String(),
              confidence: Type.Number(),
              reason: Type.String(),
            }),
            sample: Type.Array(Type.Record(Type.String(), Type.Unknown())),
          }),
          422: ERROR_RESPONSE,
        },
      },
    },
    async (request) => {
      const upload = await readUpload(request);
      const filename = request.query.filename || upload.filename;
      const format = await asConversion(() =>
        detectInputFormat(filename, upload.content),
      );
      const table = await asConversion(() =>
        format === 'sdf'
          ? readSdf(upload.content)
          : readTable(upload.content, format),
      );
      const detection = detectStructureColumn(table, {
        column: request.query.column,
        kind: request.query.kind,
      });
      return {
        format,
        columns: table.columns,
        rowCount: table.rows.length,
        detection,
        sample: sampleRows(table),
      };
    },
  );
}

async function readUpload(
  request: FastifyRequest,
): Promise<{ content: Uint8Array; filename: string }> {
  if (request.isMultipart()) {
    const file = await request.file();
    if (!file) {
      throw new ConversionError('no file found in the multipart request');
    }
    return { content: await file.toBuffer(), filename: file.filename ?? '' };
  }
  const body = request.body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new ConversionError('the request carries no file');
  }
  return { content: body, filename: '' };
}

function sampleRows(table: Table): Array<Record<string, unknown>> {
  const sample: Array<Record<string, unknown>> = [];
  for (let index = 0; index < Math.min(5, table.rows.length); index++) {
    const row = table.rows[index];
    if (!row) continue;
    const preview: Record<string, unknown> = {};
    for (const column of table.columns) {
      const value = row[column];
      preview[column] =
        typeof value === 'string' && value.length > 200
          ? `${value.slice(0, 200)}…`
          : value;
    }
    sample.push(preview);
  }
  return sample;
}
