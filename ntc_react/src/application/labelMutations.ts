import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";
import type { Label, Page } from "../domain/models";

type LabelInput = Pick<Label, "name" | "color" | "icon">;
type Snapshot = { creating: Label[]; deleting: string[] };
type Repository = {
  create: (input: LabelInput) => Promise<Label>;
  delete: (id: string) => Promise<unknown>;
};

// Temporary create IDs stay in the manager, never in note-assignment queries.
// Delete overlays survive modal remounts and are shared by label readers.
export class LabelMutations {
  private snapshot: Snapshot = { creating: [], deleting: [] };
  private listeners = new Set<() => void>();
  private generation = 0;
  constructor(
    private repository: Repository,
    private cache: QueryClient,
    private key: (resource: string) => QueryKey,
    private identity: () => string | undefined,
    private report: (
      action: "create" | "delete",
      label: Label,
      error: unknown,
    ) => void,
  ) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit(snapshot: Snapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
  reset = () => {
    this.generation++;
    this.emit({ creating: [], deleting: [] });
  };
  private update(key: QueryKey, label: Label, remove: boolean) {
    const previous = this.cache.getQueryData<InfiniteData<Page<Label>>>(key);
    const reconcile =
      !previous?.pages.length || !!previous.pages.at(-1)?.hasNextPage;
    this.cache.setQueryData<InfiniteData<Page<Label>>>(key, (data) => {
      if (!data?.pages.length)
        return remove
          ? data
          : {
              pageParams: [1],
              pages: [
                {
                  items: [label],
                  currentPage: 1,
                  totalPages: 1,
                  totalItems: 1,
                  pageSize: 100,
                  hasNextPage: false,
                  hasPreviousPage: false,
                },
              ],
            };
      const exists = data.pages.some((page) =>
        page.items.some((item) => item.id === label.id),
      );
      const delta = remove ? (exists ? -1 : 0) : exists ? 0 : 1;
      return {
        ...data,
        pages: data.pages.map((page, index) => ({
          ...page,
          totalItems: Math.max(0, page.totalItems + delta),
          items: [
            ...(!remove && index === 0 ? [label] : []),
            ...page.items.filter((item) => item.id !== label.id),
          ],
        })),
      };
    });
    return reconcile;
  }
  async create(input: LabelInput) {
    const owner = this.identity(),
      generation = this.generation;
    if (!owner) return;
    const key = this.key("labels");
    const pending: Label = {
      ...input,
      id: `pending:${crypto.randomUUID()}`,
      version: "",
    };
    const current = () =>
      owner === this.identity() && generation === this.generation;
    this.emit({
      ...this.snapshot,
      creating: [...this.snapshot.creating, pending],
    });
    let reconcile = true;
    try {
      await this.cache.cancelQueries({ queryKey: key });
      if (!current()) return;
      const saved = await this.repository.create(input);
      if (!current()) return;
      await this.cache.cancelQueries({ queryKey: key });
      if (!current()) return;
      reconcile = this.update(key, saved, false);
      return saved;
    } catch (error) {
      if (current()) this.report("create", pending, error);
      throw error;
    } finally {
      if (current()) {
        this.emit({
          ...this.snapshot,
          creating: this.snapshot.creating.filter(
            (label) => label.id !== pending.id,
          ),
        });
        // Complete lists can use the canonical acknowledgement directly.
        // Partial lists need background reconciliation for server page boundaries.
        if (reconcile)
          void this.cache.invalidateQueries({ queryKey: key }).catch(() => {});
      }
    }
  }
  async delete(label: Label) {
    const owner = this.identity(),
      generation = this.generation;
    if (!owner || this.snapshot.deleting.includes(label.id)) return;
    const key = this.key("labels"),
      notesKey = this.key("notes");
    const current = () =>
      owner === this.identity() && generation === this.generation;
    this.emit({
      ...this.snapshot,
      deleting: [...this.snapshot.deleting, label.id],
    });
    let saved = false;
    let reconcile = true;
    try {
      await this.cache.cancelQueries({ queryKey: key });
      if (!current()) return;
      await this.repository.delete(label.id);
      if (!current()) return;
      await this.cache.cancelQueries({ queryKey: key });
      if (!current()) return;
      saved = true;
      reconcile = this.update(key, label, true);
    } catch (error) {
      if (current()) this.report("delete", label, error);
      throw error;
    } finally {
      if (current()) {
        this.emit({
          ...this.snapshot,
          deleting: this.snapshot.deleting.filter((id) => id !== label.id),
        });
        if (reconcile)
          void this.cache.invalidateQueries({ queryKey: key }).catch(() => {});
        if (saved)
          void this.cache
            .invalidateQueries({ queryKey: notesKey })
            .catch(() => {});
      }
    }
  }
}
