import { Molecule } from 'openchemlib';
import { expect, test } from 'vitest';

import { buildSdfWithInchi, parseSdfFile } from '../sdfFile.ts';
import type { InchiComputation } from '../sdfInchi.ts';
import { computeInchiBatch } from '../sdfInchi.ts';

const ETHANOL_INCHI = 'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3';
const ETHANOL_KEY = 'LFQSCWFLJHTTHZ-UHFFFAOYSA-N';
const ACETIC_INCHI = 'InChI=1S/C2H4O2/c1-2(3)4/h1H3,(H,3,4)';

test('computeInchiBatch returns the correct InChI and InChIKey per molfile', async () => {
  const molfiles = [
    Molecule.fromSmiles('CCO').toMolfile(),
    Molecule.fromSmiles('CC(=O)O').toMolfile(),
  ];

  const computations = await computeInchiBatch(molfiles);

  expect(computations).toHaveLength(2);
  expect(computations[0]?.status).toBe('ok');
  expect(computations[0]?.inchi).toBe(ETHANOL_INCHI);
  expect(computations[0]?.inchikey).toBe(ETHANOL_KEY);
  expect(computations[1]?.inchi).toBe(ACETIC_INCHI);
});

test('computeInchiBatch reports progress for every record', async () => {
  const molfiles = [Molecule.fromSmiles('CCO').toMolfile()];
  const seen: number[] = [];

  await computeInchiBatch(molfiles, {
    chunkSize: 1,
    onProgress: (progress) => seen.push(progress.done),
  });

  expect(seen.at(-1)).toBe(1);
});

test('computeInchiBatch reports progress after each record within a chunk', async () => {
  const molfiles = [
    Molecule.fromSmiles('CCO').toMolfile(),
    Molecule.fromSmiles('CC(=O)O').toMolfile(),
    Molecule.fromSmiles('CCC').toMolfile(),
  ];
  const seen: number[] = [];

  await computeInchiBatch(molfiles, {
    chunkSize: 50,
    onProgress: (progress) => seen.push(progress.done),
  });

  expect(seen).toStrictEqual([1, 2, 3]);
});

test('parseSdfFile parses an uploaded SDF and keeps data fields as strings', async () => {
  const molfile = Molecule.fromSmiles('CCO').toMolfile();
  const sdf = `${molfile}\n>  <Name>\nethanol\n\n$$$$\n`;
  const file = new File([sdf], 'sample.sdf');

  const result = await parseSdfFile(file);

  expect(result.molecules).toHaveLength(1);
  expect(result.molecules[0]?.Name).toBe('ethanol');
  expect(result.labels).toStrictEqual(['Name']);
});

test('parseSdfFile parses every record when line endings are mixed', async () => {
  const ethanol = Molecule.fromSmiles('CCO').toMolfile();
  const acetic = Molecule.fromSmiles('CC(=O)O').toMolfile();
  // First record uses Windows CRLF, the second Unix LF. Without mixedEOL
  // the parser detects CRLF from the header, then never matches the second
  // `\n$$$$` delimiter and collapses the file to a single molecule.
  const crlf = `${ethanol}\n>  <Name>\nethanol\n\n$$$$\n`.replaceAll(
    '\n',
    '\r\n',
  );
  const lf = `${acetic}\n>  <Name>\nacetic acid\n\n$$$$\n`;
  const file = new File([crlf + lf], 'mixed.sdf');

  const result = await parseSdfFile(file);

  expect(result.molecules).toHaveLength(2);
  expect(result.molecules[0]?.Name).toBe('ethanol');
  expect(result.molecules[1]?.Name).toBe('acetic acid');
});

test('buildSdfWithInchi preserves existing fields and appends InChI/InChIKey', () => {
  const molecules = [
    { molfile: 'first-molfile\nM  END', Name: 'ethanol' },
    { molfile: 'second-molfile\nM  END', Name: 'acetic acid' },
  ];
  const computations: InchiComputation[] = [
    {
      inchi: ETHANOL_INCHI,
      inchikey: ETHANOL_KEY,
      status: 'ok',
      message: '',
      warning: false,
    },
    {
      inchi: ACETIC_INCHI,
      inchikey: 'QTBSBXVTEAMEQO-UHFFFAOYSA-N',
      status: 'ok',
      message: '',
      warning: false,
    },
  ];

  const sdf = buildSdfWithInchi(molecules, computations);

  expect(sdf).toContain('>  <Name>\nethanol');
  expect(sdf).toContain(`>  <InChI>\n${ETHANOL_INCHI}`);
  expect(sdf).toContain(`>  <InChIKey>\n${ETHANOL_KEY}`);
  expect(sdf).toContain(`>  <InChI>\n${ACETIC_INCHI}`);
  expect(sdf.split('$$$$').filter((block) => block.trim())).toHaveLength(2);
});
