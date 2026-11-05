import { useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { t as tr } from "../../shared/i18n";
import { Button, Modal, ErrorBanner } from "../../shared/ui";
export function AvatarPicker({
  picture,
  onChange,
  onError,
  onBusy,
  disabled,
  children,
}: {
  picture: string;
  onChange: (value: string) => Promise<void>;
  onError: (error: unknown) => void;
  onBusy: (busy: boolean) => void;
  disabled: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false),
    [source, setSource] = useState(picture),
    [zoom, setZoom] = useState(1),
    [position, setPosition] = useState({ x: 0, y: 0 }),
    [size, setSize] = useState({ w: 240, h: 240 }),
    [ready, setReady] = useState(false),
    [error, setError] = useState<unknown>();
  const input = useRef<HTMLInputElement>(null),
    image = useRef<HTMLImageElement>(null),
    drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
      null,
    );
  const [saving, setSaving] = useState(false);
  const apply = async (value: string) => {
    setSaving(true);
    onBusy(true);
    setError(undefined);
    try {
      await onChange(value);
      onError(undefined);
      setOpen(false);
    } catch (error) { setError(error); }
    finally { setSaving(false); onBusy(false); }
  };
  const reset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };
  return (
    <>
      <button
        type="button"
        className="avatar-edit-trigger"
        aria-label={tr("Edit avatar")}
        disabled={disabled}
        onClick={() => {
          setSource(picture);
          setReady(false);
          reset();
          setError(undefined);
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open && (
        <Modal open title={tr("Edit avatar")} onClose={() => { if (!saving) setOpen(false); }}>
          <div className="modal-body">
            <ErrorBanner error={error} />
            <div
              className="avatar-crop-stage"
              role="img"
              aria-label={tr("Avatar preview")}
              onPointerDown={(e) => {
                if (saving) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = {
                  x: e.clientX,
                  y: e.clientY,
                  px: position.x,
                  py: position.y,
                };
              }}
              onPointerMove={(e) => {
                if (drag.current)
                  setPosition({
                    x: drag.current.px + e.clientX - drag.current.x,
                    y: drag.current.py + e.clientY - drag.current.y,
                  });
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              {source && (
                <img
                  ref={image}
                  crossOrigin="anonymous"
                  src={source}
                  alt=""
                  draggable={false}
                  onLoad={(e) => {
                    setReady(true);
                    const img = e.currentTarget;
                    const scale = Math.max(
                      240 / img.naturalWidth,
                      240 / img.naturalHeight,
                    );
                    setSize({
                      w: img.naturalWidth * scale,
                      h: img.naturalHeight * scale,
                    });
                  }}
                  onError={() => {
                    setReady(false);
                    setError(
                      new Error(
                        tr(
                          "This image could not be opened. Choose another image.",
                        ),
                      ),
                    );
                  }}
                  style={{
                    width: size.w * zoom,
                    height: size.h * zoom,
                    transform:
                      "translate(-50%, -50%) translate(" +
                      position.x +
                      "px, " +
                      position.y +
                      "px)",
                  }}
                />
              )}
            </div>
            <label className="field">
              {tr("Zoom")}
              <input
                aria-label={tr("Avatar zoom")}
                type="range"
                disabled={saving}
                min="0.25"
                max="4"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
            <div className="form-grid">
              <label>
                {tr("Horizontal position")}
                <input
                  aria-label={tr("Horizontal position")}
                  type="range"
                  disabled={saving}
                  min="-240"
                  max="240"
                  value={position.x}
                  onChange={(e) =>
                    setPosition({ ...position, x: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                {tr("Vertical position")}
                <input
                  aria-label={tr("Vertical position")}
                  type="range"
                  disabled={saving}
                  min="-240"
                  max="240"
                  value={position.y}
                  onChange={(e) =>
                    setPosition({ ...position, y: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <input
              hidden
              ref={input}
              type="file"
              disabled={saving}
              accept="image/png,image/jpeg,image/webp"
              aria-label={tr("Choose avatar")}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (
                  !["image/png", "image/jpeg", "image/webp"].includes(
                    file.type,
                  ) ||
                  file.size > 5 * 1024 * 1024
                ) {
                  setError(
                    new Error(
                      tr("Choose a PNG, JPG or WebP image up to 5 MB."),
                    ),
                  );
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setReady(false);
                  setSource(String(reader.result));
                  reset();
                  setError(undefined);
                };
                reader.onerror = () =>
                  setError(
                    new Error(
                      tr(
                        "This image could not be opened. Choose another image.",
                      ),
                    ),
                  );
                reader.readAsDataURL(file);
              }}
            />
            <div className="form-actions">
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => input.current?.click()}
              >
                {tr("Choose avatar")}
              </Button>
              <Button
                variant="ghost"
                disabled={saving || !source}
                onClick={() => setSource("")}
              >
                {tr("Remove avatar")}
              </Button>
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" disabled={saving} onClick={() => setOpen(false)}>
              {tr("Cancel")}
            </Button>
            <Button
              disabled={!!source && !ready}
              busy={saving}
              onClick={() => {
                try {
                  if (!source) {
                    void apply("");
                    return;
                  }
                  const img = image.current;
                  if (!img?.complete || !img.naturalWidth) return;
                  const canvas = document.createElement("canvas");
                  canvas.width = canvas.height = 128;
                  const ctx = canvas.getContext("2d");
                  if (!ctx) throw new Error("Image unavailable");
                  ctx.drawImage(
                    img,
                    ((120 + position.x - (size.w * zoom) / 2) * 128) / 240,
                    ((120 + position.y - (size.h * zoom) / 2) * 128) / 240,
                    (size.w * zoom * 128) / 240,
                    (size.h * zoom * 128) / 240,
                  );
                  void apply(canvas.toDataURL("image/png"));
                } catch (err) {
                  setError(err);
                }
              }}
            >
              {tr("Apply")}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function deviceZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
function zoneName(zone: string) {
  try {
    const offset = new Intl.DateTimeFormat(undefined, {
      timeZone: zone,
      timeZoneName: "shortOffset",
    })
      .formatToParts()
      .find((p) => p.type === "timeZoneName")?.value;
    return `${zone.replaceAll("_", " ")} (${offset})`;
  } catch {
    return zone;
  }
}
export function TimezoneField({ initial }: { initial: string }) {
  const id = useId();
  const [value, setValue] = useState(initial || deviceZone());
  const zones = [
    ...new Set(
      [
        "UTC",
        "Asia/Ho_Chi_Minh",
        initial,
        deviceZone(),
        ...Intl.supportedValuesOf("timeZone"),
      ].filter(Boolean),
    ),
  ].sort();
  return (
    <div className="field timezone-field">
      <div className="timezone-heading">
        <label className="field-label" htmlFor={id}>
          {tr("Timezone")}
        </label>
        <Button variant="ghost" onClick={() => setValue(deviceZone())}>
          {tr("Use device timezone")}
        </Button>
      </div>
      <div className="timezone-select">
        <select
          id={id}
          name="timeZoneId"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required
        >
          {zones.map((zone) => (
            <option value={zone} key={zone}>
              {zoneName(zone)}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </div>
      <span className="field-hint">
        {tr(
          "Used for reminder times and dates. Choose where you live, or use your device timezone.",
        )}
      </span>
    </div>
  );
}
