import { t as tr, useLanguage } from "../../shared/i18n";
import { lazy, Suspense, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  Clock3,
  Mail,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cache, reminders, workspace } from "../../app/runtime";
import type { Reminder, ReminderInput } from "../../domain/models";
import { REPEAT_NAMES } from "../../domain/models";
import { notePalette } from "../../domain/color";
import { useAuth, useMe } from "../../shared/hooks";
import {
  ActionMenu,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  ErrorPanel,
  Modal,
  Spinner,
} from "../../shared/ui";
import { dateTime, errorMessage } from "../../shared/utils";
import { ReminderForm } from "./ReminderDialog";
import { commitReminder, pendingReminder } from "./reminderCache";
const NoteEditor = lazy(() => import("../editor/NoteEditor"));
export default function RemindersPage() {
  useLanguage();
  const state = useAuth();
  const me = useMe();
  const query = useInfiniteQuery({
    queryKey: workspace.key("reminders"),
    queryFn: ({ pageParam, signal }) => reminders.list(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.currentPage + 1 : undefined,
    enabled: state.status === "authenticated",
    refetchOnMount: "always",
  });
  const [editing, setEditing] = useState<Reminder>();
  const [openedNote, setOpenedNote] = useState<string>();
  const [pending, setPending] = useState<Reminder>();
  const [toggling, setToggling] = useState<Reminder>();
  const [draft, setDraft] = useState<ReminderInput>();
  const [saveError, setSaveError] = useState<unknown>();
  const saveOwner = useRef("");
  const [deleting, setDeleting] = useState<Reminder>();
  const [busy, setBusy] = useState<string>();
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  async function refresh() {
    await Promise.all([
      query.refetch(),
      cache.invalidateQueries({ queryKey: workspace.key("notes") }),
      cache.invalidateQueries({ queryKey: workspace.key("note-reminders") }),
    ]);
  }
  async function toggle(reminder: Reminder) {
    if (busy) return;
    const owner = String(workspace.key("reminders")[1]);
    setBusy(reminder.id);
    setToggling({ ...reminder, isActive: !reminder.isActive });
    try {
      const saved = await reminders.patch(reminder, {
        isActive: !reminder.isActive,
      });
      commitReminder(saved, owner);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setToggling(undefined);
      setBusy(undefined);
    }
  }
  return (
    <>
      <h1 className="sr-only">{tr("Reminders")}</h1>
      <div className="feature-banner">
        <div className="feature-icon">
          <CalendarDays size={27} />
        </div>
        <div>
          <strong>{tr("Let your notes find you.")}</strong>
          <p>
            {tr(
              "Open a note and tap the bell. Choose a time and repeat schedule; your device timezone is used automatically.",
            )}
          </p>
        </div>
        <Link className="button secondary" to="/notes">
          {tr("Go to notes")}
        </Link>
      </div>
      {query.isPending ? (
        <Spinner label={tr("Finding your reminders…")} />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : !items.length ? (
        <EmptyState
          icon={Bell}
          title={tr("Nothing to remember just yet")}
          description={tr(
            "Add a reminder to a note, and it will find its way here.",
          )}
        />
      ) : (
        <div className="reminders-board">
          {items.map((item) => {
            const reminder =
              toggling?.id === item.id
                ? toggling
                : pending?.id === item.id
                  ? pending
                  : item;
            const saving = pending?.id === item.id;
            return (
              <article
                className={`reminder-card ${!reminder.isActive ? "paused" : ""} ${reminder.noteColor ? "colored" : ""}`}
                key={reminder.id}
                style={
                  reminder.noteColor
                    ? {
                        ...notePalette(reminder.noteColor),
                        backgroundColor: reminder.noteColor,
                      }
                    : undefined
                }
              >
                <div className="reminder-card-icon">
                  <Bell size={20} />
                </div>
                <div className="reminder-card-content">
                  <h2>
                    <button
                      className="reminder-card-open"
                      onClick={() => setOpenedNote(reminder.noteId)}
                    >
                      {reminder.noteTitle || tr("Untitled")}
                    </button>
                  </h2>
                  {reminder.notePreview?.trim() ? (
                    <p className="reminder-note-preview">
                      {reminder.notePreview.trim()}
                    </p>
                  ) : null}
                  <p>
                    <Clock3 size={14} />
                    {dateTime(
                      reminder.nextOccurrenceAt ?? reminder.reminderAt,
                      reminder.timeZoneId,
                    )}
                  </p>
                  <div className="reminder-meta">
                    <span>
                      {tr(REPEAT_NAMES[reminder.repeatType])}
                      {reminder.repeatInterval > 1
                        ? tr("· every {0}", reminder.repeatInterval)
                        : ""}
                    </span>
                    <span>{reminder.timeZoneId}</span>
                    {reminder.sendEmail ? (
                      <span>
                        <Mail size={11} />
                        {tr("Email")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span
                  className={`status-pill ${reminder.isActive ? "success" : ""}`}
                >
                  {saving
                    ? tr("Saving in background…")
                    : reminder.isActive
                      ? tr("Active")
                      : tr("Paused")}
                </span>
                <div className="reminder-card-actions">
                  <ActionMenu
                    label={tr("Reminder actions")}
                    items={[
                      {
                        label: tr("Edit reminder"),
                        icon: Pencil,
                        action: () => {
                          setDraft(undefined);
                          setSaveError(undefined);
                          setEditing(reminder);
                        },
                        disabled: busy === reminder.id || saving,
                      },
                      {
                        label: reminder.isActive
                          ? tr("Pause reminder")
                          : tr("Enable reminder"),
                        icon: reminder.isActive ? Pause : Play,
                        action: () => void toggle(reminder),
                        disabled: busy === reminder.id || saving,
                      },
                      {
                        label: tr("Delete reminder"),
                        icon: Trash2,
                        danger: true,
                        separator: true,
                        action: () => setDeleting(reminder),
                        disabled: busy === reminder.id || saving,
                      },
                    ]}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
      {query.hasNextPage ? (
        <Button
          variant="secondary"
          busy={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {tr("Load more reminders")}
        </Button>
      ) : null}
      {openedNote ? (
        <Suspense fallback={<Spinner label={tr("Opening editor…")} />}>
          <NoteEditor
            noteId={openedNote}
            onClose={() => setOpenedNote(undefined)}
          />
        </Suspense>
      ) : null}
      {editing ? (
        <Modal
          open
          onClose={() => {
            setDraft(undefined);
            setSaveError(undefined);
            setEditing(undefined);
          }}
          title={tr("Edit reminder")}
        >
          <div className="modal-body">
            <ErrorBanner error={saveError} />
            <ReminderForm
              noteId={editing.noteId}
              initial={editing}
              draft={draft}
              zone={
                me.data?.account.timeZoneId ??
                state.session?.timeZoneId ??
                "Asia/Ho_Chi_Minh"
              }
              onStarted={(body) => {
                setSaveError(undefined);
                saveOwner.current = String(workspace.key("reminders")[1]);
                setPending(
                  pendingReminder(
                    editing.noteId,
                    editing.noteTitle,
                    body,
                    editing,
                  ),
                );
                setEditing(undefined);
              }}
              onDone={(saved) => {
                commitReminder(saved, saveOwner.current);
                setPending(undefined);
                setDraft(undefined);
              }}
              onFailed={(failure, body) => {
                setPending(undefined);
                setDraft(body);
                setSaveError(failure);
                setEditing(editing);
                toast.error(errorMessage(failure));
              }}
              onCancel={() => {
                setDraft(undefined);
                setSaveError(undefined);
                setEditing(undefined);
              }}
            />
          </div>
        </Modal>
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title={tr("Delete reminder?")}
          description={tr(
            "Future reminders will stop. Your note will be kept.",
          )}
          confirmLabel={tr("Delete reminder")}
          danger
          onClose={() => setDeleting(undefined)}
          onConfirm={async () => {
            await reminders.delete(deleting.id);
            await refresh();
          }}
        />
      ) : null}
    </>
  );
}
