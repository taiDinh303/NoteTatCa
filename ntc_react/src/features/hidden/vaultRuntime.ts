import { hiddenDraftProtection } from "../../application/hiddenDraftProtection";
import { QueryClient } from "@tanstack/react-query";
import { api, auth, cache, offline, offlineStore } from "../../app/runtime";
import {
  ApiClient,
  ApiError,
  type RequestOptions,
} from "../../infrastructure/http";
import { NotesRepository } from "../../infrastructure/repositories";
import { WorkspaceService } from "../../application/workspace";
import type { Note, NoteDraft, NoteFilter, Page } from "../../domain/models";
import { draftFrom } from "../../domain/models";
const drafts = new Map<
  string,
  { owner: string; note: Note; draft: NoteDraft }
>();
let token: string | undefined;
let owner: string | undefined;
let requests = new AbortController();
const idleLimit = 15 * 60 * 1000;
let lastActivity = 0;
const sessionListeners = new Set<() => void>();
export const subscribeVault = (listener: () => void) => {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
};
export const isVaultUnlocked = () =>
  !!token &&
  owner === auth.identity() &&
  navigator.onLine &&
  performance.now() - lastActivity < idleLimit;
const changed = () => sessionListeners.forEach((listener) => listener());
function checkExpiry() {
  if (token && !isVaultUnlocked()) void lockVault();
}
function activity() {
  checkExpiry();
  if (token) lastActivity = performance.now();
}
for (const name of ["pointerdown", "keydown", "pointermove", "touchstart"])
  window.addEventListener(name, activity, { passive: true });
window.addEventListener("focus", checkExpiry);
document.addEventListener("visibilitychange", checkExpiry);
const leave = () => {
  void lockVault();
};
window.addEventListener("pagehide", leave);
window.addEventListener("offline", leave);
let heartbeat = 0;
const sessionTimer = window.setInterval(() => {
  checkExpiry();
  if (token && ++heartbeat % 30 === 0)
    void vaultApi
      .request("/hidden-notes/heartbeat", { method: "POST" })
      .catch(() => lockVault());
}, 1000);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    clearInterval(sessionTimer);
    for (const name of ["pointerdown", "keydown", "pointermove", "touchstart"])
      window.removeEventListener(name, activity);
    window.removeEventListener("focus", checkExpiry);
    document.removeEventListener("visibilitychange", checkExpiry);
    window.removeEventListener("pagehide", leave);
    window.removeEventListener("offline", leave);
    void lockVault();
  });
