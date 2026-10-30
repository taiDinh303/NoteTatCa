import type {
  Label,
  Note,
  NoteDraft,
  NoteFilter,
  Page,
} from "../domain/models";
import { matchesNote } from "../domain/models";
import { DeviceSaveError, OfflineNotes, offlinePage } from "../application/offline";
import { ApiClient, ApiError } from "./http";
import { LabelsRepository, NotesRepository } from "./repositories";
import type { OfflineStore } from "./offlineStore";

const connectionFailure = (error: unknown) =>
  error instanceof ApiError && [0, 502, 503, 504].includes(error.status);
export class OfflineNotesRepository extends NotesRepository {
  private pages = new Map<number, Note[]>();
  constructor(
    api: ApiClient,
    private offline: OfflineNotes,
    private online: () => boolean,
  ) {
    super(api);
  }
  override async list(
    filter: NoteFilter,
    page = 1,
    signal?: AbortSignal,
  ): Promise<Page<Note>> {
    if (!this.online() && !filter.trash)
      return this.offline.cachedList(filter, page);
    try {
      const result = await super.list(filter, page, signal);
      if (!filter.trash) await this.offline.rememberPage(result.items).catch(() => {});
      if (!Object.keys(filter).length) {
        if (page === 1) this.pages.clear();
        this.pages.set(page, result.items);
        if (
          !result.hasNextPage &&
          Array.from({ length: page }, (_, i) => this.pages.has(i + 1)).every(
            Boolean,
          )
        )
          await this.offline
            .rememberNotes(
              Array.from({ length: page }, (_, i) =>
                this.pages.get(i + 1)!,
              ).flat(),
            )
            .catch(() => {});
      }
      // Overlay only this page; local-only creates are added to the first page.
      if (!filter.trash) {
        const items = await this.offline
          .overlay(result.items, page === 1)
          .catch(() => result.items);
        result.items = items.filter(
          (n) =>
            matchesNote(n, filter) &&
            (page === 1 || result.items.some((item) => item.id === n.id)),
        );
      }
      return result;
    } catch (error) {
      if (!filter.trash && connectionFailure(error))
        return this.offline.cachedList(filter, page);
      throw error;
    }
  }
  override find(id: string) {
    return this.offline.find(id);
  }
  override async create(draft: NoteDraft, key: string): Promise<Note> {
    try {
      return await this.offline.save(undefined, draft, "local", key);
    } catch (error) {
      if (!(error instanceof DeviceSaveError) || !this.online()) throw error;
      // Storage may be disabled/full. A server ACK is still a safe save.
      return super.create(draft, key);
    }
  }
  override async patch(
    id: string,
    draft: NoteDraft,
    version: string,
  ): Promise<Note> {
    try {
      return await this.offline.save(id, draft, version);
    } catch (error) {
      if (!(error instanceof DeviceSaveError) || !this.online()) throw error;
      // Do not bypass queued work whose storage cannot currently be read.
      if (await this.offline.hasPending(id).catch(() => true)) throw error;
      const target = await this.offline.resolveWrite(id, version);
      return super.patch(target.id, draft, target.version);
    }
  }
  private async requireSynced(id: string) {
    if (this.online() && await this.offline.hasPending(id)) await this.offline.sync();
    if (
      !this.online() ||
      (await this.offline.hasPending(id).catch(() => false))
    )
      throw new Error(
        "Sync this note before changing its pin, labels, reminders, order or trash state.",
      );
    return (await this.offline.resolveWrite(id, "")).id;
  }
  override async readyForRemote(id: string) {
    return super.find(await this.requireSynced(id));
  }
  override async pin(note: Note) {
    await this.requireSynced(note.id);
    const target = await this.offline.resolveWrite(note.id, note.version);
    const saved = await super.pin({ ...note, ...target });
    await this.offline.rememberOne(saved).catch(() => {});
    return saved;
  }
  override async setLabels(note: Note, ids: string[]) {
    await this.requireSynced(note.id);
    const target = await this.offline.resolveWrite(note.id, note.version);
    const saved = await super.setLabels({ ...note, ...target }, ids);
    await this.offline.rememberOne(saved).catch(() => {});
    return saved;
  }
  override async trash(id: string) {
    const resolved = await this.requireSynced(id);
    const result = await super.trash(resolved);
    await this.offline.forget(resolved).catch(() => {});
    return result;
  }
  override async restore(id: string) {
    await this.requireSynced(id);
    const saved = await super.restore(id);
    await this.offline.rememberOne(saved).catch(() => {});
    return saved;
  }
  override async delete(id: string) {
    await this.requireSynced(id);
    const result = await super.delete(id);
    await this.offline.forget(id).catch(() => {});
    return result;
  }
  override async reorder(
    id: string,
    version: string,
    previous: string | null,
    next: string | null,
  ) {
    await this.requireSynced(id);
    return super.reorder(id, version, previous, next);
  }
}
export class OfflineLabelsRepository extends LabelsRepository {
  private pages = new Map<number, Label[]>();
  constructor(
    api: ApiClient,
    private store: OfflineStore,
    private owner: () => string | undefined,
    private online: () => boolean,
  ) {
    super(api);
  }
  override async list(page = 1, signal?: AbortSignal): Promise<Page<Label>> {
    const owner = this.owner();
    try {
      if (!this.online()) throw new ApiError(0);
      const result = await super.list(page, signal);
      if (owner && owner === this.owner()) {
        if (page === 1) this.pages.clear();
        this.pages.set(page, result.items);
        if (
          !result.hasNextPage &&
          Array.from({ length: page }, (_, i) => this.pages.has(i + 1)).every(
            Boolean,
          )
        )
          await this.store
            .change(owner, (data) => {
              data.labels = Array.from({ length: page }, (_, i) =>
                this.pages.get(i + 1)!,
              ).flat();
            })
            .catch(() => {});
      }
      return result;
    } catch (error) {
      if (!owner || !connectionFailure(error)) throw error;
      const data = await this.store.read(owner);
      if (owner !== this.owner() || (!data.complete && !data.notes.length)) throw error;
      return offlinePage(data.labels, page);
    }
  }
}
