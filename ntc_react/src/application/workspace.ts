import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { Note, NoteFilter, Page } from "../domain/models";
import { matchesNote, sortNotes } from "../domain/models";
import { NotesRepository } from "../infrastructure/repositories";
import { NoteOrderCoordinator } from "./noteOrder";
export class WorkspaceService {
  readonly order: NoteOrderCoordinator;
  private pinQueue: Promise<void> = Promise.resolve();
  private pinRevisions = new Map<string, number>();
  constructor(
    readonly notes: NotesRepository,
    readonly cache: QueryClient,
    private readonly identity: () => string | undefined,
  ) {
    this.order = new NoteOrderCoordinator(
      identity,
      async (pinned) => {
        const items: Note[] = [];
        for (let page = 1; ; page++) {
          const result = await notes.list({ pinned }, page);
          items.push(...result.items);
          if (!result.hasNextPage) return sortNotes(items);
        }
      },
      async (id, previous, next) => {
        const owner = identity();
        const note = await notes.find(id);
        if (!owner || identity() !== owner || note.userId !== owner)
          throw new Error("Account changed");
        await notes.reorder(id, note.version, previous, next);
      },
      (items) => {
        // Cancel list reads started before this acknowledgement so they cannot
        // overwrite canonical order after the optimistic overlay is released.
        void cache.cancelQueries({ queryKey: this.key("notes") });
        items.forEach(this.commit);
      },
    );
  }
  key(resource: string, ...parts: unknown[]) {
    return ["private", this.identity() ?? "none", resource, ...parts];
  }
  cachedNote(id: string) {
    const owner = this.identity();
    if (!owner) return;
    for (const [key, data] of this.cache.getQueriesData<InfiniteData<Page<Note>>>({
      queryKey: this.key("notes"),
    })) {
      const note = data?.pages.flatMap((page) => page.items).find(
        (note) => note.id === id && note.userId === owner && !note.deletedTime,
      );
      if (note) return { note, updatedAt: this.cache.getQueryState(key)?.dataUpdatedAt };
    }
  }
  cachedNotes(
    filter: NoteFilter,
  ): InfiniteData<Page<Note>, number> | undefined {
    const key = this.key("notes", filter.trash ? { trash: true } : {});
    const state = this.cache.getQueryState<InfiniteData<Page<Note>>>(key);
    const data = state?.data;
    if (
      !state ||
      !data ||
      state.isInvalidated ||
      data.pages.at(-1)?.hasNextPage
    )
      return;
    const items = sortNotes(
      data.pages
        .flatMap((page) => page.items)
        .filter((note) => matchesNote(note, filter)),
    );
    const totalPages = Math.max(1, Math.ceil(items.length / 100));
    return {
      pages: Array.from({ length: totalPages }, (_, index) => ({
        items: items.slice(index * 100, (index + 1) * 100),
        currentPage: index + 1,
        totalPages,
        totalItems: items.length,
        pageSize: 100,
        hasNextPage: index + 1 < totalPages,
        hasPreviousPage: index > 0,
      })),
      pageParams: Array.from({ length: totalPages }, (_, index) => index + 1),
    };
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
    const owner = this.identity();
    const revisionKey = `${owner}:${note.id}`;
    const revision = (this.pinRevisions.get(revisionKey) ?? 0) + 1;
    this.pinRevisions.set(revisionKey, revision);
    const latest = () =>
      this.pinRevisions.get(revisionKey) === revision &&
      this.identity() === owner;
    const hold = this.order.hold();
    const originalPosition =
      this.order
        .getSnapshot()
        .groups.get(note.isPinned)
        ?.ids.indexOf(note.id) ?? 0;
    const cancellation = this.cache.cancelQueries({
      queryKey: this.key("notes"),
    });
    const target = this.cache
      .getQueriesData<InfiniteData<Page<Note>>>({ queryKey: this.key("notes") })
      .flatMap(([, data]) => data?.pages.flatMap((page) => page.items) ?? [])
      .filter(
        (item) =>
          item.id !== note.id &&
          item.isPinned !== note.isPinned &&
          !item.deletedTime,
      );
    const optimistic = {
      ...note,
      isPinned: !note.isPinned,
      pinnedAt: note.isPinned ? null : new Date().toISOString(),
      sortOrder: Math.min(1000, ...target.map((item) => item.sortOrder)) - 1000,
    };
    this.order.membership(note.id, optimistic.isPinned);
    this.commit(optimistic);
    const previous = this.pinQueue;
    let done!: () => void;
    this.pinQueue = new Promise<void>((resolve) => {
      done = resolve;
    });
    try {
      await Promise.all([previous, hold.ready, cancellation]);
      if (this.identity() !== owner) throw new Error("Account changed");
      const fresh = await this.notes.find(note.id);
      if (this.identity() !== owner) throw new Error("Account changed");
      const saved =
        fresh.isPinned === optimistic.isPinned
          ? fresh
          : await this.notes.pin(fresh);
      if (latest()) {
        await this.cache.cancelQueries({ queryKey: this.key("notes") });
        if (latest()) this.commit(saved);
      }
    } catch (error) {
      if (latest()) {
        this.order.membership(note.id, note.isPinned, originalPosition);
        this.commit(note);
      }
      throw error;
    } finally {
      done();
      hold.release();
    }
  }
  async trash(note: Note) {
    await this.cache.cancelQueries({ queryKey: this.key("notes") });
    this.commit({ ...note, deletedTime: new Date().toISOString() });
    try {
      await this.notes.trash(note.id);
    } catch (error) {
      this.commit(note);
      throw error;
    }
    void this.refreshNotes().catch(() => {});
  }
  async restore(note: Note) {
    await this.cache.cancelQueries({ queryKey: this.key("notes") });
    this.commit({ ...note, deletedTime: null });
    try {
      this.commit(await this.notes.restore(note.id));
    } catch (error) {
      this.commit(note);
      throw error;
    }
    void this.refreshNotes().catch(() => {});
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
  reorder(group: Note[], from: number, to: number) {
    this.order.reorder(group, from, to);
  }
}
