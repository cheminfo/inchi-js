# OCL `setStereoBondsFromParity` — stereo-inversion bug repro

`Molecule.setAtomParity(atom, P)` + `Molecule.inventCoordinates()` + `Molecule.setStereoBondsFromParity()` produces wedge bonds that encode the **opposite absolute configuration** for two molecules whose chiral atom has the same local connectivity. The bug only manifests for certain ring substrates — acyclic centres and most cyclic centres round-trip correctly.

## Symptom

Two molecules, both with a chiral ring CH bearing `(methyl, ring-CH₂, ring-CH₂, implicit H)`:

| Molecule                                         | OCL parity in | OCL re-parsed | InChI from emitted molfile          |
| ------------------------------------------------ | ------------- | ------------- | ----------------------------------- |
| **A**: 3-methylcyclohexan-1-one                  | 1             | 1 ✓           | `…/t6-/m0/s1`                       |
| **A**: 3-methylcyclohexan-1-one                  | 2             | 2 ✓           | `…/t6-/m1/s1`                       |
| **B**: 4-(2-buten-1-ylidene)-1-methylcyclohexane | 1             | 1 ✓           | `…/t8-/m1/s1` ← **/m flipped vs A** |
| **B**: 4-(2-buten-1-ylidene)-1-methylcyclohexane | 2             | 2 ✓           | `…/t8-/m0/s1`                       |

Both cases are OCL-self-consistent (parity round-trips through molfile via OCL alone). But the IUPAC InChI library — the reference for MDL/V2000 stereo semantics — interprets the wedge bonds as encoding **opposite** absolute configurations between case A and case B. Since the local stereo configuration is the same in both, OCL must be assigning a wedge that no longer corresponds to the same physical chirality once a remote substituent (on the far side of the ring) is added.

## Files

| File                                                  | Content                                                                                                                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reproduce.js`                                        | Self-contained console snippet. Copy-paste into a browser console with `openchemlib-full.js` loaded, or `node -e "globalThis.OCL = require('openchemlib'); $(cat reproduce.js)"`. |
| `3-methylcyclohexan-1-one-parity1.mol`                | Case A, OCL output for `setAtomParity(1, cAtomParity1)`                                                                                                                           |
| `3-methylcyclohexan-1-one-parity2.mol`                | Case A, OCL output for `setAtomParity(1, cAtomParity2)`                                                                                                                           |
| `4-2-buten-1-ylidene-1-methylcyclohexane-parity1.mol` | Case B, OCL output for `setAtomParity(7, cAtomParity1)`                                                                                                                           |
| `4-2-buten-1-ylidene-1-methylcyclohexane-parity2.mol` | Case B, OCL output for `setAtomParity(7, cAtomParity2)`                                                                                                                           |

## Verification

```bash
node -e "globalThis.OCL = require('openchemlib'); $(cat reproduce.js)"
```

Also run the vitest reproducer in this repo:

```bash
npx vitest run --no-coverage ocl-stereo-bug
```

Both the self-consistency test and the parity-inversion test pass — i.e. the parity inversion is observed deterministically.

## Why this matters

For a molecule built programmatically with `setAtomParity()`, no downstream tool can recover the intended chirality from the OCL-emitted molfile without first running a round-trip through the InChI library (or equivalent) to determine which way `parity 1` got drawn. Workaround: brute-force flip per stereo centre until the round-tripped InChI matches the source — but that requires repeated WASM round-trips. The clean fix is for OCL's `setStereoBondsFromParity()` to emit wedges whose chirality interpretation is independent of remote substituents.

## OCL version

```
openchemlib@9.22.1
```
