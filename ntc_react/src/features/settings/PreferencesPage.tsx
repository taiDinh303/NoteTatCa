import { SettingsNav } from "./SettingsNav";
import { useTheme } from "../../shared/useTheme";
import {
  languages,
  setLanguage,
  useLanguage,
  t as tr,
} from "../../shared/i18n";
import PrivacySettings from "./PrivacySettings";
import { IconButton } from "../../shared/ui";
import { useDisplayZoom } from "../../shared/displayZoom";
import { Minus, Plus } from "lucide-react";
import "./preferences.css";

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
      <span>{tr("Interface zoom")}</span>
      <div
        className="appearance-zoom-controls"
        role="group"
        aria-label={tr("Interface zoom")}
      >
        <IconButton
          icon={Minus}
          label={tr("Zoom out")}
          disabled={percent <= 50}
          onClick={() => change(percent - 5)}
        />
        <span className="appearance-zoom-percentage">
          {tr("Zoom ({0}%)", percent)}
        </span>
        <IconButton
          icon={Plus}
          label={tr("Zoom in")}
          disabled={percent >= 150}
          onClick={() => change(percent + 5)}
        />
        <button
          type="button"
          className="text-button appearance-zoom-reset"
          disabled={percent === 100}
          onClick={() => change(100)}
        >
          {tr("Reset to 100%")}
        </button>
      </div>
    </div>
  );
}
