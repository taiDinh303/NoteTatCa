import { t as tr, useLanguage } from "../shared/i18n";
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import {
  Check,
  Circle,
  CircleAlert,
  CloudOff,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { auth, cache, connection, preparation } from "./runtime";
import { StartupPresentation } from "./startup-context";
import { useAuth } from "../shared/hooks";
import { Button, ErrorBanner } from "../shared/ui";
import { isAdministrator } from "../application/access";
import type {
  PreparationResource,
  PreparationTask,
} from "../application/preparation";

export function ConnectionFeedback({ children }: { children: ReactNode }) {
  useLanguage();
  const [screens, setScreens] = useState(0);
  const register = useCallback(() => {
    setScreens((count) => count + 1);
    return () => setScreens((count) => count - 1);
  }, []);
  return (
    <StartupPresentation value={register}>
      {children}
      <ConnectionNotice suppressed={screens > 0} />
    </StartupPresentation>
  );
}

export function ConnectionSpinner({ size = 22 }: { size?: number }) {
  useLanguage();
  return (
    <span className="connection-spinner" aria-hidden="true">
      <RefreshCw size={size} />
    </span>
  );
}
export function ConnectionProgress({
  label = tr("Server connection progress"),
}: {
  label?: string;
}) {
  useLanguage();
  return (
    <div
      className="connection-progress"
      role="progressbar"
      aria-label={label}
      aria-valuetext={tr("Waiting for a response")}
    >
      <span />
    </div>
  );
}
const resourceNames: Record<PreparationResource, string> = {
  notes: "notes",
  trash: "trashed notes",
  labels: "labels",
  reminders: "reminders",
  inbox: "inbox",
  unread: "unread count",
  me: "account details",
  "admin-stats": "administration overview",
};
function PreparationTasks({ tasks }: { tasks: PreparationTask[] }) {
  useLanguage();
  return (
    <ul className="startup-tasks" aria-label={tr("Loading tasks")}>
      {tasks.map(({ resource, status }) => {
        const name = tr(resourceNames[resource]);
        const text =
          status === "ready"
            ? tr("{0} ready", name[0].toUpperCase() + name.slice(1))
            : status === "error"
              ? tr("Couldn’t load {0}", name)
              : status === "loading"
                ? tr("Loading {0}…", name)
                : tr("Waiting for {0}…", name);
        return (
          <li key={resource} data-resource={resource} data-status={status}>
            {status === "loading" ? (
              <ConnectionSpinner size={14} />
            ) : status === "ready" ? (
              <Check size={14} aria-hidden="true" />
            ) : status === "error" ? (
              <CircleAlert size={14} aria-hidden="true" />
            ) : (
              <Circle size={12} aria-hidden="true" />
            )}
            <span>{text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function LoadingMark() {
  useLanguage();
  return (
    <div className="startup-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <b>
        <ConnectionSpinner size={26} />
      </b>
    </div>
  );
}
const connectionCopy = (offline: boolean) =>
  offline
    ? tr(
        "You’re offline. Reconnect to continue. Your open draft stays in this tab.",
      )
    : tr(
        "The server may be starting up or temporarily unavailable. We’re checking the connection.",
      );

export function StartupScreen({
  title,
  children,
  busy = true,
}: {
  title: string;
  children?: ReactNode;
  busy?: boolean;
}) {
  useLanguage();
  const register = useContext(StartupPresentation);
  useLayoutEffect(() => register?.(), [register]);
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
          <div role="status">
            <p>{connectionCopy(network.problem === "offline")}</p>
            {network.warming ? (
              <small>
                {tr("Connecting to server… Attempt {0}", network.attempt)}
              </small>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function WorkspaceReady({ children }: { children: ReactNode }) {
  useLanguage();
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
          ? tr("Your workspace couldn’t finish loading")
          : administrator
            ? tr("Preparing administration")
            : tr("Preparing your workspace")
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
              {tr("Try again")}
            </Button>
            <Button variant="ghost" onClick={() => void auth.logout()}>
              {tr("Sign out")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="startup-progress-summary">
            <span role="status">
              {snapshot.total
                ? tr(
                    "{0} of {1} collections ready",
                    snapshot.completed,
                    snapshot.total,
                  )
                : tr("Opening your workspace…")}
            </span>
            {snapshot.total ? (
              <strong>
                {Math.round((snapshot.completed / snapshot.total) * 100)}%
              </strong>
            ) : null}
          </div>
          <progress
            aria-label={tr("Workspace loading")}
            max={snapshot.total || 1}
            value={snapshot.completed}
          />
        </>
      )}
      {snapshot.tasks.length ? (
        <PreparationTasks tasks={snapshot.tasks} />
      ) : null}
      {snapshot.pages ? (
        <small>
          {snapshot.pages}
          {" "}{tr("pages loaded")}
        </small>
      ) : null}
    </StartupScreen>
  );
}

function ConnectionNotice({ suppressed }: { suppressed: boolean }) {
  useLanguage();
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
  if (
    suppressed ||
    (!network.slow && !network.problem) ||
    loading.status === "loading"
  )
    return null;
  const connecting =
    network.warming || (network.pending > 0 && !network.problem);
  const offline = network.problem === "offline" && !connecting;
  return (
    <aside
      className={`connection-notice ${!state.session ? "connection-notice-auth" : ""}`}
      aria-label={tr("Connection status")}
    >
      {connecting ? (
        <ConnectionSpinner />
      ) : network.problem ? (
        offline ? (
          <WifiOff size={22} />
        ) : (
          <CloudOff size={22} />
        )
      ) : (
        <ConnectionSpinner />
      )}
      <div role="status" className="connection-details">
        <strong>
          {offline
            ? tr("You’re offline")
            : network.problem && !network.warming
              ? tr("Connection interrupted")
              : tr("Connecting to NoteTatCa…")}
        </strong>
        <p>{connectionCopy(offline)}</p>
        {connecting ? (
          <>
            <small className="connection-step">
              {network.warming
                ? tr("Connecting to server… Attempt {0}", network.attempt)
                : tr("Waiting for response…")}
            </small>
            <ConnectionProgress />
          </>
        ) : null}
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
          {tr("Reconnect")}
        </Button>
      ) : null}
    </aside>
  );
}
