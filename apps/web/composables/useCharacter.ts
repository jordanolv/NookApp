export const CG_LAYER_ORDER = ['body', 'eyes', 'outfit', 'hair', 'accessory'] as const;
export type CgLayer = (typeof CG_LAYER_ORDER)[number];

export const CG_VARIANTS: Record<CgLayer, string[]> = {
  body: [
    'body_01',
    'body_02',
    'body_03',
    'body_04',
    'body_05',
    'body_06',
    'body_07',
    'body_08',
    'body_09',
    'farmer_body_01',
    'farmer_body_02',
    'farmer_body_03',
    'farmer_body_04',
    'farmer_body_05',
    'farmer_body_06',
    'farmer_body_07',
    'farmer_body_08',
    'farmer_body_09',
  ],
  eyes: [
    'eyes_01',
    'eyes_02',
    'eyes_03',
    'eyes_04',
    'eyes_05',
    'eyes_06',
    'eyes_07',
    'farmer_eyes_blue',
    'farmer_eyes_brown',
    'farmer_eyes_gray',
    'farmer_eyes_green',
    'farmer_eyes_orange',
  ],
  outfit: [
    'outfit_01',
    'outfit_03',
    'outfit_05',
    'outfit_07',
    'outfit_11',
    'outfit_15',
    'outfit_20',
    'farmer_outfit_braces_brown',
    'farmer_outfit_braces_green',
    'farmer_outfit_braces_orange',
    'farmer_outfit_dungarees_black',
    'farmer_outfit_dungarees_green',
    'farmer_outfit_dungarees_red',
    'farmer_outfit_dungarees_violet',
    'farmer_outfit_laborer_blue',
    'farmer_outfit_laborer_red',
    'farmer_outfit_laborer_violet',
    'farmer_outfit_vest_brown',
    'farmer_outfit_vest_brown_light',
    'farmer_outfit_vest_yellow',
  ],
  hair: [
    'hair_01',
    'hair_03',
    'hair_05',
    'hair_09',
    'hair_12',
    'hair_15',
    'hair_18',
    'hair_23',
    'farmer_hair_short_blonde',
    'farmer_hair_short_brown_dark',
    'farmer_hair_short_gray',
    'farmer_hair_short_orange',
    'farmer_hair_long_blonde',
    'farmer_hair_long_brown_dark',
    'farmer_hair_long_gray',
    'farmer_hair_long_orange',
    'farmer_hair_tuft_blonde',
    'farmer_hair_tuft_brown_dark',
    'farmer_hair_unkept_brown_dark',
    'farmer_hair_unkept_orange',
  ],
  accessory: [
    'acc_glasses',
    'acc_beanie',
    'acc_snapback',
    'acc_backpack',
    'farmer_acc_bamboo_hat_brown',
    'farmer_acc_bamboo_hat_brown_dull',
    'farmer_acc_gas_mask',
    'farmer_acc_straw_hat_black',
    'farmer_acc_straw_hat_cyan',
    'farmer_acc_straw_hat_green',
    'farmer_acc_straw_hat_red',
    'farmer_acc_straw_hat_violet',
  ],
};

export const CG_LAYER_OPTIONAL: Record<CgLayer, boolean> = {
  body: false,
  eyes: false,
  outfit: false,
  hair: false,
  accessory: true,
};

export type Appearance = {
  body: string;
  eyes: string;
  outfit: string;
  hair: string;
  accessory: string | null;
};

export const DEFAULT_APPEARANCE: Appearance = {
  body: 'body_01',
  eyes: 'eyes_01',
  outfit: 'outfit_01',
  hair: 'hair_01',
  accessory: null,
};

const STORAGE_KEY = 'nookapp:character';

export function variantUrl(layer: CgLayer, variant: string): string {
  return `/assets/cg/${layer}/${variant}.png`;
}

function isValidVariant(layer: CgLayer, value: string | null): boolean {
  if (value === null) return CG_LAYER_OPTIONAL[layer];
  return CG_VARIANTS[layer].includes(value);
}

function sanitize(raw: unknown): Appearance {
  const out: Appearance = { ...DEFAULT_APPEARANCE };
  if (!raw || typeof raw !== 'object') return out;
  for (const layer of CG_LAYER_ORDER) {
    const v = (raw as Record<string, unknown>)[layer];
    if (typeof v === 'string' && isValidVariant(layer, v)) {
      (out[layer] as string) = v;
    } else if (v === null && CG_LAYER_OPTIONAL[layer]) {
      out[layer] = null as never;
    }
  }
  return out;
}

function loadInitial(): Appearance {
  if (typeof window === 'undefined') return { ...DEFAULT_APPEARANCE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APPEARANCE };
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function useCharacter() {
  const appearance = useState<Appearance>('character.appearance', loadInitial);

  function persist() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance.value));
    } catch {
      /* quota / private mode — fail silent */
    }
  }

  function setLayer(layer: CgLayer, value: string | null) {
    if (!isValidVariant(layer, value)) return;
    appearance.value = { ...appearance.value, [layer]: value };
    persist();
  }

  function reset() {
    appearance.value = { ...DEFAULT_APPEARANCE };
    persist();
  }

  return {
    appearance: readonly(appearance),
    setLayer,
    reset,
  };
}
