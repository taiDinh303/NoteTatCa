import type {
  Label,
  Note,
  NoteDraft,
  NoteFilter,
  Page,
  RichNode,
} from "../domain/models";
import { draftFrom, matchesNote, sortNotes } from "../domain/models";
import { validateDocument } from "../domain/document";
import { ApiError } from "../infrastructure/http";
import type {
  OfflineData,
  OfflineStore,
  PendingNote,
} from "../infrastructure/offlineStore";
import type { NoteWriter } from "./autosave";

export const offlinePage = <T>(items: T[], number = 1): Page<T> => ({
  items: items.slice((number - 1) * 100, number * 100),
  currentPage: number,
  totalItems: items.length,
  totalPages: Math.max(1, Math.ceil(items.length / 100)),
  pageSize: 100,
  hasNextPage: number * 100 < items.length,
  hasPreviousPage: number > 1,
});
const unavailable = (error: unknown) =>
  error instanceof ApiError && [0, 502, 503, 504].includes(error.status);
const sameDraft = (a: NoteDraft, b: NoteDraft) => {
  const normalized = (draft: NoteDraft) => ({
    ...draft,
    title: draft.title.trim(),
    iconEmoji: draft.iconEmoji.trim(),
    backgroundColor: draft.backgroundColor.toLowerCase(),
    tagIds: [...draft.tagIds].sort(),
  });
  return JSON.stringify(normalized(a)) === JSON.stringify(normalized(b));
};
function text(node: RichNode): string {
  return (
    node.text ??
    (node.content ?? []).map(text).join(node.type === "doc" ? "\n" : "")
  );
}
function applyDraft(note: Note, draft: NoteDraft, labels: Label[]): Note {
  return {
    ...note,
    ...draft,
    content: text(JSON.parse(draft.documentJson)),
    tags: draft.tagIds
      .map((id) => labels.find((label) => label.id === id))
      .filter((label): label is Label => !!label),
    lastUpdatedTime: new Date().toISOString(),
  };
}
export interface SyncSnapshot {
  pending: number;
  syncing: boolean;
  error?: string;
  conflicts: PendingNote[];
}
export class DeviceSaveError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "Could not save on this device. Keep your note open.", { cause });
  }
}
export class OfflineNotes {
  private snapshot: SyncSnapshot = {
    pending: 0,
    syncing: false,
    conflicts: [],
  };
  private listeners = new Set<() => void>();
  private flight?: Promise<void>;
  constructor(
    readonly store: OfflineStore,
    private owner: () => string | undefined,
    private remote: NoteWriter & { find(id: string): Promise<Note> },
    private online: () => boolean,
    private verified: () => boolean,
    private committed: (note: Note, oldId?: string) => void,
    private lock: (name: string, action: () => Promise<void>) => Promise<void>,
    private changed: () => void = () => {},
  ) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit(patch: Partial<SyncSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((f) => f());
  }
  private requireOwner() {
    const owner = this.owner();
    if (!owner) throw new Error("Sign in to access offline notes.");
    return owner;
  }
  private guard(owner: string) {
    if (this.owner() !== owner) throw new Error("Account changed");
  }
  async refresh() {
    const owner = this.owner();
    if (!owner) {
      this.emit({ pending: 0, conflicts: [], error: undefined });
      return;
    }
    try {
      const data = await this.store.read(owner);
      this.guard(owner);
      this.emit({
        pending: data.pending.length,
        conflicts: data.pending
          .filter((p) => p.blocked)
          .map((p) => {
            const latest = data.notes.find((note) => note.id === p.id);
            return latest ? { ...p, draft: draftFrom(latest) } : p;
          }),
      });
    } catch {
      this.emit({
        error: "Offline storage is unavailable. Keep unsaved notes open.",
      });
    }
  }
  async cachedList(filter: NoteFilter, page: number) {
    const owner = this.requireOwner();
    const data = await this.store.read(owner);
    this.guard(owner);
    if ((!data.complete && !data.notes.length) || filter.trash) throw new ApiError(0);
    return offlinePage(
      sortNotes(data.notes.filter((n) => matchesNote(n, filter))),
      page,
    );
  }
  async overlay(items: Note[], includeLocal = true) {
    const owner = this.requireOwner();
    const data = await this.store.read(owner);
    this.guard(owner);
    const pending = new Set(data.pending.map((p) => p.id));
    const ids = new Set(items.map((n) => n.id));
    return sortNotes([
      ...items.filter((n) => !pending.has(n.id)),
      ...data.notes.filter(
        (n) =>
          pending.has(n.id) &&
          (ids.has(n.id) || (includeLocal && n.id.startsWith("local-"))),
      ),
    ]);
  }
  async rememberNotes(items: Note[]) {
    const owner = this.requireOwner();
    if (items.some((note) => note.userId !== owner))
      throw new Error("Account changed");
    await this.store.change(owner, (data) => {
      const pending = new Set(data.pending.map((p) => p.id));
      data.notes = [
        ...items.filter((n) => !pending.has(n.id)),
        ...data.notes.filter((n) => pending.has(n.id)),
      ];
      data.complete = true;
    });
  }
  async rememberPage(items: Note[]) {
    const owner = this.requireOwner();
    if (items.some((note) => note.userId !== owner)) throw new Error("Account changed");
    await this.store.change(owner, (data) => {
      const pending = new Set(data.pending.map((operation) => operation.id));
      const incoming = new Set(items.map((note) => note.id));
      data.notes = [
        ...data.notes.filter((note) => !incoming.has(note.id) || pending.has(note.id)),
        ...items.filter((note) => !pending.has(note.id) && !note.deletedTime),
      ];
      // A page is useful for local editing, but never certifies a complete list.
    });
  }
  private async persistDraft<T>(owner: string, update: (data: OfflineData) => T) {
    let invalidDraft = false;
    try {
      return await this.store.change(owner, (data) => {
        try { return update(data); }
        catch (error) { invalidDraft = true; throw error; }
      });
    } catch (error) {
      this.guard(owner);
      if (invalidDraft) throw error;
      throw new DeviceSaveError(error);
    }
  }
  async rememberOne(note: Note) {
    const owner = this.requireOwner();
    if (note.userId !== owner) throw new Error("Account changed");
    await this.store.change(owner, (data) => {
      if (data.pending.some((p) => p.id === note.id)) return;
      data.notes = data.notes.filter((n) => n.id !== note.id);
      if (!note.deletedTime) data.notes.push(note);
    });
  }
  async forget(id: string) {
    const owner = this.requireOwner();
    await this.store.change(owner, (data) => {
      data.notes = data.notes.filter((n) => n.id !== id);
    });
  }
  async find(id: string): Promise<Note> {
    const owner = this.requireOwner();
    const data = await this.store.read(owner).catch((error) => {
      if (this.online()) return undefined;
      throw error;
    });
    this.guard(owner);
    if (!data) return this.remote.find(id);
    const resolved = data.aliases[id] ?? id;
    const local = data.notes.find((n) => n.id === resolved);
    if (
      local &&
      (!this.online() || data.pending.some((p) => p.id === resolved))
    )
      return local;
    try {
      const note = await this.remote.find(resolved);
      this.guard(owner);
      await this.rememberOne(note).catch(() => {});
      // A read started before a local save must not replace the newer draft.
      const visible = await this.overlay([note], false).catch(() => [note]);
      this.guard(owner);
      return visible[0] ?? note;
    } catch (error) {
      if (local && unavailable(error)) { this.guard(owner); return local; }
      throw error;
    }
  }
  async save(
    id: string | undefined,
    draft: NoteDraft,
    version: string,
    key: string = crypto.randomUUID(),
    attempted = false,
  ): Promise<Note> {
    validateDocument(draft.documentJson);
    const owner = this.requireOwner();
    const result = await this.persistDraft(owner, (data) => {
      const resolved = id ? (data.aliases[id] ?? id) : "local-" + key;
      const existing = data.notes.find((n) => n.id === resolved);
      if (id && !existing)
        throw new Error("Open this note online before editing offline.");
      // An ambiguous network failure retries the exact original create payload/key.
      const already = data.pending.find((p) => p.key === key);
      if (already) return data.notes.find((n) => n.id === already.id)!;
      let expected = version;
      const seen = new Set<string>();
      while (data.versions[resolved + ":" + expected] && !seen.has(expected)) {
        seen.add(expected);
        expected = data.versions[resolved + ":" + expected];
      }
      if (existing && expected !== existing.version)
        throw new ApiError(409, {
          message:
            "This note changed on this device. Keep your draft or save a new copy.",
        });
      const operation: PendingNote = {
        key,
        id: resolved,
        kind: id ? "patch" : "create",
        draft: structuredClone(draft),
        version: expected,
        attempted,
      };
      const previous = data.pending.filter((p) => p.id === resolved).at(-1);
      if (
        previous?.kind === "patch" &&
        !previous.attempted &&
        !previous.blocked &&
        !attempted
      ) {
        // Collapse only never-sent edits. An in-flight/ambiguous request keeps its
        // exact payload so replay can distinguish its own ACK from a conflict.
        operation.version = previous.version;
        data.pending = data.pending.filter((p) => p.key !== previous.key);
      }
      const now = new Date().toISOString();
      const base: Note = existing ?? {
        id: resolved,
        userId: owner,
        title: "",
        content: "",
        documentJson: null,
        documentSchemaVersion: 1,
        iconEmoji: null,
        version: "local",
        isPinned: false,
        pinnedAt: null,
        backgroundColor: null,
        sortOrder: -Date.now(),
        tags: [],
        reminders: [],
        createdTime: now,
        lastUpdatedTime: now,
        deletedTime: null,
      };
      const note = applyDraft(base, draft, data.labels);
      note.version = "local:" + key;
      data.notes = [...data.notes.filter((n) => n.id !== resolved), note];
      data.pending.push(operation);
      return note;
    });
    this.guard(owner);
    await this.refresh();
    this.changed();
    void this.sync();
    return result;
  }
  async hasPending(id?: string) {
    const owner = this.requireOwner();
    const data = await this.store.read(owner);
    this.guard(owner);
    return data.pending.some((p) => !id || p.id === (data.aliases[id] ?? id));
  }
  async resolveWrite(id: string, version: string) {
    const owner = this.requireOwner();
    const data = await this.store.read(owner);
    this.guard(owner);
    const resolved = data.aliases[id] ?? id;
    const seen = new Set<string>();
    while (data.versions[resolved + ":" + version] && !seen.has(version)) {
      seen.add(version);
      version = data.versions[resolved + ":" + version];
    }
    return { id: resolved, version };
  }
  async sync() {
    if (this.flight) return this.flight;
    if (!this.online() || !this.verified() || !this.owner()) return;
    const owner = this.requireOwner();
    this.flight = this.lock("ntc.notes.sync." + owner, async () => {
      this.emit({ syncing: true, error: undefined });
      try {
        while (this.online() && this.verified() && this.owner() === owner) {
          const data = await this.store.read(owner);
          this.guard(owner);
          const blocked = new Set(
            data.pending.filter((p) => p.blocked).map((p) => p.id),
          );
          const candidate = data.pending.find((p) => !blocked.has(p.id));
          if (!candidate) break;
          const op = await this.store.change(owner, (current) => {
            const item = current.pending.find((p) => p.key === candidate.key);
            if (!item) return;
            item.attempted = true;
            return structuredClone(item);
          });
          if (!op) continue;
          let saved: Note;
          try {
            saved =
              op.kind === "create"
                ? await this.remote.create(op.draft, op.key)
                : await this.remote.patch(op.id, op.draft, op.version);
          } catch (error) {
            if (
              error instanceof ApiError &&
              error.status === 409 &&
              op.kind === "patch"
            ) {
              const server = await this.remote.find(op.id);
              if (sameDraft(draftFrom(server), op.draft)) saved = server;
              else {
                await this.block(
                  owner,
                  op,
                  "This note changed online. Keep a copy or use the online version.",
                );
                continue;
              }
            } else if (
              error instanceof ApiError &&
              [400, 404, 409, 422].includes(error.status)
            ) {
              await this.block(owner, op, error.message);
              continue;
            } else throw error;
          }
          this.guard(owner);
          if (saved.userId !== owner) throw new Error("Account changed");
          // Idempotent create can return a note edited elsewhere after an earlier
          // response was lost. Do not let queued follow-up patches overwrite it.
          if (op.kind === "create" && !sameDraft(draftFrom(saved), op.draft)) {
            await this.block(
              owner,
              op,
              "This note changed online. Keep a copy or use the online version.",
              saved.id,
            );
            continue;
          }
          const visible = await this.store.change(owner, (current) => {
            current.pending = current.pending.filter((p) => p.key !== op.key);
            const later = current.pending.filter((p) => p.id === op.id);
            for (const pending of later) {
              pending.id = saved.id;
              pending.version = saved.version;
            }
            if (saved.id !== op.id) current.aliases[op.id] = saved.id;
            current.versions[saved.id + ":" + op.version] = saved.version;
            current.versions[saved.id + ":local:" + op.key] = saved.version;
            const result = later.length
              ? applyDraft(saved, later[later.length - 1].draft, current.labels)
              : saved;
            if (later.length)
              result.version = "local:" + later[later.length - 1].key;
            current.notes = [
              ...current.notes.filter(
                (n) => n.id !== op.id && n.id !== saved.id,
              ),
              result,
            ];
            return result;
          });
          this.guard(owner);
          this.committed(visible, op.id);
          this.changed();
          await this.refresh();
        }
      } catch (error) {
        if (this.owner() === owner)
          this.emit({
            error:
              error instanceof Error
                ? error.message
                : "Sync failed. Your changes stay on this device.",
          });
      } finally {
        this.emit({ syncing: false });
        await this.refresh();
      }
    })
      .catch((error) => {
        this.emit({
          error: error instanceof Error ? error.message : "Sync failed.",
        });
      })
      .finally(() => {
        this.flight = undefined;
      });
    return this.flight;
  }
  private async block(
    owner: string,
    op: PendingNote,
    message: string,
    serverId?: string,
  ) {
    this.guard(owner);
    await this.store.change(owner, (data) => {
      const item = data.pending.find((p) => p.key === op.key);
      if (item) {
        item.blocked = message;
        item.serverId = serverId;
      }
    });
    await this.refresh();
    this.changed();
  }
  async resolve(id: string, copy: boolean) {
    const owner = this.requireOwner();
    // Fetch first: unavailable/deleted server versions never discard the local copy.
    const snapshot = await this.store.read(owner);
    const serverId =
      snapshot.pending.find((p) => p.id === id && p.blocked)?.serverId ?? id;
    const server = copy ? undefined : await this.remote.find(serverId);
    this.guard(owner);
    const result = await this.store.change(owner, (data) => {
      const local = data.notes.find((n) => n.id === id);
      if (!local) return;
      data.pending = data.pending.filter((p) => p.id !== id);
      if (copy) {
        const key = crypto.randomUUID();
        const note = {
          ...local,
          id: "local-" + key,
          title: (local.title ?? "") + " (offline copy)",
        };
        data.pending.push({
          key,
          id: note.id,
          kind: "create",
          draft: draftFrom(note),
          version: "local",
        });
        data.notes = [...data.notes.filter((n) => n.id !== id), note];
        return note;
      }
      data.notes = [...data.notes.filter((n) => n.id !== id), server!];
      return server;
    });
    if (result) this.committed(result, id);
    await this.refresh();
    this.changed();
    void this.sync();
  }
  async exportPending(): Promise<OfflineData> {
    const owner = this.requireOwner();
    const data = await this.store.read(owner);
    this.guard(owner);
    return data;
  }
}
