import { z } from 'zod';

// World grid dimensions (in tiles). Bounded so a payload can't blow up storage.
export const MAP_MIN_SIZE = 8;
export const MAP_MAX_SIZE = 80;

// Sparse representation: tiles default to "present"; removed lists the holes.
// Each entry is [x, y]. Storing as tuples keeps the JSON compact.
const tileCoordSchema = z.tuple([z.number().int().min(0), z.number().int().min(0)]);

export const mapDataSchema = z.object({
  width: z.number().int().min(MAP_MIN_SIZE).max(MAP_MAX_SIZE),
  height: z.number().int().min(MAP_MIN_SIZE).max(MAP_MAX_SIZE),
  removed: z.array(tileCoordSchema),
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

export const DEFAULT_MAP: MapData = {
  width: 40,
  height: 40,
  removed: [],
};
