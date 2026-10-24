import { useRef, useState } from "react";
import { t as tr } from "../../shared/i18n";
import { Button, Field } from "../../shared/ui";

export function AvatarPicker({
  picture,
  onChange,
  onError,
  onBusy,
  disabled,
}: {
  disabled: boolean;
  picture: string;
  onChange: (picture: string) => void;
  onError: (error: unknown) => void;
  onBusy: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="avatar-actions">
      <input
        hidden
        ref={input}
        type="file"
        disabled={busy || disabled}
        accept="image/png,image/jpeg,image/webp"
        aria-label={tr("Choose avatar")}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          setBusy(true);
          onBusy(true);
          onError(undefined);
          void prepareAvatar(file)
            .then(onChange)
            .catch(onError)
            .finally(() => {
              setBusy(false);
              onBusy(false);
            });
        }}
      />
      <Button
        variant="secondary"
        busy={busy}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {tr("Change avatar")}
      </Button>
      {picture ? (
        <Button
          variant="ghost"
          disabled={busy || disabled}
          onClick={() => onChange("")}
        >
          {tr("Remove avatar")}
        </Button>
      ) : null}
      <span className="field-hint">
        {tr("PNG, JPG or WebP, up to 5 MB. Saved with your profile.")}
      </span>
    </div>
  );
}
async function prepareAvatar(file: File) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error(tr("Choose a PNG, JPG or WebP image up to 5 MB."));
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      tr("This image could not be opened. Choose another image."),
    );
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        tr("This image could not be opened. Choose another image."),
      );
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      128,
      128,
    );
    return canvas.toDataURL("image/png");
  } finally {
    bitmap.close();
  }
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
    <Field label={tr("Timezone")}>
      <select
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
      <Button variant="ghost" onClick={() => setValue(deviceZone())}>
        {tr("Use device timezone")}
      </Button>
      <span className="field-hint">
        {tr(
          "Used for reminder times and dates. Choose where you live, or use your device timezone.",
        )}
      </span>
    </Field>
  );
}
