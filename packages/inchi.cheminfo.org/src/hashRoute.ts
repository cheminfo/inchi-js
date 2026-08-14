/**
 * Split the current hash into its path segments, with the leading `#/`
 * removed. The route has the shape `#/<tab>/<subtab or item>`.
 * @returns The segments, in order.
 */
export function hashSegments(): string[] {
  return (globalThis.location?.hash ?? '').replace(/^#\/?/, '').split('/');
}
