/**
 * Public surface of the file conversion layer.
 *
 * Everything here is browser-safe — it is consumed both by the Fastify routes
 * of this service and, through the workspace, by the conversion worker of
 * `inchi.cheminfo.org`, which runs the very same code with no server involved.
 */

export type {
  ConvertFileOptions,
  ConvertFileResult,
  ConvertStats,
} from './convertFile.ts';
export { canAppendSmiles } from './canAppendSmiles.ts';
export { convertFile } from './convertFile.ts';
export { detectStructureColumn } from './detectStructureColumn.ts';
export { ConversionError, asConversion, messageOf } from './errors.ts';
export { OUTPUT_MEDIA, detectInputFormat, outputFilename } from './formats.ts';
export { readSdf } from './readSdf.ts';
export { readTable } from './readTable.ts';
export type {
  Conversion,
  SerializeConversionOptions,
  SerializedConversion,
} from './serializeConversion.ts';
export { serializeConversion } from './serializeConversion.ts';
export type {
  CellValue,
  ConversionStats,
  DetectionReason,
  EnrichedRow,
  InputFormat,
  OutputFormat,
  StructureColumnDetection,
  StructureKind,
  Table,
} from './types.ts';
export {
  AUXINFO_COLUMN,
  INCHIKEY_COLUMN,
  INCHI_COLUMN,
  MESSAGE_COLUMN,
  MOLFILE_COLUMN,
  SMILES_COLUMN,
} from './types.ts';
