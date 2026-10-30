import { t as tr, useLanguage } from "../../shared/i18n";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { cache, notes, reminders, workspace } from "../../app/runtime";
import type { Reminder, ReminderInput } from "../../domain/models";
import { REPEAT_NAMES, WEEKDAYS } from "../../domain/models";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  ErrorPanel,
  Field,
  IconButton,
  Modal,
  Spinner,
} from "../../shared/ui";
import { dateTime, errorMessage } from "../../shared/utils";
import { commitReminder, pendingReminder } from "./reminderCache";

function deviceZone(fallback: string) {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

export function ReminderForm({
  noteId,
  initial,
  draft,
  zone,
  onStarted,
  onDone,
  onFailed,
  onCancel,
}: {
  noteId: string;
  initial?: Reminder;
  draft?: ReminderInput;
  zone: string;
  onStarted: (body: ReminderInput) => void;
  onDone: (saved: Reminder) => void;
  onFailed: (error: unknown, body: ReminderInput) => void;
  onCancel: () => void;
}) {
  useLanguage();
  const [repeat, setRepeat] = useState(
    draft?.repeatType ?? initial?.repeatType ?? 0,
  );
  const [days, setDays] = useState(
    draft?.repeatDays ?? initial?.repeatDays ?? 0,
  );
  const [ending, setEnding] = useState(
    draft?.repeatCount || initial?.repeatCount
      ? "count"
      : draft?.repeatUntil || initial?.repeatUntil
        ? "until"
        : "never",
  );
  const submitting = useRef(false);
  const timeZone = deviceZone(zone);
  const [date] = useState(
    () =>
      new Date(
        draft?.reminderAt ?? initial?.reminderAt ?? Date.now() + 60 * 60 * 1000,
      ),
  );
  const localInput = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  return (
    <form
      className="reminder-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (submitting.current) return;
        const data = new FormData(e.currentTarget);
        const body: ReminderInput = {
          reminderAt: new Date(String(data.get("at"))).toISOString(),
          timeZoneId: timeZone,
          repeatType: repeat,
          repeatInterval: repeat ? Number(data.get("interval")) : 1,
          repeatDays: repeat === 2 ? days : null,
          repeatCount:
            repeat && ending === "count" ? Number(data.get("count")) : null,
          repeatUntil:
            repeat && ending === "until"
              ? new Date(String(data.get("until"))).toISOString()
              : null,
          sendEmail: data.get("email") === "on",
        };
        submitting.current = true;
        onStarted(body);
        void (
          initial
            ? reminders.patch(initial, body)
            : reminders.create(noteId, body)
        )
          .then(onDone)
          .catch((error) => onFailed(error, body));
      }}
    >
      <Field
        label={tr("Date & time")}
        hint={tr(
          "Your device timezone ({0}) is used automatically. The reminder appears in Inbox at this time.",
          timeZone,
        )}
      >
        <input
          type="datetime-local"
          name="at"
          defaultValue={localInput}
          required
        />
      </Field>
      <div className="form-grid">
        <Field label={tr("Repeat")}>
          <select
            value={repeat}
            onChange={(e) => setRepeat(Number(e.target.value))}
          >
            {REPEAT_NAMES.map((n, i) => (
              <option key={tr(n)} value={i}>
                {tr(n)}
              </option>
            ))}
          </select>
        </Field>
        {repeat ? (
          <Field label={tr("Every")}>
            <input
              type="number"
              name="interval"
              min={1}
              max={365}
              defaultValue={
                draft?.repeatInterval ?? initial?.repeatInterval ?? 1
              }
              required
            />
          </Field>
        ) : null}
      </div>
      {repeat === 2 ? (
        <fieldset className="weekday-picker">
          <legend>{tr("On these days")}</legend>
          {WEEKDAYS.map(([day, mask]) => (
            <label key={tr(day)} className={days & mask ? "selected" : ""}>
              <input
                type="checkbox"
                checked={Boolean(days & mask)}
                onChange={() => setDays((value) => value ^ mask)}
              />
              {tr(day)}
            </label>
          ))}
        </fieldset>
      ) : null}
      {repeat ? (
        <div className="form-grid">
          <Field label={tr("Ends")}>
            <select value={ending} onChange={(e) => setEnding(e.target.value)}>
              <option value="never">{tr("Never")}</option>
              <option value="count">{tr("After occurrences")}</option>
              <option value="until">{tr("On date")}</option>
            </select>
          </Field>
          {ending === "count" ? (
            <Field label={tr("Occurrences (including first)")}>
              <input
                type="number"
                name="count"
                min={1}
                max={100000}
                required
                defaultValue={draft?.repeatCount ?? initial?.repeatCount ?? 10}
              />
            </Field>
          ) : ending === "until" ? (
            <Field label={tr("Last date & time")}>
              <input
                type="datetime-local"
                name="until"
                defaultValue={
                  draft?.repeatUntil || initial?.repeatUntil
                    ? new Date(
                        new Date(
                          (draft?.repeatUntil ?? initial?.repeatUntil)!,
                        ).getTime() -
                          new Date(
                            (draft?.repeatUntil ?? initial?.repeatUntil)!,
                          ).getTimezoneOffset() *
                            60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : undefined
                }
                required
              />
            </Field>
          ) : null}
        </div>
      ) : null}
      <label className="check-label">
        <input
          type="checkbox"
          name="email"
          defaultChecked={draft?.sendEmail ?? initial?.sendEmail ?? true}
        />{" "}
        {tr("Also send an email reminder")}
      </label>
      <p className="field-hint">
        {tr(
          repeat
            ? "After the first reminder, it repeats at this local time until the selected end. You can edit or pause it later. Past Inbox notifications stay."
            : "This reminder runs once. You can edit or pause it later. Past Inbox notifications stay.",
        )}
      </p>
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel} type="button">
          {tr("Cancel")}
        </Button>
        <Button type="submit">
          {initial ? tr("Save reminder") : tr("Set reminder")}
        </Button>
      </div>
    </form>
  );
}
export default function ReminderDialog({
  noteId, title, zone, onClose,
}: {
  noteId: string; title: string; zone: string; onClose: () => void;
}) {
  useLanguage();
  const resolved = useQuery({
    queryKey: workspace.key("remote-note", noteId),
    queryFn: () => notes.readyForRemote(noteId),
    enabled: noteId.startsWith("local-"),
    retry: false,
    networkMode: "always",
  });
  if (noteId.startsWith("local-") && !resolved.data) return (
    <Modal open onClose={onClose} title={tr("Reminders")}>
      {resolved.isError ? <ErrorPanel error={resolved.error} retry={() => void resolved.refetch()} /> : <Spinner />}
    </Modal>
  );
  return <ReadyReminderDialog noteId={resolved.data?.id ?? noteId} title={title} zone={zone} onClose={onClose} />;
}

