import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { t as tr, useLanguage } from "../../shared/i18n";
import "./settings.css";

export function SettingsNav({ base }: { base: string }) {
  useLanguage();
  const { pathname } = useLocation();
  const nav = useRef<HTMLElement>(null);
  const preferences = base.startsWith("/admin") ? "/admin/preferences" : base;
  useEffect(() => {
    nav.current
      ?.querySelector("[aria-current='page']")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);
  return (
    <nav ref={nav} className="settings-tabs" aria-label={tr("Settings")}>
      {[
        [base + "/profile", "Profile"],
        [base + "/account", "Account & security"],
        [base + "/sessions", "Active sessions"],
        [preferences + "/language", "Language"],
        [preferences + "/privacy", "Privacy"],
        [preferences + "/appearance", "Appearance"],
      ].map(([to, label]) => (
        <NavLink key={to} to={to}>
          {tr(label)}
        </NavLink>
      ))}
    </nav>
  );
}
