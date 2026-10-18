import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.NTC_API_PROXY_TARGET ?? env.NTC_API_PROXY_TARGET ?? "http://localhost:5032",
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
