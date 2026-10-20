import { useState } from "react";
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
import type { Reminder } from "../../domain/models";
import { REPEAT_NAMES } from "../../domain/models";
import { useAuth, useMe } from "../../shared/hooks";
import {
  ActionMenu,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorPanel,
  Modal,
  Spinner,
} from "../../shared/ui";
import { dateTime, errorMessage } from "../../shared/utils";
import { ReminderForm } from "./ReminderDialog";
export default function RemindersPage() {
  const state = useAuth();
  const me = useMe();
  const query = useInfiniteQuery({
    queryKey: workspace.key("reminders"),
    queryFn: ({ pageParam, signal }) => reminders.list(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.currentPage + 1 : undefined,
    enabled: state.status === "authenticated",
  });
  const [editing, setEditing] = useState<Reminder>();
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
    setBusy(reminder.id);
    try {
      await reminders.patch(reminder, { isActive: !reminder.isActive });
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <>
      <h1 className="sr-only">Reminders</h1>
      <div className="feature-banner">
        <div className="feature-icon">
          <CalendarDays size={27} />
        </div>
        <div>
          <strong>Let your notes find you.</strong>
          <p>
            Open any note and tap the bell to set a reminder. Recurring
            reminders follow your chosen timezone.
          </p>
        </div>
        <Link className="button secondary" to="/notes">
          Go to notes
        </Link>
      </div>
      {query.isPending ? (
        <Spinner label="Finding your reminders…" />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : !items.length ? (
        <EmptyState
          icon={Bell}
          title="Nothing to remember just yet"
          description="Add a reminder to a note, and it will find its way here."
        />
      ) : (
        <div className="reminders-board">
          {items.map((reminder) => (
            <article
              className={`reminder-card ${!reminder.isActive ? "paused" : ""}`}
              key={reminder.id}
            >
              <div className="reminder-card-icon">
                <Bell size={20} />
              </div>
              <div className="reminder-card-content">
                <Link to={`/notes?note=${reminder.noteId}`}>
                  <h2>{reminder.noteTitle || "Untitled"}</h2>
                </Link>
                <p>
                  <Clock3 size={14} />
                  {dateTime(
                    reminder.nextOccurrenceAt ?? reminder.reminderAt,
                    reminder.timeZoneId,
                  )}
                </p>
                <div className="reminder-meta">
                  <span>
                    {REPEAT_NAMES[reminder.repeatType]}
                    {reminder.repeatInterval > 1
                      ? ` · every ${reminder.repeatInterval}`
                      : ""}
                  </span>
                  <span>{reminder.timeZoneId}</span>
                  {reminder.sendEmail ? (
                    <span>
                      <Mail size={11} />
                      Email
                    </span>
                  ) : null}
                </div>
              </div>
              <span
                className={`status-pill ${reminder.isActive ? "success" : ""}`}
              >
                {reminder.isActive ? "Active" : "Paused"}
              </span>
              <ActionMenu
                label="Reminder actions"
                items={[
                  {
                    label: "Edit reminder",
                    icon: Pencil,
                    action: () => setEditing(reminder),
                    disabled: busy === reminder.id,
                  },
                  {
                    label: reminder.isActive
                      ? "Pause reminder"
                      : "Enable reminder",
                    icon: reminder.isActive ? Pause : Play,
                    action: () => void toggle(reminder),
                    disabled: busy === reminder.id,
                  },
                  {
                    label: "Delete reminder",
                    icon: Trash2,
                    danger: true,
                    separator: true,
                    action: () => setDeleting(reminder),
                    disabled: busy === reminder.id,
                  },
                ]}
              />
            </article>
          ))}
        </div>
      )}
      {query.hasNextPage ? (
        <Button
          variant="secondary"
          busy={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Load more reminders
        </Button>
      ) : null}
      {editing ? (
        <Modal open onClose={() => setEditing(undefined)} title="Edit reminder">
          <div className="modal-body">
            <ReminderForm
              noteId={editing.noteId}
              initial={editing}
              zone={
                me.data?.account.timeZoneId ??
                state.session?.timeZoneId ??
                "Asia/Ho_Chi_Minh"
              }
              onDone={async () => {
                await refresh();
                setEditing(undefined);
              }}
              onCancel={() => setEditing(undefined)}
            />
          </div>
        </Modal>
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title="Delete reminder?"
          description="Future reminders will stop. Your note will be kept."
          confirmLabel="Delete reminder"
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
