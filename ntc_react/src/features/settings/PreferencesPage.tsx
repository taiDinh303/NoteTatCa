import {
  ArrowLeft,
  ChevronRight,
  Languages,
  Palette,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../shared/useTheme";
import {
  languages,
  setLanguage,
  useLanguage,
  t as tr,
} from "../../shared/i18n";
import PrivacySettings from "./PrivacySettings";
import "./preferences.css";

const sections = [
  { id: "language", label: "Language", icon: Languages },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
  { id: "appearance", label: "Appearance", icon: Palette },
] as const;

export default function PreferencesPage({
  section,
  administration = false,
}: {
  section?: "language" | "privacy" | "appearance";
  administration?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const language = useLanguage();
  const base = administration ? "/admin/preferences" : "/settings";
  const title = tr(
    sections.find((item) => item.id === section)?.label ?? "Settings",
  );
  return (
    <section className="preferences-page">
      {section ? (
        <Link className="preferences-back" to={base}>
          <ArrowLeft size={16} aria-hidden="true" />
          {tr("Settings")}
        </Link>
      ) : null}
      <h1>{title}</h1>
      {!section ? (
        <nav className="preferences-list" aria-label={tr("App settings")}>
          {sections.map(({ id, label, icon: Icon }) => (
            <Link key={id} className="preferences-row" to={`${base}/${id}`}>
              <Icon size={19} aria-hidden="true" />
              <span>{tr(label)}</span>
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      ) : section === "language" ? (
        <fieldset className="preferences-list language-options">
          <legend className="sr-only">{tr("App language")}</legend>
          {languages.map(({ code, name }) => (
            <label key={code} className="preferences-row language-option">
              <span lang={code}>{name}</span>
              <input
                type="radio"
                name="app-language"
                value={code}
                checked={language === code}
                onChange={() => setLanguage(code)}
              />
            </label>
          ))}
        </fieldset>
      ) : section === "privacy" ? (
        <PrivacySettings administration={administration} />
      ) : section === "appearance" ? (
        <div className="preferences-list">
          <div className="preferences-row">
            <label htmlFor="dark-mode">{tr("Dark mode")}</label>
            <button
              id="dark-mode"
              type="button"
              className="theme-switch"
              role="switch"
              aria-checked={theme === "dark"}
              aria-label={tr("Dark mode")}
              onClick={toggleTheme}
            >
              <span />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
