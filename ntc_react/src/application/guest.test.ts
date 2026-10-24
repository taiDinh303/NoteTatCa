import { describe, expect, it, vi } from "vitest";
import { GuestWorkspace, guestSession } from "./guest";
import { GuestTransferService } from "./guestTransfer";
import {
  emptyGuest,
  type GuestData,
  type GuestStore,
} from "../infrastructure/guestStore";
import {
  draftFrom,
  type Label,
  type Note,
  type NoteDraft,
} from "../domain/models";
import { offlinePage } from "./offline";
import { ApiError } from "../infrastructure/http";

class MemoryGuestStore implements GuestStore {
  data = emptyGuest();
  async read() {
    return structuredClone(this.data);
  }
  async change<T>(update: (data: GuestData) => T) {
    const data = structuredClone(this.data);
    const result = update(data);
    this.data = data;
    return result;
  }
}
function setup() {
  const store = new MemoryGuestStore();
  return { store, guest: new GuestWorkspace(store) };
}
describe("local guest workspace", () => {
  it("seeds once and persists CRUD, labels and 30-day trash across service instances", async () => {
    const f = setup();
    await f.guest.ensure();
    const original = await f.store.read();
    await f.guest.ensure();
    expect((await f.store.read()).notes.map((n) => n.id)).toEqual(
      original.notes.map((n) => n.id),
    );
    const label = await f.guest.createLabel({
      name: "Custom",
      color: "#123456",
      icon: null,
    });
    const draft = {
      ...draftFrom(),
      title: "My guest note",
      tagIds: [label.id],
    };
    const created = await f.guest.create(draft, "request");
    expect((await f.guest.create(draft, "request")).id).toBe(created.id);
    const saved = await f.guest.patch(
      created.id,
      { ...draft, title: "Updated" },
      created.version,
    );
    await expect(
      f.guest.patch(created.id, draft, created.version),
    ).rejects.toMatchObject({ status: 409 });
    const reopened = new GuestWorkspace(f.store);
    expect((await reopened.find(created.id)).title).toBe("Updated");
    const renamed = await reopened.patchLabel(label, {
      name: "Renamed",
      color: "#123456",
      icon: null,
    });
    expect((await reopened.find(created.id)).tags[0].name).toBe(renamed.name);
    await reopened.trash(saved.id);
    expect((await reopened.list({ trash: true })).items).toHaveLength(1);
    await reopened.restore(saved.id);
    await reopened.trash(saved.id);
    await reopened.delete(saved.id);
    await expect(reopened.find(saved.id)).rejects.toMatchObject({
      status: 404,
    });
    expect(guestSession().token).toBe("");
    expect(guestSession().roles).toEqual(["Guest"]);
  });
  it("reorders within a pinned group and resets only local content", async () => {
    const f = setup();
    await f.guest.ensure();
    const items = (await f.guest.list({ pinned: false })).items;
    await f.guest.reorder(items[1].id, items[1].version, null, items[0].id);
    expect((await f.guest.list({ pinned: false })).items[0].id).toBe(
      items[1].id,
    );
    await f.guest.create({ ...draftFrom(), title: "Discard on reset" }, "new");
    await f.guest.reset();
    expect((await f.guest.list({})).items).toHaveLength(3);
    expect((await f.guest.list({ q: "Discard on reset" })).items).toHaveLength(
      0,
    );
  });
  it("does not acknowledge a guest save if storage fails", async () => {
    const f = setup();
    await f.guest.ensure();
    vi.spyOn(f.store, "change").mockRejectedValueOnce(
      new Error("Quota exceeded"),
    );
    await expect(f.guest.create(draftFrom(), "new")).rejects.toThrow(
      "Quota exceeded",
    );
    expect((await f.store.read()).notes).toHaveLength(3);
  });
});
function transferSetup(store: MemoryGuestStore) {
  let owner: string | undefined = "account-a";
  const serverLabels: Label[] = [];
  const serverNotes = new Map<string, Note>();
  const calls: string[] = [];
  const labels = {
    list: vi.fn(async () => offlinePage(serverLabels)),
    create: vi.fn(async (body: Omit<Label, "id" | "version">) => {
      const label = { ...body, id: crypto.randomUUID(), version: "server" };
      serverLabels.push(label);
      return label;
    }),
  };
  const notes = {
    create: vi.fn(async (draft: NoteDraft, key: string): Promise<Note> => {
      calls.push(key);
      if (serverNotes.has(key)) return serverNotes.get(key)!;
      const source = store.data.notes[0];
      const saved: Note = {
        ...source,
        ...draft,
        id: crypto.randomUUID(),
        userId: owner!,
        version: "server",
        tags: serverLabels.filter((l) => draft.tagIds.includes(l.id)),
        deletedTime: null,
      };
      serverNotes.set(key, saved);
      return saved;
    }),
    trash: vi.fn(async () => true),
    findTrashed: vi.fn(async () => store.data.notes[0]),
  };
  const transfer = new GuestTransferService(
    store,
    notes,
    labels,
    () => owner,
    (action) => action(),
  );
  return {
    transfer,
    notes,
    labels,
    calls,
    serverNotes,
    serverLabels,
    switchOwner: (value?: string) => {
      owner = value;
    },
  };
}
describe("guest account copy", () => {
  it("copies new notes with mapped labels and clears the guest only after success", async () => {
    const f = setup();
    await f.guest.ensure();
    const t = transferSetup(f.store);
    expect(await t.transfer.copy()).toBe(true);
    expect(t.serverNotes.size).toBe(3);
    expect(t.serverLabels).toHaveLength(3);
    expect((await f.store.read()).initialized).toBe(false);
  });
  it("retries an ambiguous create with the same key and keeps data until the retry finishes", async () => {
    const f = setup();
    await f.guest.ensure();
    const t = transferSetup(f.store);
    const create = t.notes.create.getMockImplementation()!;
    let lost = true;
    t.notes.create.mockImplementation(async (draft, key) => {
      const saved = await create(draft, key);
      if (lost) {
        lost = false;
        throw new ApiError(0);
      }
      return saved;
    });
    await expect(t.transfer.copy()).rejects.toMatchObject({ status: 0 });
    expect((await f.store.read()).notes).toHaveLength(3);
    await t.transfer.copy();
    expect(t.serverNotes.size).toBe(3);
    expect(t.calls[0]).toBe(t.calls[1]);
  });
  it("keeps edits made in another guest tab during the copy and skips completed versions on retry", async () => {
    const f = setup();
    await f.guest.ensure();
    const t = transferSetup(f.store);
    const create = t.notes.create.getMockImplementation()!;
    let edit = true;
    t.notes.create.mockImplementation(async (draft, key) => {
      const saved = await create(draft, key);
      if (edit) {
        edit = false;
        const note = (await f.store.read()).notes[0];
        await f.guest.patch(
          note.id,
          { ...draftFrom(note), title: "New guest edit" },
          note.version,
        );
      }
      return saved;
    });
    expect(await t.transfer.copy()).toBe(false);
    expect((await f.store.read()).notes[0].title).toBe("New guest edit");
    expect(await t.transfer.copy()).toBe(true);
    expect(t.serverNotes.size).toBe(4);
  });
  it("stops after an account change and does not clear the guest or mark the other account complete", async () => {
    const f = setup();
    await f.guest.ensure();
    const t = transferSetup(f.store);
    t.labels.list.mockImplementationOnce(async () => {
      t.switchOwner("account-b");
      return offlinePage([]);
    });
    await expect(t.transfer.copy()).rejects.toThrow("Account changed");
    expect(t.notes.create).not.toHaveBeenCalled();
    expect((await f.store.read()).notes).toHaveLength(3);
  });
  it("preserves distinct guest labels with identical names and attributes", async () => {
    const f = setup();
    await f.guest.ensure();
    const label = (await f.store.read()).labels[0];
    await f.guest.createLabel({
      name: label.name,
      color: label.color,
      icon: label.icon,
    });
    const t = transferSetup(f.store);
    await t.transfer.copy();
    expect(t.serverLabels).toHaveLength(4);
  });
  it("does not clear the guest when a replayed copy has been edited in the account", async () => {
    const f = setup();
    await f.guest.ensure();
    const t = transferSetup(f.store);
    const create = t.notes.create.getMockImplementation()!;
    t.notes.create.mockImplementationOnce(async (draft, key) => ({
      ...(await create(draft, key)),
      title: "Edited elsewhere",
    }));
    await expect(t.transfer.copy()).rejects.toThrow("Guest data was kept");
    expect((await f.store.read()).notes).toHaveLength(3);
  });
});
