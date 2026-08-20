import { defineConfig, devices } from '@playwright/test';
import { env } from './src/support/env';

/**
 * Playwright configuration.
 *
 * The only things that belong here are *how the suite runs* — not test data,
 * not credentials, not selectors. Everything environment-specific is read
 * through `src/support/env.ts` so there is exactly one place that touches
 * `process.env`.
 */
export default defineConfig({
  testDir: './tests',

  // Full isolation: every test gets a fresh browser context. This is what makes
  // the parallelism below safe, and it is why tests must never depend on state
  // left behind by another test.
  fullyParallel: true,

  // A `test.only` left in the source is a suite that silently stops covering
  // everything else. Fail the CI run rather than pass a subset.
  forbidOnly: !!process.env.CI,

  // Retries mask flake locally, so keep them at zero there — a test that fails
  // once on your machine is information you want to see. In CI one retry
  // distinguishes genuine failure from infrastructure noise, and the report
  // marks the difference as "flaky" rather than hiding it.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  use: {
    baseURL: env.baseUrl,

    // Diagnostics on failure only. Traces are large; collecting them always
    // slows the suite and fills the disk, and you only ever read the failures.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // A default that fits the app, not each call site. Per-assertion timeouts
    // scattered through specs are how a suite becomes untunable.
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  // Web-first assertions poll until this deadline. Raising it is almost always
  // wrong — if an assertion needs longer, the app has a real performance
  // problem the suite is now hiding.
  expect: { timeout: 5_000 },

  projects: [
    /**
     * A setup project that runs ONCE before everything else and writes an
     * authenticated storage state to disk. Every other project depends on it.
     *
     * This is the single biggest speed win available: without it, N tests each
     * pay a full UI login. See `tests/auth/auth.setup.ts`.
     */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
