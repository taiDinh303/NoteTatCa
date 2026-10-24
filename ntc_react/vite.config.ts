import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import react from "@vitejs/plugin-react";
import { resolveFrontendEnvironment } from "./config/environment.mjs";
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const runtime = resolveFrontendEnvironment(env, {
    mode,
    apiPath: "/api/v1",
    defaultProxy: "http://localhost:5032",
  });
  return {
    plugins: [
      react(),
      {
        name: "offline-app-shell",
        apply: "build",
        closeBundle() {
          const files = readdirSync("dist/assets").map(
            (name) => "/assets/" + name,
          );
          const version = createHash("sha256")
            .update(readFileSync("dist/index.html"))
            .digest("hex")
            .slice(0, 16);
          const sources = JSON.stringify(["/index.html", ...files]);
          writeFileSync(
            join("dist", "offline-worker.js"),
            `
const NAME = "ntc-shell-${version}";
const SOURCES = ${sources};
self.addEventListener("install", event => event.waitUntil(caches.open(NAME).then(cache => cache.addAll(SOURCES))));
self.addEventListener("activate", event => event.waitUntil(Promise.all([
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("ntc-shell-") && key !== NAME).map(key => caches.delete(key)))),
  self.clients.claim()
])));
self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.open(NAME).then(cache => cache.match("/index.html"))));
  } else if (SOURCES.includes(url.pathname)) {
    event.respondWith(caches.open(NAME).then(cache => cache.match(url.pathname, { ignoreVary: true })).then(hit => hit || fetch(request)));
  }
});
`,
          );
        },
      },
    ],
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(runtime.apiBaseUrl),
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/health": { target: runtime.proxyTarget, changeOrigin: true },
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
