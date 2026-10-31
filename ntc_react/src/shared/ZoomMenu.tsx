import { t as tr, useLanguage } from "./i18n";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useDisplayZoom } from "./displayZoom";

function commitZoom(value: number) {
  if (!Number.isFinite(value)) return undefined;
  return Math.min(150, Math.max(50, Math.round(value)));
}

/**
 * Inline zoom controls designed to render inside the account dropdown
 * (via the `extra` slot of ActionMenu). Not a standalone trigger.
 */
export function ZoomDropdown() {
  useLanguage();
  const { percent, change } = useDisplayZoom();
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>(String(percent));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  function commit() {
    if (focused) {
      const value = commitZoom(Number(draft));
      if (value !== undefined) change(value);
    }
    setFocused(false);
  }

  return (
    <div className="zoom-dropdown-controls" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="zoom-step"
        aria-label={tr("Zoom out")}
        disabled={percent <= 50}
        onClick={(event) => {
          event.stopPropagation();
          change(Math.max(50, percent - 5));
        }}
      >
        <Minus size={15} />
      </button>
      <div className="zoom-dropdown-number">
        <input
          ref={inputRef}
          type="number"
          min={50}
          max={150}
          step={1}
          inputMode="numeric"
          value={focused ? draft : String(percent)}
          aria-label={tr("Zoom percentage")}
          onFocus={() => {
            setFocused(true);
            setDraft(String(percent));
          }}
          onChange={(event) => {
            setFocused(true);
            setDraft(event.target.value);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
        />
      </div>
      <button
        type="button"
        className="zoom-step"
        aria-label={tr("Zoom in")}
        disabled={percent >= 150}
        onClick={(event) => {
          event.stopPropagation();
          change(Math.min(150, percent + 5));
        }}
      >
        <Plus size={15} />
      </button>
      <button
        type="button"
        className="zoom-reset"
        aria-label={tr("Reset")}
        onClick={(event) => {
          event.stopPropagation();
          change(100);
        }}
      >
        <RotateCcw size={15} />
      </button>
    </div>
  );
}
