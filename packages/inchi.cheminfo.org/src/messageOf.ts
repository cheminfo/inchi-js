/**
 * Turn anything thrown into a displayable message, so a `catch` never has
 * to render `[object Object]`.
 * @param error - The caught value, of any type.
 * @returns The error's message, or the value stringified.
 */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
