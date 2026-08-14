# inchi-api

HTTP API around [`inchi-js`](../inchi-js): convert a structure to its InChI and
InChIKey, and enrich a CSV, TSV, XLSX, or SDF file with them.

The structure column is detected automatically — `molfile` for an SDF, a
SMILES or molfile column otherwise — by looking at the column names first
(`SMILES`, `canonical_smiles`, `molfile`, …) and, when they say nothing, by
parsing a sample of every column with `openchemlib`.

## Run

```bash
npm run dev-api        # from the repository root, port 10523
docker compose up -d   # or through compose, together with the playground
```

Interactive documentation is served at `/documentation`.

In production this process also serves the built playground
(`packages/inchi.cheminfo.org/dist`) at `/`, so the site, the API and its
documentation share a single origin and a single Docker image.

| Variable        | Default    | Meaning                           |
| --------------- | ---------- | --------------------------------- |
| `PORT`          | `10523`    | Port the server listens on        |
| `HOST`          | `0.0.0.0`  | Address the server binds to       |
| `MAX_FILE_SIZE` | `52428800` | Largest accepted upload, in bytes |

## Endpoints

| Method | Route                     | Purpose                                             |
| ------ | ------------------------- | --------------------------------------------------- |
| `GET`  | `/health`                 | Liveness probe, reports the InChI C library version |
| `GET`  | `/v1/inchi?structure=CCO` | InChI and InChIKey of one structure                 |
| `POST` | `/v1/inchi`               | Same, with the structure in the JSON body           |
| `POST` | `/v1/inchi/batch`         | InChI and InChIKey of a list of structures          |
| `POST` | `/v1/inchikey`            | InChIKey of an InChI                                |
| `POST` | `/v1/molfile`             | Molfile reconstructed from an InChI                 |
| `POST` | `/v1/detect`              | Structure column detected in a file, plus a sample  |
| `POST` | `/v1/convert`             | The uploaded file with InChI and InChIKey appended  |

### One structure

```bash
curl 'http://localhost:10523/v1/inchi?structure=CCO'
# {"molfile":"…","inchi":"InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3","inchikey":"LFQSCWFLJHTTHZ-UHFFFAOYSA-N",…}

curl -X POST http://localhost:10523/v1/inchi/batch \
  -H 'content-type: application/json' \
  -d '{"structures":["CCO","c1ccccc1"],"options":"-FixedH"}'
```

`kind` (`smiles` / `molfile`) is guessed from the value; `options` is the raw
InChI option string forwarded to the C API; `auxinfo` adds the AuxInfo layer.

### A file

Upload it as `multipart/form-data` (field `file`) or as a raw body:

```bash
curl -X POST 'http://localhost:10523/v1/convert' \
  -F file=@compounds.csv -o compounds-inchi.csv

curl -X POST 'http://localhost:10523/v1/convert?filename=compounds.csv&output=sdf' \
  --data-binary @compounds.csv -o compounds-inchi.sdf
```

| Query parameter | Default  | Meaning                                              |
| --------------- | -------- | ---------------------------------------------------- |
| `output`        | `same`   | `same`, `csv`, `tsv`, `xlsx`, `sdf`, or `json`       |
| `column`        | detected | Structure column to read                             |
| `kind`          | detected | `smiles` or `molfile`                                |
| `filename`      | —        | Name of a raw body upload, used to detect its format |
| `options`       | `''`     | Raw InChI option string                              |
| `smiles`        | `false`  | Append a `SMILES` column derived from the structure  |
| `inchi`         | `true`   | Append the `InChI` column                            |
| `inchikey`      | `true`   | Append the `InChIKey` column                         |
| `auxinfo`       | `false`  | Append the AuxInfo layer                             |

The response carries the counters as headers — `x-structure-column`,
`x-structure-kind`, `x-rows-total`, `x-rows-converted`, `x-rows-failed`,
`x-rows-skipped` — and the file as an attachment.

`InChI` and `InChIKey` are appended to every record — turn either off with
`inchi=false` / `inchikey=false`. `smiles=true` adds a `SMILES` column, and is
ignored unless the structures are molfiles and the file has no SMILES column of
its own. A record that failed carries
an empty `InChI`; the reason is never written to the file, only counted in
`x-rows-failed`. Writing an SDF leaves out the records
whose structure could not be turned into a molfile (`x-rows-skipped`), and
reading an SDF into a tabular format drops the `molfile` column.

A file whose format, header, or structure column cannot be resolved answers
`422` with the list of available columns.
