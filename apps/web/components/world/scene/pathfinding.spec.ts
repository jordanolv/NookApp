import { describe, expect, it } from 'vitest';
import { findPathToClosestReachable, type PathGrid } from './pathfinding';

function grid(blocked: Array<[number, number]>, cols = 8, rows = 8): PathGrid {
  const blockedKeys = new Set(blocked.map(([x, y]) => `${x},${y}`));
  return {
    cols,
    rows,
    isBlocked: (x, y) => blockedKeys.has(`${x},${y}`),
  };
}

describe('findPathToClosestReachable', () => {
  it('routes around blocked cells', () => {
    const path = findPathToClosestReachable(
      { x: 1, y: 1 },
      { x: 5, y: 1 },
      grid([
        [2, 1],
        [3, 1],
        [4, 1],
      ]),
    );

    expect(path.at(-1)).toEqual({ x: 5, y: 1 });
    expect(path).not.toContainEqual({ x: 2, y: 1 });
    expect(path).not.toContainEqual({ x: 3, y: 1 });
    expect(path).not.toContainEqual({ x: 4, y: 1 });
  });

  it('falls back to the closest reachable cell when target is blocked', () => {
    const path = findPathToClosestReachable({ x: 1, y: 1 }, { x: 4, y: 1 }, grid([[4, 1]]));

    expect(path.at(-1)).toEqual({ x: 3, y: 1 });
  });
});
