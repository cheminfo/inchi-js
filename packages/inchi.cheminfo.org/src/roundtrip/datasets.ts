/**
 * Metadata for each IUPAC test SDF served by the
 * `vendor-test-data` Vite plugin at `/test-data/<filename>`.
 */
export interface TestDataset {
  id: string;
  filename: string;
  approxCount: number;
  description: string;
  origin: string;
}

/**
 * Picks how to invoke `inchiFromMolfile` per dataset. Organometallic
 * fixtures upstream are always exercised with the `-RecMet` switch.
 * @param dataset - The dataset whose canonical CLI options we want.
 * @returns The raw option string to forward to the C wrapper.
 */
export function inchiOptionsFor(dataset: TestDataset): string {
  if (dataset.id.startsWith('organometallics')) return '-RecMet';
  if (dataset.id === 'alex_clark') return '-RecMet';
  return '';
}

export const TEST_DATASETS: TestDataset[] = [
  {
    id: 'inchi',
    filename: 'inchi.sdf.gz',
    approxCount: 2190,
    description: 'IUPAC InChI regression corpus',
    origin: 'INCHI-1-TEST/tests/test_library/data/ci/',
  },
  {
    id: 'mcule',
    filename: 'mcule.sdf.gz',
    approxCount: 2000,
    description: 'mcule.com purchasable structures',
    origin: 'INCHI-1-TEST/tests/test_library/data/ci/',
  },
  {
    id: 'test_io',
    filename: 'test_io.sdf.gz',
    approxCount: 4,
    description: 'V3000 I/O edge cases (SCSR, >999 atoms)',
    origin: 'INCHI-1-TEST/tests/test_executable/data/',
  },
  {
    id: 'organometallics_pubchem',
    filename: 'organometallic_structures_pubchem.sdf.gz',
    approxCount: 200,
    description: 'PubChem organometallic structures (-RecMet)',
    origin: 'INCHI-1-TEST/tests/test_executable/data/',
  },
  {
    id: 'organometallics_ccdc',
    filename: 'organometallic_structures_CCDC.sdf.gz',
    approxCount: 1500,
    description: 'CCDC organometallic structures (-RecMet)',
    origin: 'INCHI-1-TEST/tests/test_executable/data/',
  },
  {
    id: 'alex_clark',
    filename: 'alex_clark_structures.sdf.gz',
    approxCount: 5000,
    description: 'Alex Clark organometallic test set (-RecMet)',
    origin: 'INCHI-1-TEST/tests/test_executable/data/',
  },
];
