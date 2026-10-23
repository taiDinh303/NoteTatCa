import { QueryClient } from "@tanstack/react-query";
import { ApiClient } from "../infrastructure/http";
import {
  AccountRepository,
  AdminRepository,
  InboxRepository,
  LabelsRepository,
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
api.setConnection(connection);
const sessionChannel =
  typeof BroadcastChannel === "undefined"
    ? undefined
    : new BroadcastChannel("ntc.session.memory.v1");
export const auth = new AuthService(
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
);
api.setAuth(auth);
export const notes = new NotesRepository(api);
export const labels = new LabelsRepository(api);
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
);

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
