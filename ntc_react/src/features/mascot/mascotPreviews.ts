import { useEffect, useSyncExternalStore } from "react";
import { mascotCharacters, mascotPresetSources } from "./mascotPreference";

type State = "idle" | "loading" | "ready" | "error";
type Entry = { state: State; urgent: boolean; image?: HTMLImageElement; promise: Promise<void>; resolve: () => void; reject: (error: unknown) => void };
const entries = new Map<string, Entry>();
const queue: string[] = [];
const listeners = new Set<() => void>();
let active = 0;
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function mascotPreviewSources(name: (typeof mascotCharacters)[number]) {
  const sources = mascotPresetSources(name);
  return { directions: sources.directions.replace("/ntc-v6/", "/ntc-v6/previews/"), reactions: sources.reactions.replace("/ntc-v6/", "/ntc-v6/previews/") };
}

function drain() {
  while (active < 4 && queue.length) {
    const source = queue.shift()!, entry = entries.get(source)!;
    active++;
    const image = new Image();
    entry.image = image;
    image.decoding = "async";
    image.fetchPriority = entry.urgent ? "high" : "low";
    let settled = false;
    const timeout = window.setTimeout(() => finish(new Error("Mascot preview timed out.")), 20_000);
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      image.onload = image.onerror = null;
      entry.image = undefined;
      entry.state = error ? "error" : "ready";
      if (error) entry.reject(error); else entry.resolve();
      active--;
      emit();
      drain();
    };
    image.onload = () => { void image.decode().then(() => finish(), finish); };
    image.onerror = () => finish(new Error("Could not load mascot preview."));
    image.src = source;
  }
}

function load(source: string, priority: boolean, retry = false) {
  const previous = entries.get(source);
  if (previous && !(retry && previous.state === "error")) {
    const index = queue.indexOf(source);
    if (priority && !previous.urgent) {
      previous.urgent = true;
      if (previous.image) previous.image.fetchPriority = "high";
      if (index >= 0) { queue.splice(index, 1); enqueue(source, true); }
    }
    return previous.promise;
  }
  let resolve!: () => void, reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  entries.set(source, { state: "loading", urgent: priority, promise, resolve, reject });
  enqueue(source, priority);
  emit();
  drain();
  return promise;
}

function enqueue(source: string, priority: boolean) {
  const firstBackground = priority ? queue.findIndex(queued => !entries.get(queued)?.urgent) : -1;
  if (firstBackground < 0) queue.push(source); else queue.splice(firstBackground, 0, source);
}

export function warmMascotPreviews() {
  for (const name of mascotCharacters) for (const source of Object.values(mascotPreviewSources(name))) void load(source, false).catch(() => {});
}

export function useMascotPreview(directions: string, reactions: string) {
  const snapshot = () => {
    const states = [directions, reactions].map(source => entries.get(source)?.state ?? "idle");
    return states.includes("error") ? "error" : states.every(state => state === "ready") ? "ready" : "loading";
  };
  const state = useSyncExternalStore(subscribe, snapshot);
  useEffect(() => {
    for (const source of [directions, reactions]) void load(source, true).catch(() => {});
  }, [directions, reactions]);
  return { state, retry: () => { for (const source of [directions, reactions]) void load(source, true, true).catch(() => {}); } };
}