function ReadyReminderDialog({
  noteId,
  title,
  zone,
  onClose,
}: {
  noteId: string;
  title: string;
  zone: string;
  onClose: () => void;
}) {
  useLanguage();
  const query = useQuery({
    queryKey: workspace.key("note-reminders", noteId),
    queryFn: () => reminders.forNote(noteId),
  });
  const [editing, setEditing] = useState<Reminder | null | undefined>();
  const [deleting, setDeleting] = useState<Reminder>();
  const [pending, setPending] = useState<Reminder>();
  const [draft, setDraft] = useState<ReminderInput>();
  const [error, setError] = useState<unknown>();
  const saveOwner = useRef("");
  async function refresh() {
    await Promise.all([
      query.refetch(),
      cache.invalidateQueries({ queryKey: workspace.key("reminders") }),
      cache.invalidateQueries({ queryKey: workspace.key("notes") }),
    ]);
    setEditing(undefined);
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={tr("Reminders")}
      description={title || tr("Untitled note")}
    >
      <div className="modal-body">
        <ErrorBanner error={error} />
        {editing !== undefined ? (
          <ReminderForm
            key={editing?.id ?? "new"}
            noteId={noteId}
            initial={editing ?? undefined}
            draft={draft}
            zone={zone}
            onStarted={(body) => {
              setError(undefined);
              saveOwner.current = String(workspace.key("reminders")[1]);
              setPending(
                pendingReminder(noteId, title, body, editing ?? undefined),
              );
              setEditing(undefined);
            }}
            onDone={(saved) => {
              commitReminder(saved, saveOwner.current);
              setDraft(undefined);
              setPending(undefined);
            }}
            onFailed={(failure, body) => {
              setPending(undefined);
              setDraft(body);
              setError(failure);
              setEditing(editing ?? null);
              toast.error(errorMessage(failure));
            }}
            onCancel={() => {
              setDraft(undefined);
              setEditing(undefined);
            }}
          />
        ) : (
          <>
            {query.isPending ? (
              <Spinner />
            ) : query.isError ? (
              <ErrorPanel
                error={query.error}
                retry={() => void query.refetch()}
              />
            ) : !query.data.length && !pending ? (
              <EmptyState
                icon={Bell}
                title={tr("Give it a little nudge")}
                description={tr("Choose when this note should find you again.")}
              />
            ) : (
              <div className="reminder-list">
                {[
                  ...query.data,
                  ...(pending &&
                  !query.data.some((item) => item.id === pending.id)
                    ? [pending]
                    : []),
                ].map((item) => {
                  const reminder = pending?.id === item.id ? pending : item;
                  const saving =
                    reminder.id.startsWith("pending-") ||
                    pending?.id === reminder.id;
                  return (
                    <div className="reminder-row" key={reminder.id}>
                      <Clock3 size={19} />
                      <div>
                        <strong>
                          {dateTime(
                            reminder.nextOccurrenceAt ?? reminder.reminderAt,
                            reminder.timeZoneId,
                          )}
                        </strong>
                        <span>
                          {tr(REPEAT_NAMES[reminder.repeatType])} ·{" "}
                          {saving
                            ? tr("Saving in background…")
                            : reminder.isActive
                              ? tr("Active")
                              : tr("Paused")}{" "}
                          · {reminder.timeZoneId}
                        </span>
                      </div>
                      <IconButton
                        icon={Pencil}
                        label={tr("Edit reminder")}
                        onClick={() => {
                          setDraft(undefined);
                          setError(undefined);
                          setEditing(reminder);
                        }}
                        disabled={saving}
                      />
                      <IconButton
                        icon={Trash2}
                        label={tr("Delete reminder")}
                        onClick={() => setDeleting(reminder)}
                        disabled={saving}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <Button
              variant="secondary"
              disabled={
                Boolean(pending) ||
                (query.data?.filter((r) => r.isActive).length ?? 0) >= 5
              }
              onClick={() => {
                setError(undefined);
                setDraft(undefined);
                setEditing(null);
              }}
            >
              <Plus size={16} />
              {tr("Add reminder")}
            </Button>
            <p className="field-hint">
              {tr("Up to five active reminders per note.")}
            </p>
          </>
        )}
      </div>
      {deleting ? (
        <ConfirmDialog
          title={tr("Delete reminder?")}
          description={tr(
            "Future reminders will stop. This note will be kept.",
          )}
          confirmLabel={tr("Delete reminder")}
          danger
          onClose={() => setDeleting(undefined)}
          onConfirm={async () => {
            try {
              await reminders.delete(deleting.id);
              await refresh();
            } catch (error) {
              setError(error);
              throw error;
            }
          }}
        />
      ) : null}
    </Modal>
  );
}
