import { useSyncExternalStore } from "react";

const query = "(min-width: 801px)";

// Temporarily limit note companions and their settings to desktop layouts.
// Do not change the saved preference when the viewport becomes narrow.
export function desktopMascotsAvailable() {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

function subscribe(changed: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
}

export function useDesktopMascots() {
  return useSyncExternalStore(subscribe, desktopMascotsAvailable, () => false);
}
