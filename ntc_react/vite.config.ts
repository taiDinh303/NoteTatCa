import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolveFrontendEnvironment } from "./config/environment.mjs";
export default defineConfig(({mode}) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const runtime = resolveFrontendEnvironment(env, { mode, apiPath: "/api/v1", defaultProxy: "http://localhost:5032" });
  return {
  plugins: [react()],
  define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(runtime.apiBaseUrl) },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: runtime.proxyTarget,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
  },
  build: { chunkSizeWarningLimit: 700 },
  };
});
