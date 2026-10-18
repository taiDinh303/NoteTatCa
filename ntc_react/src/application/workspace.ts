import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { Note, NoteFilter, Page } from "../domain/models";
import { matchesNote, sortNotes } from "../domain/models";
import { NotesRepository } from "../infrastructure/repositories";
export class WorkspaceService {
  constructor(
    readonly notes: NotesRepository,
    readonly cache: QueryClient,
    private readonly identity: () => string | undefined,
  ) {}
  key(resource: string, ...parts: unknown[]) {
    return ["private", this.identity() ?? "none", resource, ...parts];
  }
  commit = (note: Note) => {
    if (note.userId !== this.identity()) return;
    const detail = note.deletedTime ? "trash-note" : "note";
    this.cache.removeQueries({
      queryKey: this.key(note.deletedTime ? "note" : "trash-note", note.id),
      exact: true,
    });
    this.cache.setQueryData(this.key(detail, note.id), note);
    for (const [key, data] of this.cache.getQueriesData<
      InfiniteData<Page<Note>>
    >({ queryKey: this.key("notes") })) {
      if (!data) continue;
      const filter = key[3] as NoteFilter;
      const all = data.pages.flatMap((p) => p.items);
      const existed = all.some((n) => n.id === note.id);
      const match = matchesNote(note, filter);
      if (!existed && match && data.pages.at(-1)?.hasNextPage) {
        void this.cache.invalidateQueries({ queryKey: key, exact: true });
        continue;
      }
      let items = all.filter((n) => n.id !== note.id);
      if (match) items.push(note);
      items = sortNotes(items);
      const delta = Number(match) - Number(existed);
      let offset = 0;
      const pages = data.pages.map((page, index) => {
        const size =
          index === data.pages.length - 1
            ? items.length - offset
            : page.items.length;
        const result = {
          ...page,
          totalItems: Math.max(0, page.totalItems + delta),
          items: items.slice(offset, offset + size),
        };
        offset += size;
        return result;
      });
      this.cache.setQueryData(key, { ...data, pages });
    }
  };
  private async refreshNotes() {
    await this.cache.invalidateQueries({ queryKey: this.key("notes") });
    await this.cache.invalidateQueries({ queryKey: this.key("reminders") });
    await this.cache.invalidateQueries({ queryKey: this.key("inbox") });
    await this.cache.invalidateQueries({ queryKey: this.key("unread") });
  }
  async pin(note: Note) {
    await this.cache.cancelQueries({ queryKey: this.key("notes") });
    const optimistic = { ...note, isPinned: !note.isPinned };
    this.commit(optimistic);
    try {
      this.commit(await this.notes.pin(note));
      await this.refreshNotes();
    } catch (error) {
      this.commit(note);
      throw error;
    }
  }
  async trash(note: Note) {
    await this.notes.trash(note.id);
    this.commit({ ...note, deletedTime: new Date().toISOString() });
    await this.refreshNotes();
  }
  async restore(note: Note) {
    this.commit(await this.notes.restore(note.id));
    await this.refreshNotes();
  }
  async delete(note: Note) {
    await this.notes.delete(note.id);
    for (const [key, data] of this.cache.getQueriesData<
      InfiniteData<Page<Note>>
    >({ queryKey: this.key("notes") })) {
      if (data)
        this.cache.setQueryData(key, {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            items: p.items.filter((n) => n.id !== note.id),
          })),
        });
    }
    this.cache.removeQueries({ queryKey: this.key("note", note.id) });
    this.cache.removeQueries({ queryKey: this.key("trash-note", note.id) });
    await this.refreshNotes();
  }
  async reorder(group: Note[], from: number, to: number) {
    const ordered = [...group];
    const [dragged] = ordered.splice(from, 1);
    ordered.splice(to, 0, dragged);
    await this.cache.cancelQueries({ queryKey: this.key("notes") });
    const old = group.map((n) => ({ ...n }));
    ordered.forEach((n, i) => this.commit({ ...n, sortOrder: (i + 1) * 1000 }));
    try {
      await this.notes.reorder(
        dragged.id,
        dragged.version,
        ordered[to - 1]?.id ?? null,
        ordered[to + 1]?.id ?? null,
      );
      this.commit(await this.notes.find(dragged.id));
      await this.cache.invalidateQueries({ queryKey: this.key("notes") });
    } catch (error) {
      old.forEach(this.commit);
      await this.cache.invalidateQueries({ queryKey: this.key("notes") });
      throw error;
    }
  }
}
