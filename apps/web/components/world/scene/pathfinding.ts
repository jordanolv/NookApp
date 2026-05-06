export interface GridPoint {
  x: number;
  y: number;
}

export interface PathGrid {
  cols: number;
  rows: number;
  isBlocked: (x: number, y: number) => boolean;
}

interface PathNode {
  point: GridPoint;
  g: number;
  f: number;
  parent: string | null;
}

const DIAGONAL_COST = Math.SQRT2;

const DIRECTIONS = [
  { x: 0, y: -1, cost: 1 },
  { x: 1, y: 0, cost: 1 },
  { x: 0, y: 1, cost: 1 },
  { x: -1, y: 0, cost: 1 },
  { x: 1, y: -1, cost: DIAGONAL_COST },
  { x: 1, y: 1, cost: DIAGONAL_COST },
  { x: -1, y: 1, cost: DIAGONAL_COST },
  { x: -1, y: -1, cost: DIAGONAL_COST },
];

function keyOf(point: GridPoint): string {
  return `${point.x},${point.y}`;
}

function samePoint(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function clampPoint(point: GridPoint, grid: PathGrid): GridPoint {
  return {
    x: Math.max(0, Math.min(grid.cols - 1, point.x)),
    y: Math.max(0, Math.min(grid.rows - 1, point.y)),
  };
}

function isWalkable(point: GridPoint, grid: PathGrid): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < grid.cols &&
    point.y < grid.rows &&
    !grid.isBlocked(point.x, point.y)
  );
}

function canStep(from: GridPoint, to: GridPoint, grid: PathGrid): boolean {
  if (!isWalkable(to, grid)) return false;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) !== 1 || Math.abs(dy) !== 1) return true;
  return !grid.isBlocked(from.x + dx, from.y) && !grid.isBlocked(from.x, from.y + dy);
}

function neighborsOf(point: GridPoint, grid: PathGrid): Array<GridPoint & { cost: number }> {
  const neighbors: Array<GridPoint & { cost: number }> = [];
  for (const dir of DIRECTIONS) {
    const next = { x: point.x + dir.x, y: point.y + dir.y };
    if (canStep(point, next, grid)) neighbors.push({ ...next, cost: dir.cost });
  }
  return neighbors;
}

function heuristic(a: GridPoint, b: GridPoint): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) + (DIAGONAL_COST - 1) * Math.min(dx, dy);
}

function reconstruct(nodes: Map<string, PathNode>, endKey: string): GridPoint[] {
  const path: GridPoint[] = [];
  let currentKey: string | null = endKey;

  while (currentKey) {
    const node = nodes.get(currentKey);
    if (!node) break;
    path.push(node.point);
    currentKey = node.parent;
  }

  path.reverse();
  return path.slice(1);
}

function findPath(start: GridPoint, target: GridPoint, grid: PathGrid): GridPoint[] {
  if (samePoint(start, target)) return [];

  const startKey = keyOf(start);
  const targetKey = keyOf(target);
  const nodes = new Map<string, PathNode>();
  const open = new Set<string>([startKey]);

  nodes.set(startKey, {
    point: start,
    g: 0,
    f: heuristic(start, target),
    parent: null,
  });

  while (open.size) {
    let currentKey = '';
    let currentNode: PathNode | null = null;

    for (const key of open) {
      const node = nodes.get(key);
      if (!node) continue;
      if (!currentNode || node.f < currentNode.f) {
        currentKey = key;
        currentNode = node;
      }
    }

    if (!currentNode) break;
    if (currentKey === targetKey) return reconstruct(nodes, targetKey);

    open.delete(currentKey);

    for (const next of neighborsOf(currentNode.point, grid)) {
      const nextPoint = { x: next.x, y: next.y };
      const nextKey = keyOf(nextPoint);
      const g = currentNode.g + next.cost;
      const existing = nodes.get(nextKey);

      if (existing && g >= existing.g) continue;

      nodes.set(nextKey, {
        point: nextPoint,
        g,
        f: g + heuristic(nextPoint, target),
        parent: currentKey,
      });
      open.add(nextKey);
    }
  }

  return [];
}

function distanceSq(a: GridPoint, b: GridPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function findClosestReachablePath(
  start: GridPoint,
  target: GridPoint,
  grid: PathGrid,
): GridPoint[] {
  const startKey = keyOf(start);
  const parents = new Map<string, string | null>([[startKey, null]]);
  const points = new Map<string, GridPoint>([[startKey, start]]);
  const queue = [start];
  let best = start;

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!;
    if (distanceSq(current, target) < distanceSq(best, target)) best = current;

    for (const next of neighborsOf(current, grid)) {
      const point = { x: next.x, y: next.y };
      const key = keyOf(point);
      if (parents.has(key)) continue;

      parents.set(key, keyOf(current));
      points.set(key, point);
      queue.push(point);
    }
  }

  if (samePoint(best, start)) return [];

  const path: GridPoint[] = [];
  let currentKey: string | null = keyOf(best);

  while (currentKey) {
    const point = points.get(currentKey);
    if (!point) break;
    path.push(point);
    currentKey = parents.get(currentKey) ?? null;
  }

  path.reverse();
  return path.slice(1);
}

export function findPathToClosestReachable(
  startPoint: GridPoint,
  targetPoint: GridPoint,
  grid: PathGrid,
): GridPoint[] {
  const start = clampPoint(startPoint, grid);
  const target = clampPoint(targetPoint, grid);

  if (!isWalkable(start, grid)) return [];

  if (isWalkable(target, grid)) {
    const path = findPath(start, target, grid);
    if (path.length || samePoint(start, target)) return path;
  }

  return findClosestReachablePath(start, target, grid);
}
