export class LogoutProtection {
  private snapshot = false;
  private listeners = new Set<() => void>();
  private flight?: Promise<boolean>;
  private resolve?: (value: boolean) => void;
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  request() {
    if (this.flight) return this.flight;
    this.flight = new Promise<boolean>((resolve) => {
      this.resolve = resolve;
    });
    this.snapshot = true;
    this.listeners.forEach((f) => f());
    return this.flight;
  }
  finish(value: boolean) {
    this.snapshot = false;
    this.resolve?.(value);
    this.resolve = undefined;
    this.flight = undefined;
    this.listeners.forEach((f) => f());
  }
}
