import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { cache, preparation } from "./app/runtime";
import { router } from "./app/router";
import { AppErrorBoundary } from "./shared/ui";
import { DisplayPreferences } from "./shared/DisplayPreferences";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./styles.css";
import { initializeLanguage } from "./shared/i18n";
initializeLanguage();
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  // A phone can stay pinned to an old shell (old meta tag, old back logic) for
  // days because the browser caches the service-worker script. Detect a newer
  // worker, ask it to activate immediately, and reload once it takes control.
  let sawUpdate = false;
  let reloading = false;
  const stop = preparation.subscribe(() => {
    if (preparation.getSnapshot().status !== "ready") return;
    stop();
    const register = () => {
      navigator.serviceWorker
        .register("/offline-worker.js")
        .then((registration) => {
          const onControllerChange = () => {
            if (sawUpdate && !reloading) {
              reloading = true;
              window.location.reload();
            }
          };
          // A waiting worker from a previous load already means an update exists.
          if (registration.waiting) {
            sawUpdate = true;
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }
          registration.addEventListener("updatefound", () => {
            const next = registration.installing;
            if (!next) return;
            next.addEventListener("statechange", () => {
              // A newer worker is installed while an older one still controls
              // this page → it is waiting; activate it now instead of next load.
              if (
                next.state === "installed" &&
                navigator.serviceWorker.controller &&
                navigator.serviceWorker.controller !== next
              ) {
                sawUpdate = true;
                next.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });
          registration.addEventListener("controllerchange", onControllerChange);
        })
        .catch(() => {});
    };
    if ("requestIdleCallback" in window) window.requestIdleCallback(register, { timeout: 10_000 });
    else setTimeout(register, 1000);
  });
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={cache}>
        <DisplayPreferences>
          <RouterProvider router={router} />
          <Toaster richColors position="bottom-right" closeButton />
        </DisplayPreferences>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
