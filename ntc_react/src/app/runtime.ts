import { QueryClient } from "@tanstack/react-query";
import { OfflineNotes } from "../application/offline";
import { IndexedOfflineStore } from "../infrastructure/offlineStore";
import {
  OfflineLabelsRepository,
  OfflineNotesRepository,
} from "../infrastructure/offlineRepositories";
import { LogoutProtection } from "../application/logoutProtection";
import { isAdministrator } from "../application/access";
import type { Note } from "../domain/models";
import { ApiClient } from "../infrastructure/http";
import {
  AccountRepository,
  AdminRepository,
  InboxRepository,
  NotesRepository,
  RemindersRepository,
} from "../infrastructure/repositories";
import { AuthService, SessionVault } from "../application/auth";
import { WorkspaceService } from "../application/workspace";
import { ServerConnection, healthUrl } from "../application/connection";
import {
  WorkspacePreparation,
  WORKSPACE_STALE_TIME,
} from "../application/preparation";
export const cache = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: WORKSPACE_STALE_TIME,
      gcTime: Infinity,
      refetchOnWindowFocus: true,
      retry: (count, error) =>
        count < 1 && (!("status" in error) || Number(error.status) >= 500),
    },
    mutations: { retry: false },
  },
});
export const api = new ApiClient(
  import.meta.env.VITE_API_BASE_URL || "/api/v1",
);
export const connection = new ServerConnection(healthUrl(api.baseUrl));
export const offlineStore = new IndexedOfflineStore();
export const logoutProtection = new LogoutProtection();
api.setConnection(connection);
const sessionChannel =
  typeof BroadcastChannel === "undefined"
    ? undefined
    : new BroadcastChannel("ntc.session.memory.v1");
export const auth: AuthService = new AuthService(
  api,
  new SessionVault({
    getItem: (key) => {
      const legacy = window.sessionStorage.getItem(key);
      try {
        const saved = window.localStorage.getItem(key);
        if (saved) return saved;
        if (legacy) {
          window.localStorage.setItem(key, legacy);
          window.sessionStorage.removeItem(key);
        }
      } catch {
        /* Fall back to this tab when persistent storage is unavailable. */
      }
      return legacy;
    },
    setItem: (key, value) => {
      try {
        window.localStorage.setItem(key, value);
        window.sessionStorage.removeItem(key);
      } catch {
        window.sessionStorage.setItem(key, value);
      }
    },
    removeItem: (key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* Storage may be blocked. */
      }
      window.sessionStorage.removeItem(key);
    },
  }),
  () => {
    preparation.reset();
    void cache.cancelQueries();
    cache.clear();
  },
  connection.ensureReady,
  async (action) => {
    if (navigator.locks)
      await navigator.locks.request("ntc.session.refresh.v1", action);
    else await action();
  },
  (session) => sessionChannel?.postMessage(session),
  async (owner) => {
    const data = await offlineStore.read(owner);
    return data.complete &&
      data.identity?.userId === owner &&
      Array.isArray(data.identity.roles) &&
      data.identity.roles.includes("User") &&
      !data.identity.roles.includes("Admin")
      ? data.identity
      : undefined;
  },
  () => navigator.onLine,
  async () => {
    if (!owner()) return true;
    try {
      return (await offline.hasPending()) ? logoutProtection.request() : true;
    } catch {
      return logoutProtection.request();
    }
  },
  (owner) => offlineStore.clear(owner),
);
api.setAuth(auth);
const owner = (): string | undefined =>
  isAdministrator(auth.getSnapshot().session)
    ? undefined
    : auth.getSnapshot().session?.userId;
export const onlineWorkspace = () =>
  navigator.onLine && auth.getSnapshot().status !== "offline";
const offlineChannel =
  typeof BroadcastChannel === "undefined"
    ? undefined
    : new BroadcastChannel("ntc.offline.changed.v1");
