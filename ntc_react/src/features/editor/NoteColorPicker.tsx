import { t as tr, useLanguage } from "../../shared/i18n";
import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, Paintbrush, X } from "lucide-react";
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
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <IconButton
          icon={Paintbrush}
          label={tr("Note background color")}
          active={open}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="note-color-menu"
          side="top"
          align="start"
          sideOffset={12}
          collisionPadding={12}
          aria-label={tr("Note colors")}
        >
          <ColorChoices
            key={userId}
            userId={userId}
            color={color}
            onChange={onChange}
            onClose={() => setOpen(false)}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
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
      <button
        type="button"
        className="color-default-button"
        aria-label={tr("Default note color")}
        aria-pressed={!color}
        onClick={() => {
          onChange("");
          onClose();
        }}
      >
        <span className="color-default-swatch" aria-hidden="true" />
        {tr("Default note color")}
        {!color ? <Check size={16} /> : null}
      </button>
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
        <input
          type="color"
          aria-label={tr("Custom note color")}
          value={candidate ?? "#ffffff"}
          onChange={(event) => {
            setHex(event.target.value);
            onChange(event.target.value);
          }}
        />
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
          type="submit"
          className="icon-button"
          aria-label={tr("Apply color")}
          title={tr("Apply color")}
          disabled={!candidate}
        >
          <Check size={17} />
        </button>
      </form>
      <button
        type="button"
        className="button secondary save-note-color"
        disabled={!candidate || saved}
        onClick={() => {
          if (candidate) {
            palette.save(candidate);
            onChange(candidate);
            setHex(candidate);
          }
        }}
      >
        {saved ? tr("Color saved") : tr("Save color")}
      </button>
      <h3 className="saved-colors-heading">{tr("Saved colors")}</h3>
      <div className="saved-note-colors">
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
      <p className="saved-colors-hint">
        {palette.storageError ? (
          <span role="status">
            {tr("Colors could not be saved in this browser.")}
          </span>
        ) : (
          tr("Colors are saved for your account in this browser.")
        )}
      </p>
    </>
  );
}
