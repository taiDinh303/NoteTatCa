import { useSyncExternalStore } from "react";

export const mascotGroups = [
  {
    label: "NoteTatCa companions",
    names: ["cat", "fox", "owl", "bear", "bunny", "otter", "notebook", "paper"],
  },
] as const;
export const mascotCharacters = mascotGroups.flatMap((group) => [
  ...group.names,
]);
export type MascotCharacter =
  (typeof mascotCharacters)[number] | "custom" | "generated";

// Versioned URLs keep existing browser/CDN caches from serving the old artwork.
export function mascotPresetSources(name: (typeof mascotCharacters)[number]) {
  return {
    directions: `/mascots/ntc-v1/${name}-directions.webp`,
    reactions: `/mascots/ntc-v1/${name}-reactions.webp`,
  };
}
const key = "ntc.mascot.v1";
const imageKey = "ntc.mascot.image.v1";
const eventName = "ntc:mascot-change";
let fallback = "on:bunny";
function read() {
  let value = fallback;
  try {
    value = localStorage.getItem(key) ?? fallback;
  } catch {
    /* Memory fallback. */
  }
  const [enabled, character] = value.split(":");
  return (enabled === "on" || enabled === "off") &&
    (character === "custom" ||
      character === "generated" ||
      mascotCharacters.some((name) => name === character))
    ? value
    : `${enabled === "off" ? "off" : "on"}:bunny`;
}
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === key || event.key === imageKey || event.key === null)
      listener();
  };
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", storage);
  };
}
export function setMascotPreference(update: {
  enabled?: boolean;
  character?: MascotCharacter;
}) {
  const [enabled, character] = read().split(":");
  fallback = `${update.enabled === undefined ? enabled : update.enabled ? "on" : "off"}:${update.character ?? character}`;
  try {
    localStorage.setItem(key, fallback);
  } catch {
    /* Keep the choice in memory. */
  }
  window.dispatchEvent(new Event(eventName));
}
function readImage() {
  try {
    const value = localStorage.getItem(imageKey);
    return value && /^data:image\/(png|jpeg|webp);base64,/.test(value)
      ? value
      : null;
  } catch {
    return null;
  }
}
export async function saveCustomMascot(file: File) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 512 * 1024
  ) {
    throw new Error("Choose a PNG, JPEG or WebP image up to 512 KB.");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Could not read this image.");
  }
  const valid =
    bitmap.width > 0 &&
    bitmap.height > 0 &&
    bitmap.width <= 4096 &&
    bitmap.height <= 4096;
  bitmap.close();
  if (!valid)
    throw new Error("The image must be no larger than 4096 × 4096 pixels.");
  const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });
  // Do not claim persistence when browser storage is unavailable/full.
  try {
    localStorage.setItem(imageKey, image);
  } catch {
    throw new Error(
      "Could not save the image. Browser storage may be full or unavailable.",
    );
  }
  setMascotPreference({ enabled: true, character: "custom" });
}
export function removeCustomMascot() {
  localStorage.removeItem(imageKey);
  if (read().endsWith(":custom")) setMascotPreference({ character: "bunny" });
  else window.dispatchEvent(new Event(eventName));
}
export function useMascotPreference() {
  const [enabled, character] = useSyncExternalStore(subscribe, read).split(":");
  const customImage = useSyncExternalStore(subscribe, readImage);
  return {
    enabled: enabled === "on",
    character: character as MascotCharacter,
    customImage,
  };
}
