/**
 * Error raised when an uploaded file cannot be converted — unsupported
 * format, missing header, or no structure column found. Routes turn it into
 * a `422 Unprocessable Entity` response.
 */
export class ConversionError extends Error {
  /** HTTP status code the route replies with. */
  readonly statusCode = 422;
  /** Column names available in the uploaded file, when relevant. */
  readonly columns: string[];

  constructor(message: string, columns: string[] = []) {
    super(message);
    this.name = 'ConversionError';
    this.columns = columns;
  }
}

/**
 * Turn anything thrown into a displayable message, so a `catch` never has
 * to render `[object Object]`.
 * @param error - The caught value, of any type.
 * @returns The error's message, or the value stringified.
 */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Run an action and rethrow anything it throws as a {@link ConversionError},
 * so a malformed upload answers `422` instead of `500`.
 * @param action - The parsing step to run.
 * @returns Whatever the action returns.
 */
export async function asConversion<T>(
  action: () => T | Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    throw new ConversionError(messageOf(error));
  }
}
