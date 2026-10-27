import { SettingsNav } from "./SettingsNav";
import { useTheme } from "../../shared/useTheme";
import {
  languages,
  setLanguage,
  useLanguage,
  t as tr,
} from "../../shared/i18n";
import PrivacySettings from "./PrivacySettings";
import { useDisplayZoom } from "../../shared/displayZoom";
import { Minus, Plus, RotateCcw } from "lucide-react";
import "./preferences.css";
import { MascotSettings } from "../mascot/MascotSettings";

export default function PreferencesPage({
  section,
  administration = false,
}: {
  section: "language" | "privacy" | "appearance";
  administration?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const language = useLanguage();
  const title = tr(
    { language: "Language", privacy: "Privacy", appearance: "Appearance" }[
      section
    ],
  );
  return (
    <section className="preferences-page">
      <SettingsNav base={administration ? "/admin/settings" : "/settings"} />
      <h1 className="sr-only">{title}</h1>
      {section === "language" ? (
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
          <AppearanceZoomRow />
          {!administration ? <MascotSettings /> : null}
        </div>
      ) : null}
    </section>
  );
}

function AppearanceZoomRow() {
  useLanguage();
  const { percent, change } = useDisplayZoom();
  return (
    <div className="preferences-row appearance-zoom-row">
      <span>{tr("Notes zoom")}</span>
      <div
        className="appearance-zoom-controls zoom-dropdown-controls"
        role="group"
        aria-label={tr("Notes zoom")}
      >
        <button
          type="button"
          className="zoom-step"
          aria-label={tr("Zoom out")}
          disabled={percent <= 50}
          onClick={() => change(Math.max(50, percent - 5))}
        >
          <Minus size={15} />
        </button>
        <div className="zoom-dropdown-number">
          <input
            type="number"
            min={50}
            max={150}
            step={5}
            inputMode="numeric"
            value={percent}
            aria-label={tr("Zoom percentage")}
            onChange={(event) => {
              const raw = Number(event.target.value);
              if (Number.isFinite(raw)) change(Math.min(150, Math.max(50, Math.round(raw))));
            }}
          />
        </div>
        <button
          type="button"
          className="zoom-step"
          aria-label={tr("Zoom in")}
          disabled={percent >= 150}
          onClick={() => change(Math.min(150, percent + 5))}
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          className="zoom-reset"
          aria-label={tr("Reset")}
          onClick={() => change(100)}
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  );
}
