import { defineConfig } from "@playwright/test";

const apiPort = Number.parseInt(process.env.PLAYWRIGHT_API_PORT ?? "3201", 10);
const webPort = Number.parseInt(process.env.PLAYWRIGHT_WEB_PORT ?? "3200", 10);

const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;

const sharedEnvironment = {
  ...process.env,
  API_HOST: "127.0.0.1",
  API_PORT: String(apiPort),
  WEB_HOST: "127.0.0.1",
  WEB_PORT: String(webPort),
  WEB_PUBLIC_URL: webBaseUrl,
  NEXT_PUBLIC_API_URL: apiBaseUrl,
  API_INTERNAL_URL: apiBaseUrl
};

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  outputDir: "test-results/playwright",
  reporter: process.env.CI
    ? [["github"]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: webBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: [
    {
      command: "pnpm --filter @tk182/api start",
      url: `${apiBaseUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: sharedEnvironment
    },
    {
      command: "pnpm --filter @tk182/web start",
      url: `${webBaseUrl}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: sharedEnvironment
    }
  ]
});
