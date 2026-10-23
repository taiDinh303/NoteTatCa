import { t as tr, useLanguage } from "../../shared/i18n";
import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, Paintbrush } from "lucide-react";
import { NOTE_COLORS } from "../../domain/models";
import { notePalette } from "../../domain/color";
import { IconButton } from "../../shared/ui";

export default function NoteColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  useLanguage();
  const [open, setOpen] = useState(false);
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
          <div className="note-color-grid">
            {NOTE_COLORS.map((value, index) => (
              <button
                key={value || "none"}
                type="button"
                className={`color-swatch ${color === value ? "selected" : ""}`}
                style={{
                  ...notePalette(value),
                  background: value || "var(--surface)",
                }}
                aria-label={
                  index === 0
                    ? tr("Default note color")
                    : tr("Note color {0}", index)
                }
                aria-pressed={color === value}
                onClick={() => {
                  onChange(value);
                  setOpen(false);
                }}
              >
                {color === value ? <Check size={16} /> : null}
              </button>
            ))}
          </div>
          <label className="note-custom-color">
            <span className="custom-color">
              <input
                type="color"
                aria-label={tr("Custom note color")}
                value={color || "#ffffff"}
                onChange={(event) => onChange(event.target.value)}
              />
            </span>
            <span>{tr("Custom color")}</span>
          </label>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
