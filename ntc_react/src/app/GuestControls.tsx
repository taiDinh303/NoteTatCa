import { useEffect, useState, useSyncExternalStore } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { auth, guest, guestTransfer, cache, workspace } from "./runtime";
import { guestSession } from "../application/guest";
import { homePath, isAdministrator } from "../application/access";
import { useAuth } from "../shared/hooks";
import {
  t as tr,
  useLanguage,
  languages,
  setLanguage,
  type Language,
} from "../shared/i18n";
import {
  Button,
  ConfirmDialog,
  ErrorBanner,
  Modal,
  Select,
  Spinner,
} from "../shared/ui";
import "./GuestControls.css";

export function GuestEntry() {
  useLanguage();
  const state = useAuth();
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    let active = true;
    if (state.status === "anonymous")
      void guest
        .ensure()
        .then(() => {
          if (active) auth.enterGuest(guestSession());
        })
        .catch((failure) => {
          if (active) setError(failure);
        });
    return () => {
      active = false;
    };
  }, [state.status]);
  if (state.session) return <Navigate to={homePath(state.session)} replace />;
  return (
    <section className="guest-entry">
      <h1>{tr("Opening guest mode")}</h1>
      <ErrorBanner error={error} />
      {error ? (
        <Button onClick={() => window.location.reload()}>
          {tr("Try again")}
        </Button>
      ) : (
        <Spinner />
      )}
    </section>
  );
}
export function GuestBanner() {
  const language = useLanguage();
  const state = useAuth();
  const navigate = useNavigate();
  const snapshot = useSyncExternalStore(guest.subscribe, guest.getSnapshot);
  const [reset, setReset] = useState(false);
  if (state.status !== "guest") return null;
  return (
    <>
      <aside className="guest-banner" aria-label={tr("Guest mode")}>
        <div>
          <strong>{tr("Guest mode")}</strong>
          <p>
            {tr(
              "Saved only on this browser. Sign in to keep a copy in your account.",
            )}
          </p>
        </div>
        <Select
          label={tr("App language")}
          value={language}
          onChange={(code) => setLanguage(code as Language)}
        >
          {languages.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </Select>
        <Button variant="ghost" onClick={() => setReset(true)}>
          {tr("Reset demo")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            guest.requestImport();
            void navigate("/login");
          }}
        >
          {tr("Sign in")}
        </Button>
      </aside>
      {snapshot.error ? (
        <ErrorBanner error={new Error(snapshot.error)} />
      ) : null}
      {reset ? (
        <ConfirmDialog
          title={tr("Reset this guest demo?")}
          description={tr(
            "This removes guest notes and labels from this browser and restores the sample content. Account notes are not affected.",
          )}
          danger
          confirmLabel={tr("Reset demo")}
          onClose={() => setReset(false)}
          onConfirm={async () => {
            await guest.reset();
            await cache.invalidateQueries({
              queryKey: ["private", state.session!.userId],
            });
            setReset(false);
          }}
        />
      ) : null}
    </>
  );
}
export function GuestImportOffer() {
  useLanguage();
  const state = useAuth();
  const snapshot = useSyncExternalStore(guest.subscribe, guest.getSnapshot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [kept, setKept] = useState(false);
  if (
    state.status !== "authenticated" ||
    isAdministrator(state.session) ||
    !snapshot.importOpen ||
    !snapshot.exists
  )
    return null;
  return (
    <Modal
      open
      title={tr("Copy guest notes to your account?")}
      onClose={() => {
        if (!busy) {
          guest.closeImport();
          setKept(false);
        }
      }}
    >
      <div className="modal-body">
        <p>
          {tr(
            "Copy {0} notes and {1} labels as new items. Existing account notes will not be overwritten. Guest data is cleared after a successful copy.",
            snapshot.notes,
            snapshot.labels,
          )}
        </p>
        <p className="field-hint">
          {tr(
            "Deleted guest notes are copied into account Trash with a new 30-day recovery period.",
          )}
        </p>
        {kept ? (
          <p role="status">
            {tr(
              "The copy finished. Newer guest edits were kept on this browser.",
            )}
          </p>
        ) : null}
        <ErrorBanner error={error} />
        <p className="field-hint">
          {tr(
            "Skipping deletes guest notes and labels from this browser without copying. Your account notes are kept.",
          )}
        </p>
      </div>
      <div className="modal-footer guest-import-footer">
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError(undefined);
            void guest
              .discard()
              .then(() => setKept(false))
              .catch(setError)
              .finally(() => setBusy(false));
          }}
        >
          {tr("Delete")}
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            guest.closeImport();
            setKept(false);
          }}
        >
          {tr("Close")}
        </Button>
        {!kept ? (
          <Button
            busy={busy}
            onClick={() => {
              setBusy(true);
              setError(undefined);
              void guestTransfer
                .copy()
                .then(async (cleared) => {
                  await guest.refresh();
                  await Promise.all([
                    cache.invalidateQueries({
                      queryKey: workspace.key("notes"),
                    }),
                    cache.invalidateQueries({
                      queryKey: workspace.key("labels"),
                    }),
                  ]);
                  if (cleared) guest.closeImport();
                  else setKept(true);
                })
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          >
            {tr("Copy to my account")}
          </Button>
        ) : null}
      </div>
    </Modal>
  );
}
