import { signal } from '@preact/signals-react';

import type { InchiToStructureState } from '../components/inchiToStructureResult.ts';
import { EMPTY_INCHI_TO_STRUCTURE } from '../components/inchiToStructureResult.ts';
import type { StructureToInchiState } from '../components/structureToInchiResult.ts';
import { EMPTY_RESULT } from '../components/structureToInchiResult.ts';

/**
 * What the engine made of the current inputs. Never persisted: it is
 * recomputed from `preferences.idCode` and `preferences.inchi` on every
 * load, by the effects in `conversions.ts`.
 */
export const data = {
  /** InChI, InChIKey and AuxInfo of the structure being drawn. */
  structure: signal<StructureToInchiState>(EMPTY_RESULT),
  /** The molecule the typed InChI describes, laid out in 2D. */
  inchiStructure: signal<InchiToStructureState>(EMPTY_INCHI_TO_STRUCTURE),
};
