import { DatabaseSync } from 'node:sqlite';

/**
 * Shape of each row in the upstream IUPAC regression reference SQLite
 * database (table `results`). The `result` column is a JSON blob.
 */
export interface ReferenceRow {
  molfileId: string;
  inchi: string;
  inchikey: string;
  auxinfo: string;
  log: string;
  message: string;
  exit: number;
}

interface RawJson {
  inchi: string;
  key: string;
  aux: string;
  log: string;
  message: string;
  exit: number;
}

/**
 * Load every row of the upstream regression-reference SQLite database
 * into a `molfileId → ReferenceRow` map.
 * @param path - Absolute path to the `*.sdf.regression_reference.sqlite` file.
 * @returns Map keyed by `molfileId`.
 */
export function loadReferenceMap(path: string): Map<string, ReferenceRow> {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    /* eslint-disable @typescript-eslint/naming-convention -- column name from upstream schema */
    const rows = db
      .prepare('SELECT molfile_id, result FROM results')
      .all() as Array<{ molfile_id: string; result: string }>;
    /* eslint-enable @typescript-eslint/naming-convention */
    const map = new Map<string, ReferenceRow>();
    for (const row of rows) {
      const parsed = JSON.parse(row.result) as RawJson;
      map.set(row.molfile_id, {
        molfileId: row.molfile_id,
        inchi: parsed.inchi,
        inchikey: parsed.key,
        auxinfo: parsed.aux,
        log: parsed.log,
        message: parsed.message,
        exit: parsed.exit,
      });
    }
    return map;
  } finally {
    db.close();
  }
}
