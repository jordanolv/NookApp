import {
  DEFAULT_FLOOR_ID,
  FLOORS,
  FLOOR_GROUP_LABELS,
  FLOOR_GROUP_ORDER,
  type FloorEntry,
  type FloorGroup,
} from './assets/manifest';

export type { FloorGroup };
export { FLOOR_GROUP_LABELS };

export interface FloorAsset {
  id: string;
  label: string;
  group: FloorGroup;
  url: string | null;
}

export interface FloorCatalogGroup {
  id: FloorGroup;
  label: string;
  assets: ReadonlyArray<FloorAsset>;
}

function toAsset(entry: FloorEntry): FloorAsset {
  return { id: entry.id, label: entry.label, group: entry.group, url: entry.file || null };
}

export const FLOOR_CATALOG: ReadonlyArray<FloorAsset> = FLOORS.map(toAsset);

export const FLOOR_CATALOG_GROUPS: ReadonlyArray<FloorCatalogGroup> = FLOOR_GROUP_ORDER.map(
  (id) => ({
    id,
    label: FLOOR_GROUP_LABELS[id],
    assets: FLOOR_CATALOG.filter((asset) => asset.group === id),
  }),
).filter((group) => group.assets.length > 0);

const BY_ID = new Map<string, FloorAsset>(FLOOR_CATALOG.map((a) => [a.id, a]));

export function getFloorAsset(id: string): FloorAsset | undefined {
  return BY_ID.get(id);
}

export const FLOOR_IDS: ReadonlySet<string> = new Set(FLOOR_CATALOG.map((a) => a.id));

export { DEFAULT_FLOOR_ID };
