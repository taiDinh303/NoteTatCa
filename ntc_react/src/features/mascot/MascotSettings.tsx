import { t as tr, useLanguage } from "../../shared/i18n";
import {
  mascotGroups,
  mascotPresetSources,
  setMascotPreference,
  useMascotPreference,
} from "./mascotPreference";
import { useAuth } from "../../shared/hooks";
import { MascotAiSettings } from "./MascotAiSettings";
import { useAccountMascot } from "./generatedMascot";
import { MascotPage } from "./MascotPage";
import { useMascotFloor } from "./mascotFloor";
import { mascotArtScale } from "./mascotGeometry";
import "./MascotSettings.css";

function MascotChoicePreview({
  name,
}: {
  name: Parameters<typeof mascotPresetSources>[0];
}) {
  const sources = mascotPresetSources(name);
  const floors = useMascotFloor(sources.directions, sources.reactions, true);
  // The larger transparent canvas must not turn into empty gallery layout space.
  // The exported v6 frames need <6px above this preview; retain the v5 allowance.
  const headroom = 72 * Math.min(0.4, mascotArtScale(sources.directions) - 1);
  return (
    <span
      style={{
        display: "block",
        width: 72,
        height: 72 + headroom,
        paddingTop: headroom,
        boxSizing: "border-box",
        visibility: floors ? "visible" : "hidden",
      }}
    >
      <MascotPage
        {...sources}
        size={72}
        label={characterLabel(name)}
        className="mascot-choice-page"
        disableSquash
        fixedDirection="center"
        floors={floors}
      />
    </span>
  );
}

function characterLabel(name: string) {
  const translated = tr(`mascot.${name}`);
  const english: Record<string, string> = {
    redpanda: "Red panda",
    gearbot: "Gear bot",
    postbot: "Post bot",
    crt: "CRT",
    tv: "TV",
    notebook: "Notebook robot",
    paper: "Paper pal",
  };
  return translated === `mascot.${name}`
    ? (english[name] ?? name[0].toUpperCase() + name.slice(1))
    : translated;
}

export function MascotSettings() {
  useLanguage();
  const { enabled, character } = useMascotPreference();
  const owner = useAuth().session?.userId;
  const { images } = useAccountMascot(
    owner,
    enabled && character === "generated",
  );
  const selectedCharacter =
    (character === "generated" && !images) || character === "custom"
      ? "bunny"
      : character;
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
          {owner ? <MascotAiSettings key={owner} owner={owner} /> : null}
          {mascotGroups.map((group) => (
            <fieldset className="mascot-choices" key={group.label}>
              <legend>{tr(group.label)}</legend>
              {group.names.map((name) => (
                <label className="mascot-choice" key={name}>
                  <input
                    type="radio"
                    name="mascot-character"
                    aria-label={characterLabel(name)}
                    value={name}
                    checked={selectedCharacter === name}
                    onChange={() => setMascotPreference({ character: name })}
                  />
                  <MascotChoicePreview name={name} />
                  <span>{characterLabel(name)}</span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      ) : null}
    </div>
  );
}
