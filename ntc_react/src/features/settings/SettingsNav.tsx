import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { t as tr, useLanguage } from "../../shared/i18n";
import "./settings.css";
import { settingsLinks } from "./settingsLinks";
import { warmSettings } from "./warmSettings";

export function SettingsNav({ base }: { base: string }) {
  useLanguage();
  const { pathname } = useLocation();
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    nav.current
      ?.querySelector("[aria-current='page']")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);
  return (
    <nav ref={nav} className="settings-tabs" aria-label={tr("Settings")}>
      {settingsLinks(base).map(([to, label]) => (
        <NavLink key={to} to={to} onPointerEnter={warmSettings} onFocus={warmSettings}>
          {tr(label)}
        </NavLink>
      ))}
    </nav>
  );
}
