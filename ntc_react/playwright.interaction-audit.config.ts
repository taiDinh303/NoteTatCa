import base from "./playwright.config";
import { resolve } from "node:path";

// Run from the repository root, after npm --prefix ntc_react run build.
const cwd = resolve("ntc_react");
export default {
  ...base,
  timeout: 60_000,
  use: { ...base.use, baseURL: "http://127.0.0.1:4173" },
  webServer: [
    { ...base.webServer![0], cwd },
    {
      command: "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173",
      cwd,
      url: "http://127.0.0.1:4173",
      timeout: 60_000,
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: "http://127.0.0.1:5199", VITE_API_BASE_URL: "/api/v1", VERCEL: "0" },
    },
  ],
};
