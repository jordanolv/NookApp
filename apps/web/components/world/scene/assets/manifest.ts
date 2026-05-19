import { DECOR as GENERATED_DECOR } from './decor.generated';

export type DecorCategory = 'nature' | 'construction' | 'office' | 'props';
export type FloorGroup = 'base' | 'interior' | 'mauve' | 'mint' | 'slate';

export interface FloorEntry {
  id: string;
  label: string;
  group: FloorGroup;
  file: string;
}

export interface WallEntry {
  id: string;
  label: string;
  file: string | null;
}

export interface DecorCell {
  dx: number;
  dy: number;
  file: string;
}

export interface DecorEntry {
  id: string;
  label: string;
  category: DecorCategory;
  cells: ReadonlyArray<DecorCell>;
}

const ROOT = '/assets/build';

export const DECOR_CATEGORY_LABELS: Record<DecorCategory, string> = {
  nature: 'Nature',
  construction: 'Structure',
  office: 'Bureau',
  props: 'Objets',
};

export const DECOR_CATEGORY_ORDER: ReadonlyArray<DecorCategory> = [
  'nature',
  'construction',
  'office',
  'props',
];

export const FLOOR_GROUP_ORDER: ReadonlyArray<FloorGroup> = [
  'base',
  'interior',
  'mauve',
  'mint',
  'slate',
];

export const FLOOR_GROUP_LABELS: Record<FloorGroup, string> = {
  base: 'Nature',
  interior: 'Intérieur',
  mauve: 'Dalles mauves',
  mint: 'Dalles menthe',
  slate: 'Dalles ardoise',
};

export const DEFAULT_FLOOR_ID = 'default';

const floor = (id: string, group: FloorGroup, label: string): FloorEntry => ({
  id,
  label,
  group,
  file: `${ROOT}/floors/${id}.png`,
});

export const FLOORS: ReadonlyArray<FloorEntry> = [
  { id: DEFAULT_FLOOR_ID, label: 'Beige', group: 'base', file: '' },
  floor('grass', 'base', 'Herbe'),
  floor('grass_tufts', 'base', 'Herbe touffue'),
  floor('grass_flowers', 'base', 'Herbe fleurie'),
  floor('dirt', 'base', 'Terre'),
  floor('cobble', 'base', 'Chemin'),

  floor('office_floor_light', 'interior', 'Brique claire'),
  floor('office_floor_gray', 'interior', 'Moquette grise'),
  floor('office_floor_blue', 'interior', 'Moquette bleue'),
  floor('office_floor_mint', 'interior', 'Carrelage menthe'),
  floor('office_floor_wood', 'interior', 'Parquet clair'),

  floor('tile_0000', 'mauve', 'Mauve 01'),
  floor('tile_0001', 'mauve', 'Mauve 02'),
  floor('tile_0002', 'mauve', 'Mauve 03'),
  floor('tile_0003', 'mauve', 'Mauve 04'),
  floor('tile_0004', 'mauve', 'Mauve 05'),
  floor('tile_0018', 'mauve', 'Mauve 06'),
  floor('tile_0019', 'mauve', 'Mauve 07'),
  floor('tile_0020', 'mauve', 'Mauve 08'),
  floor('tile_0021', 'mauve', 'Mauve 09'),
  floor('tile_0022', 'mauve', 'Mauve 10'),

  floor('tile_0005', 'mint', 'Menthe 01'),
  floor('tile_0006', 'mint', 'Menthe 02'),
  floor('tile_0007', 'mint', 'Menthe 03'),
  floor('tile_0008', 'mint', 'Menthe 04'),
  floor('tile_0009', 'mint', 'Menthe 05'),
  floor('tile_0023', 'mint', 'Menthe 06'),
  floor('tile_0024', 'mint', 'Menthe 07'),
  floor('tile_0025', 'mint', 'Menthe 08'),
  floor('tile_0026', 'mint', 'Menthe 09'),
  floor('tile_0027', 'mint', 'Menthe 10'),

  floor('tile_0010', 'slate', 'Ardoise 01'),
  floor('tile_0011', 'slate', 'Ardoise 02'),
  floor('tile_0012', 'slate', 'Ardoise 03'),
  floor('tile_0013', 'slate', 'Ardoise 04'),
  floor('tile_0014', 'slate', 'Ardoise 05'),
  floor('tile_0015', 'slate', 'Ardoise 06'),
  floor('tile_0016', 'slate', 'Ardoise 07'),
  floor('tile_0017', 'slate', 'Ardoise 08'),
  floor('tile_0028', 'slate', 'Ardoise 09'),
  floor('tile_0029', 'slate', 'Ardoise 10'),
  floor('tile_0030', 'slate', 'Ardoise 11'),
  floor('tile_0031', 'slate', 'Ardoise 12'),
  floor('tile_0032', 'slate', 'Ardoise 13'),
  floor('tile_0033', 'slate', 'Ardoise 14'),
  floor('tile_0034', 'slate', 'Ardoise 15'),
  floor('tile_0035', 'slate', 'Ardoise 16'),
];

// Procedural 9-slice wall sheets — one per style. Each sheet is a 3×3 grid of
// 32×32 tiles. The autotiler picks the right frame based on cell neighbours.
//   (0,0) TL  (1,0) T   (2,0) TR
//   (0,1) L   (1,1) C   (2,1) R
//   (0,2) BL  (1,2) B   (2,2) BR
export interface WallStyle {
  id: string;
  label: string;
  url: string;
}

export const WALL_STYLES: ReadonlyArray<WallStyle> = [
  { id: 'drywall', label: 'Drywall', url: `${ROOT}/walls/limezu/auto_drywall.png` },
  { id: 'cream', label: 'Crème', url: `${ROOT}/walls/limezu/auto_cream.png` },
  { id: 'wood', label: 'Bois', url: `${ROOT}/walls/limezu/auto_wood.png` },
];

export const DEFAULT_WALL_STYLE = 'drywall';

// Legacy exports kept empty until callers migrate.
export const WALLS: ReadonlyArray<WallEntry> = [];

export const DECOR: ReadonlyArray<DecorEntry> = GENERATED_DECOR;
