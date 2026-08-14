import { Molecule } from 'openchemlib';

import { ConversionError } from './errors.ts';
import type {
  StructureColumnDetection,
  StructureKind,
  Table,
} from './types.ts';
import { MOLFILE_COLUMN } from './types.ts';

/** Number of non-empty values inspected per column. */
const SAMPLE_SIZE = 50;
/** Ratio of parseable values required when the column name says nothing. */
const CONTENT_THRESHOLD = 0.9;
/** Ratio of parseable values required when the column name is a known one. */
const NAMED_THRESHOLD = 0.5;

const SMILES_NAMES = new Set([
  'smiles',
  'smile',
  'smi',
  'canonicalsmiles',
  'isomericsmiles',
  'structuresmiles',
  'smilesstring',
]);

const MOLFILE_NAMES = new Set([
  'molfile',
  'mol',
  'molblock',
  'ctab',
  'structure',
]);

/**
 * Find the column holding the chemical structures of a table.
 *
 * An SDF always exposes its structures in the `molfile` column. For CSV, TSV,
 * and XLSX the column name is looked at first (`SMILES`, `canonical_smiles`,
 * `molfile`, …); when it says nothing, every column is scored by actually
 * parsing a sample of its values with `openchemlib`, and the column with the
 * highest ratio of parseable structures wins.
 * @param table - The table read from the uploaded file.
 * @param options - Explicit overrides, when the caller knows better.
 * @param options.column - Structure column to use instead of detecting one.
 * @param options.kind - Kind of that column, guessed from its content when omitted.
 * @returns The detected column, its kind, and how confident the detection is.
 * @throws {ConversionError} When no column holds structures.
 */
export function detectStructureColumn(
  table: Table,
  options: { column?: string; kind?: StructureKind } = {},
): StructureColumnDetection {
  const { column, kind } = options;
  if (column) {
    if (!table.columns.includes(column)) {
      throw new ConversionError(
        `column "${column}" is not in the file`,
        table.columns,
      );
    }
    const scored = scoreColumn(table, column);
    return {
      column,
      kind:
        kind ??
        (scored.molfileRatio >= scored.smilesRatio ? 'molfile' : 'smiles'),
      confidence: Math.max(scored.molfileRatio, scored.smilesRatio),
      reason: 'explicit',
    };
  }

  if (table.columns.includes(MOLFILE_COLUMN)) {
    return {
      column: MOLFILE_COLUMN,
      kind: 'molfile',
      confidence: 1,
      reason: 'sdf',
    };
  }

  let best: StructureColumnDetection | null = null;
  for (const candidate of table.columns) {
    const detection = detectionFor(table, candidate);
    if (detection && (!best || isBetter(detection, best))) {
      best = detection;
    }
  }
  if (!best) {
    throw new ConversionError(
      'no SMILES or molfile column found; pass `column` to select one',
      table.columns,
    );
  }
  return best;
}

function detectionFor(
  table: Table,
  column: string,
): StructureColumnDetection | null {
  const named = nameKind(column);
  const { smilesRatio, molfileRatio } = scoreColumn(table, column);
  const kind: StructureKind =
    molfileRatio >= smilesRatio ? 'molfile' : 'smiles';
  const confidence = kind === 'molfile' ? molfileRatio : smilesRatio;
  const threshold =
    named && named === kind ? NAMED_THRESHOLD : CONTENT_THRESHOLD;
  if (confidence < threshold) return null;
  return {
    column,
    kind,
    confidence,
    reason: named === kind ? 'name' : 'content',
  };
}

function isBetter(
  candidate: StructureColumnDetection,
  current: StructureColumnDetection,
): boolean {
  const candidateNamed = candidate.reason === 'name' ? 1 : 0;
  const currentNamed = current.reason === 'name' ? 1 : 0;
  if (candidateNamed !== currentNamed) return candidateNamed > currentNamed;
  return candidate.confidence > current.confidence;
}

function nameKind(column: string): StructureKind | null {
  const normalized = column.toLowerCase().replaceAll(/[^a-z]/g, '');
  if (SMILES_NAMES.has(normalized)) return 'smiles';
  if (MOLFILE_NAMES.has(normalized)) return 'molfile';
  if (normalized.includes('smiles')) return 'smiles';
  if (normalized.includes('molfile')) return 'molfile';
  return null;
}

function scoreColumn(
  table: Table,
  column: string,
): { smilesRatio: number; molfileRatio: number } {
  let sampled = 0;
  let smiles = 0;
  let molfiles = 0;
  for (let i = 0; i < table.rows.length && sampled < SAMPLE_SIZE; i++) {
    const raw = table.rows[i]?.[column];
    if (raw === null || raw === undefined) continue;
    const value = String(raw).trim();
    if (!value) continue;
    sampled++;
    if (isMolfile(value)) {
      molfiles++;
    } else if (isSmiles(value)) {
      smiles++;
    }
  }
  if (sampled === 0) return { smilesRatio: 0, molfileRatio: 0 };
  return { smilesRatio: smiles / sampled, molfileRatio: molfiles / sampled };
}

function isMolfile(value: string): boolean {
  return /^M {2}END\s*$/m.test(value) || /\bV[23]000\b/.test(value);
}

function isSmiles(value: string): boolean {
  if (value.length > 1000 || /\s/.test(value)) return false;
  try {
    return Molecule.fromSmiles(value).getAllAtoms() > 0;
  } catch {
    return false;
  }
}
