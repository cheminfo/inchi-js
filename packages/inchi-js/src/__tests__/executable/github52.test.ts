import { expect, test } from 'vitest';

import { inchiFromMolfile } from '../../inchiFromMolfile.ts';

/*
 * Ported from IUPAC `INCHI-1-TEST/tests/test_executable/test_github_52.py`.
 *
 * V3000 Molfiles with an explicit empty `BOND` block or no bond block
 * at all must not trigger the upstream "No V3000 CTAB end marker" bug
 * (GitHub issue #52).
 */

const MOLFILE_EMPTY_BONDBLOCK = `
  -INDIGO-08292417452D

  0  0  0  0  0  0  0  0  0  0  0 V3000
M  V30 BEGIN CTAB
M  V30 COUNTS 1 0 0 0 0
M  V30 BEGIN ATOM
M  V30 1 C 9.35 -4.8 0.0 0
M  V30 END ATOM
M  V30 BEGIN BOND
M  V30 END BOND
M  V30 END CTAB
M  END
`;

const MOLFILE_NO_BONDBLOCK = `
  -INDIGO-08292417452D

  0  0  0  0  0  0  0  0  0  0  0 V3000
M  V30 BEGIN CTAB
M  V30 COUNTS 1 0 0 0 0
M  V30 BEGIN ATOM
M  V30 1 C 9.35 -4.8 0.0 0
M  V30 END ATOM
M  V30 END CTAB
M  END
`;

test('no_bondblock — V3000 with no BOND block parses', async () => {
  const result = await inchiFromMolfile(MOLFILE_NO_BONDBLOCK);

  expect(result.log).not.toContain('No V3000 CTAB end marker');
  expect(result.inchi).toBe('InChI=1S/CH4/h1H4');
});

test.fails(
  'empty_bondblock — V3000 with explicit empty BOND block still hits the upstream bug',
  async () => {
    const result = await inchiFromMolfile(MOLFILE_EMPTY_BONDBLOCK);

    expect(result.log).not.toContain('No V3000 CTAB end marker');
  },
);
