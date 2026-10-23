import { useEffect, useState } from "react";

export function normalizeHexColor(value: string): string | null {
  const hex = value.trim().replace(/^#/, "");
  if (/^[\da-f]{3}$/i.test(hex))
    return (
      "#" +
      [...hex]
        .map((part) => part + part)
        .join("")
        .toUpperCase()
    );
  return /^[\da-f]{6}$/i.test(hex) ? "#" + hex.toUpperCase() : null;
}

function readColors(key: string): string[] {
  try {
    const values: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(values)
      ? [
          ...new Set(
            values.flatMap((value) => {
              const color =
                typeof value === "string" ? normalizeHexColor(value) : null;
              return color ? [color] : [];
            }),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}

export function useSavedColors(userId: string) {
  const key = `ntc.saved-note-colors.v1:${userId}`;
  const [colors, setColors] = useState(() => readColors(key));
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === key || event.key === null) setColors(readColors(key));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);
  function update(next: string[]) {
    setColors(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  return {
    colors,
    storageError,
    save: (value: string) => {
      const color = normalizeHexColor(value);
      if (color && !colors.includes(color)) update([...colors, color]);
    },
    remove: (color: string) =>
      update(colors.filter((value) => value !== color)),
  };
}
