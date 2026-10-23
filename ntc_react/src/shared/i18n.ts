import { useSyncExternalStore } from "react";
import { messages } from "./messages";

export const languages = [
  { code: "en", name: "English" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
] as const;
export type Language = (typeof languages)[number]["code"];
const storageKey = "ntc.language.v1";
let language: Language = "en";
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function readLanguage(): Language {
  try {
    const saved = localStorage.getItem(storageKey);
    return languages.find((item) => item.code === saved)?.code ?? "en";
  } catch {
    return language;
  }
}

export function initializeLanguage() {
  language = readLanguage();
  document.documentElement.lang = language;
}

export function setLanguage(next: Language) {
  language = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(storageKey, next);
  } catch {
    // Language selection remains usable without browser storage.
  }
  notify();
}

function onStorage(event: StorageEvent) {
  if (event.key === storageKey || event.key === null) {
    language = readLanguage();
    document.documentElement.lang = language;
    notify();
  }
}

function subscribe(onChange: () => void) {
  if (!listeners.size) window.addEventListener("storage", onStorage);
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}

export function useLanguage() {
  return useSyncExternalStore(subscribe, currentLanguage);
}

export function currentLanguage() {
  return language;
}

export function t(source: string, ...values: (string | number)[]): string {
  const index =
    language === "vi" ? 0 : language === "zh" ? 1 : language === "ja" ? 2 : -1;
  const text =
    language === "en"
      ? source
      : (messages[source]?.[index as 0 | 1 | 2] ?? source);
  return text.replace(/\{(\d+)\}/g, (match, position: string) =>
    String(values[Number(position)] ?? match),
  );
}
