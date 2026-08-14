import type { Molecule } from 'openchemlib';

/** Everything the InChI → structure panel shows for one input. */
export interface InchiToStructureState {
  molecule: Molecule | null;
  molfile: string;
  smiles: string;
  inchikey: string;
  message: string;
  log: string;
  warning: boolean;
  error: string | null;
}

/** The state the panel shows before anything has been parsed. */
export const EMPTY_INCHI_TO_STRUCTURE: InchiToStructureState = {
  molecule: null,
  molfile: '',
  smiles: '',
  inchikey: '',
  message: '',
  log: '',
  warning: false,
  error: null,
};

/** The InChI the panel opens on when nothing was stored. */
export const DEFAULT_INCHI =
  'InChI=1S/C9H18O2/c1-5-7(3)8(4)11-9(10)6-2/h7-8H,5-6H2,1-4H3/t7-,8+/m0/s1';
