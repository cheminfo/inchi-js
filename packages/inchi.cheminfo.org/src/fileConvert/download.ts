import type { ConvertedFile } from './protocol.ts';

/**
 * Hand a converted file to the browser as a download.
 *
 * Everything runs client-side, so the bytes never leave the machine: the blob
 * is built in the page and released as soon as the click is dispatched.
 * @param result - The converted file, as returned by the worker.
 */
export function downloadConverted(result: ConvertedFile): void {
  const blob = new Blob([result.body], { type: result.contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Human-readable size of a converted body, for the result summary.
 * @param body - The converted file body.
 * @returns A size such as `12.4 kB`.
 */
export function sizeOf(body: string | ArrayBuffer): string {
  const bytes =
    typeof body === 'string'
      ? new TextEncoder().encode(body).length
      : body.byteLength;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
