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
      hideTitle
      hideCloseButton
    >
      <div className="modal-body zoom-panel-body">
        <div className="zoom-adjustments">
          <IconButton
            icon={Minus}
            label={tr("Zoom out")}
            disabled={percent <= 50}
            onClick={() => change(percent - 5)}
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
              aria-label={tr("Zoom percentage")}
            />
          </div>
          <IconButton
            icon={Plus}
            label={tr("Zoom in")}
            disabled={percent >= 150}
            onClick={() => change(percent + 5)}
          />
        </div>
      </div>
      <div className="modal-footer">
        <Button variant="secondary" onClick={() => change(100)}>
          {tr("Reset")}
        </Button>
        <Button onClick={onClose}>{tr("Close")}</Button>
      </div>
    </Modal>
  );
}
