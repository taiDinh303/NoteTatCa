import type { Label, NoteDraft } from "../domain/models";
import { draftFrom } from "../domain/models";
import type { GuestStore } from "../infrastructure/guestStore";
import type {
  NotesRepository,
  LabelsRepository,
} from "../infrastructure/repositories";
import { ApiError } from "../infrastructure/http";

/** Copy, never merge over existing account notes. Progress survives interrupted imports. */
export class GuestTransferService {
  private flight?: Promise<boolean>;
  constructor(
    private store: GuestStore,
    private notes: Pick<NotesRepository, "create" | "trash" | "findTrashed">,
    private labels: Pick<LabelsRepository, "list" | "create">,
    private owner: () => string | undefined,
    private lock: (action: () => Promise<boolean>) => Promise<boolean>,
  ) {}
  copy(): Promise<boolean> {
    if (this.flight) return this.flight;
    this.flight = this.lock(() => this.run()).finally(() => {
      this.flight = undefined;
    });
    return this.flight;
  }
  private async run(): Promise<boolean> {
    const owner = this.owner();
    if (!owner) throw new Error("Sign in to copy guest notes to your account.");
    const guard = () => {
      if (this.owner() !== owner) throw new Error("Account changed");
    };
    const source = await this.store.read();
    guard();
    if (!source.initialized) return true;
    await this.store.change((data) => {
      guard();
      data.transfers[owner] ??= { labels: {}, notes: {} };
    });
    const available: Label[] = [];
    for (let page = 1; ; page++) {
      guard();
      const result = await this.labels.list(page);
      guard();
      available.push(...result.items);
      if (!result.hasNextPage) break;
    }
    const mapped = new Map<string, string>();
    const claimedLabels = new Set<string>();
    for (const label of source.labels) {
      guard();
      const slot = label.id + ":" + label.version;
      const progress = (await this.store.read()).transfers[owner];
      let server = available.find(
        (item) =>
          item.id === progress.labels[slot] && !claimedLabels.has(item.id),
      );
      // Reconcile a lost label-create response by exact attributes, not name alone.
      server ??= available.find(
        (item) =>
          !claimedLabels.has(item.id) &&
          item.name === label.name &&
          (item.color ?? "").toLowerCase() ===
            (label.color ?? "").toLowerCase() &&
          (item.icon ?? "") === (label.icon ?? ""),
      );
      if (!server) {
        server = await this.labels.create({
          name: label.name,
          color: label.color,
          icon: label.icon,
        });
        guard();
        available.push(server);
      }
      const id = server.id;
      mapped.set(label.id, id);
      claimedLabels.add(id);
      await this.store.change((data) => {
        guard();
        data.transfers[owner].labels[slot] = id;
      });
    }
    for (const note of source.notes) {
      guard();
      const slot = note.id + ":" + note.version;
      const draft: NoteDraft = {
        ...draftFrom(note),
        tagIds: note.tags.map((tag) => {
          const id = mapped.get(tag.id);
          if (!id)
            throw new Error(
              "A guest label is missing. Your notes have been kept.",
            );
          return id;
        }),
      };
      const progress = await this.store.change((data) => {
        guard();
        return (data.transfers[owner].notes[slot] ??= {
          key: crypto.randomUUID(),
          draft,
        });
      });
      if (progress.complete) continue;
      let id = progress.serverId;
      if (!id) {
        guard();
        const saved = await this.notes.create(progress.draft!, progress.key);
        guard();
        id = saved.id;
        if (saved.userId !== owner) throw new Error("Account changed");
        const comparable = (draft: NoteDraft) =>
          JSON.stringify({
            ...draft,
            title: draft.title.trim(),
            backgroundColor: draft.backgroundColor.toLowerCase(),
            iconEmoji: draft.iconEmoji.trim(),
            tagIds: [...draft.tagIds].sort(),
          });
        if (comparable(draftFrom(saved)) !== comparable(progress.draft!))
          throw new Error(
            "A copied note changed in your account. Guest data was kept.",
          );
        await this.store.change((data) => {
          guard();
          data.transfers[owner].notes[slot].serverId = saved.id;
        });
      }
      if (note.deletedTime) {
        guard();
        try {
          await this.notes.trash(id);
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 404)) throw error;
          await this.notes.findTrashed(id);
        }
      }
      guard();
      await this.store.change((data) => {
        guard();
        data.transfers[owner].notes[slot].complete = true;
      });
    }
    guard();
    return this.store.change((data) => {
      guard();
      // Another tab may have edited the demo while the network was busy.
      if (data.revision !== source.revision) return false;
      data.initialized = false;
      data.notes = [];
      data.labels = [];
      data.creates = {};
      data.transfers = {};
      data.revision++;
      return true;
    });
  }
}
