import { defineConfig, devices } from '@playwright/test';

/**
 * The dev server reads `PORT` from the monorepo-root `.env` (defaulting to
 * the production port). For deterministic e2e runs we pin a dedicated port
 * via the `webServer.env` override and `--strictPort`, so the server binds
 * exactly where `baseURL` expects it instead of drifting to a free port.
 */
const PORT = 5273;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --strictPort',
    url: baseURL,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
