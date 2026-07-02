import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "frontend/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "corepack pnpm --filter @origin-ms/frontend dev",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "uv run --project backend uvicorn origin_ms.main:app --host 127.0.0.1 --port 8000",
      url: "http://127.0.0.1:8000/openapi.json",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-reduced-motion",
      use: { ...devices["Desktop Chrome"], reducedMotion: "reduce" },
    },
  ],
});
