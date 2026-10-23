import { useEffect, useSyncExternalStore } from "react";

const themeKey = "ntc.theme.v1";
const themeEvent = "ntc:theme-change";

function getTheme() {
  try {
    return localStorage.getItem(themeKey) === "dark" ? "dark" : "light";
  } catch {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }
}

function subscribe(onChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === themeKey || event.key === null) onChange();
  }
  window.addEventListener(themeEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(themeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(themeKey, next);
  } catch {
    // The document retains the preference when storage is blocked.
  }
  window.dispatchEvent(new Event(themeEvent));
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return { theme, toggleTheme };
}
