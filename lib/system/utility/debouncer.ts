/**
 * A simple debouncer for a single callback. Each call to `schedule` resets the
 * timer. Call `flush` to cancel the timer and invoke the callback immediately,
 * or `cancel` to discard it.
 */
export class Debouncer {
  private pending: { timer: ReturnType<typeof setTimeout>; fn: () => void } | null = null;

  schedule(fn: () => void, delay: number): void {
    if (this.pending) clearTimeout(this.pending.timer);
    this.pending = {
      fn,
      timer: setTimeout(() => {
        this.pending = null;
        fn();
      }, delay),
    };
  }

  /** Cancel the pending call and invoke it immediately, if one is scheduled. */
  flush(): void {
    if (!this.pending) return;
    const { timer, fn } = this.pending;
    clearTimeout(timer);
    this.pending = null;
    fn();
  }

  /** Cancel the pending call without invoking it. */
  cancel(): void {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    this.pending = null;
  }
}

/**
 * A debouncer that tracks pending callbacks by string key, for scenarios where
 * multiple independent items each need their own debounce timer (e.g. per-row
 * auto-save in a list).
 *
 * Each call to `schedule(key, ...)` resets the timer for that key only. Call
 * `flush(key)` to save immediately on blur, and `cancelAll()` on unmount.
 */
export class KeyedDebouncer {
  private pending: Record<string, { timer: ReturnType<typeof setTimeout>; fn: () => void }> = {};

  schedule(key: string, fn: () => void, delay: number): void {
    if (this.pending[key]) clearTimeout(this.pending[key].timer);
    this.pending[key] = {
      fn,
      timer: setTimeout(() => {
        delete this.pending[key];
        fn();
      }, delay),
    };
  }

  /** Cancel the pending call for key and invoke it immediately, if one is scheduled. */
  flush(key: string): void {
    const entry = this.pending[key];
    if (!entry) return;
    clearTimeout(entry.timer);
    delete this.pending[key];
    entry.fn();
  }

  /** Cancel the pending call for key without invoking it. */
  cancel(key: string): void {
    if (!this.pending[key]) return;
    clearTimeout(this.pending[key].timer);
    delete this.pending[key];
  }

  /** Cancel all pending calls. Call this on component unmount. */
  cancelAll(): void {
    for (const { timer } of Object.values(this.pending)) {
      clearTimeout(timer);
    }
    this.pending = {};
  }
}
