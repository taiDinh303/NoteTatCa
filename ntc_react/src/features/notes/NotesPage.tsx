
import { t as tr, useLanguage } from "../../shared/i18n";
import {
  Suspense,
  useMemo,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  type SortingStrategy,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  FileText,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Note, NoteFilter } from "../../domain/models";
import { sortNotes } from "../../domain/models";
import {
  animateNoteDrop,
  cancelNoteDrop,
  captureNoteLayout,
  animateNoteLayout,
} from "./noteMotion";
import "./NoteMotion.css";
import { HiddenNotesPull } from "../hidden/HiddenNotesPull";
import { NotesZoomViewport } from "./NotesZoomViewport";
import { useListMascotPerch } from "../mascot/useListMascotPerch";
import "../mascot/NoteMascot.css";
import { workspace } from "../../app/runtime";
import { useAuth, useDebounced, useLabels, useNotes } from "../../shared/hooks";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorPanel,
  IconButton,
  Select,
  SkeletonCards,
  Spinner,
} from "../../shared/ui";
import { errorMessage } from "../../shared/utils";
import { warmNoteEditor } from "../editor/loadNoteEditor";
import NoteEditor from "../editor/NoteEditorLoader";
import { NoteSurfaceHost } from "../editor/NoteSurfaceHost";
import type { NoteOpenAction } from "../editor/NoteEditor";
import { NoteCard } from "./NoteCard";
export default function NotesPage({
  trash = false,
  reminderView = false,
}: {
  trash?: boolean;
  reminderView?: boolean;
}) {
  useLanguage();
  const authState = useAuth();
  const { tagId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = useDebounced(params.get("q") ?? "");

  const [pinFilter, setPinFilter] = useState("all");
  const filter: NoteFilter = {
    ...(q ? { q } : {}),
    ...(tagId ? { tagId } : {}),
    ...(trash ? { trash: true } : {}),
    ...(reminderView ? { hasReminder: true } : {}),
    ...(pinFilter === "pinned"
      ? { pinned: true }
      : pinFilter === "unpinned"
        ? { pinned: false }
        : {}),
  };
  const query = useNotes(filter);
  const labels = useLabels();
  const [editor, setEditor] = useState<{
    id?: string;
    action?: NoteOpenAction;
  } | null>(null);
  const [lastOpenedNoteId, setLastOpenedNoteId] = useState<string | null>(null);
  const selected = params.get("note");
  const [savedView, setView] = useState(() => {
    try {
      return localStorage.getItem("ntc.view.v1") === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });
  const view = savedView;
  const [confirm, setConfirm] = useState<{
    note: Note;
    action: "delete";
  }>();
  const [pending, setPending] = useState<string>();
  const order = useSyncExternalStore(
    workspace.order.subscribe,
    workspace.order.getSnapshot,
  );
  const orderNotSaved = [...order.groups.values()].some((group) => group.error);
  useEffect(() => {
    if (!orderNotSaved) return;
    const id = toast.error(tr("Note order is not saved."), {
      id: "note-order-not-saved",
      duration: Infinity,
      action: { label: tr("Try again"), onClick: workspace.order.retry },
    });
    return () => { toast.dismiss(id); };
  }, [orderNotSaved]);
  const all = useMemo(() => {
    const stored = sortNotes(query.data?.pages.flatMap((p) => p.items) ?? []);
    return [true, false].flatMap((pinned) => {
      const group = stored.filter((note) => note.isPinned === pinned);
      const desired = order.groups.get(pinned);
      if (!desired) return group;
      const ranks = new Map(desired.ids.map((id, index) => [id, index]));
      return group.sort(
        (a, b) => (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity),
      );
    });
  }, [query.data, order]);
  const sortableIds = useMemo(() => all.map(note => note.id), [all]);
  const openNote = useCallback((id: string) => {
    if (trash) navigate(`/trash?note=${id}`);
    setEditor({ id });
  }, [navigate, trash]);
  const organizeNote = useCallback((id: string, action: NoteOpenAction) => setEditor({ id, action }), []);
  const motionLayout = useRef<ReturnType<typeof captureNoteLayout> | null>(
    null,
  );
  const layoutKey = all.map((note) => `${note.id}:${note.isPinned}`).join();
  useLayoutEffect(() => {
    if (motionLayout.current) {
      animateNoteLayout(motionLayout.current);
      motionLayout.current = null;
    }
  }, [layoutKey]);
  const label = labels.data?.pages
    .flatMap((p) => p.items)
    .find((l) => l.id === tagId);
  // Pick a random card once when the list first loads and no note has been
  // opened yet this session. The initializer picks a stable index so the
  // bunny stays on the same card across re-renders.
  const [randomMascotNoteId, setRandomMascotNoteId] = useState<string | null>(
    null,
  );
  useEffect(() => {
    if (randomMascotNoteId || !all.length) return;
    const id = all[Math.floor(Math.random() * all.length)].id;
    const timer = window.setTimeout(() => setRandomMascotNoteId(id), 0);
    return () => window.clearTimeout(timer);
  }, [all, randomMascotNoteId]);
  const randomMascotTarget =
    lastOpenedNoteId === null ? randomMascotNoteId : null;
  const mascotPerch = useListMascotPerch(lastOpenedNoteId ?? randomMascotTarget, layoutKey, view);
  const canDrag = !trash && !q && !tagId && !reminderView && !query.hasNextPage;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const act = useCallback(
    async (note: Note, action: "pin" | "trash" | "restore" | "delete") => {
      if (action === "delete") {
        setConfirm({ note, action });
        return;
      }
      if (action !== "pin") setPending(note.id);
      try {
        if (action === "pin") {
          motionLayout.current = captureNoteLayout();
          await workspace.pin(note);
        } else if (action === "trash") await workspace.trash(note);
        else await workspace.restore(note);
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        if (action !== "pin") setPending(undefined);
      }
    },
    [],
  );
  function reorder(group: Note[], from: number, to: number) {
    if (from === to || to < 0 || to >= group.length) return;
    workspace.reorder(group, from, to);
  }
  function dragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) {
      animateNoteDrop(event.active.id);
      return;
    }
    const note = all.find((n) => n.id === event.active.id),
      over = all.find((n) => n.id === event.over!.id);
    if (!note || !over || note.isPinned !== over.isPinned) {
      animateNoteDrop(event.active.id);
      toast.info(tr("Move notes within the same pinned group."));
      return;
    }
    const group = all.filter((n) => n.isPinned === note.isPinned);
    motionLayout.current = captureNoteLayout();
    void reorder(
      group,
      group.findIndex((n) => n.id === note.id),
      group.findIndex((n) => n.id === over.id),
    );
  }
  const activeNoteId = editor?.id ?? selected;
  useEffect(() => {
    if (!activeNoteId || trash) return;
    const timer = window.setTimeout(
      () => setLastOpenedNoteId(activeNoteId),
      500,
    );
    return () => window.clearTimeout(timer);
  }, [activeNoteId, trash]);
  function closeEditor() {
    setEditor(null);
    if (params.has("note")) {
      const next = new URLSearchParams(params);
      next.delete("note");
      setParams(next, { replace: true });
    }
  }
  const groupSortingStrategy = useCallback<SortingStrategy>((args) => {
    if (
      all[args.activeIndex]?.isPinned !== all[args.overIndex]?.isPinned ||
      all[args.index]?.isPinned !== all[args.activeIndex]?.isPinned
    )
      return null;
    return rectSortingStrategy(args);
  }, [all]);
  const renderGroup = (group: Note[], title: string) =>
    group.length ? (
      <section className="notes-section">
        <div className="section-heading">
          <h2>
            {title}
            <span>{group.length}</span>
          </h2>
        </div>

        <div className={`note-grid ${view === "list" ? "list-view" : ""}`}>
          {group.map((note) => {
            const isTargetCard =
              !trash &&
              mascotPerch === note.id;
            return (
              <NoteCard
                key={note.id}
                note={note}
                busy={pending === note.id}
                trash={trash}
                draggable={canDrag}
                hasMascot={!!isTargetCard && !editor && !selected}
                onOrganize={organizeNote}
                onOpen={openNote}
                onAction={act}
              />
            );
          })}
        </div>
      </section>
    ) : null;
  return (
    <NoteSurfaceHost session={`${editor?.id ?? selected ?? "new"}:${editor?.action ?? "view"}`} open={!trash && !!(editor || selected) && !editor?.action} onClose={closeEditor}>
      <h1
        className="sr-only"
      >
        {trash
          ? tr("Trash")
          : tagId
            ? (label?.name ?? tr("Label"))
            : reminderView
              ? tr("Notes with reminders")
              : q
                ? tr("Search results")
                : tr("Notes")}
      </h1>
      <div className={`workspace-toolbar${trash ? " trash-toolbar" : ""}`}>
        {trash ? (
          <div className="notice-strip trash-retention">
            <Trash2 size={16} />
            <span>
              {tr(
                "Deleted notes are permanently removed after the 30-day retention period.",
              )}
            </span>
          </div>
        ) : null}
        {!trash ? (
          <button
            className="quick-capture"
            aria-label={tr("Take a note")}
            onPointerEnter={warmNoteEditor}
            onFocus={warmNoteEditor}
            onTouchStart={warmNoteEditor}
            onClick={() => setEditor({})}
          >
            <span className="quick-capture-icon">
              <Plus size={14} />
            </span>
            <span>{tr("New")}</span>
          </button>
        ) : null}
        <div className="row-actions">
          {!trash ? (
            <Select
              label={tr("Filter pinned notes")}
              value={pinFilter}
              onChange={setPinFilter}
            >
              <option value="all">{tr("All notes")}</option>
              <option value="pinned">{tr("Pinned only")}</option>
              <option value="unpinned">{tr("Unpinned only")}</option>
            </Select>
          ) : null}
          {<div
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
                    tr(name === "grid" ? "Grid" : "List").toLocaleLowerCase(),
                  )}
                  active={view === name}
                  onClick={() => {
                    setView(String(name));
                    try {
                      localStorage.setItem("ntc.view.v1", String(name));
                    } catch {
                      /* Preference persistence is optional. */
                    }
                  }}
                />
              );
            })}
          </div>}
        </div>
      </div>
      {query.isPending ? (
        <SkeletonCards />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : all.length === 0 ? (
        <EmptyState
          icon={trash ? Trash2 : q ? Search : FileText}
          title={
            trash
              ? tr("A clean slate")
              : q
                ? tr("No notes found")
                : tr("Your next idea starts here")
          }
          description={
            trash
              ? tr(
                  "Nothing in the trash. Your notes are right where they belong.",
                )
              : q
                ? tr("Try another phrase or remove a filter.")
                : tr(
                    "A thought, a list, a plan. Give it a home in your first note.",
                  )
          }
        />
      ) : (
        <NotesZoomViewport mode={view}>
          <HiddenNotesPull enabled={!trash && !editor && !selected && authState.status === "authenticated"} />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => cancelNoteDrop(active.id)}
            onDragCancel={({ active }) => animateNoteDrop(active.id)}
            onDragEnd={dragEnd}
          >
            <SortableContext
              items={sortableIds}
              strategy={groupSortingStrategy}
            >
              {trash ? (
                renderGroup(all, tr("Deleted notes"))
              ) : (
                <>
                  {renderGroup(
                    all.filter((n) => n.isPinned),
                    tr("Pinned"),
                  )}
                  {renderGroup(
                    all.filter((n) => !n.isPinned),
                    all.some((n) => n.isPinned)
                      ? tr("Everything else")
                      : tr("All notes"),
                  )}
                </>
              )}
            </SortableContext>
          </DndContext>
        </NotesZoomViewport>
      )}
      {query.hasNextPage ? (
        <div className="load-more">
          <Button
            variant="secondary"
            busy={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {tr("Load more notes")}
          </Button>
          <span className="field-hint">
            {tr("Load all notes to enable reordering.")}
          </span>
        </div>
      ) : null}
      {editor || selected ? (
        <Suspense fallback={<Spinner label={tr("Opening editor…")} />}>
          {trash ? (
            <TrashViewer id={editor?.id ?? selected!} onClose={closeEditor} />
          ) : (
            <NoteEditor
              key={`${editor?.id ?? selected ?? "new"}:${editor?.action ?? "view"}`}
              initialAction={editor?.action}
              noteId={editor?.id ?? selected ?? undefined}
              onClose={closeEditor}
            />
          )}
        </Suspense>
      ) : null}
      {confirm ? (
        <ConfirmDialog
          title={tr("Permanently delete note?")}
          description={tr(
            "This removes the note and its related reminders permanently. This cannot be undone.",
          )}
          confirmLabel={tr("Delete permanently")}
          danger
          onClose={() => setConfirm(undefined)}
          onConfirm={async () => {
            setPending(confirm.note.id);
            try {
              await workspace.delete(confirm.note);
            } finally {
              setPending(undefined);
            }
          }}
        />
      ) : null}
    </NoteSurfaceHost>
  );
}
import { useQuery } from "@tanstack/react-query";
import { notes } from "../../app/runtime";
import { Modal } from "../../shared/ui";
function TrashViewer({ id, onClose }: { id: string; onClose: () => void }) {
  useLanguage();
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<unknown>();
  const query = useQuery({
    queryKey: workspace.key("trash-note", id),
    queryFn: ({ signal }) => notes.findTrashed(id, signal),
  });
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={query.data?.title || tr("Untitled")}
      description={tr(
        "This note is in the trash. Restore it to continue editing.",
      )}
    >
      <div className="modal-body">
        {restoreError ? <ErrorPanel error={restoreError} /> : null}
        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorPanel error={query.error} retry={() => void query.refetch()} />
        ) : (
          <>
            <pre className="trash-content">{query.data.content}</pre>
            <Button
              busy={restoring}
              onClick={async () => {
                setRestoring(true);
                try {
                  await workspace.restore(query.data);
                  onClose();
                } catch (error) {
                  setRestoreError(error);
                } finally {
                  setRestoring(false);
                }
              }}
            >
              <RotateCcw size={16} />
              {tr("Restore note")}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
