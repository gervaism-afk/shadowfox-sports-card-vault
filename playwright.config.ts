import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3001',
    browserName: 'chromium',
    launchOptions: { executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3001',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: false,
    timeout: 120000,
    env: { NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-fixture-key', SUPABASE_SERVICE_ROLE_KEY: '' },
  },
});