export const offline: OfflineNotes = new OfflineNotes(
  offlineStore,
  owner,
  new NotesRepository(api),
  onlineWorkspace,
  () =>
    auth.getSnapshot().status === "authenticated" &&
    preparation.getSnapshot().status === "ready" &&
    preparation.getSnapshot().identity === auth.identity(),
  (note, oldId) => {
    void cache.cancelQueries({ queryKey: workspace.key("notes") });
    if (oldId && oldId !== note.id) {
      for (const [key, data] of cache.getQueriesData<
        import("@tanstack/react-query").InfiniteData<
          import("../domain/models").Page<Note>
        >
      >({ queryKey: workspace.key("notes") })) {
        if (data)
          cache.setQueryData(key, {
            ...data,
            pages: data.pages.map((p) => ({
              ...p,
              items: p.items.filter((n) => n.id !== oldId),
            })),
          });
      }
      cache.setQueryData(workspace.key("note", oldId), note);
    }
    workspace.commit(note);
  },
  async (name, action) => {
    if (!navigator.locks)
      throw new Error(
        "Automatic sync needs a browser with Web Locks support. Your changes remain on this device.",
      );
    await navigator.locks.request(name, action);
  },
  () => offlineChannel?.postMessage(owner()),
);
export const notes = new OfflineNotesRepository(api, offline, onlineWorkspace);
export const labels = new OfflineLabelsRepository(
  api,
  offlineStore,
  owner,
  onlineWorkspace,
);
export const reminders = new RemindersRepository(api);
export const account = new AccountRepository(api);
export const inbox = new InboxRepository(api);
export const admin = new AdminRepository(api);
export const workspace = new WorkspaceService(
  notes,
  cache,
  () => auth.getSnapshot().session?.userId,
);
let orderOwner = auth.getSnapshot().session?.userId;
auth.subscribe(() => {
  const next = auth.getSnapshot().session?.userId;
  if (next !== orderOwner) {
    orderOwner = next;
    workspace.order.reset();
  }
});
export const preparation = new WorkspacePreparation(
  cache,
  { notes, labels, reminders, inbox, account, admin },
  () => auth.identity(),
  onlineWorkspace,
);
preparation.subscribe(() => {
  if (preparation.getSnapshot().status === "ready") void offline.sync();
});

// Persist only customer identity metadata (no access token) and complete active notes/labels.
let cachedSessionVisible = false;
auth.subscribe(() => {
  const state = auth.getSnapshot();
  const revalidateSnapshot =
    cachedSessionVisible && state.status === "authenticated";
  cachedSessionVisible = state.status === "offline";
  if (state.status === "authenticated" && owner()) {
    const {
      userId,
      userName,
      givenName,
      familyName,
      fullName,
      picture,
      roles,
      timeZoneId,
    } = state.session!;
    void offlineStore
      .change(userId, (data) => {
        data.identity = {
          userId,
          userName,
          givenName,
          familyName,
          fullName,
          picture,
          roles,
          timeZoneId,
        };
      })
      .catch(() => {});
    void offline.sync();
    void preparation
      .prepare(state.session!)
      .then(async () => {
        if (!revalidateSnapshot || owner() !== userId) return;
        await Promise.all([
          cache.invalidateQueries({
            queryKey: ["private", userId, "notes"],
            refetchType: "all",
          }),
          cache.invalidateQueries({
            queryKey: ["private", userId, "labels"],
            refetchType: "all",
          }),
        ]);
      })
      .catch(() => {});
  }
  void offline.refresh();
});
async function reconnectWorkspace() {
  if (!navigator.onLine || !owner()) return;
  if (auth.getSnapshot().status === "offline") {
    try {
      await auth.refresh();
    } catch {
      return;
    }
  }
  await offline.sync();
}
window.addEventListener("online", () => {
  void reconnectWorkspace();
});
window.addEventListener("focus", () => {
  void reconnectWorkspace();
});
// Bounded retry cadence only while the app is open and pending work exists.
window.setInterval(() => {
  if (offline.getSnapshot().pending) void reconnectWorkspace();
}, 30_000);
if (offlineChannel)
  offlineChannel.onmessage = (event) => {
    if (event.data !== owner()) return;
    void offline.refresh();
    void cache.invalidateQueries({ queryKey: ["private", owner(), "notes"] });
  };

window.addEventListener("storage", (event) => {
  if (event.key !== "ntc.session.v1" && event.key !== null) return;
  if (event.storageArea !== window.localStorage) return;
  let userId: string | undefined;
  try {
    userId = event.newValue ? JSON.parse(event.newValue).userId : undefined;
  } catch {
    /* Invalid shared session. */
  }
  auth.savedSessionChanged(userId);
});

if (sessionChannel)
  sessionChannel.onmessage = (event) => auth.adoptSharedSession(event.data);
