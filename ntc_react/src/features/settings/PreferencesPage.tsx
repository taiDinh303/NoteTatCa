import {
  ArrowLeft,
  ChevronRight,
  Languages,
  Palette,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../shared/useTheme";
import "./preferences.css";

const sections = [
  { id: "language", label: "Language", icon: Languages },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
  { id: "appearance", label: "Appearance", icon: Palette },
] as const;

export default function PreferencesPage({
  section,
}: {
  section?: "language" | "privacy" | "appearance";
}) {
  const { theme, toggleTheme } = useTheme();
  const title =
    sections.find((item) => item.id === section)?.label ?? "Settings";
  return (
    <section className="preferences-page">
      {section ? (
        <Link className="preferences-back" to="/settings">
          <ArrowLeft size={16} aria-hidden="true" /> Settings
        </Link>
      ) : null}
      <h1>{title}</h1>
      {!section ? (
        <nav className="preferences-list" aria-label="App settings">
          {sections.map(({ id, label, icon: Icon }) => (
            <Link key={id} className="preferences-row" to={`/settings/${id}`}>
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      ) : section === "appearance" ? (
        <div className="preferences-list">
          <div className="preferences-row">
            <label htmlFor="dark-mode">Dark mode</label>
            <button
              id="dark-mode"
              type="button"
              className="theme-switch"
              role="switch"
              aria-checked={theme === "dark"}
              aria-label="Dark mode"
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
