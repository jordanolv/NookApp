import type * as Y from 'yjs';

type Cell = { x: number; y: number };

// One entry per grid cell, first occurrence wins.
export function dedupeCells<T extends Cell>(cells: T[]): T[] {
  const seen = new Set<string>();
  return cells.filter((c) => {
    const key = `${c.x},${c.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Rewrites the array in place when it holds duplicates. Returns true if it did.
export function dedupeYArray<T extends Cell>(arr: Y.Array<T>): boolean {
  const items = arr.toArray();
  const unique = dedupeCells(items);
  if (unique.length === items.length) return false;
  arr.delete(0, arr.length);
  if (unique.length) arr.insert(0, unique);
  return true;
}
