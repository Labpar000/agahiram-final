import { defineConfig, devices } from '@playwright/test';

const webPort = 5173;
const adminPort = 3001;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'web',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL: `http://127.0.0.1:${webPort}`,
      },
      testMatch: /.*\.web\.spec\.ts/,
    },
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL: `http://127.0.0.1:${adminPort}`,
      },
      testMatch: /.*\.admin\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: 'pnpm dev',
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      cwd: '.',
    },
    {
      command: 'pnpm --filter @agahiram/admin dev',
      url: `http://127.0.0.1:${adminPort}/admin/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
