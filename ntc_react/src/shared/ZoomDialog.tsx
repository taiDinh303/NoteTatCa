import { t as tr, useLanguage } from "./i18n";
import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useDisplayZoom } from "./displayZoom";
import { Button, IconButton, Modal } from "./ui";

export function ZoomDialog({ onClose }: { onClose: () => void }) {
  useLanguage();
  const { percent, change } = useDisplayZoom();
  const [draft, setDraft] = useState<string | null>(null);
  const inputId = useId();
  function commit() {
    if (draft?.trim() && Number.isFinite(Number(draft))) change(Number(draft));
    setDraft(null);
  }
  return (
    <Modal
      open
      title={tr("Interface zoom")}
      className="zoom-panel"
      onClose={onClose}
    >
      <div className="modal-body">
        <label className="field-label" htmlFor={inputId}>
          {tr("Zoom percentage")}
        </label>
        <div className="zoom-adjustments">
          <IconButton
            icon={Minus}
            label={tr("Zoom out")}
            disabled={percent <= 50}
            onClick={() => change(percent - 10)}
          />
          <div className="zoom-number-wrap">
            <input
              id={inputId}
              type="number"
              min={50}
              max={150}
              step={1}
              inputMode="numeric"
              value={draft ?? String(percent)}
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
          </div>
          <IconButton
            icon={Plus}
            label={tr("Zoom in")}
            disabled={percent >= 150}
            onClick={() => change(percent + 10)}
          />
        </div>
        <p className="zoom-help">
          {tr("50%–150% · Ctrl + mouse wheel · Pinch with two fingers")}
        </p>
      </div>
      <div className="modal-footer">
        <Button variant="secondary" onClick={() => change(100)}>
          {tr("Reset to 100%")}
        </Button>
        <Button onClick={onClose}>{tr("Done")}</Button>
      </div>
    </Modal>
  );
}
