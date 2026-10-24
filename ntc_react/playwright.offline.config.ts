import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: "offline-shell.spec.ts",
  timeout: 90_000,
  use: { ...base.use, baseURL: "http://127.0.0.1:4173" },
  webServer: [
    {
      command:
        "dotnet run --project ../tools/FrontendFixture/FrontendFixture.csproj --no-launch-profile",
      url: "http://127.0.0.1:5199/__fixture/health",
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run preview -- --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        API_PROXY_TARGET: "http://127.0.0.1:5199",
        VITE_API_BASE_URL: "/api/v1",
        VERCEL: "0",
      },
    },
  ],
});
