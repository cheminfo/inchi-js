import type { StructureToInchiResult } from './structureToInchi.ts';
import { structureToInchi } from './structureToInchi.ts';
import type {
  ConversionStats,
  EnrichedRow,
  StructureColumnDetection,
  Table,
} from './types.ts';

/** Records processed between two yields to the event loop. */
const YIELD_INTERVAL = 50;

/** Options of {@link enrichTable}. */
export interface EnrichOptions {
  /**
   * Raw InChI option string forwarded to the C API.
   * @default ''
   */
  inchiOptions?: string;
  /**
   * Called every 50 records with the number of records processed so far,
   * so a caller can drive a progress bar.
   * @default undefined
   */
  onProgress?: (done: number, total: number) => void;
}

/** Result of {@link enrichTable}. */
export interface EnrichResult {
  /** One entry per input record, in the original order. */
  rows: EnrichedRow[];
  /** Conversion counters. */
  stats: ConversionStats;
}

/**
 * Compute the InChI and InChIKey of every record of a table.
 *
 * Records are processed sequentially — a single WASM instance backs the whole
 * process — and the event loop is released every 50 records so a large upload
 * never blocks the server. Identical structures are computed once and reused.
 * @param table - The table read from the uploaded file.
 * @param detection - The structure column to read, as returned by `detectStructureColumn`.
 * @param options - InChI options and the progress callback.
 * @returns The enriched records and the conversion counters.
 */
export async function enrichTable(
  table: Table,
  detection: StructureColumnDetection,
  options: EnrichOptions = {},
): Promise<EnrichResult> {
  const { inchiOptions = '', onProgress } = options;
  const cache = new Map<string, StructureToInchiResult>();
  const rows: EnrichedRow[] = [];
  let converted = 0;

  /* eslint-disable no-await-in-loop -- one WASM instance: records convert sequentially and yield to the event loop. */
  for (let index = 0; index < table.rows.length; index++) {
    const row = table.rows[index];
    if (!row) continue;
    const structure = String(row[detection.column] ?? '');
    let result = cache.get(structure);
    if (!result) {
      result = await structureToInchi(structure, {
        kind: detection.kind,
        inchiOptions,
      });
      cache.set(structure, result);
    }
    if (result.inchi) converted++;
    rows.push({
      data: row,
      molfile: result.molfile,
      smiles: result.smiles,
      inchi: result.inchi,
      inchikey: result.inchikey,
      auxinfo: result.auxinfo,
      message: result.message,
    });
    if (index % YIELD_INTERVAL === YIELD_INTERVAL - 1) {
      onProgress?.(index + 1, table.rows.length);
      await yieldToEventLoop();
    }
  }
  /* eslint-enable no-await-in-loop */
  onProgress?.(rows.length, table.rows.length);

  return {
    rows,
    stats: {
      total: rows.length,
      converted,
      failed: rows.length - converted,
    },
  };
}

// `setImmediate` is Node-only: this layer also runs in the browser worker of
// inchi.cheminfo.org, where `setTimeout` is the portable yield.
function yieldToEventLoop(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
