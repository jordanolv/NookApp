import {
  DECOR,
  DECOR_CATEGORY_LABELS,
  DECOR_CATEGORY_ORDER,
  type DecorCategory,
  type DecorCell,
  type DecorEntry,
} from './assets/manifest';

export type { DecorCategory };
export { DECOR_CATEGORY_LABELS, DECOR_CATEGORY_ORDER };

export interface DecorAsset {
  id: string;
  label: string;
  category: DecorCategory;
  cells: ReadonlyArray<DecorCell>;
  primary: DecorCell;
}

function toAsset(entry: DecorEntry): DecorAsset {
  let primary = entry.cells[0]!;
  for (const c of entry.cells) if (c.dy > primary.dy) primary = c;
  return {
    id: entry.id,
    label: entry.label,
    category: entry.category,
    cells: entry.cells,
    primary,
  };
}

export const DECOR_CATALOG: ReadonlyArray<DecorAsset> = DECOR.map(toAsset);

const BY_ID = new Map<string, DecorAsset>(DECOR_CATALOG.map((a) => [a.id, a]));

export function getDecorAsset(id: string): DecorAsset | undefined {
  return BY_ID.get(id);
}
