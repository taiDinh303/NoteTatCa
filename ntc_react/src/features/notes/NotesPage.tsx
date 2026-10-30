import { t as tr, useLanguage } from "../../shared/i18n";
import {
  lazy,
  Suspense,
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
  useSortable,
} from "@dnd-kit/sortable";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  LayoutGrid,
  List,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Note, NoteFilter } from "../../domain/models";
import { sortNotes } from "../../domain/models";
import { notePalette } from "../../domain/color";
import { CardLabels } from "./CardLabels";
import {
  animateNoteDrop,
  cancelNoteDrop,
  captureNoteLayout,
  animateNoteLayout,
} from "./noteMotion";
import "./NoteMotion.css";
import { NotesZoomViewport } from "./NotesZoomViewport";
import { NoteMascot } from "../mascot/NoteMascot";
import "../mascot/NoteMascot.css";
import { workspace } from "../../app/runtime";
import { useAuth, useDebounced, useLabels, useNotes } from "../../shared/hooks";
import {
  ActionMenu,
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
import { loadNoteEditor, warmNoteEditor } from "../editor/loadNoteEditor";
const NoteEditor = lazy(loadNoteEditor);
import type { NoteOpenAction } from "../editor/NoteEditor";
type NoteGroup = "pinned" | "normal";
const collapsedGroupsKey = "ntc.note-groups.v1";
function readCollapsedGroups(): Record<NoteGroup, boolean> {
  try {
    const value = JSON.parse(localStorage.getItem(collapsedGroupsKey) ?? "null");
    return { pinned: value?.pinned === true, normal: value?.normal === true };
  } catch { return { pinned: false, normal: false }; }
}
function NoteCard({
  note,
  onOpen,
  trash,
  busy,
  onAction,
  onMove,
  draggable,
  onOrganize,
  hasMascot = false,
}: {
  note: Note;
  onOpen: () => void;
  trash: boolean;
  busy: boolean;
  onAction: (action: "pin" | "trash" | "restore" | "delete") => void;
  onMove: (direction: number) => void;
  draggable: boolean;
  onOrganize: (action: NoteOpenAction) => void;
  hasMascot?: boolean;
}) {
  useLanguage();
  const guestMode = useAuth().status === "guest";
  const {
    setNodeRef,
    transform,
    transition,
    isSorting,
    isDragging,
    attributes,
    listeners,
  } = useSortable({
    id: note.id,
    disabled: !draggable,
    // The release is animated once, from the actual painted positions below.
    animateLayoutChanges: () => false,
    transition: { duration: 220, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  });
  // The title/preview buttons are also drag surfaces. Keep action controls
  // independent, and leave keyboard activation on the accessible handle.
  const canStartDrag = (target: EventTarget) =>
    target instanceof Element &&
    (!target.closest("button, a, input, [role='menuitem']") ||
      !!target.closest(".note-open, .note-card-identity, .drag-handle"));
  const [now] = useState(() => Date.now());
  const expiry = note.deletedTime
    ? Math.max(
        0,
        Math.ceil(
          (Date.parse(note.deletedTime) + 30 * 86400000 - now) / 86400000,
        ),
      )
    : null;
  const title = note.title?.trim() || tr("Untitled");
  return (
    <article
      ref={setNodeRef}
      style={{
        ...notePalette(note.backgroundColor),
        // Dnd-kit measures screen pixels; CSS transforms use pixels before the
        // notes layer's scale. Translate only, so unequal cards keep their shape.
        transform: transform
          ? `translate3d(calc(${transform.x}px / var(--notes-scale, 1)), calc(${transform.y}px / var(--notes-scale, 1)), 0)`
          : undefined,
        transition: !isDragging && isSorting ? transition : "none",
        backgroundColor: note.backgroundColor || undefined,
        opacity: isDragging ? 0.95 : 1,
      }}
      className={`note-card ${draggable ? "draggable" : ""} ${isDragging ? "dragging" : ""} ${note.backgroundColor ? "colored" : ""}`}
      data-testid={`note-${note.id}`}
      onPointerEnter={warmNoteEditor}
      onFocus={warmNoteEditor}
      data-sort-animating={
        transition && !transition.startsWith("transform 0ms")
          ? "true"
          : undefined
      }
      onMouseDown={(event) => {
        if (canStartDrag(event.target)) listeners?.onMouseDown?.(event);
      }}
      onTouchStart={(event) => {
        warmNoteEditor();
        if (canStartDrag(event.target)) listeners?.onTouchStart?.(event);
      }}
    >
      <div className="note-card-top">
        {note.iconEmoji || note.title?.trim() ? (
          <button
            type="button"
            className="note-card-identity"
            onClick={onOpen}
            aria-label={tr("View {0}", title)}
          >
            {note.iconEmoji ? (
              <span className="note-emoji">{note.iconEmoji}</span>
            ) : null}
            {note.title?.trim() ? (
              <h3 title={note.title}>{note.title}</h3>
            ) : null}
          </button>
        ) : null}
        <div className="row-actions">
          {draggable ? (
            <button
              type="button"
              className="sr-only drag-handle"
              aria-label={tr("Move {0}", title)}
              title={tr("Drag to move. Keyboard: Space, arrow keys, Space.")}
              {...attributes}
              onKeyDown={(event) => listeners?.onKeyDown?.(event)}
            >
              {tr("Move {0}", title)}
            </button>
          ) : null}
          {!trash ? (
            <IconButton
              icon={note.isPinned ? PinOff : Pin}
              label={
                note.isPinned ? tr("Unpin {0}", title) : tr("Pin {0}", title)
              }
              active={note.isPinned}
              disabled={busy}
              onClick={() => onAction("pin")}
            />
          ) : null}
        </div>
      </div>
      <button
        type="button"
        className="note-open"
        onClick={onOpen}
        aria-label={tr("Open {0}", title)}
      >
        {note.content ? (
          <p
            className={`note-preview ${note.documentJson?.includes("taskList") ? "checklist-preview" : ""}`}
          >
            {note.content.slice(0, 600)}
          </p>
        ) : (
          <p className="note-preview empty-preview">
            {tr("A blank page, full of possibilities.")}
          </p>
        )}
      </button>
      <div className="note-card-footer">
        {note.tags.length ? <CardLabels labels={note.tags} /> : null}
        {trash ? (
          <span className="note-date">
            {expiry
              ? tr(expiry === 1 ? "{0} day left" : "{0} days left", expiry)
              : tr("Retention elapsed")}
          </span>
        ) : null}
        <div className="row-actions">
          {!trash && note.reminders.some((r) => r.isActive) ? (
            <span
              className="reminder-indicator"
              title={tr("Has active reminders")}
            >
              <Bell size={13} />
            </span>
          ) : null}
          {trash ? (
            <>
              <IconButton
                icon={RotateCcw}
                label={tr("Restore {0}", title)}
                disabled={busy || expiry === 0}
                onClick={() => onAction("restore")}
              />
              <IconButton
                icon={Trash2}
                label={tr("Delete {0} permanently", title)}
                disabled={busy}
                onClick={() => onAction("delete")}
              />
            </>
          ) : (
            <ActionMenu
              label={tr("Actions for {0}", title)}
              items={[
                {
                  label: tr("Add label"),
                  icon: Tag,
                  action: () => onOrganize("labels"),
                  disabled: busy,
                },
                {
                  label: tr("Add reminder"),
                  icon: Bell,
                  action: () => onOrganize("reminder"),
                  disabled: busy || guestMode,
                },
                {
                  label: tr("Move earlier"),
                  icon: ArrowUp,
                  action: () => onMove(-1),
                  disabled: !draggable || busy,
                },
                {
                  label: tr("Move later"),
                  icon: ArrowDown,
                  action: () => onMove(1),
                  disabled: !draggable || busy,
                },
                {
                  label: tr("Move to trash"),
                  icon: Trash2,
                  danger: true,
                  separator: true,
                  action: () => onAction("trash"),
                  disabled: busy,
                },
              ]}
            />
          )}
        </div>
      </div>
      {/* The bunny sits on one card at a time and follows the last opened note. */}
      {hasMascot ? <NoteMascot size={80} /> : null}
    </article>
  );
}
export default function NotesPage({
  trash = false,
  reminderView = false,
}: {
  trash?: boolean;
  reminderView?: boolean;
}) {
  useLanguage();
  const { tagId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = useDebounced(params.get("q") ?? "");
  const [pinFilter, setPinFilter] = useState("all");
  const [collapsedGroups, setCollapsedGroups] = useState(readCollapsedGroups);
  function toggleGroup(key: NoteGroup) {
    const next = { ...collapsedGroups, [key]: !collapsedGroups[key] };
    setCollapsedGroups(next);
    try { localStorage.setItem(collapsedGroupsKey, JSON.stringify(next)); }
    catch { /* Collapsing still works when preference storage is unavailable. */ }
  }
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
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem("ntc.view.v1") === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });
  const [confirm, setConfirm] = useState<{
    note: Note;
    action: "delete";
  }>();
  const [pending, setPending] = useState<string>();
  const order = useSyncExternalStore(
    workspace.order.subscribe,
    workspace.order.getSnapshot,
  );
  const stored = sortNotes(query.data?.pages.flatMap((p) => p.items) ?? []);
  const all = [true, false].flatMap((pinned) => {
    const group = stored.filter((note) => note.isPinned === pinned);
    const desired = order.groups.get(pinned);
    if (!desired) return group;
    const ranks = new Map(desired.ids.map((id, index) => [id, index]));
    return group.sort(
      (a, b) => (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity),
    );
  });
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
  const visibleNotes = trash ? all : all.filter(note => !collapsedGroups[note.isPinned ? "pinned" : "normal"]);
  const groupSortingStrategy: SortingStrategy = (args) => {
    if (
      visibleNotes[args.activeIndex]?.isPinned !== visibleNotes[args.overIndex]?.isPinned ||
      visibleNotes[args.index]?.isPinned !== visibleNotes[args.activeIndex]?.isPinned
    )
      return null;
    return rectSortingStrategy(args);
  };
  const renderGroup = (group: Note[], title: string, key?: NoteGroup) =>
    group.length ? (
      <section className="notes-section" data-note-group={key}>
        <div className="section-heading">
          <h2>
            {title}
            <span>{group.length}</span>
          </h2>
          {key ? <IconButton
            className="note-group-toggle"
            icon={collapsedGroups[key] ? ChevronRight : ChevronDown}
            label={tr(collapsedGroups[key] ? "Expand {0}" : "Collapse {0}", title)}
            aria-expanded={!collapsedGroups[key]}
            aria-controls={`note-group-${key}`}
            onClick={() => toggleGroup(key)}
          /> : null}
        </div>

        <div id={key ? `note-group-${key}` : undefined} className="note-group-content" hidden={key ? collapsedGroups[key] : false}>
        <div className={`note-grid ${view === "list" ? "list-view" : ""}`}>
          {(!key || !collapsedGroups[key]) && group.map((note, index) => {
            const isTargetCard =
              !trash &&
              (lastOpenedNoteId === note.id ||
                (lastOpenedNoteId === null && randomMascotTarget === note.id));
            return (
              <NoteCard
                key={note.id}
                note={note}
                busy={pending === note.id}
                trash={trash}
                draggable={canDrag}
                hasMascot={!!isTargetCard && !editor && !selected}
                onOrganize={(action) => setEditor({ id: note.id, action })}
                onOpen={() => {
                  if (trash) {
                    navigate(`/trash?note=${note.id}`);
                    setEditor({ id: note.id });
                  } else {
                    setEditor({ id: note.id });
                  }
                }}
                onAction={(action) => void act(note, action)}
                onMove={(direction) =>
                  void reorder(group, index, index + direction)
                }
              />
            );
          })}
        </div>
        </div>
      </section>
    ) : null;
  return (
    <>
      <h1
        className={
          !trash && !tagId && reminderView ? "notes-context-title" : "sr-only"
        }
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
      {[...order.groups.values()].some((group) => group.error) ? (
        <div className="notice-strip" role="alert">
          <span>{tr("Note order is not saved.")}</span>
          <Button variant="ghost" onClick={workspace.order.retry}>
            {tr("Try again")}
          </Button>
        </div>
      ) : null}
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
          </div>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => cancelNoteDrop(active.id)}
            onDragCancel={({ active }) => animateNoteDrop(active.id)}
            onDragEnd={dragEnd}
          >
            <SortableContext
              items={visibleNotes.map((n) => n.id)}
              strategy={groupSortingStrategy}
            >
              {trash ? (
                renderGroup(all, tr("Deleted notes"))
              ) : (
                <>
                  {renderGroup(
                    all.filter((n) => n.isPinned),
                    tr("Pinned"),
                    "pinned",
                  )}
                  {renderGroup(
                    all.filter((n) => !n.isPinned),
                    all.some((n) => n.isPinned)
                      ? tr("Everything else")
                      : tr("All notes"),
                    "normal",
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
    </>
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
