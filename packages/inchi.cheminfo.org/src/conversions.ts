import { effect } from '@preact/signals-react';
import type { InchikeyFromInchiResult } from 'inchi-js';
import {
  inchiFromMolfile,
  inchikeyFromInchi,
  oclMoleculeFromStructure,
  structureFromInchi,
} from 'inchi-js';
import * as OCL from 'openchemlib';
import { Molecule } from 'openchemlib';

import { EMPTY_INCHI_TO_STRUCTURE } from './components/inchiToStructureResult.ts';
import {
  EMPTY_RESULT,
  buildResult,
} from './components/structureToInchiResult.ts';
import { messageOf } from './messageOf.ts';
import { state } from './state/index.ts';

let started = false;
let structureRun = 0;
let inchiRun = 0;

/**
 * Keep the two conversion results in step with their inputs. Both call
 * into WebAssembly, so each run is guarded by a counter and a late
 * answer to a superseded input is dropped rather than rendered.
 */
export function startConversions(): void {
  if (started) return;
  started = true;

  effect(() => {
    void convertStructure(state.preferences.idCode.value, ++structureRun);
  });
  effect(() => {
    void convertInchi(state.preferences.inchi.value, ++inchiRun);
  });
}

async function convertStructure(idCode: string, run: number): Promise<void> {
  if (!idCode) {
    state.data.structure.value = EMPTY_RESULT;
    return;
  }

  let molecule: Molecule;
  let smiles = '';
  let molfile = '';
  try {
    molecule = Molecule.fromIDCode(idCode);
    smiles = molecule.toIsomericSmiles();
    molfile = molecule.toMolfile();
  } catch (error) {
    state.data.structure.value = {
      ...EMPTY_RESULT,
      idCode,
      error: messageOf(error),
    };
    return;
  }
  if (molecule.getAllAtoms() === 0) {
    state.data.structure.value = { ...EMPTY_RESULT, idCode, smiles };
    return;
  }

  state.view.structurePending.value = true;
  try {
    const inchiResult = await inchiFromMolfile(molfile);
    let keyResult: InchikeyFromInchiResult = {
      returnCode: 0,
      inchikey: '',
      message: '',
    };
    if (inchiResult.inchi) {
      keyResult = await inchikeyFromInchi(inchiResult.inchi);
    }
    if (run !== structureRun) return;
    state.data.structure.value = buildResult(
      inchiResult,
      keyResult,
      smiles,
      idCode,
    );
  } catch (error) {
    if (run !== structureRun) return;
    state.data.structure.value = {
      ...EMPTY_RESULT,
      idCode,
      smiles,
      error: messageOf(error),
    };
  } finally {
    if (run === structureRun) state.view.structurePending.value = false;
  }
}

async function convertInchi(input: string, run: number): Promise<void> {
  const trimmed = input.trim();
  if (!trimmed) {
    state.data.inchiStructure.value = EMPTY_INCHI_TO_STRUCTURE;
    return;
  }

  state.view.inchiPending.value = true;
  try {
    const [structure, keyResult] = await Promise.all([
      structureFromInchi(trimmed),
      inchikeyFromInchi(trimmed),
    ]);
    if (run !== inchiRun) return;
    if (structure.returnCode === -1) {
      state.data.inchiStructure.value = {
        ...EMPTY_INCHI_TO_STRUCTURE,
        error:
          structure.message || structure.log || 'InChI could not be parsed.',
      };
      return;
    }
    const molecule = oclMoleculeFromStructure(structure, OCL);
    state.data.inchiStructure.value = {
      molecule,
      molfile: molecule.toMolfile(),
      smiles: molecule.toIsomericSmiles(),
      inchikey: keyResult.inchikey,
      message: structure.message,
      log: structure.log,
      warning: structure.returnCode === 1,
      error: null,
    };
  } catch (error) {
    if (run !== inchiRun) return;
    state.data.inchiStructure.value = {
      ...EMPTY_INCHI_TO_STRUCTURE,
      error: messageOf(error),
    };
  } finally {
    if (run === inchiRun) state.view.inchiPending.value = false;
  }
}
