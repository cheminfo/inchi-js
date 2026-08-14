import type { InputFormat, OutputFormat } from './types.ts';

const EXTENSIONS: Record<string, InputFormat> = {
  csv: 'csv',
  tsv: 'tsv',
  tab: 'tsv',
  txt: 'tsv',
  xlsx: 'xlsx',
  xlsm: 'xlsx',
  sdf: 'sdf',
  sd: 'sdf',
  mol: 'sdf',
};

/** MIME type and file extension used when returning a converted file. */
export const OUTPUT_MEDIA: Record<
  Exclude<OutputFormat, 'same'>,
  { contentType: string; extension: string }
> = {
  csv: { contentType: 'text/csv; charset=utf-8', extension: 'csv' },
  tsv: {
    contentType: 'text/tab-separated-values; charset=utf-8',
    extension: 'tsv',
  },
  xlsx: {
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
  },
  sdf: {
    contentType: 'chemical/x-mdl-sdfile; charset=utf-8',
    extension: 'sdf',
  },
  json: { contentType: 'application/json; charset=utf-8', extension: 'json' },
};

/**
 * Determine the format of an uploaded file from its name, falling back to
 * sniffing the first bytes of its content.
 *
 * The extension wins when it is known; otherwise the content decides:
 * a ZIP magic number means `xlsx`, an `M  END` / `$$$$` marker means `sdf`,
 * and a first line holding more tabs than commas means `tsv`.
 * @param filename - Uploaded file name, may be empty.
 * @param content - Raw file bytes.
 * @returns The detected input format.
 * @throws {Error} When neither the name nor the content identifies a supported format.
 */
export function detectInputFormat(
  filename: string,
  content: Uint8Array,
): InputFormat {
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  const fromExtension = EXTENSIONS[extension];
  if (fromExtension) return fromExtension;

  if (isZip(content)) return 'xlsx';

  const head = new TextDecoder().decode(content.subarray(0, 4096));
  if (/^M {2}END$/m.test(head) || head.includes('$$$$')) return 'sdf';

  const firstLine = head.split(/\r?\n/, 1)[0] ?? '';
  if (!firstLine) {
    throw new Error(`unsupported or empty file "${filename}"`);
  }
  return countOf(firstLine, '\t') > countOf(firstLine, ',') ? 'tsv' : 'csv';
}

/**
 * Resolve the `same` output format against the format of the input file.
 * @param output - Requested output format.
 * @param input - Format of the uploaded file.
 * @returns The concrete output format.
 */
export function resolveOutputFormat(
  output: OutputFormat,
  input: InputFormat,
): Exclude<OutputFormat, 'same'> {
  return output === 'same' ? input : output;
}

/**
 * Build the name of the converted file from the uploaded one.
 * @param filename - Uploaded file name, may be empty.
 * @param format - Concrete output format.
 * @returns A file name carrying the `-inchi` suffix and the right extension.
 */
export function outputFilename(
  filename: string,
  format: Exclude<OutputFormat, 'same'>,
): string {
  const base = (filename.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
  return `${base || 'structures'}-inchi.${OUTPUT_MEDIA[format].extension}`;
}

function isZip(content: Uint8Array): boolean {
  return content.length > 4 && content[0] === 0x50 && content[1] === 0x4b;
}

function countOf(text: string, character: string): number {
  let count = 0;
  for (const current of text) {
    if (current === character) count++;
  }
  return count;
}
