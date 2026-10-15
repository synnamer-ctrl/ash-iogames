/**
 * Snapshot-based undo/redo. Stores whole scene snapshots (cheap because
 * completed strokes are shared, immutable objects) and ignores duplicates.
 */
export class UndoStack<T> {
  private past: T[] = [];
  private future: T[] = [];
  private present: T | null = null;

  constructor(private readonly limit = 40, private readonly equals: (a: T, b: T) => boolean = (a, b) => JSON.stringify(a) === JSON.stringify(b)) {}

  reset(state: T): void {
    this.past = [];
    this.future = [];
    this.present = state;
  }

  /** Record a new state. Returns false if nothing changed. */
  push(state: T): boolean {
    if (this.present !== null && this.equals(this.present, state)) return false;
    if (this.present !== null) this.past.push(this.present);
    if (this.past.length > this.limit) this.past.shift();
    this.present = state;
    this.future = [];
    return true;
  }

  undo(): T | null {
    const prev = this.past.pop();
    if (prev === undefined || this.present === null) return null;
    this.future.push(this.present);
    this.present = prev;
    return prev;
  }

  redo(): T | null {
    const next = this.future.pop();
    if (next === undefined || this.present === null) return null;
    this.past.push(this.present);
    this.present = next;
    return next;
  }

  get current(): T | null {
    return this.present;
  }
  get canUndo(): boolean {
    return this.past.length > 0;
  }
  get canRedo(): boolean {
    return this.future.length > 0;
  }
}
