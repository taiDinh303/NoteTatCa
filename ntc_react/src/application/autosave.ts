import type { Note, NoteDraft } from "../domain/models";
import { ApiError } from "../infrastructure/http";
import { validateDocument } from "../domain/document";
export interface NoteWriter {
  create(draft: NoteDraft, key: string): Promise<Note>;
  patch(id: string, draft: NoteDraft, version: string): Promise<Note>;
}
export interface SaveSnapshot {
  status: "saved" | "dirty" | "saving" | "error" | "conflict";
  dirty: boolean;
  note?: Note;
  error?: Error;
}
const copyDraft = (draft: NoteDraft): NoteDraft => ({ ...draft, tagIds: [...draft.tagIds] });
const sameDraft = (a: NoteDraft, b: NoteDraft) =>
  a.title === b.title && a.documentJson === b.documentJson &&
  a.iconEmoji === b.iconEmoji && a.backgroundColor === b.backgroundColor &&
  a.isPinned === b.isPinned && a.tagIds.length === b.tagIds.length &&
  a.tagIds.every((id, index) => id === b.tagIds[index]);
export class AutosaveCoordinator {
  private draft: NoteDraft;
  private confirmed: NoteDraft;
  private forceCreate = false;
  private note?: Note;
  private pendingCreate?: { draft: NoteDraft; key: string };
  private flight?: Promise<Note | undefined>;
  private timer?: ReturnType<typeof setTimeout>;
  private listeners = new Set<() => void>();
  private snapshot: SaveSnapshot;
  private disposed = false;
  constructor(
    private readonly writer: NoteWriter,
    initial: NoteDraft,
    note: Note | undefined,
    private readonly committed: (note: Note) => void,
    private readonly delay = 750,
  ) {
    this.draft = copyDraft(initial);
    this.confirmed = copyDraft(initial);
    this.note = note;
    this.snapshot = { status: "saved", dirty: false, note };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private dirty() {
    return this.forceCreate || !sameDraft(this.draft, this.confirmed);
  }
  private emit(status: SaveSnapshot["status"], error?: Error) {
    this.snapshot = { status, dirty: this.dirty(), note: this.note, error };
    this.listeners.forEach((f) => f());
  }
  update(draft: NoteDraft) {
    this.draft = copyDraft(draft);
    clearTimeout(this.timer);
    if (this.snapshot.status === "conflict") {
      this.emit("conflict", this.snapshot.error);
      return;
    }
    this.emit(this.flight ? "saving" : this.dirty() ? "dirty" : "saved");
    if (this.dirty() && !this.disposed)
      this.timer = setTimeout(() => {
        void this.flush().catch(() => {});
      }, this.delay);
  }
  async flush(createEmpty = false): Promise<Note | undefined> {
    clearTimeout(this.timer);
    if (this.flight) return this.flight;
    if (this.snapshot.status === "conflict") throw this.snapshot.error;
    if (createEmpty && !this.note) this.forceCreate = true;
    if (!this.dirty()) return this.note;
    this.flight = this.drain().finally(() => {
      this.flight = undefined;
    });
    return this.flight;
  }
  private async drain() {
    try {
      while (this.dirty()) {
        this.emit("saving");
        validateDocument(this.draft.documentJson);
        if (!this.note && !this.pendingCreate)
          this.pendingCreate = {
            draft: copyDraft(this.draft),
            key: crypto.randomUUID(),
          };
        const target = this.pendingCreate?.draft ?? copyDraft(this.draft);
        const note = this.note
          ? await this.writer.patch(this.note.id, target, this.note.version)
          : await this.writer.create(target, this.pendingCreate!.key);
        this.note = note;
        this.pendingCreate = undefined;
        this.confirmed = target;
        this.forceCreate = false;
        this.committed(note);
      }
      this.emit("saved");
      return this.note;
    } catch (error) {
      const failure =
        error instanceof Error ? error : new Error("Could not save your note.");
      this.emit(
        error instanceof ApiError && error.status === 409
          ? "conflict"
          : "error",
        failure,
      );
      throw failure;
    }
  }
  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
    this.listeners.clear();
  }
  resume() {
    this.disposed = false;
  }
}
