import { t as tr, useLanguage } from "../../shared/i18n";
import { useState } from "react";
import NoteToolPanel from "./NoteToolPanel";
import { Check, Paintbrush, Save, X } from "lucide-react";
import { notePalette } from "../../domain/color";
import { IconButton } from "../../shared/ui";
import { useAuth } from "../../shared/hooks";
import { normalizeHexColor, useSavedColors } from "../../shared/savedColors";

export default function NoteColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  useLanguage();
  const [open, setOpen] = useState(false);
  const userId = useAuth().session?.userId ?? "anonymous";
  return <>
    <IconButton data-note-tool-trigger icon={Paintbrush} label={tr("Note background color")} active={open} onClick={() => setOpen(!open)} />
    {open ? <NoteToolPanel title={tr("Note colors")} onClose={() => setOpen(false)}>
      <ColorChoices key={userId} userId={userId} color={color} onChange={onChange} onClose={() => setOpen(false)} />
    </NoteToolPanel> : null}
  </>;
}

function ColorChoices({
  userId,
  color,
  onChange,
  onClose,
}: {
  userId: string;
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
}) {
  useLanguage();
  const [hex, setHex] = useState(() => normalizeHexColor(color) ?? "#FFFFFF");
  const palette = useSavedColors(userId);
  const candidate = normalizeHexColor(hex);
  const saved = !!candidate && palette.colors.includes(candidate);
  return (
    <>
      <form
        className="color-entry"
        onSubmit={(event) => {
          event.preventDefault();
          if (candidate) {
            onChange(candidate);
            setHex(candidate);
          }
        }}
      >
        <span
          className="saved-color-swatch color-input-swatch"
          style={{ backgroundColor: candidate ?? "#ffffff" }}
        >
          <input
            type="color"
            aria-label={tr("Custom note color")}
            value={candidate ?? "#ffffff"}
            onChange={(event) => {
              setHex(event.target.value);
              onChange(event.target.value);
            }}
          />
        </span>
        <input
          type="text"
          aria-label={tr("Hex color")}
          value={hex}
          placeholder="#RRGGBB"
          maxLength={7}
          spellCheck={false}
          aria-invalid={hex.length > 0 && !candidate}
          onChange={(event) => setHex(event.target.value)}
        />
        <button
          type="button"
          className="icon-button color-entry-action"
          aria-label={saved ? tr("Color saved") : tr("Save color")}
          title={saved ? tr("Color saved") : tr("Save color")}
          disabled={!candidate || saved}
          onClick={() => {
            if (candidate) {
              palette.save(candidate);
              onChange(candidate);
              setHex(candidate);
            }
          }}
        >
          <Save size={17} />
        </button>
        <button
          type="submit"
          className="icon-button color-entry-action"
          aria-label={tr("Apply color")}
          title={tr("Apply color")}
          disabled={!candidate}
        >
          <Check size={17} />
        </button>
      </form>
      <h3 className="saved-colors-heading">{tr("Saved colors")}</h3>
      <div className="saved-note-colors">
        <div className="saved-note-color">
          <button
            type="button"
            className="saved-color-apply saved-color-default"
            aria-label={tr("Default")}
            aria-pressed={!color}
            onClick={() => {
              onChange("");
              onClose();
            }}
          >
            <span className="color-default-swatch" aria-hidden="true" />
            <span>{tr("Default")}</span>
            {!color ? <Check size={16} /> : null}
          </button>
        </div>
        {palette.colors.length ? (
          palette.colors.map((value) => (
            <div className="saved-note-color" key={value}>
              <button
                type="button"
                className="saved-color-apply"
                aria-label={tr("Use color {0}", value)}
                aria-pressed={normalizeHexColor(color) === value}
                onClick={() => {
                  onChange(value);
                  onClose();
                }}
              >
                <span
                  className="saved-color-swatch"
                  style={{ backgroundColor: value, ...notePalette(value) }}
                  aria-hidden="true"
                >
                  {normalizeHexColor(color) === value ? (
                    <Check size={15} />
                  ) : null}
                </span>
                <span>{value}</span>
              </button>
              <IconButton
                icon={X}
                label={tr("Remove saved color {0}", value)}
                onClick={() => palette.remove(value)}
              />
            </div>
          ))
        ) : (
          <p className="saved-colors-empty">{tr("No saved colors yet.")}</p>
        )}
      </div>
      {palette.storageError ? (
        <p className="saved-colors-hint">
          <span role="status">
            {tr("Colors could not be saved in this browser.")}
          </span>
        </p>
      ) : null}
    </>
  );
}
