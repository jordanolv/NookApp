import { z } from 'zod';

const tileCoordSchema = z.tuple([
  z.number().int().min(0).max(199),
  z.number().int().min(0).max(199),
]);

const sideSchema = z.enum(['top', 'bottom', 'left', 'right']);
export type Side = z.infer<typeof sideSchema>;

// Each item type is its own object schema; the discriminated union makes adding
// new types (bed, rug, plant, …) a matter of declaring a new schema and adding
// it to the union below — no other code touches MapData shape.
const doorItemSchema = z.object({
  type: z.literal('door'),
  x: z.number().int().min(0).max(199),
  y: z.number().int().min(0).max(199),
  side: sideSchema,
});

const mapItemSchema = z.discriminatedUnion('type', [doorItemSchema]);
export type MapItem = z.infer<typeof mapItemSchema>;
export type DoorItem = z.infer<typeof doorItemSchema>;

export const mapDataSchema = z.object({
  tiles: z.array(tileCoordSchema).max(40000),
  items: z.array(mapItemSchema).max(2000),
});
export type MapData = z.infer<typeof mapDataSchema>;

export const updateMapInputSchema = z.object({
  data: mapDataSchema,
});
export type UpdateMapInput = z.infer<typeof updateMapInputSchema>;

export const mapPublicSchema = z.object({
  serverId: z.string(),
  data: mapDataSchema,
  updatedAt: z.string().datetime(),
});
export type MapPublic = z.infer<typeof mapPublicSchema>;

const SPAWN = 35;
const HALF = 3;
const defaultTiles: [number, number][] = [];
for (let dx = -HALF; dx < HALF; dx++) {
  for (let dy = -HALF; dy < HALF; dy++) {
    defaultTiles.push([SPAWN + dx, SPAWN + dy]);
  }
}
export const DEFAULT_MAP: MapData = { tiles: defaultTiles, items: [] };
