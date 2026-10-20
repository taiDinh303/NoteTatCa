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
export const auth = new AuthService(
  api,
  new SessionVault({
    getItem: (key) => window.sessionStorage.getItem(key),
    setItem: (key, value) => window.sessionStorage.setItem(key, value),
    removeItem: (key) => window.sessionStorage.removeItem(key),
  }),
  () => {
    preparation.reset();
    void cache.cancelQueries();
    cache.clear();
  },
  connection.ensureReady,
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
export const preparation = new WorkspacePreparation(
  cache,
  { notes, labels, reminders, inbox, account, admin },
  () => auth.identity(),
);
