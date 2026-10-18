import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command:
        "dotnet run --project ../tools/FrontendFixture/FrontendFixture.csproj --no-launch-profile",
      url: "http://127.0.0.1:5199/__fixture/health",
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev",
      url: "http://127.0.0.1:5173",
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      env: { API_PROXY_TARGET: "http://127.0.0.1:5199", VITE_API_BASE_URL: "/api/v1", VERCEL: "0" },
    },
  ],
});
