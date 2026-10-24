import { useState, useSyncExternalStore } from "react";
import {
  offline,
  logoutProtection,
  auth,
  onlineWorkspace,
  cache,
  workspace,
  connection,
} from "./runtime";
import { Button, ConfirmDialog, ErrorBanner, Modal } from "../shared/ui";
import { t as tr, useLanguage } from "../shared/i18n";
import { useAuth } from "../shared/hooks";

async function downloadBackup() {
  const data = await offline.exportPending();
  const blob = new Blob(
    [
      JSON.stringify(
        { schema: 1, exportedAt: new Date().toISOString(), ...data },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "NoteTatCa-offline-backup.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return JSON.stringify(
    data.pending.map(({ key, id, draft }) => ({ key, id, draft })),
  );
}
export function LogoutWarning() {
  useLanguage();
  const open = useSyncExternalStore(
    logoutProtection.subscribe,
    logoutProtection.getSnapshot,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [backup, setBackup] = useState<string>();
  function finish(done: boolean) {
    setBackup(undefined);
    setError(undefined);
    logoutProtection.finish(done);
  }
  if (!open) return null;
  return (
    <Modal
      open
      className="offline-logout-modal"
      title={tr("Unsynced notes")}
      description={tr(
        "Some changes exist only on this device. Stay signed in to sync, or download a backup before signing out and clearing local notes.",
      )}
      onClose={() => {
        if (!busy) finish(false);
      }}
    >
      <div className="modal-body">
        <ErrorBanner error={error} />
        {backup ? (
          <p>
            {tr("Check that the backup file was saved before signing out.")}
          </p>
        ) : null}
      </div>
      <div className="modal-footer">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => finish(false)}
        >
          {tr("Stay signed in")}
        </Button>
        <Button
          busy={busy}
          onClick={() => {
            setBusy(true);
            setError(undefined);
            void downloadBackup()
              .then(setBackup)
              .catch(setError)
              .finally(() => setBusy(false));
          }}
        >
          {tr("Download backup")}
        </Button>
        {backup ? (
          <Button
            busy={busy}
            onClick={() => {
              setBusy(true);
              setError(undefined);
              void offline
                .exportPending()
                .then((data) => {
                  if (
                    data.pending.length &&
                    JSON.stringify(
                      data.pending.map(({ key, id, draft }) => ({
                        key,
                        id,
                        draft,
                      })),
                    ) !== backup
                  ) {
                    setBackup(undefined);
                    throw new Error(
                      "Notes changed. Download a fresh backup before signing out.",
                    );
                  }
                  finish(true);
                })
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          >
            {tr("Backup saved; sign out")}
          </Button>
        ) : null}
      </div>
    </Modal>
  );
}
export function OfflineControls() {
  useLanguage();
  const state = useSyncExternalStore(offline.subscribe, offline.getSnapshot);
  const session = useAuth();
  const network = useSyncExternalStore(
    connection.subscribe,
    connection.getSnapshot,
  );
  const [details, setDetails] = useState(false);
  const [discard, setDiscard] = useState<string>();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  async function sync() {
    if (!navigator.onLine) return;
    setBusy(true);
    setError(undefined);
    try {
      if (!onlineWorkspace()) await auth.refresh();
      await offline.sync();
      if (!offline.getSnapshot().pending)
        await cache.invalidateQueries({ queryKey: workspace.key("notes") });
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  const quiet =
    !busy &&
    !state.pending &&
    session.status !== "offline" &&
    !network.warming &&
    !network.problem &&
    !state.error &&
    !error;
  return (
    <>
      {quiet ? (
        <span className="sr-only" role="status">
          {tr("Notes synced")}
        </span>
      ) : (
        <div
          className="offline-toolbar"
          role="region"
          aria-label={tr("Note synchronization")}
        >
          <span role="status">
            {state.syncing
              ? tr("Syncing notes…")
              : state.pending
                ? tr("{0} pending changes", state.pending)
                : session.status === "offline"
                  ? tr("Offline notes on this device")
                  : network.warming
                    ? tr("Connecting to NoteTatCa…")
                    : network.problem === "offline"
                      ? tr("Working offline")
                      : network.problem
                        ? tr("Connection interrupted")
                        : tr("Notes synced")}
          </span>
          <Button
            variant="ghost"
            busy={state.syncing || busy}
            onClick={() => void sync()}
          >
            {tr("Sync now")}
          </Button>
          {state.conflicts.length || state.error || error ? (
            <Button variant="ghost" onClick={() => setDetails(true)}>
              {tr("Review sync")}
            </Button>
          ) : null}
        </div>
      )}
      {details ? (
        <Modal
          open
          title={tr("Note synchronization")}
          onClose={() => setDetails(false)}
        >
          <div className="modal-body">
            <ErrorBanner
              error={
                error ?? (state.error ? new Error(state.error) : undefined)
              }
            />
            <p>
              {tr(
                "Changes saved on this device are kept until they sync. Conflicts never overwrite the online note automatically.",
              )}
            </p>
            {state.conflicts.map((item) => (
              <section className="offline-conflict" key={item.key}>
                <strong>{item.draft.title || tr("Untitled")}</strong>
                <p>{item.blocked ? tr(item.blocked) : null}</p>
                <Button
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void offline
                      .resolve(item.id, true)
                      .catch(setError)
                      .finally(() => setBusy(false));
                  }}
                >
                  {tr("Save as a new copy")}
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setDiscard(item.id)}
                >
                  {tr("Use online version")}
                </Button>
              </section>
            ))}
          </div>
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => {
                void downloadBackup().catch(setError);
              }}
            >
              {tr("Download backup")}
            </Button>
            <Button onClick={() => setDetails(false)}>{tr("Close")}</Button>
          </div>
        </Modal>
      ) : null}
      {discard ? (
        <ConfirmDialog
          title={tr("Use online version")}
          description={tr(
            "This discards the pending local edits for this note. Download a backup first if you want to keep them.",
          )}
          danger
          onClose={() => setDiscard(undefined)}
          onConfirm={async () => {
            await offline.resolve(discard, false);
            setDiscard(undefined);
          }}
        />
      ) : null}
    </>
  );
}
