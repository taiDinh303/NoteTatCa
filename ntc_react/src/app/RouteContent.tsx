import { Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SettingsNav } from "../features/settings/SettingsNav";
import { Spinner } from "../shared/ui";
import { t as tr, useLanguage } from "../shared/i18n";

export function RouteContent({ children }: { children: ReactNode }) {
  useLanguage();
  const { pathname } = useLocation();
  const settings = /^\/(settings|admin\/(settings|preferences))(\/|$)/.test(pathname);
  return <Suspense key={pathname} fallback={
    <section aria-busy="true">
      {settings ? <SettingsNav base={pathname.startsWith("/admin") ? "/admin/settings" : "/settings"} /> : null}
      <Spinner label={tr(settings ? "Loading settings…" : "Loading…")} />
    </section>
  }>{children}</Suspense>;
}
