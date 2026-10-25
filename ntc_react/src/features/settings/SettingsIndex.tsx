import { useSyncExternalStore } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  UserRound,
  ShieldCheck,
  Palette,
  Languages,
  LockKeyhole,
  Monitor,
  ChevronRight,
} from "lucide-react";
import { t as tr, useLanguage } from "../../shared/i18n";
import { settingsLinks } from "./settingsLinks";
import "./settings.css";
import "./preferences.css";

function subscribe(listener: () => void) {
  window.addEventListener("resize", listener);
  return () => window.removeEventListener("resize", listener);
}
const icons = [
  UserRound,
  ShieldCheck,
  Palette,
  Languages,
  LockKeyhole,
  Monitor,
];
export default function SettingsIndex({
  administration = false,
}: {
  administration?: boolean;
}) {
  useLanguage();
  const width = useSyncExternalStore(subscribe, () => window.innerWidth);
  const base = administration ? "/admin/settings" : "/settings";
  if (width > 800)
    return <Navigate to={base + "/account"} replace />;
  return (
    <section className="settings-index">
      <h1 className="sr-only">{tr("Settings")}</h1>
      <nav className="preferences-list" aria-label={tr("Settings")}>
        {settingsLinks(base).map(([to, label], index) => {
          const Icon = icons[index];
          return (
            <Link className="preferences-row" key={to} to={to}>
              <Icon size={19} aria-hidden="true" />
              <span>{tr(label)}</span>
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
