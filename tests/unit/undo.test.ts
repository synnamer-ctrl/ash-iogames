import { describe, expect, it } from 'vitest';
import { UndoStack } from '../../src/game/systems/UndoStack';

describe('UndoStack', () => {
  it('undoes and redoes snapshots', () => {
    const u = new UndoStack<{ n: number }>();
    u.reset({ n: 0 });
    expect(u.canUndo).toBe(false);
    u.push({ n: 1 });
    u.push({ n: 2 });
    expect(u.undo()).toEqual({ n: 1 });
    expect(u.undo()).toEqual({ n: 0 });
    expect(u.undo()).toBeNull();
    expect(u.redo()).toEqual({ n: 1 });
    expect(u.canRedo).toBe(true);
  });

  it('ignores unchanged states and clears redo on new actions', () => {
    const u = new UndoStack<{ n: number }>();
    u.reset({ n: 0 });
    expect(u.push({ n: 0 })).toBe(false);
    u.push({ n: 1 });
    u.undo();
    u.push({ n: 5 });
    expect(u.canRedo).toBe(false);
    expect(u.current).toEqual({ n: 5 });
  });

  it('respects the history limit', () => {
    const u = new UndoStack<number>(3, (a, b) => a === b);
    u.reset(0);
    for (let i = 1; i <= 10; i++) u.push(i);
    let steps = 0;
    while (u.undo() !== null) steps++;
    expect(steps).toBe(3);
  });
});
