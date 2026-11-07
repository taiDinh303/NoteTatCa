import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import {hiddenDraftProtection} from "../../application/hiddenDraftProtection";
import { api, auth, offlineStore } from "../../app/runtime";
import { useAuth } from "../../shared/hooks";
import { t as tr, useLanguage } from "../../shared/i18n";
import { Button, ErrorBanner, Spinner, Select } from "../../shared/ui";
import { errorMessage } from "../../shared/utils";
import type { Note, Page } from "../../domain/models";
import { draftFrom } from "../../domain/models";
import NoteEditor from "../editor/NoteEditorLoader";
import { EditorScopeContext } from "../editor/EditorScope";
import { PatternLock } from "./PatternLock";
import {
  vaultApi,
  vaultCache,
  vaultScope,
  setVaultToken,
  lockVault,
  hideNote,
  requireSavedVaultDraft,
} from "./vaultRuntime";
import "./HiddenNotes.css";
type Status = {
  configured: boolean;
  kind: "pin" | "pattern" | null;
  emailVerified: boolean;
};
export default function HiddenNotes() {
  useLanguage();
  const session = useAuth();
  if (session.status !== "authenticated")
    return <p>{tr("Hidden notes need an online connection.")}</p>;
  return (
    <QueryClientProvider client={vaultCache}>
      <VaultPage />
    </QueryClientProvider>
  );
}
function VaultPage() {
  useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const hideId =
    typeof location.state?.hideNoteId === "string"
      ? location.state.hideNoteId
      : undefined;
  const [status, setStatus] = useState<Status>();
  const [kind, setKind] = useState<"pin" | "pattern">("pin");
  const [secret, setSecret] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [mode, setMode] = useState<"unlock" | "reset" | "change">("unlock");
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const [page, setPage] = useState(1);
  const [trash, setTrash] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const configuredKind = useRef<"pin" | "pattern">("pin");
  const epoch = useRef(0);
  const newRequest = useRef<string | undefined>(undefined);
  const active = useRef(false);
  const lastActivity = useRef(0);
  const lock = useCallback(() => {
    epoch.current++;
    active.current = false;
    setUnlocked(false);
    setKind(configuredKind.current);
    setError(undefined);
    setItems([]);
    setSelected(undefined);
    setTrash(false);
    setSecret("");
    setConfirm("");
    setCode("");
    setStep("enter");
    setMode("unlock");
    void lockVault();
  }, []);
  useEffect(() => {
    let live = true;
    void api
      .request<Status>("/hidden-notes/status")
      .then((s) => {
        if (live) {
          setStatus(s);
          setKind(s.kind ?? "pin");
          configuredKind.current = s.kind ?? "pin";
        }
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      });
    return () => {
      live = false;
      active.current = false;
      void lockVault();
    };
  }, []);
  useEffect(() => {
    const activity = () => {
      lastActivity.current = performance.now();
    };
    const background = () => {
      if (document.hidden && active.current) flushSync(lock);
    };
    const blur = () => {
      if (active.current) flushSync(lock);
    };
    const offline = () => {
      if (active.current) {
        lock();
        setNotice(tr("Hidden notes need an online connection."));
      }
    };
    document.addEventListener("visibilitychange", background);
    window.addEventListener("blur", blur);
    window.addEventListener("pagehide", blur);
    window.addEventListener("offline", offline);
    for (const name of ["pointerdown", "keydown", "pointermove", "touchstart"])
      window.addEventListener(name, activity, { passive: true });
    let heartbeat = 0;
    const timer = window.setInterval(() => {
      if (!active.current) return;
      if (performance.now() - lastActivity.current >= 300000) {
        lock();
        return;
      }
      if (++heartbeat % 30 === 0)
        void vaultApi
          .request("/hidden-notes/heartbeat", { method: "POST" })
          .catch(() => lock());
    }, 1000);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", background);
      window.removeEventListener("blur", blur);
      window.removeEventListener("pagehide", blur);
      window.removeEventListener("offline", offline);
      for (const name of [
        "pointerdown",
        "keydown",
        "pointermove",
        "touchstart",
      ])
        window.removeEventListener(name, activity);
    };
  }, [lock]);
  const load = useCallback(
    async (next = 1, inTrash = trash) => {
      const generation = epoch.current;
      const result = await vaultApi.request<Page<Note>>(
        `/hidden-notes?pageNumber=${next}&pageSize=100&trash=${inTrash}`,
      );
      if (generation !== epoch.current || !active.current) return;
      setItems((old) =>
        next === 1 ? result.items : [...old, ...result.items],
      );
      setPage(next);
      setHasNext(result.hasNextPage);
    },
    [trash],
  );
  async function action(run: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await run();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const configure =
    !status?.configured || mode === "change" || mode === "reset";
  async function submit() {
    await action(async () => {
      if (configure && step === "enter") {
        if (
          (kind === "pin" && !/^\d{6}$/.test(secret)) ||
          (kind === "pattern" && secret.length < 4)
        )
          throw new Error(
            tr("Use a six-digit PIN or at least four pattern points."),
          );
        setConfirm(secret);
        setSecret("");
        setStep("confirm");
        return;
      }
      if (configure && secret !== confirm)
        throw new Error(tr("The locks do not match. Try again."));
      if (mode === "reset") {
        await api.request("/hidden-notes/reset", {
          method: "POST",
          body: { code, kind, secret },
        });
        configuredKind.current = kind;
        setStatus((s) => (s ? { ...s, configured: true, kind } : s));
        lock();
        setNotice(tr("Your lock was reset. Hidden notes were kept."));
        return;
      }
      if (configure) {
        const client = mode === "change" ? vaultApi : api;
        await client.request("/hidden-notes/configure", {
          method: "POST",
          body: { kind, secret },
        });
        configuredKind.current = kind;
        setStatus((s) => (s ? { ...s, configured: true, kind } : s));
        if (mode === "change") {
          lock();
          return;
        }
      }
      const result = await api.request<{ token: string }>(
        "/hidden-notes/unlock",
        { method: "POST", body: { kind, secret } },
      );
      setVaultToken(result.token);
      active.current = true;
      lastActivity.current = performance.now();
      setUnlocked(true);
      setSecret("");
      setConfirm("");
      setStep("enter");
      setNotice(undefined);
      await load();
    });
  }
  async function unhide(note: Note) {
    await action(async () => {
      const current = await requireSavedVaultDraft(note.id);
      await vaultApi.request(`/hidden-notes/${note.id}/visibility`, {
        method: "PATCH",
        body: { hidden: false, version: current.version },
      });
      const owner = auth.getSnapshot().session?.userId;
      if (owner)
        await offlineStore.change(owner, (data) => {
          data.hiddenIds = data.hiddenIds?.filter((id) => id !== note.id);
        });
      await load();
    });
  }
  return (
    <section className="vault-page">
      <div className="vault-heading">
        <h1>
          <LockKeyhole size={22} /> {tr("Hidden notes")}
        </h1>
        {unlocked ? (
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                setMode("change");
                setSecret("");
                setStep("enter");
              }}
            >
              {tr("Change lock")}
            </Button>{" "}
            <Button onClick={lock}>{tr("Lock now")}</Button>
          </div>
        ) : null}
      </div>
      {notice ? <p role="status">{notice}</p> : null}
      {hiddenDraftProtection.has(auth.identity()??"")?<p role="status">{tr("An unsent hidden draft is kept in this tab. Unlock to save it before reloading or signing out.")}</p>:null}
      {error ? <ErrorBanner error={new Error(error)} /> : null}
      {!status ? (
        <Spinner />
      ) : !unlocked || mode === "change" ? (
        <form
          className="vault-lock-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p>
            {tr(
              "Hidden notes are online only. They lock when you leave the app or after five minutes without activity.",
            )}
          </p>
          {!status.emailVerified ? (
            <p>
              {tr(
                "Verify your email in Account settings before setting up hidden notes.",
              )}
            </p>
          ) : null}
          {configure ? (
            <label>
              {tr("Lock type")}
              <Select
                label={tr("Lock type")}
                value={kind}
                disabled={busy}
                onChange={(value) => {
                  setKind(value as "pin" | "pattern");
                  setSecret("");
                  setConfirm("");
                  setStep("enter");
                }}
              >
                <option value="pin">{tr("Six-digit PIN")}</option>
                <option value="pattern">{tr("3 by 3 pattern")}</option>
              </Select>
            </label>
          ) : null}
          {mode === "reset" ? (
            <label>
              {tr("Email reset code")}
              <input
                value={code}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </label>
          ) : null}
          <strong>
            {tr(
              configure
                ? step === "confirm"
                  ? "Repeat your new lock"
                  : "Choose your new lock"
                : "Unlock hidden notes",
            )}
          </strong>
          {kind === "pin" ? (
            <label>
              {tr("Six-digit PIN")}
              <input
                aria-label={tr("Six-digit PIN")}
                type="password"
                value={secret}
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                disabled={busy}
                onChange={(e) => setSecret(e.target.value.replace(/\D/g, ""))}
              />
            </label>
          ) : (
            <>
              <PatternLock
                value={secret}
                onChange={setSecret}
                disabled={busy}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSecret("")}
              >
                {tr("Clear pattern")}
              </Button>
            </>
          )}
          <Button type="submit" busy={busy} disabled={!status.emailVerified}>
            {tr(
              configure
                ? step === "enter"
                  ? "Continue"
                  : "Confirm lock"
                : "Unlock",
            )}
          </Button>
          {status.configured && mode === "unlock" ? (
            <Button
              type="button"
              variant="ghost"
              busy={busy}
              onClick={() =>
                void action(async () => {
                  await api.request("/hidden-notes/reset-code", {
                    method: "POST",
                  });
                  setMode("reset");
                  setSecret("");
                  setStep("enter");
                  setNotice(
                    tr("A reset code was sent to your verified email."),
                  );
                })
              }
            >
              {tr("Forgot lock?")}
            </Button>
          ) : null}
          {mode === "reset" ? (
            <Button
              type="button"
              variant="secondary"
              busy={busy}
              onClick={() =>
                void action(async () => {
                  await api.request("/hidden-notes/reset-code", {
                    method: "POST",
                  });
                  setNotice(
                    tr("A reset code was sent to your verified email."),
                  );
                })
              }
            >
              {tr("Send another code")}
            </Button>
          ) : null}
          {mode !== "unlock" ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode("unlock");
                setKind(status.kind ?? "pin");
                setSecret("");
                setStep("enter");
              }}
            >
              {tr("Cancel")}
            </Button>
          ) : null}
        </form>
      ) : (
        <>
          <Button
            busy={busy}
            onClick={() =>
              void action(async () => {
                const key = newRequest.current ?? crypto.randomUUID();
                newRequest.current = key;
                const note = await vaultApi.request<Note>("/hidden-notes", {
                  method: "POST",
                  body: draftFrom(),
                  headers: { "Idempotency-Key": key },
                });
                await load();
                if (active.current) {
                  newRequest.current = undefined;
                  setSelected(note.id);
                }
              })
            }
          >
            {tr("New hidden note")}
          </Button>
          <Button
            variant="secondary"
            busy={busy}
            onClick={() =>
              void action(async () => {
                setTrash(!trash);
                await load(1, !trash);
              })
            }
          >
            {tr(trash ? "Hidden notes" : "Trash")}
          </Button>
          {hideId && !trash ? (
            <div role="status">
              <p>
                {tr(
                  "Hide the selected note? It will be removed from normal lists and this device’s offline cache. Reminders are paused while hidden.",
                )}
              </p>
              <Button
                busy={busy}
                onClick={() =>
                  void action(async () => {
                    await hideNote(hideId);
                    navigate("/hidden-notes", { replace: true, state: null });
                    await load();
                  })
                }
              >
                {tr("Hide note")}
              </Button>
            </div>
          ) : null}
          {!items.length ? (
            <p>
              {tr("No hidden notes yet. Use Hide note from a note’s menu.")}
            </p>
          ) : null}
          <div className="vault-grid">
            {items.map((note) => (
              <article key={note.id} className="vault-card">
                <button
                  className="vault-open"
                  disabled={trash}
                  onClick={() => setSelected(note.id)}
                >
                  <h2>{note.title || tr("Untitled")}</h2>
                  <p>{note.content.slice(0, 300)}</p>
                </button>
                <Button
                  variant="secondary"
                  busy={busy}
                  onClick={() =>
                    void (trash
                      ? action(async () => {
                          await vaultApi.request(`/notes/${note.id}/restore`, {
                            method: "POST",
                          });
                          await load();
                        })
                      : unhide(note))
                  }
                >
                  {tr(trash ? "Restore" : "Unhide note")}
                </Button>
              </article>
            ))}
          </div>
          {hasNext ? (
            <Button
              busy={busy}
              onClick={() => void action(() => load(page + 1))}
            >
              {tr("Show more")}
            </Button>
          ) : null}
          {selected ? (
            <EditorScopeContext.Provider value={vaultScope}>
              <NoteEditor
                noteId={selected}
                onClose={() => {
                  setSelected(undefined);
                  void action(() => load());
                }}
              />
            </EditorScopeContext.Provider>
          ) : null}
        </>
      )}
    </section>
  );
}
