import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { cache } from "./app/runtime";
import { router } from "./app/router";
import { AppErrorBoundary } from "./shared/ui";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={cache}>
        <RouterProvider router={router} />
        <Toaster richColors position="bottom-right" closeButton />
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
