import { describe, expect, it, vi } from "vitest";
import { OfflineNotes } from "./offline";
import { emptyOfflineData } from "../infrastructure/offlineStore";
import type { OfflineData, OfflineStore } from "../infrastructure/offlineStore";
import { ApiError } from "../infrastructure/http";
import { ApiClient } from "../infrastructure/http";
import { OfflineNotesRepository } from "../infrastructure/offlineRepositories";
import { draftFrom, plainDocument } from "../domain/models";
import type { Note, NoteDraft } from "../domain/models";
const note = (id = "n", content = "old", version = "v1"): Note => ({
  id,
  userId: "a",
  title: "Note",
  content,
  documentJson: JSON.stringify(plainDocument(content)),
  documentSchemaVersion: 1,
  version,
  iconEmoji: "",
  backgroundColor: "",
  isPinned: false,
  pinnedAt: null,
  sortOrder: 1,
  tags: [],
  reminders: [],
  createdTime: "",
  lastUpdatedTime: "",
  deletedTime: null,
});
class MemoryStore implements OfflineStore {
  data = new Map<string, OfflineData>();
  async read(owner: string) {
    return structuredClone(this.data.get(owner) ?? emptyOfflineData());
  }
  async change<T>(owner: string, update: (data: OfflineData) => T) {
    const data = await this.read(owner);
    const result = update(data);
    this.data.set(owner, data);
    return result;
  }
  async clear(owner: string) {
    this.data.delete(owner);
  }
}
function setup() {
  const store = new MemoryStore();
  let online = false;
  let owner: string | undefined = "a";
  const remote = {
    find: vi.fn(async () => note()),
    create: vi.fn(async (draft: NoteDraft, _key: string): Promise<Note> => ({
      ...note("server", "", "v2"),
      ...draft,
    })),
    patch: vi.fn(
      async (
        id: string,
        draft: NoteDraft,
        _version: string,
      ): Promise<Note> => ({
        ...note(id, "", "v3"),
        ...draft,
      }),
    ),
  };
  const committed = vi.fn();
  const offline = new OfflineNotes(
    store,
    () => owner,
    remote,
    () => online,
    () => online,
    committed,
    async (_name, fn) => fn(),
  );
  return {
    store,
    offline,
    remote,
    committed,
    connect: () => {
      online = true;
    },
    owner: (value?: string) => {
      owner = value;
    },
  };
}
describe("offline notes", () => {
  it("commits an online edit locally before its server acknowledgement", async () => {
    const f = setup();
    await f.offline.rememberPage([note()]);
    expect((await f.store.read("a")).complete).toBe(false);
    expect((await f.offline.cachedList({}, 1)).items).toHaveLength(1);
    let acknowledge!: (note: Note) => void;
    f.remote.patch.mockImplementationOnce(() => new Promise(resolve => { acknowledge = resolve; }));
    f.connect();
    const repository = new OfflineNotesRepository(new ApiClient("/api/v1"), f.offline, () => true);
    const local = await repository.patch("n", { ...draftFrom(note()), title: "Local first" }, "v1");
    expect(local.version).toMatch(/^local:/);
    expect((await f.store.read("a")).notes[0].title).toBe("Local first");
    await vi.waitFor(() => expect(f.remote.patch).toHaveBeenCalled());
    expect(f.offline.getSnapshot().pending).toBe(1);
    acknowledge({ ...local, version: "v2" });
    await f.offline.sync();
    expect(f.offline.getSnapshot().pending).toBe(0);
    expect((await f.offline.resolveWrite("n", local.version)).version).toBe("v2");
  });
  it("keeps a newly saved note recoverable before create returns its server ID", async () => {
    const f = setup();
    let acknowledge!: (note: Note) => void;
    f.remote.create.mockImplementationOnce(() => new Promise(resolve => { acknowledge = resolve; }));
    f.connect();
    const repository = new OfflineNotesRepository(new ApiClient("/api/v1"), f.offline, () => true);
    const local = await repository.create(draftFrom(), "new-key");
    expect(local.id).toBe("local-new-key");
    expect((await f.store.read("a")).pending[0].key).toBe("new-key");
    await vi.waitFor(() => expect(f.remote.create).toHaveBeenCalled());
    acknowledge({ ...local, id: "server", version: "v2" });
    await f.offline.sync();
    expect((await f.offline.resolveWrite(local.id, local.version)).id).toBe("server");
  });
  it("does not let an older detail GET overwrite a draft committed while it was in flight", async () => {
    const f = setup();
    await f.offline.rememberPage([note()]);
    let returnGet!: (note: Note) => void;
    let acknowledge!: (note: Note) => void;
    f.remote.find.mockImplementationOnce(() => new Promise(resolve => { returnGet = resolve; }));
    f.remote.patch.mockImplementationOnce(() => new Promise(resolve => { acknowledge = resolve; }));
    f.connect();
    const reading = f.offline.find("n");
    await vi.waitFor(() => expect(f.remote.find).toHaveBeenCalled());
    const local = await f.offline.save("n", { ...draftFrom(note()), title: "New draft" }, "v1");
    returnGet(note());
    expect((await reading).title).toBe("New draft");
    await vi.waitFor(() => expect(f.remote.patch).toHaveBeenCalled());
    acknowledge({ ...local, version: "v2" });
    await f.offline.sync();
  });
  it("never falls back to a remote write on a stale local version", async () => {
    const f = setup();
    await f.offline.rememberPage([note()]);
    await f.offline.save("n", { ...draftFrom(note()), title: "Other tab" }, "v1");
    const transport = vi.fn();
    const repository = new OfflineNotesRepository(new ApiClient("/api/v1", transport), f.offline, () => true);
    await expect(repository.patch("n", draftFrom(note()), "v1")).rejects.toMatchObject({ status: 409 });
    expect(transport).not.toHaveBeenCalled();
  });
  it("discards detail content when the account changes during its device-cache write", async () => {
    const f = setup();
    await f.offline.rememberPage([note()]);
    f.connect();
    vi.spyOn(f.offline, "rememberOne").mockImplementationOnce(async () => { f.owner("b"); });
    await expect(f.offline.find("n")).rejects.toThrow("Account changed");
  });
  it("keeps edits through a new coordinator, filters local content and syncs the expected version", async () => {
    const f = setup();
    await f.offline.rememberNotes([note()]);
    const draft = {
      ...draftFrom(note()),
      title: "Offline edit",
      documentJson: JSON.stringify(plainDocument("new content")),
    };
    await f.offline.save("n", draft, "v1");
    expect(
      (await f.offline.cachedList({ q: "new content" }, 1)).items[0].title,
    ).toBe("Offline edit");
    expect(f.remote.patch).not.toHaveBeenCalled();
    await f.offline.refresh();
    expect(f.offline.getSnapshot().pending).toBe(1);
    f.connect();
    await f.offline.sync();
    expect(f.remote.patch).toHaveBeenCalledWith("n", draft, "v1");
    expect((await f.store.read("a")).pending).toEqual([]);
    expect(await f.offline.resolveWrite("n", "v1")).toEqual({
      id: "n",
      version: "v3",
    });
  });
  it("replays the exact create key/payload then patches later edits using the assigned server ID", async () => {
    const f = setup();
    const first = { ...draftFrom(), title: "First" };
    const local = await f.offline.save(undefined, first, "local", "key");
    const later = { ...first, title: "Later" };
    await f.offline.save(local.id, later, local.version, "edit-key");
    f.connect();
    await f.offline.sync();
    expect(f.remote.create).toHaveBeenCalledExactlyOnceWith(first, "key");
    expect(f.remote.patch).toHaveBeenCalledExactlyOnceWith(
      "server",
      later,
      "v2",
    );
    expect(await f.offline.resolveWrite(local.id, "local")).toEqual({
      id: "server",
      version: "v3",
    });
    expect((await f.store.read("a")).notes.map((n) => n.id)).toEqual([
      "server",
    ]);
  });
  it("does not overwrite an external edit on conflict and retains a recoverable copy", async () => {
    const f = setup();
    await f.offline.rememberNotes([note()]);
    await f.offline.save("n", { ...draftFrom(note()), title: "Local" }, "v1");
    f.remote.patch.mockRejectedValueOnce(new ApiError(409));
    f.remote.find.mockResolvedValueOnce(note("n", "External", "v5"));
    f.connect();
    await f.offline.sync();
    expect(f.offline.getSnapshot().conflicts).toHaveLength(1);
    expect((await f.offline.exportPending()).notes[0].title).toBe("Local");
    await f.offline.resolve("n", true);
    await f.offline.sync();
    expect(f.remote.create.mock.calls[0][0].title).toContain("offline copy");
  });
  it("acknowledges an ambiguous PATCH response only if the online draft matches exactly", async () => {
    const f = setup();
    await f.offline.rememberNotes([note()]);
    await f.offline.save("n", draftFrom(note()), "v1");
    f.remote.patch.mockRejectedValueOnce(new ApiError(409));
    f.remote.find.mockResolvedValueOnce(note("n", "old", "v5"));
    f.connect();
    await f.offline.sync();
    expect(f.offline.getSnapshot().pending).toBe(0);
    expect(f.offline.getSnapshot().conflicts).toEqual([]);
  });
  it("keeps pending work on network failure and never sends it as another account", async () => {
    const f = setup();
    await f.offline.rememberNotes([note()]);
    await f.offline.save("n", draftFrom(note()), "v1");
    f.remote.patch.mockRejectedValueOnce(new ApiError(0));
    f.connect();
    await f.offline.sync();
    expect(f.offline.getSnapshot().pending).toBe(1);
    f.owner("b");
    await f.offline.sync();
    expect(f.remote.patch).toHaveBeenCalledTimes(1);
    expect(
      await f.offline.cachedList({}, 1).catch(() => undefined),
    ).toBeUndefined();
    expect((await f.store.read("a")).pending).toHaveLength(1);
  });
  it("does not report a local save when durable storage fails", async () => {
    const f = setup();
    vi.spyOn(f.store, "change").mockRejectedValueOnce(
      new Error("Quota exceeded"),
    );
    await expect(
      f.offline.save(undefined, draftFrom(), "local"),
    ).rejects.toThrow("Quota exceeded");
    expect(f.offline.getSnapshot().pending).toBe(0);
  });
  it("rejects stale local versions from another tab without losing either draft", async () => {
    const f = setup();
    await f.offline.rememberNotes([note()]);
    await f.offline.save(
      "n",
      { ...draftFrom(note()), title: "First tab" },
      "v1",
    );
    await expect(
      f.offline.save("n", { ...draftFrom(note()), title: "Second tab" }, "v1"),
    ).rejects.toMatchObject({ status: 409 });
    expect((await f.store.read("a")).notes[0].title).toBe("First tab");
    expect((await f.store.read("a")).pending).toHaveLength(1);
  });
  it("does not overwrite edits returned by a replayed create from another device", async () => {
    const f = setup();
    const local = await f.offline.save(
      undefined,
      { ...draftFrom(), title: "Original" },
      "local",
      "original-key",
    );
    await f.offline.save(
      local.id,
      { ...draftFrom(), title: "Later local edit" },
      local.version,
    );
    f.remote.create.mockResolvedValueOnce(
      note("server", "External edit", "v8"),
    );
    f.connect();
    await f.offline.sync();
    expect(f.remote.patch).not.toHaveBeenCalled();
    expect(f.offline.getSnapshot().conflicts[0].draft.title).toBe(
      "Later local edit",
    );
    expect((await f.store.read("a")).pending).toHaveLength(2);
  });
  it("coalesces never-sent edits while keeping the original server version", async () => {
    const f = setup();
    await f.offline.rememberNotes([note()]);
    const first = await f.offline.save(
      "n",
      { ...draftFrom(note()), title: "First" },
      "v1",
    );
    const latest = { ...draftFrom(note()), title: "Latest" };
    await f.offline.save("n", latest, first.version);
    expect((await f.store.read("a")).pending).toHaveLength(1);
    f.connect();
    await f.offline.sync();
    expect(f.remote.patch).toHaveBeenCalledExactlyOnceWith("n", latest, "v1");
  });
});
