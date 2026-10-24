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
  const stop = preparation.subscribe(() => {
    if (preparation.getSnapshot().status !== "ready") return;
    stop();
    const install = () => { void navigator.serviceWorker.register("/offline-worker.js").catch(() => {}); };
    if ("requestIdleCallback" in window) window.requestIdleCallback(install, { timeout: 10_000 });
    else setTimeout(install, 1000);
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
