import type { InfiniteData } from "@tanstack/react-query";
import { cache, workspace } from "../../app/runtime";
import type { Page, Reminder, ReminderInput } from "../../domain/models";

export function pendingReminder(
  noteId: string,
  title: string | null,
  body: ReminderInput,
  initial?: Reminder,
): Reminder {
  return {
    ...body,
    id: initial?.id ?? `pending-${crypto.randomUUID()}`,
    noteId,
    noteTitle: initial?.noteTitle ?? title,
    notePreview: initial?.notePreview ?? null,
    noteColor: initial?.noteColor ?? null,
    nextOccurrenceAt: body.reminderAt,
    isActive: initial?.isActive ?? true,
    version: initial?.version ?? "",
  };
}

export function commitReminder(saved: Reminder, owner: string) {
  if (workspace.key("reminders")[1] !== owner) return;
  cache.setQueryData<Reminder[]>(
    workspace.key("note-reminders", saved.noteId),
    (current) => {
      if (!current) return [saved];
      const exists = current.some((item) => item.id === saved.id);
      return exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [...current, saved];
    },
  );
  cache.setQueryData<InfiniteData<Page<Reminder>, number>>(
    workspace.key("reminders"),
    (current) =>
      current && {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === saved.id ? saved : item,
          ),
        })),
      },
  );
  void Promise.all([
    cache.invalidateQueries({ queryKey: workspace.key("reminders") }),
    cache.invalidateQueries({
      queryKey: workspace.key("note-reminders", saved.noteId),
    }),
    cache.invalidateQueries({ queryKey: workspace.key("notes") }),
  ]).catch(() => {
    // The confirmed reminder remains in cache if a background refresh fails.
  });
}
