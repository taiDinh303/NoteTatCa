import type {
  Label,
  Note,
  NoteDraft,
  NoteFilter,
  RichNode,
  Session,
} from "../domain/models";
import {
  draftFrom,
  matchesNote,
  plainDocument,
  sortNotes,
} from "../domain/models";
import { validateDocument } from "../domain/document";
import { ApiError } from "../infrastructure/http";
import type { GuestData, GuestStore } from "../infrastructure/guestStore";
import { GUEST_OWNER, emptyGuest } from "../infrastructure/guestStore";
import { offlinePage } from "./offline";

function plain(node: RichNode): string {
  return (
    node.text ??
    (node.content ?? [])
      .map(plain)
      .join(
        /^(doc|taskList|bulletList|orderedList|listItem|taskItem|blockquote)$/.test(
          node.type,
        )
          ? "\n"
          : "",
      )
  );
}
function validate(draft: NoteDraft, data: GuestData) {
  validateDocument(draft.documentJson);
  if (draft.title.length > 150)
    throw new Error("Title can contain up to 150 characters.");
  if (
    draft.tagIds.length > 20 ||
    draft.tagIds.some((id) => !data.labels.some((label) => label.id === id))
  )
    throw new Error("Choose up to 20 existing labels.");
}
function apply(note: Note, draft: NoteDraft, labels: Label[]): Note {
  return {
    ...note,
    title: draft.title.trim(),
    documentJson: draft.documentJson,
    iconEmoji: draft.iconEmoji || null,
    backgroundColor: draft.backgroundColor || null,
    isPinned: draft.isPinned,
    pinnedAt: draft.isPinned
      ? (note.pinnedAt ?? new Date().toISOString())
      : null,
    content: plain(JSON.parse(draft.documentJson)),
    tags: draft.tagIds.map((id) => labels.find((label) => label.id === id)!),
    version: crypto.randomUUID(),
    lastUpdatedTime: new Date().toISOString(),
  };
}
export function guestSession(): Session {
  let zone = "UTC";
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    /* UTC fallback */
  }
  return {
    userId: GUEST_OWNER,
    userName: "Guest",
    givenName: "Guest",
    familyName: null,
    fullName: "Guest",
    picture: null,
    roles: ["Guest"],
    timeZoneId: zone,
    token: "",
    expiredAt: "",
    refreshToken: "",
    refreshExpiresAt: "",
  };
}
export function seedGuest(
  t: (text: string) => string = (text) => text,
): Pick<GuestData, "notes" | "labels"> {
  const labels = [
    { name: t("Ideas"), color: "#d69b36" },
    { name: t("Personal"), color: "#3d8b72" },
    { name: t("Work"), color: "#7484b7" },
  ].map((label) => ({
    ...label,
    id: crypto.randomUUID(),
    version: crypto.randomUUID(),
    icon: null,
  }));
  const make = (
    title: string,
    content: RichNode,
    color: string,
    tag: number,
    pinned = false,
  ): Note => {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      userId: GUEST_OWNER,
      title: t(title),
      content: plain(content),
      documentJson: JSON.stringify(content),
      documentSchemaVersion: 1,
      iconEmoji: null,
      version: crypto.randomUUID(),
      isPinned: pinned,
      pinnedAt: pinned ? now : null,
      backgroundColor: color,
      sortOrder: tag * 1000,
      tags: [labels[tag]],
      reminders: [],
      createdTime: now,
      lastUpdatedTime: now,
      deletedTime: null,
    };
  };
  return {
    labels,
    notes: [
      make(
        "Welcome to your guest space",
        plainDocument(
          t(
            "Try writing a note, choosing a color, or adding a label. Everything here stays on this browser until you copy it to an account.",
          ),
        ),
        "#FCE7F3",
        0,
        true,
      ),
      make(
        "A few things to try",
        {
          type: "doc",
          content: [
            {
              type: "taskList",
              content: [
                "Create your own note",
                "Organize it with labels",
                "Drag notes to change their order",
              ].map((line) => ({
                type: "taskItem",
                attrs: { checked: false },
                content: plainDocument(t(line)).content,
              })),
            },
          ],
        },
        "#E7F0E6",
        1,
      ),
      make(
        "A little room for ideas",
        plainDocument(
          t(
            "A project idea, a book to read, a place to visit. Make this space yours.",
          ),
        ),
        "#FFF4D6",
        2,
      ),
    ],
  };
}
export interface GuestSnapshot {
  exists: boolean;
  notes: number;
  labels: number;
  importOpen: boolean;
  error?: string;
}
export class GuestWorkspace {
  private snapshot: GuestSnapshot = {
    exists: false,
    notes: 0,
    labels: 0,
    importOpen: false,
  };
  private listeners = new Set<() => void>();
  constructor(
    readonly store: GuestStore,
    private changed: () => void = () => {},
    private translate: (text: string) => string = (text) => text,
    private importIntent: (open: boolean) => void = () => {},
  ) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit(patch: Partial<GuestSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  async refresh() {
    try {
      const data = await this.store.read();
      this.emit({
        exists:
          data.initialized && (data.notes.length > 0 || data.labels.length > 0),
        notes: data.notes.length,
        labels: data.labels.length,
        error: undefined,
      });
    } catch {
      this.emit({
        error: "Guest storage is unavailable. Keep your unsaved notes open.",
      });
    }
  }
  requestImport() {
    this.importIntent(true);
    this.emit({ importOpen: true });
  }
  closeImport() {
    this.importIntent(false);
    this.emit({ importOpen: false });
  }
  async ensure() {
    await this.store.change((data) => {
      if (!data.initialized) {
        Object.assign(data, seedGuest(this.translate));
        data.initialized = true;
        data.revision++;
      }
      this.purge(data);
    });
    await this.refresh();
  }
  private purge(data: GuestData) {
    data.notes = data.notes.filter(
      (note) =>
        !note.deletedTime ||
        Date.parse(note.deletedTime) > Date.now() - 30 * 86400000,
    );
  }
  private async change<T>(update: (data: GuestData) => T): Promise<T> {
    const result = await this.store.change((data) => {
      this.purge(data);
      const value = update(data);
      data.revision++;
      return value;
    });
    await this.refresh();
    this.changed();
    return result;
  }
  async reset() {
    await this.change((data) => {
      Object.assign(data, seedGuest(this.translate));
      data.initialized = true;
      data.creates = {};
      data.transfers = {};
    });
  }
  async discard() {
    await this.change((data) => {
      const revision = data.revision;
      Object.assign(data, emptyGuest(), { revision });
    });
    this.closeImport();
  }
  async list(filter: NoteFilter, page = 1) {
    const data = await this.store.read();
    return offlinePage(
      sortNotes(
        data.notes.filter(
          (note) =>
            matchesNote(note, filter) &&
            (!note.deletedTime ||
              Date.parse(note.deletedTime) > Date.now() - 30 * 86400000),
        ),
      ),
      page,
    );
  }
  async find(id: string, trash = false) {
    const data = await this.store.read();
    const note = data.notes.find(
      (note) => note.id === id && !!note.deletedTime === trash,
    );
    if (!note)
      throw new ApiError(404, {
        message: "This guest note is no longer available.",
      });
    return note;
  }
  async create(draft: NoteDraft, key: string) {
    return this.change((data) => {
      validate(draft, data);
      const payload = JSON.stringify(draft);
      const previous = data.creates[key];
      if (previous) {
        const note = data.notes.find((note) => note.id === previous.id);
        if (!note || previous.payload !== payload) throw new ApiError(409);
        return note;
      }
      const now = new Date().toISOString();
      const note = apply(
        {
          id: crypto.randomUUID(),
          userId: GUEST_OWNER,
          title: "",
          content: "",
          documentJson: null,
          documentSchemaVersion: 1,
          iconEmoji: null,
          version: "",
          isPinned: false,
          pinnedAt: null,
          backgroundColor: null,
          sortOrder: Math.min(0, ...data.notes.map((n) => n.sortOrder)) - 1000,
          tags: [],
          reminders: [],
          createdTime: now,
          lastUpdatedTime: now,
          deletedTime: null,
        },
        draft,
        data.labels,
      );
      data.notes.push(note);
      data.creates[key] = { id: note.id, payload };
      return note;
    });
  }
  async patch(id: string, draft: NoteDraft, version: string) {
    return this.change((data) => {
      validate(draft, data);
      const note = this.owned(data, id, version);
      const saved = apply(note, draft, data.labels);
      data.notes = data.notes.map((item) => (item.id === id ? saved : item));
      return saved;
    });
  }
  private owned(data: GuestData, id: string, version?: string, trash = false) {
    const note = data.notes.find(
      (note) => note.id === id && !!note.deletedTime === trash,
    );
    if (!note)
      throw new ApiError(404, {
        message: "This guest note is no longer available.",
      });
    if (version && note.version !== version)
      throw new ApiError(409, {
        message:
          "This note changed on this device. Keep your draft or save a new copy.",
      });
    return note;
  }
  async pin(note: Note) {
    return this.patch(
      note.id,
      { ...draftFrom(note), isPinned: !note.isPinned },
      note.version,
    );
  }
  async setLabels(note: Note, ids: string[]) {
    return this.patch(
      note.id,
      { ...draftFrom(note), tagIds: ids },
      note.version,
    );
  }
  async trash(id: string) {
    return this.change((data) => {
      const note = this.owned(data, id);
      note.deletedTime = new Date().toISOString();
      note.version = crypto.randomUUID();
      return true;
    });
  }
  async restore(id: string) {
    return this.change((data) => {
      const note = this.owned(data, id, undefined, true);
      note.deletedTime = null;
      note.version = crypto.randomUUID();
      return note;
    });
  }
  async delete(id: string) {
    return this.change((data) => {
      this.owned(data, id, undefined, true);
      data.notes = data.notes.filter((note) => note.id !== id);
      return true;
    });
  }
  async reorder(
    id: string,
    version: string,
    previous: string | null,
    next: string | null,
  ) {
    return this.change((data) => {
      const note = this.owned(data, id, version);
      const group = sortNotes(
        data.notes.filter(
          (n) => !n.deletedTime && n.isPinned === note.isPinned && n.id !== id,
        ),
      );
      const before = previous ? group.findIndex((n) => n.id === previous) : -1;
      const after = next ? group.findIndex((n) => n.id === next) : group.length;
      if (
        (previous && before < 0) ||
        (next && after < 0) ||
        after !== before + 1
      )
        throw new ApiError(409);
      group.splice(after, 0, note);
      group.forEach((item, index) => {
        item.sortOrder = index * 1000;
        item.version = crypto.randomUUID();
      });
      return true;
    });
  }
  async listLabels(page = 1) {
    return offlinePage((await this.store.read()).labels, page);
  }
  private labelBody(body: {
    name: string;
    color: string | null;
    icon: string | null;
  }) {
    const name = body.name.trim();
    if (!name || name.length > 50)
      throw new Error("Label names must contain 1 to 50 characters.");
    return { ...body, name };
  }
  async createLabel(body: {
    name: string;
    color: string | null;
    icon: string | null;
  }) {
    return this.change((data) => {
      const label = {
        ...this.labelBody(body),
        id: crypto.randomUUID(),
        version: crypto.randomUUID(),
      };
      data.labels.push(label);
      return label;
    });
  }
  async patchLabel(
    label: Label,
    body: { name: string; color: string | null; icon: string | null },
  ) {
    return this.change((data) => {
      const existing = data.labels.find((item) => item.id === label.id);
      if (!existing) throw new ApiError(404);
      if (existing.version !== label.version) throw new ApiError(409);
      const saved = {
        ...existing,
        ...this.labelBody(body),
        version: crypto.randomUUID(),
      };
      data.labels = data.labels.map((item) =>
        item.id === saved.id ? saved : item,
      );
      for (const note of data.notes)
        if (note.tags.some((tag) => tag.id === saved.id)) {
          note.tags = note.tags.map((tag) =>
            tag.id === saved.id ? saved : tag,
          );
          note.version = crypto.randomUUID();
        }
      return saved;
    });
  }
  async deleteLabel(id: string) {
    return this.change((data) => {
      data.labels = data.labels.filter((label) => label.id !== id);
      for (const note of data.notes)
        if (note.tags.some((tag) => tag.id === id)) {
          note.tags = note.tags.filter((tag) => tag.id !== id);
          note.version = crypto.randomUUID();
        }
      return true;
    });
  }
}