export const vaultCache = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
});
export function setVaultToken(value: string) {
  token = value;
  owner = auth.identity();
  requests = new AbortController();
  lastActivity = performance.now();
  heartbeat = 0;
  changed();
}
export async function lockVault() {
  const current = token;
  token = undefined;
  owner = undefined;
  requests.abort();
  vaultCache.clear();
  if (current) changed();
  if (current)
    await api
      .request("/hidden-notes/lock", {
        method: "POST",
        headers: { "X-Note-Vault": current },
      })
      .catch(() => {});
}
export class VaultApi extends ApiClient {
  override request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const current = token;
    if (!current || !isVaultUnlocked())
      return Promise.reject(
        new ApiError(403, {
          code: "VAULT_LOCKED",
          message: "Unlock hidden notes again.",
        }),
      );
    return api
      .request<T>(path, {
        ...options,
        signal: options.signal
          ? AbortSignal.any([options.signal, requests.signal])
          : requests.signal,
        headers: { ...options.headers, "X-Note-Vault": current },
      })
      .catch((error) => {
        if (
          error instanceof ApiError &&
          error.status === 403 &&
          error.code === "VAULT_LOCKED"
        )
          void lockVault();
        throw error;
      });
  }
}
export const vaultApi = new VaultApi(api.baseUrl);
class VaultNotes extends NotesRepository {
  override list(filter: NoteFilter, pageNumber = 1, signal?: AbortSignal) {
    return vaultApi.request<Page<Note>>(
      "/hidden-notes?pageNumber=" +
        pageNumber +
        "&pageSize=100" +
        (filter.trash ? "&trash=true" : ""),
      { signal },
    );
  }
  override create(draft: NoteDraft, key: string) {
    return vaultApi.request<Note>("/hidden-notes", {
      method: "POST",
      body: draft,
      headers: { "Idempotency-Key": key },
    });
  }
  override async find(id: string) {
    const note = await super.find(id);
    const pending = drafts.get(id);
    if (
      pending &&
      pending.owner === owner &&
      JSON.stringify(draftFrom(note)) === JSON.stringify(pending.draft)
    ) {
      drafts.delete(id);
      hiddenDraftProtection.set(pending.owner, id, false);
      return note;
    }
    return pending && pending.owner === owner ? pending.note : note;
  }
  override async patch(id: string, draft: NoteDraft, version: string) {
    const note = await super.patch(id, draft, version);
    const pending = drafts.get(id);
    if (
      pending &&
      pending.owner === owner &&
      JSON.stringify(pending.draft) === JSON.stringify(draft)
    ) {
      drafts.delete(id);
      if (owner) hiddenDraftProtection.set(owner, id, false);
    }
    return note;
  }
}
export const vaultNotes = new VaultNotes(vaultApi);
export const vaultWorkspace = new WorkspaceService(
  vaultNotes,
  vaultCache,
  () =>
    owner === auth.identity() ? auth.getSnapshot().session?.userId : undefined,
);
export const vaultScope = {
  hidden: true,
  api: vaultApi,
  notes: vaultNotes,
  workspace: vaultWorkspace,
  offline,
  draftFor: (note: Note) => {
    const pending = drafts.get(note.id);
    return pending && pending.owner === owner ? pending.draft : undefined;
  },
  forgetDraft: (note: Note | undefined) => {
    if (note && owner) {
      drafts.delete(note.id);
      hiddenDraftProtection.set(owner, note.id, false);
    }
  },
  rememberDraft: (note: Note | undefined, draft: NoteDraft) => {
    if (!note || !owner) return;
    if (JSON.stringify(draftFrom(note)) === JSON.stringify(draft))
      drafts.delete(note.id);
    else drafts.set(note.id, { owner, note, draft });
    hiddenDraftProtection.set(owner, note.id, drafts.has(note.id));
  },
};
auth.subscribe(() => {
  for (const [id, pending] of drafts)
    if (pending.owner !== auth.identity()) {
      drafts.delete(id);
      hiddenDraftProtection.set(pending.owner, id, false);
    }
  if (owner && owner !== auth.identity()) void lockVault();
});
export async function hideNote(id: string) {
  const identity = auth.identity();
  const user = auth.getSnapshot().session?.userId;
  if (!user || offline.getSnapshot().pending)
    throw new Error("Sync your notes before hiding a note.");
  const note = await vaultApi.request<{ version: string }>(`/notes/${id}`);
  await cache.cancelQueries();
  const alreadyExcluded = await offlineStore.change(user, (data) => {
    if (data.pending.length)
      throw new Error("Sync your notes before hiding a note.");
    const previous = data.hiddenIds?.includes(id) ?? false;
    data.hiddenIds = [...new Set([...(data.hiddenIds ?? []), id])];
    data.notes = data.notes.filter((n) => n.id !== id);
    return previous;
  });
  try {
    await vaultApi.request(`/hidden-notes/${id}/visibility`, {
      method: "PATCH",
      body: { version: note.version, hidden: true },
    });
  } catch (error) {
    const definitive =
      error instanceof ApiError &&
      [400, 401, 403, 404, 409, 413, 422, 429].includes(error.status);
    if (definitive && !alreadyExcluded)
      await offlineStore.change(user, (data) => {
        data.hiddenIds = data.hiddenIds?.filter((x) => x !== id);
      });
    else if (auth.identity() === identity) {
      await cache.cancelQueries();
      cache.clear();
    }
    throw error;
  }
  if (auth.identity() !== identity) throw new Error("Account changed");
  await cache.cancelQueries();
  cache.clear();
  // Erase any late snapshot written while the server mutation was in flight.
  await offlineStore.change(user, (data) => {
    data.notes = data.notes.filter((n) => n.id !== id);
  });
}

export async function requireSavedVaultDraft(id: string) {
  const note = await vaultNotes.find(id);
  const pending = drafts.get(id);
  if (pending && pending.owner === owner)
    throw new Error(
      "Save or discard this hidden draft before unhiding the note.",
    );
  return note;
}
