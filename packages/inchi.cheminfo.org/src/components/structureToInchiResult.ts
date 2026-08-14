import type { InchiFromMolfileResult, InchikeyFromInchiResult } from 'inchi-js';

/** Everything the structure → InChI panel shows for one drawing. */
export interface StructureToInchiState {
  inchi: string;
  inchikey: string;
  auxinfo: string;
  message: string;
  log: string;
  warning: boolean;
  error: string | null;
  smiles: string;
  idCode: string;
}

/** The state the panel shows before anything has been drawn. */
export const EMPTY_RESULT: StructureToInchiState = {
  inchi: '',
  inchikey: '',
  auxinfo: '',
  message: '',
  log: '',
  warning: false,
  error: null,
  smiles: '',
  idCode: '',
};

/** The molecule the panel opens on when nothing was stored. */
export const INITIAL_SMILES = 'CC(=O)OCC';

/**
 * Fold the engine's two results into the panel state, turning a `-1`
 * return code into a displayable error rather than a thrown exception.
 * @param inchi - What `inchiFromMolfile` returned.
 * @param inchikey - What `inchikeyFromInchi` returned.
 * @param smiles - Canonical SMILES of the drawing.
 * @param idCode - OCL idCode of the drawing.
 * @returns The state to render.
 */
export function buildResult(
  inchi: InchiFromMolfileResult,
  inchikey: InchikeyFromInchiResult,
  smiles: string,
  idCode: string,
): StructureToInchiState {
  if (inchi.returnCode === -1) {
    return {
      ...EMPTY_RESULT,
      smiles,
      idCode,
      error: inchi.message || inchi.log || 'InChI generation failed.',
    };
  }
  return {
    inchi: inchi.inchi,
    inchikey: inchikey.inchikey,
    auxinfo: inchi.auxinfo,
    message: inchi.message,
    log: inchi.log,
    warning: inchi.returnCode === 1,
    error: null,
    smiles,
    idCode,
  };
}
