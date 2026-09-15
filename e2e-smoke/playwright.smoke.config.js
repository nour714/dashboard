import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'https://africiatravel.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  }
});
