// =============================================================================
// OCL stereo bug repro — copy-paste into any browser console where the
// openchemlib UMD bundle has been loaded (e.g. https://www.openmolecules.org/),
// or run with Node via:
//
//   node -e "const OCL = require('openchemlib'); $(cat reproduce.js)"
//
// What it shows: OCL's setAtomParity(atom, P) + inventCoordinates() +
// setStereoBondsFromParity() produces wedge bonds that encode OPPOSITE
// absolute stereochemistry for two molecules whose chiral atom has the
// SAME local connectivity (3 carbon neighbours + implicit H) and is laid
// out in the SAME local 2D angular pattern by inventCoordinates().
//
// OCL itself remains self-consistent — re-parsing the emitted molfile
// returns the original parity in both cases. But when the same molfiles
// are interpreted by the IUPAC InChI library (the reference for MDL
// stereo semantics), the two cases come back with opposite /m flags.
//
// The remote substituent on the OTHER side of the ring (a C=O in case A,
// an exocyclic C=C in case B) must not change the chirality OCL assigns
// to a local-stereo configuration — but it does.
// =============================================================================

(function () {
  // Resolve OCL from window (browser) or local require (Node).
  const OCL =
    typeof window !== 'undefined' && window.OCL
      ? window.OCL
      : typeof globalThis !== 'undefined' && globalThis.OCL
        ? globalThis.OCL
        : typeof require === 'function'
          ? require('openchemlib')
          : null;
  if (!OCL || !OCL.Molecule) {
    console.error(
      'openchemlib not found. Load https://unpkg.com/openchemlib/dist/openchemlib-full.js first.',
    );
    return;
  }
  const M = OCL.Molecule;

  /**
   * Case A — 3-methylcyclohexan-1-one
   *   atoms: 0=methyl-C, 1=chiral C*, 2..4=ring CH2, 5=C(=O), 6=ring CH2, 7=O
   *   chiral atom: 1
   */
  function buildCaseA(parity) {
    const m = new M(16, 16);
    for (let i = 0; i < 7; i++) m.addAtom(6); // 7 carbons
    m.addAtom(8); // 1 oxygen, idx 7
    m.addBond(0, 1); // methyl - C*
    m.addBond(1, 2); // ring
    m.addBond(2, 3);
    m.addBond(3, 4);
    m.addBond(4, 5);
    m.setBondType(m.addBond(5, 7), M.cBondTypeDouble); // C=O
    m.addBond(5, 6);
    m.addBond(6, 1); // close ring
    m.setAtomParity(1, parity, false);
    m.setParitiesValid(0);
    m.inventCoordinates();
    m.setStereoBondsFromParity();
    return m;
  }

  /**
   * Case B — 4-(2-buten-1-ylidene)-1-methylcyclohexane
   *   atoms: 0=terminal CH3 of vinyl, 1=methyl on chiral C*, 2..8=ring+vinyl
   *   chiral atom: 7
   */
  function buildCaseB(parity) {
    const m = new M(16, 16);
    for (let i = 0; i < 9; i++) m.addAtom(6);
    m.addBond(0, 2); // vinyl-terminal CH3 - vinyl CH
    m.setBondType(m.addBond(2, 8), M.cBondTypeDouble); // C=C exocyclic
    m.addBond(8, 5);
    m.addBond(5, 3);
    m.addBond(3, 7); // ring CH2 - C*
    m.addBond(7, 1); // C* - methyl
    m.addBond(7, 4); // C* - ring CH2
    m.addBond(4, 6);
    m.addBond(6, 8);
    m.setAtomParity(7, parity, false);
    m.setParitiesValid(0);
    m.inventCoordinates();
    m.setStereoBondsFromParity();
    return m;
  }

  function report(label, build, chiralAtom) {
    for (const parity of [1, 2]) {
      const m = build(parity);
      const molfile = m.toMolfile();
      const reparsed = M.fromMolfile(molfile);
      reparsed.ensureHelperArrays(M.cHelperParities);
      const oclRoundTrip = reparsed.getAtomParity(chiralAtom);
      const smi = m.toIsomericSmiles();
      console.log(
        `[${label}] parity in=${parity}  OCL re-parsed=${oclRoundTrip}  SMILES=${smi}`,
      );
      console.log(molfile);
    }
  }

  console.log('=== Case A: 3-methylcyclohexan-1-one (chiral atom = 1) ===');
  report('A', buildCaseA, 1);
  console.log(
    '=== Case B: 4-(2-buten-1-ylidene)-1-methylcyclohexane (chiral atom = 7) ===',
  );
  report('B', buildCaseB, 7);

  console.log(
    [
      '',
      '--- Observation ---',
      'Both molecules have the same local chirality pattern around their',
      'chiral atom (methyl, two ring-CH2 carbons, implicit H). OCL emits',
      'wedge bonds with the SAME geometry. OCL round-trips parity through',
      'molfile correctly (self-consistent).',
      '',
      'However, when these molfiles are fed to the IUPAC InChI library',
      '(reference implementation of MDL stereo semantics):',
      '',
      '  Case A  parity 1 → InChI …/t6-/m0/s1',
      '  Case A  parity 2 → InChI …/t6-/m1/s1',
      '  Case B  parity 1 → InChI …/t8-/m1/s1   ← /m flipped vs A',
      '  Case B  parity 2 → InChI …/t8-/m0/s1',
      '',
      'Same local stereo configuration → opposite absolute configurations.',
      'A remote substituent on the far side of the ring is changing what',
      'OCL thinks parity 1 means at the local chiral atom. That should not',
      'happen — parity must be a function of the local geometry.',
    ].join('\n'),
  );
})();
