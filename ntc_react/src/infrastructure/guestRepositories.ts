import type { Label, Note, NoteDraft, NoteFilter } from "../domain/models";
import type { OfflineNotes } from "../application/offline";
import type { GuestWorkspace } from "../application/guest";
import type { OfflineStore } from "./offlineStore";
import type { ApiClient } from "./http";
import {
  OfflineLabelsRepository,
  OfflineNotesRepository,
} from "./offlineRepositories";

/** Route only explicit guest sessions to local repositories; signed-in paths stay unchanged. */
export class GuestNotesRepository extends OfflineNotesRepository {
  constructor(
    api: ApiClient,
    offline: OfflineNotes,
    online: () => boolean,
    private guest: GuestWorkspace,
    private active: () => boolean,
  ) {
    super(api, offline, online);
  }
  override list(filter: NoteFilter, page = 1, signal?: AbortSignal) {
    return this.active()
      ? this.guest.list(filter, page)
      : super.list(filter, page, signal);
  }
  override find(id: string) {
    return this.active() ? this.guest.find(id) : super.find(id);
  }
  override findTrashed(id: string, signal?: AbortSignal) {
    return this.active()
      ? this.guest.find(id, true)
      : super.findTrashed(id, signal);
  }
  override create(draft: NoteDraft, key: string) {
    return this.active()
      ? this.guest.create(draft, key)
      : super.create(draft, key);
  }
  override patch(id: string, draft: NoteDraft, version: string) {
    return this.active()
      ? this.guest.patch(id, draft, version)
      : super.patch(id, draft, version);
  }
  override pin(note: Note) {
    return this.active() ? this.guest.pin(note) : super.pin(note);
  }
  override setLabels(note: Note, ids: string[]) {
    return this.active()
      ? this.guest.setLabels(note, ids)
      : super.setLabels(note, ids);
  }
  override trash(id: string) {
    return this.active() ? this.guest.trash(id) : super.trash(id);
  }
  override restore(id: string) {
    return this.active() ? this.guest.restore(id) : super.restore(id);
  }
  override delete(id: string) {
    return this.active() ? this.guest.delete(id) : super.delete(id);
  }
  override reorder(
    id: string,
    version: string,
    previous: string | null,
    next: string | null,
  ) {
    return this.active()
      ? this.guest.reorder(id, version, previous, next)
      : super.reorder(id, version, previous, next);
  }
}
export class GuestLabelsRepository extends OfflineLabelsRepository {
  constructor(
    api: ApiClient,
    store: OfflineStore,
    owner: () => string | undefined,
    online: () => boolean,
    private guest: GuestWorkspace,
    private active: () => boolean,
  ) {
    super(api, store, owner, online);
  }
  override list(page = 1, signal?: AbortSignal) {
    return this.active()
      ? this.guest.listLabels(page)
      : super.list(page, signal);
  }
  override create(body: {
    name: string;
    color: string | null;
    icon: string | null;
  }) {
    return this.active() ? this.guest.createLabel(body) : super.create(body);
  }
  override patch(
    label: Label,
    body: { name: string; color: string | null; icon: string | null },
  ) {
    return this.active()
      ? this.guest.patchLabel(label, body)
      : super.patch(label, body);
  }
  override delete(id: string) {
    return this.active() ? this.guest.deleteLabel(id) : super.delete(id);
  }
}
