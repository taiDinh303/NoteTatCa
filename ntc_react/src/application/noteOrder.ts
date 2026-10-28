import type { Note } from "../domain/models";
type Group = { ids: string[]; revision: number; error: boolean };
type Snapshot = Readonly<{ groups: ReadonlyMap<boolean, Group> }>;
const empty: Snapshot = { groups: new Map() };
export class NoteOrderCoordinator {
  private owner?: string;
  private generation = 0;
  private snapshot: Snapshot = empty;
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  private running = false;
  private readyAt = 0;
  private holds = 0;
  private idleWaiters = new Set<() => void>();
  hold() {
    this.holds++;
    clearTimeout(this.timer);
    const ready = this.running
      ? new Promise<void>((resolve) => this.idleWaiters.add(resolve))
      : Promise.resolve();
    return {
      ready,
      release: () => {
        this.holds--;
        if (!this.holds) this.schedule(0);
      },
    };
  }
  membership(id: string, pinned: boolean, position = 0) {
    if (this.owner !== this.identity()) return;
    const groups = new Map(this.snapshot.groups);
    for (const [key, group] of groups) {
      const ids = group.ids.filter((item) => item !== id);
      if (key === pinned)
        ids.splice(Math.min(Math.max(0, position), ids.length), 0, id);
      groups.set(key, { ...group, ids, revision: group.revision + 1 });
    }
    this.update(groups);
  }
  constructor(
    private identity: () => string | undefined,
    private load: (pinned: boolean) => Promise<Note[]>,
    private move: (
      id: string,
      previous: string | null,
      next: string | null,
    ) => Promise<void>,
    private publish: (notes: Note[]) => void,
  ) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => (this.owner === this.identity() ? this.snapshot : empty);
  reset = () => {
    clearTimeout(this.timer);
    this.generation++;
    this.running = false;
    this.owner = this.identity();
    this.update(new Map());
  };
  private update(groups: Map<boolean, Group>) {
    this.snapshot = { groups };
    this.listeners.forEach((fn) => fn());
  }
  private schedule(delay = 400) {
    clearTimeout(this.timer);
    this.readyAt = Date.now() + delay;
    this.timer = setTimeout(() => {
      void this.flush();
    }, delay);
  }
  reorder(group: Note[], from: number, to: number) {
    if (from === to || !group[from] || !group[to]) return;
    const owner = this.identity();
    if (!owner || group.some((note) => note.userId !== owner)) return;
    if (this.owner !== owner) {
      this.owner = owner;
      this.generation++;
      this.running = false;
      this.snapshot = empty;
    }
    const ids = group.map((note) => note.id);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    const pinned = group[0].isPinned;
    const groups = new Map(this.snapshot.groups);
    groups.set(pinned, {
      ids,
      revision: (groups.get(pinned)?.revision ?? 0) + 1,
      error: false,
    });
    this.update(groups);
    this.schedule();
  }
  retry = () => {
    if (this.owner !== this.identity()) return;
    this.update(
      new Map(
        [...this.snapshot.groups].map(([key, group]) => [
          key,
          { ...group, error: false },
        ]),
      ),
    );
    this.schedule(0);
  };
  private async flush() {
    if (this.running || this.holds || this.owner !== this.identity()) return;
    this.running = true;
    const generation = this.generation;
    const valid = () =>
      generation === this.generation &&
      this.owner === this.identity() &&
      !this.holds;
    try {
      for (const pinned of [true, false]) {
        if (!valid()) return;
        let target = this.snapshot.groups.get(pinned);
        if (!target || target.error) continue;
        try {
          let server = await this.load(pinned);
          if (!valid()) return;
          let current = server.map((note) => note.id);
          while (valid()) {
            target = this.snapshot.groups.get(pinned);
            if (!target) break;
            const revision = target.revision;
            // A pin/trash/create elsewhere may change membership. Keep surviving
            // requested positions and append new members from the server.
            const currentIds = new Set(current);
            const wanted = target.ids.filter((id) => currentIds.has(id));
            const wantedIds = new Set(wanted);
            wanted.push(...current.filter((id) => !wantedIds.has(id)));
            const index = wanted.findIndex((id, i) => id !== current[i]);
            if (index < 0) {
              server = await this.load(pinned);
              if (!valid()) return;
              if (this.snapshot.groups.get(pinned)?.revision !== revision) {
                current = server.map((n) => n.id);
                continue;
              }
              // Reconcile canonical sortOrder/version only once the batch settles.
              const actual = server.map((n) => n.id);
              if (actual.join() !== wanted.join())
                throw new Error(
                  "Note order changed elsewhere. Try saving again.",
                );
              this.publish(server);
              const groups = new Map(this.snapshot.groups);
              groups.delete(pinned);
              this.update(groups);
              break;
            }
            // A drag from the first cell to the last should be one request,
            // rather than moving every intervening card forward one by one.
            const displaced = current[index];
            const displacedIndex = wanted.indexOf(displaced);
            const candidate = (id: string, at: number) => {
              const ids = current.filter((item) => item !== id);
              ids.splice(at, 0, id);
              return ids.filter((item, i) => item === wanted[i]).length;
            };
            const useDisplaced =
              candidate(displaced, displacedIndex) >
              candidate(wanted[index], index);
            const id = useDisplaced ? displaced : wanted[index];
            const destination = useDisplaced ? displacedIndex : index;
            const without = current.filter((item) => item !== id);
            await this.move(
              id,
              without[destination - 1] ?? null,
              without[destination] ?? null,
            );
            if (!valid()) return;
            without.splice(destination, 0, id);
            current = without;
          }
        } catch {
          if (!valid()) return;
          const groups = new Map(this.snapshot.groups);
          const latest = groups.get(pinned);
          if (latest) groups.set(pinned, { ...latest, error: true });
          this.update(groups);
        }
      }
    } finally {
      if (generation === this.generation) this.running = false;
      this.idleWaiters.forEach((resolve) => resolve());
      this.idleWaiters.clear();
      if (valid()) {
        if ([...this.snapshot.groups.values()].some((group) => !group.error))
          this.schedule(Math.max(0, this.readyAt - Date.now()));
      }
    }
  }
}
