export interface ConnectionSnapshot {
  pending: number;
  slow: boolean;
  warming: boolean;
  attempt: number;
  problem: "offline" | "unavailable" | null;
}

export const isConnectionError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  [0, 502, 503, 504].includes(Number(error.status));

/** Observes real requests; probes only on sign-in/restore or an explicit retry. */
export class ServerConnection {
  private snapshot: ConnectionSnapshot = {
    pending: 0,
    slow: false,
    warming: false,
    attempt: 0,
    problem: null,
  };
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  private flight?: Promise<void>;
  private lastReady = 0;
  constructor(
    private readonly healthUrl: string,
    private readonly transport: typeof fetch = globalThis.fetch.bind(
      globalThis,
    ),
    private readonly online: () => boolean = () =>
      typeof navigator === "undefined" || navigator.onLine,
    private readonly budgetMs = 120_000,
  ) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit(patch: Partial<ConnectionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  begin() {
    if (!this.snapshot.pending) {
      this.timer = setTimeout(() => this.emit({ slow: true }), 1500);
    }
    this.emit({ pending: this.snapshot.pending + 1 });
    return (error?: unknown) => {
      const pending = Math.max(0, this.snapshot.pending - 1);
      if (!pending) clearTimeout(this.timer);
      if (isConnectionError(error)) {
        this.lastReady = 0;
        this.emit({
          pending,
          slow: pending ? this.snapshot.slow : false,
          problem: this.online() ? "unavailable" : "offline",
        });
      } else {
        if (!error) this.lastReady = Date.now();
        this.emit({
          pending,
          slow: pending ? this.snapshot.slow : false,
          ...(!error ? { problem: null } : {}),
        });
      }
    };
  }
  reportOffline() {
    this.lastReady = 0;
    this.emit({ problem: "offline" });
  }
  ensureReady = (): Promise<void> => {
    if (this.flight) return this.flight;
    if (this.online() && Date.now() - this.lastReady < 30_000)
      return Promise.resolve();
    this.flight = this.probe().finally(() => {
      this.flight = undefined;
    });
    return this.flight;
  };
  private async probe() {
    const deadline = Date.now() + this.budgetMs;
    const finish = this.begin();
    this.emit({ warming: true, attempt: 0 });
    let failure: unknown;
    try {
      while (Date.now() < deadline) {
        if (!this.online())
          throw Object.assign(
            new Error("You are offline. Reconnect and try again."),
            { status: 0 },
          );
        this.emit({ attempt: this.snapshot.attempt + 1 });
        try {
          const response = await this.transport(this.healthUrl, {
            method: "GET",
            cache: "no-store",
            credentials: "omit",
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(
              Math.max(1, Math.min(15_000, deadline - Date.now())),
            ),
          });
          // A Render wake-up HTML page is not evidence that the API is ready.
          const body =
            response.ok &&
            response.headers.get("content-type")?.includes("application/json")
              ? await response.json()
              : null;
          if (response.ok && body?.status === "live") {
            this.lastReady = Date.now();
            return;
          }
          if (
            response.status >= 400 &&
            response.status < 500 &&
            response.status !== 429
          )
            throw Object.assign(
              new Error(
                "The server address could not be reached. Check the API configuration.",
              ),
              { status: response.status },
            );
        } catch (error) {
          if (
            typeof error === "object" &&
            error &&
            "status" in error &&
            Number(error.status) >= 400
          )
            throw error;
        }
        const delay = Math.min(
          1000 * 2 ** Math.min(this.snapshot.attempt - 1, 3),
          deadline - Date.now(),
        );
        if (delay > 0)
          await new Promise((resolve) => setTimeout(resolve, delay));
      }
      throw Object.assign(
        new Error(
          "The server is taking longer to respond. Please try connecting again.",
        ),
        { status: 0 },
      );
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      this.emit({ warming: false });
      finish(failure);
    }
  }
}

export function healthUrl(apiBase: string) {
  return /^https?:\/\//i.test(apiBase)
    ? new URL("/health/live", apiBase).toString()
    : "/health/live";
}
