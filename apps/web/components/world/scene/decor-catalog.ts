import {
  DECOR,
  DECOR_CATEGORY_LABELS,
  DECOR_CATEGORY_ORDER,
  type DecorCategory,
  type DecorCell,
  type DecorEntry,
} from './assets/manifest';
import type { InteractionSpec } from './interactions/interaction-types';

export type { DecorCategory };
export { DECOR_CATEGORY_LABELS, DECOR_CATEGORY_ORDER };

export interface DecorAsset {
  id: string;
  label: string;
  category: DecorCategory;
  cells: ReadonlyArray<DecorCell>;
  primary: DecorCell;
  interaction?: InteractionSpec;
}

// Which decor the player can interact with, keyed by asset id. The catalog is
// the single registry of interactive behavior (decor.generated.ts is generated
// and must not be hand-edited). Chairs face the camera, so a down-facing sit.
const SEAT: InteractionSpec = { kind: 'sit', facing: 'down' };
const INTERACTIONS: Record<string, InteractionSpec> = {
  chair_blue: SEAT,
  chair_gray: SEAT,
  chair_orange: SEAT,
  chair_red: SEAT,
  chair_yellow: SEAT,
  free_office_chair: SEAT,
  sofa_1: SEAT,
  sofa_2: SEAT,
};

function toAsset(entry: DecorEntry): DecorAsset {
  let primary = entry.cells[0]!;
  for (const c of entry.cells) if (c.dy > primary.dy) primary = c;
  return {
    id: entry.id,
    label: entry.label,
    category: entry.category,
    cells: entry.cells,
    primary,
    interaction: INTERACTIONS[entry.id],
  };
}

export const DECOR_CATALOG: ReadonlyArray<DecorAsset> = DECOR.map(toAsset);

const BY_ID = new Map<string, DecorAsset>(DECOR_CATALOG.map((a) => [a.id, a]));

export function getDecorAsset(id: string): DecorAsset | undefined {
  return BY_ID.get(id);
}
