import { z } from 'zod';

const tileCoordSchema = z.tuple([
  z.number().int().min(0).max(199),
  z.number().int().min(0).max(199),
]);

export const mapDataSchema = z.object({
  tiles: z.array(tileCoordSchema).max(40000),
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

// Default starter slab: 6×6 tiles centered on the spawn point.
const SPAWN = 35;
const HALF = 3;
const defaultTiles: [number, number][] = [];
for (let dx = -HALF; dx < HALF; dx++) {
  for (let dy = -HALF; dy < HALF; dy++) {
    defaultTiles.push([SPAWN + dx, SPAWN + dy]);
  }
}
export const DEFAULT_MAP: MapData = { tiles: defaultTiles };
