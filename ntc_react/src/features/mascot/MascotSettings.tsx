import { t as tr, useLanguage } from "../../shared/i18n";
import {
  mascotGroups,
  removeCustomMascot,
  saveCustomMascot,
  setMascotPreference,
  useMascotPreference,
} from "./mascotPreference";
import { useState } from "react";
import { toast } from "sonner";
import "./MascotSettings.css";

function characterLabel(name: string) {
  const translated = tr(`mascot.${name}`);
  const english: Record<string, string> = {
    redpanda: "Red panda",
    gearbot: "Gear bot",
    postbot: "Post bot",
    crt: "CRT",
    tv: "TV",
  };
  return translated === `mascot.${name}`
    ? (english[name] ?? name[0].toUpperCase() + name.slice(1))
    : translated;
}

export function MascotSettings() {
  useLanguage();
  const { enabled, character, customImage } = useMascotPreference();
  const [uploading, setUploading] = useState(false);
  return (
    <div className="mascot-settings">
      <div className="preferences-row">
        <div>
          <label htmlFor="mascot-enabled">{tr("Mascot")}</label>
          <p className="field-hint">
            {tr("A little companion on your notes. Saved on this browser.")}
          </p>
        </div>
        <button
          id="mascot-enabled"
          type="button"
          className="theme-switch"
          role="switch"
          aria-label={tr("Show mascot")}
          aria-checked={enabled}
          onClick={() => setMascotPreference({ enabled: !enabled })}
        >
          <span />
        </button>
      </div>
      {enabled ? (
        <div role="group" aria-label={tr("Choose a mascot")}>
          {mascotGroups.map((group) => (
            <fieldset className="mascot-choices" key={group.label}>
              <legend>{tr(group.label)}</legend>
              {group.names.map((name) => (
                <label className="mascot-choice" key={name}>
                  <input
                    type="radio"
                    name="mascot-character"
                    value={name}
                    checked={character === name}
                    onChange={() => setMascotPreference({ character: name })}
                  />
                  <span className="mascot-choice-image" aria-hidden>
                    <img
                      src={`/mascots/${name}-directions.webp`}
                      alt=""
                      loading="lazy"
                      width={216}
                      height={216}
                    />
                  </span>
                  <span>{characterLabel(name)}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <fieldset className="mascot-custom-settings">
            <legend>{tr("Custom mascot")}</legend>
            <p className="field-hint">
              {tr(
                "Upload your own image (PNG, JPEG or WebP, up to 512 KB). Custom images stay still and are saved only on this browser.",
              )}
            </p>
            {customImage ? (
              <label className="mascot-choice mascot-custom-choice">
                <input
                  type="radio"
                  name="mascot-character"
                  checked={character === "custom"}
                  onChange={() => setMascotPreference({ character: "custom" })}
                />
                <img src={customImage} alt="" width={72} height={72} />
                <span>{tr("Your image")}</span>
              </label>
            ) : null}
            {customImage ? (
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  try {
                    removeCustomMascot();
                  } catch {
                    toast.error(
                      tr(
                        "Could not save the image. Browser storage may be full or unavailable.",
                      ),
                    );
                  }
                }}
              >
                {tr("Remove image")}
              </button>
            ) : null}
            <label className="mascot-upload-label">
              {tr("Upload image")}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={async (event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (!file) return;
                  setUploading(true);
                  try {
                    await saveCustomMascot(file);
                  } catch (error) {
                    toast.error(
                      tr(
                        error instanceof Error
                          ? error.message
                          : "Could not read this image.",
                      ),
                    );
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
