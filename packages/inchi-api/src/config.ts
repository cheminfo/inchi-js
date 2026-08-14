/** Port the server listens on. Override with the `PORT` environment variable. */
export const PORT = Number(process.env.PORT) || 10523;

/** Address the server binds to. Override with the `HOST` environment variable. */
export const HOST = process.env.HOST || '0.0.0.0';

/**
 * Largest upload accepted by `POST /v1/convert`, in bytes. Override with the
 * `MAX_FILE_SIZE` environment variable.
 */
export const MAX_FILE_SIZE =
  Number(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024;
