import { createContext, useContext, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import { ZoomIn } from "lucide-react";
import { Button, Modal } from "./ui";

const storageKey = "ntc.interface.zoom.v1";
const ZoomContext = createContext<{
  percent: number;
  setPercent: (value: number) => void;
}>({
  percent: 100,
  setPercent: () => {},
});

export function DisplayPreferences({ children }: { children: ReactNode }) {
  const [percent, setPercent] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      return Number.isInteger(saved) && saved >= 25 && saved <= 150
        ? saved
        : 100;
    } catch {
      return 100;
    }
  });
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--interface-scale",
      String(percent / 100),
    );
    try {
      localStorage.setItem(storageKey, String(percent));
    } catch {
      // Display preferences must also work with browser storage disabled.
    }
  }, [percent]);
  return (
    <ZoomContext.Provider value={{ percent, setPercent }}>
      {children}
    </ZoomContext.Provider>
  );
}

export function InterfaceZoom() {
  const { percent, setPercent } = useContext(ZoomContext);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="zoom-trigger"
        aria-label={`Interface zoom: ${percent}%`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Interface zoom"
        onClick={() => setOpen(true)}
      >
        <ZoomIn size={16} aria-hidden="true" />
        <span>{percent}%</span>
      </button>
      {open ? (
        <ZoomPanel
          percent={percent}
          onChange={setPercent}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ZoomPanel({
  percent,
  onChange,
  onClose,
}: {
  percent: number;
  onChange: (value: number) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(String(percent));
  function apply(value: number) {
    const next = Math.min(150, Math.max(25, Math.round(value)));
    onChange(next);
    setDraft(String(next));
  }
  function commit() {
    const value = draft.trim() ? Number(draft) : NaN;
    if (Number.isFinite(value)) apply(value);
    else setDraft(String(percent));
  }
  return (
    <Modal open onClose={onClose} title="Interface zoom" className="zoom-panel">
      <div className="modal-body">
        <label className="zoom-input-row">
          <span>Zoom percentage</span>
          <span className="zoom-number-wrap">
            <input
              type="number"
              min={25}
              max={150}
              step={1}
              inputMode="numeric"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commit();
                }
              }}
            />
            <span aria-hidden="true">%</span>
          </span>
        </label>
        <input
          className="zoom-slider"
          type="range"
          aria-label="Zoom level"
          aria-valuetext={`${percent}%`}
          min={25}
          max={150}
          step={1}
          value={percent}
          onChange={(event) => apply(Number(event.target.value))}
        />
        <div className="zoom-range-labels" aria-hidden="true">
          <span>25%</span>
          <span>150%</span>
        </div>
      </div>
      <div className="modal-footer">
        <Button variant="secondary" onClick={() => apply(100)}>
          Reset to 100%
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
