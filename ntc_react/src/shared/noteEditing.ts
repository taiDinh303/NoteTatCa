import { useSyncExternalStore } from "react";

const key = "ntc.note.edit-on-open.v1";
const event = "ntc:note-edit-on-open";
export function noteEditingDefault() {
  try { return localStorage.getItem(key) === "true"; } catch { return false; }
}
function subscribe(listener: () => void) {
  window.addEventListener(event, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(event, listener);
    window.removeEventListener("storage", listener);
  };
}
export function useNoteEditingPreference() {
  const enabled = useSyncExternalStore(subscribe, noteEditingDefault);
  return [enabled, () => {
    try {
      localStorage.setItem(key, String(!enabled));
      window.dispatchEvent(new Event(event));
    } catch { /* Optional browser preference. */ }
  }] as const;
}
