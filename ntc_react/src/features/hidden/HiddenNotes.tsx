import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  List,
  LockKeyhole,
  Plus,
  KeyRound,
  Trash2,
  FileText,
} from "lucide-react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { NoteCard } from "../notes/NoteCard";
import { NotesZoomViewport } from "../notes/NotesZoomViewport";
import type { NoteOpenAction } from "../editor/NoteEditor";
import { hiddenDraftProtection } from "../../application/hiddenDraftProtection";
import { api, auth, offlineStore } from "../../app/runtime";
import { useAuth } from "../../shared/hooks";
import { t as tr, useLanguage } from "../../shared/i18n";
import {
  Button,
  ErrorBanner,
  Spinner,
  Select,
  IconButton,
  ActionMenu,
  EmptyState,
  ConfirmDialog,
  Modal,
} from "../../shared/ui";
import { errorMessage } from "../../shared/utils";
import type { Note, Page } from "../../domain/models";
import { draftFrom, sortNotes } from "../../domain/models";
import NoteEditor from "../editor/NoteEditorLoader";
import { EditorScopeContext } from "../editor/EditorScope";
import { VaultRecovery } from "./VaultRecovery";
import { PatternLock } from "./PatternLock";
import {
  vaultApi,
  vaultNotes,
  isVaultUnlocked,
  subscribeVault,
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
  const location = useLocation();
  const session = useAuth();
  if (session.status !== "authenticated")
    return <p>{tr("Hidden notes need an online connection.")}</p>;
  return (
    <QueryClientProvider client={vaultCache}>
      <VaultPage key={`${auth.identity()}:${location.pathname}`} />
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
  const [mode, setMode] = useState<"unlock" | "change">("unlock");
  const unlocked = useSyncExternalStore(subscribeVault, isVaultUnlocked);
  const [view, setView] = useState(() =>
    localStorage.getItem("ntc.view.v1") === "list" ? "list" : "grid",
  );
  const [pinFilter, setPinFilter] = useState("all");
  const [selectedAction, setSelectedAction] = useState<NoteOpenAction>();
  const [deleting, setDeleting] = useState<Note>();
  const [trashPreview, setTrashPreview] = useState<Note>();
  const [items, setItems] = useState<Note[]>([]);
  const [page, setPage] = useState(1);
  const [trash, setTrash] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string | undefined>(() =>
    location.state?.vaultReset
      ? tr("Your lock was reset. Hidden notes were kept.")
      : undefined,
  );
  const configuredKind = useRef<"pin" | "pattern">("pin");
  const epoch = useRef(0);
  const newRequest = useRef<string | undefined>(undefined);
  const active = useRef(isVaultUnlocked());
  const lock = useCallback(() => {
    epoch.current++;
    active.current = false;
    setDeleting(undefined);
    setTrashPreview(undefined);
    setKind(configuredKind.current);
    setError(undefined);
    setItems([]);
    setSelected(undefined);
    setTrash(false);
    setSecret("");
    setConfirm("");
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
    };
  }, []);
  useEffect(
    () =>
      subscribeVault(() => {
        if (!isVaultUnlocked()) lock();
      }),
    [lock],
  );
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
  useEffect(() => {
    active.current = unlocked;
    if (unlocked) void load().catch((e) => setError(errorMessage(e)));
  }, [unlocked, load]);
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
  const configure = !status?.configured || mode === "change";
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
  if (location.pathname === "/hidden-notes/recover")
    return (
      <VaultRecovery
        onReset={() => {
          lock();
          navigate("/hidden-notes", {
            replace: true,
            state: { vaultReset: true },
          });
        }}
      />
    );
  return (
    <section className="vault-page">
      <h1 className="sr-only">{tr("Hidden notes")}</h1>
      {unlocked && mode === "unlock" && notice ? (
        <p role="status">{notice}</p>
      ) : null}
      {unlocked &&
      mode === "unlock" &&
      hiddenDraftProtection.has(auth.identity() ?? "") ? (
        <p role="status">
          {tr(
            "An unsent hidden draft is kept in this tab. Unlock to save it before reloading or signing out.",
          )}
        </p>
      ) : null}
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
          {!status.emailVerified ? (
            <Link className="button secondary" to="/settings/security">
              {tr("Verify email")}
            </Link>
          ) : null}
          {configure ? (
            <label>
              <span className="sr-only">{tr("Lock type")}</span>
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
          <strong className="sr-only">
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
              <span className="sr-only">{tr("Six-digit PIN")}</span>
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
            <Link className="button ghost vault-recovery-link" to="/hidden-notes/recover">
              {tr("Forgot lock?")}
            </Link>
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
          <div className="workspace-toolbar vault-toolbar">
            <button
              className="quick-capture"
              aria-label={tr("New hidden note")}
              disabled={busy}
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
                    setSelectedAction(undefined);
                    setSelected(note.id);
                  }
                })
              }
            >
              <span className="quick-capture-icon">
                <Plus size={14} />
              </span>
              <span>{tr("New")}</span>
            </button>
            <div className="row-actions vault-controls">
              <Select
                label={tr("Filter pinned notes")}
                value={pinFilter}
                onChange={setPinFilter}
              >
                <option value="all">{tr("All notes")}</option>
                <option value="pinned">{tr("Pinned only")}</option>
                <option value="unpinned">{tr("Unpinned only")}</option>
              </Select>
              <div
                className="view-toggle"
                role="group"
                aria-label={tr("Notes view")}
              >
                {[
                  ["grid", LayoutGrid],
                  ["list", List],
                ].map(([name, Icon]) => {
                  const Component = Icon as typeof LayoutGrid;
                  return (
                    <IconButton
                      key={String(name)}
                      icon={Component}
                      label={tr(
                        "{0} view",
                        tr(
                          name === "grid" ? "Grid" : "List",
                        ).toLocaleLowerCase(),
                      )}
                      active={view === name}
                      onClick={() => {
                        setView(String(name));
                        localStorage.setItem("ntc.view.v1", String(name));
                      }}
                    />
                  );
                })}
              </div>
              <IconButton
                icon={LockKeyhole}
                label={tr("Lock now")}
                onClick={lock}
              />
              <ActionMenu
                label={tr("Hidden notes options")}
                items={[
                  {
                    label: tr("Change lock"),
                    icon: KeyRound,
                    action: () => {
                      setMode("change");
                      setSecret("");
                      setStep("enter");
                    },
                  },
                  {
                    label: tr(trash ? "Hidden notes" : "Trash"),
                    icon: Trash2,
                    action: () =>
                      void action(async () => {
                        setTrash(!trash);
                        await load(1, !trash);
                      }),
                  },
                ]}
              />
            </div>
          </div>
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
            <EmptyState
              icon={FileText}
              title={tr(trash ? "A clean slate" : "Your next idea starts here")}
              description={tr(
                "No hidden notes yet. Use Hide note from a note’s menu.",
              )}
            />
          ) : null}
          <NotesZoomViewport mode={view}>
            <DndContext>
              <SortableContext items={items.map((note) => note.id)}>
                {(trash
                  ? [{ title: tr("Deleted notes"), notes: items }]
                  : [
                      {
                        title: tr("Pinned"),
                        notes: items.filter((note) => note.isPinned),
                      },
                      {
                        title: tr(
                          items.some((note) => note.isPinned)
                            ? "Everything else"
                            : "All notes",
                        ),
                        notes: items.filter((note) => !note.isPinned),
                      },
                    ]
                ).map((group) => {
                  const notes = sortNotes(group.notes).filter(
                    (note) =>
                      pinFilter === "all" ||
                      note.isPinned === (pinFilter === "pinned"),
                  );
                  return notes.length ? (
                    <section key={group.title} className="notes-section">
                      <div className="section-heading">
                        <h2>
                          {group.title}
                          <span>{notes.length}</span>
                        </h2>
                      </div>
                      <div
                        className={`note-grid ${view === "list" ? "list-view" : ""}`}
                      >
                        {notes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            trash={trash}
                            busy={busy}
                            hidden
                            draggable={false}
                            onOpen={(id) => {
                              if (trash) setTrashPreview(note);
                              else {
                                setSelectedAction(undefined);
                                setSelected(id);
                              }
                            }}
                            onOrganize={(id, action) => {
                              setSelectedAction(action);
                              setSelected(id);
                            }}
                            onUnhide={(note) => void unhide(note)}
                            onAction={(note, command) => {
                              if (command === "delete") {
                                setDeleting(note);
                                return;
                              }
                              void action(async () => {
                                if (command === "pin")
                                  await vaultNotes.pin(
                                    await requireSavedVaultDraft(note.id),
                                  );
                                else if (command === "trash") {
                                  await requireSavedVaultDraft(note.id);
                                  await vaultNotes.trash(note.id);
                                } else await vaultNotes.restore(note.id);
                                await load();
                              });
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  ) : null;
                })}
              </SortableContext>
            </DndContext>
          </NotesZoomViewport>
          {deleting ? (
            <ConfirmDialog
              title={tr("Permanently delete note?")}
              description={tr(
                "This removes the note and its related reminders permanently. This cannot be undone.",
              )}
              confirmLabel={tr("Delete permanently")}
              danger
              onClose={() => setDeleting(undefined)}
              onConfirm={async () => {
                await vaultNotes.delete(deleting.id);
                vaultScope.forgetDraft(deleting);
                setDeleting(undefined);
                await load();
              }}
            />
          ) : null}
          {trashPreview ? (
            <Modal
              open
              title={trashPreview.title || tr("Untitled")}
              onClose={() => setTrashPreview(undefined)}
            >
              <p className="trash-content">{trashPreview.content}</p>
            </Modal>
          ) : null}
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
                initialAction={selectedAction}
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
