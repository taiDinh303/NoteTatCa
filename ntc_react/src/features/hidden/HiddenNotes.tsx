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
  cachedVaultStatus, loadVaultStatus, saveVaultStatus, vaultListKey,
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
    return <section className="vault-page vault-waiting"><Spinner /></section>;
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
  const searchQuery = new URLSearchParams(location.search).get("q") ?? "";
  const hideId =
    typeof location.state?.hideNoteId === "string"
      ? location.state.hideNoteId
      : undefined;
  const [status, setStatus] = useState<Status | undefined>(cachedVaultStatus);
  const [kind, setKind] = useState<"pin" | "pattern">((cachedVaultStatus()?.kind) ?? "pin");
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
  const initialList = () => isVaultUnlocked() ? vaultCache.getQueryData<Page<Note>>(vaultListKey(false, searchQuery)) : undefined;
  const [items, setItems] = useState<Note[]>(() => initialList()?.items ?? []);
  const [listLoading, setListLoading] = useState(() => !initialList());
  const [page, setPage] = useState(1);
  const [trash, setTrash] = useState(false);
  const [hasNext, setHasNext] = useState(() => initialList()?.hasNextPage ?? false);
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string | undefined>(() =>
    location.state?.vaultReset
      ? tr("Your lock was reset. Hidden notes were kept.")
      : undefined,
  );
  const configuredKind = useRef<"pin" | "pattern">((cachedVaultStatus()?.kind) ?? "pin");
  const epoch = useRef(0);
  const listRequest = useRef(0);
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
    void loadVaultStatus()
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
      const request = ++listRequest.current;
      const cached = next === 1 ? vaultCache.getQueryData<Page<Note>>(vaultListKey(inTrash, searchQuery)) : undefined;
      if (next === 1) { setItems(cached?.items ?? []); setListLoading(!cached); }
      const result = await vaultCache.fetchQuery({
        queryKey: vaultListKey(inTrash, searchQuery, next), staleTime: 0, retry: false,
        queryFn: ({signal}) => vaultApi.request<Page<Note>>(
          `/hidden-notes?pageNumber=${next}&pageSize=100&trash=${inTrash}&q=${encodeURIComponent(searchQuery)}`, {signal}),
      });
      if (generation !== epoch.current || request !== listRequest.current || !active.current) return;
      vaultCache.setQueryData(vaultListKey(inTrash, searchQuery, next), result);
      setListLoading(false);
      setItems((old) =>
        next === 1 ? result.items : [...old, ...result.items],
      );
      setPage(next);
      setHasNext(result.hasNextPage);
    },
    [trash, searchQuery],
  );
  useEffect(() => {
    active.current = unlocked;
    // Keep the cached first render intact; schedule revalidation after the effect.
    if (unlocked) void Promise.resolve().then(() => { if (active.current) return load(); }).catch((e) => { if (active.current) { setError(errorMessage(e)); setListLoading(false); } });
  }, [unlocked, load]);
  async function action(run: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    vaultCache.removeQueries({ queryKey: ["vault-list"] });
    setError(undefined);
    try {
      await run();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      setListLoading(false);
    }
  }
  const configure = !status?.configured || mode === "change";
  async function submit(submittedSecret = secret) {
    await action(async () => {
      if (configure && step === "enter") {
        if (
          (kind === "pin" && !/^\d{6}$/.test(submittedSecret)) ||
          (kind === "pattern" && submittedSecret.length < 4)
        )
          throw new Error(
            tr("Use a six-digit PIN or at least four pattern points."),
          );
        setConfirm(submittedSecret);
        setSecret("");
        setStep("confirm");
        return;
      }
      if (configure && submittedSecret !== confirm)
        throw new Error(tr("The locks do not match. Try again."));
      if (configure) {
        const client = mode === "change" ? vaultApi : api;
        await client.request("/hidden-notes/configure", {
          method: "POST",
          body: { kind, secret: submittedSecret },
        });
        configuredKind.current = kind;
        if (status) {
          const updated = { ...status, configured: true, kind };
          saveVaultStatus(updated);
          setStatus(updated);
        }
        if (mode === "change") {
          lock();
          return;
        }
      }
      const result = await api.request<{ token: string }>(
        "/hidden-notes/unlock",
        { method: "POST", body: { kind, secret: submittedSecret } },
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
        onReset={(kind) => {
          lock();
          if (status) saveVaultStatus({ ...status, kind });
          navigate("/hidden-notes", {
            replace: true,
            state: { vaultReset: true },
          });
        }}
      />
    );
  return (
    <section
      className={`vault-page${!unlocked || mode === "change" ? " vault-locked" : ""}`}
    >
      {(!unlocked || mode === "change") && kind !== "pattern" ? <LockKeyhole className="vault-lock-watermark" aria-hidden="true" strokeWidth={1} /> : unlocked && mode === "unlock" ? <h1 className="sr-only">{tr("Hidden notes")}</h1> : null}
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
          <h1 className="sr-only">Hidden Notes</h1>
          <span className="sr-only">
            {tr(
              configure
                ? step === "confirm"
                  ? "Repeat your new lock"
                  : "Choose your new lock"
                : "Unlock hidden notes",
            )}
          </span>
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
              <div className="vault-pattern-stage">
                <LockKeyhole className="vault-lock-watermark vault-pattern-watermark" aria-hidden="true" strokeWidth={1} />
                <PatternLock value={secret} onChange={setSecret} disabled={busy} onComplete={!configure && status.emailVerified ? (value) => { if (value.length >= 4) void submit(value); } : undefined} />
              </div>
            </>
          )}
          {configure || kind === "pin" ? <Button type="submit" busy={busy} disabled={!status.emailVerified || (!configure && kind === "pin" && secret.length !== 6)}>
            {tr(
              configure
                ? step === "enter"
                  ? "Continue"
                  : "Confirm lock"
                : "Unlock",
            )}
          </Button> : null}
          {status.configured && mode === "unlock" ? (
            <Link className="button secondary vault-recovery-link" to="/hidden-notes/recover">
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
          {listLoading ? <Spinner /> : !items.length ? (
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
