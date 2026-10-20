import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { CloudOff, RefreshCw, WifiOff } from "lucide-react";
import { auth, cache, connection, preparation } from "./runtime";
import { useAuth } from "../shared/hooks";
import { Button, ErrorBanner } from "../shared/ui";
import { isAdministrator } from "../application/access";

function LoadingMark() {
  return (
    <div className="startup-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <b>N</b>
    </div>
  );
}
const connectionCopy = (offline: boolean) =>
  offline
    ? "You’re offline. Reconnect to continue. Your open draft stays in this tab."
    : "The server may be starting up or temporarily unavailable. We’re checking the connection.";

export function StartupScreen({
  title,
  children,
  busy = true,
}: {
  title: string;
  children?: ReactNode;
  busy?: boolean;
}) {
  const network = useSyncExternalStore(
    connection.subscribe,
    connection.getSnapshot,
  );
  return (
    <section className="startup-screen" aria-busy={busy}>
      <div className="startup-card">
        {busy ? <LoadingMark /> : <CloudOff size={42} />}
        <h1>{title}</h1>
        {network.warming || network.problem ? (
          <p role="status">{connectionCopy(network.problem === "offline")}</p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function WorkspaceReady({ children }: { children: ReactNode }) {
  const state = useAuth();
  const snapshot = useSyncExternalStore(
    preparation.subscribe,
    preparation.getSnapshot,
  );
  const [moduleError, setModuleError] = useState<unknown>();
  const [modulesReady, setModulesReady] = useState(false);
  const administrator = isAdministrator(state.session);
  useEffect(() => {
    let active = true;
    const modules = administrator
      ? [
          import("./AdminShell"),
          import("../features/admin/AdminPage"),
          import("../features/settings/SettingsPage"),
        ]
      : [
          import("./AppShell"),
          import("../features/notes/NotesPage"),
          import("../features/reminders/RemindersPage"),
          import("../features/inbox/InboxPage"),
          import("../features/settings/SettingsPage"),
        ];
    void Promise.all(modules)
      .then(() => {
        if (active) setModulesReady(true);
        if (!administrator) {
          // The editor is warmed in the background; slow editor chunks never block sign-in.
          void import("../features/editor/NoteEditor").catch(() => {});
          void import("../features/editor/RichEditor").catch(() => {});
          void import("../features/labels/LabelsManager").catch(() => {});
        }
      })
      .catch((error) => {
        if (active) setModuleError(error);
      });
    return () => {
      active = false;
    };
  }, [administrator]);
  useEffect(() => {
    if (state.status === "authenticated" && state.session)
      void preparation.prepare(state.session).catch(() => {});
  }, [state.status, state.session]);
  if (
    snapshot.identity === auth.identity() &&
    snapshot.status === "ready" &&
    modulesReady
  )
    return children;
  return (
    <StartupScreen
      busy={snapshot.status !== "error" && !moduleError}
      title={
        snapshot.status === "error" || moduleError
          ? "Your workspace couldn’t finish loading"
          : administrator
            ? "Preparing administration"
            : "Preparing your workspace"
      }
    >
      {snapshot.status === "error" || moduleError ? (
        <>
          <ErrorBanner error={moduleError ?? snapshot.error} />
          <div className="startup-actions">
            <Button
              onClick={() => {
                if (moduleError) {
                  window.location.reload();
                  return;
                }
                if (state.session)
                  void preparation.prepare(state.session).catch(() => {});
              }}
            >
              Try again
            </Button>
            <Button variant="ghost" onClick={() => void auth.logout()}>
              Sign out
            </Button>
          </div>
        </>
      ) : (
        <>
          <p role="status">
            {snapshot.total
              ? `${snapshot.completed} of ${snapshot.total} collections ready`
              : "Opening your workspace…"}
          </p>
          <progress
            aria-label="Workspace loading"
            max={snapshot.total || 1}
            value={snapshot.completed}
          />
          {snapshot.pages ? <small>{snapshot.pages} pages loaded</small> : null}
        </>
      )}
    </StartupScreen>
  );
}

export function ConnectionNotice() {
  const network = useSyncExternalStore(
    connection.subscribe,
    connection.getSnapshot,
  );
  const loading = useSyncExternalStore(
    preparation.subscribe,
    preparation.getSnapshot,
  );
  const state = useAuth();
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    const offline = () => connection.reportOffline();
    const online = () => {
      // Revalidate reads only. A failed save still requires the explicit Retry save action.
      void connection
        .ensureReady()
        .then(() => cache.invalidateQueries({ refetchType: "active" }))
        .catch(() => {});
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    if (!navigator.onLine) offline();
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);
  if ((!network.slow && !network.problem) || loading.status === "loading")
    return null;
  const offline = network.problem === "offline";
  return (
    <aside className="connection-notice" aria-label="Connection status">
      {network.problem ? (
        offline ? (
          <WifiOff size={22} />
        ) : (
          <CloudOff size={22} />
        )
      ) : (
        <RefreshCw size={22} className="spin" />
      )}
      <div role="status">
        <strong>
          {offline
            ? "You’re offline"
            : network.problem && !network.warming
              ? "Connection interrupted"
              : "Connecting to NoteTatCa…"}
        </strong>
        <p>{connectionCopy(offline)}</p>
      </div>
      {network.problem && !network.warming && state.status !== "unavailable" ? (
        <Button
          variant="secondary"
          busy={retrying}
          onClick={() => {
            setRetrying(true);
            void connection
              .ensureReady()
              .then(() => cache.invalidateQueries({ refetchType: "active" }))
              .catch(() => {})
              .finally(() => setRetrying(false));
          }}
        >
          Reconnect
        </Button>
      ) : null}
    </aside>
  );
}
