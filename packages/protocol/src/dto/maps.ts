import { z } from 'zod';

const mapCoordSchema = z.number().int().min(0).max(199);

const mapCellSchema = z.object({
  x: mapCoordSchema,
  y: mapCoordSchema,
});

const floorCellSchema = mapCellSchema.extend({
  asset: z.string().min(1).max(64),
});

const wallCellSchema = mapCellSchema.extend({
  // Index into the LimeZu Room_Builder spritesheet (24 cols × 59 rows = 1416).
  frame: z.number().int().min(0).max(1415),
});

const decorObjectSchema = mapCellSchema.extend({
  id: z.string().min(1).max(64),
  asset: z.string().min(1).max(64),
});

const mapLayersSchema = z.object({
  floors: z.array(floorCellSchema).max(40000).default([]),
  walls: z.array(wallCellSchema).max(40000).default([]),
  decor: z.array(decorObjectSchema).max(2000).default([]),
});

export const mapDataSchema = z.object({
  width: z.number().int().min(1).max(200).default(200),
  height: z.number().int().min(1).max(200).default(200),
  spawn: mapCellSchema.default({ x: 35, y: 35 }),
  layers: mapLayersSchema.default({ floors: [], walls: [], decor: [] }),
});

export type MapData = z.infer<typeof mapDataSchema>;
export type FloorCell = z.infer<typeof floorCellSchema>;
export type WallCell = z.infer<typeof wallCellSchema>;
export type DecorObject = z.infer<typeof decorObjectSchema>;

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

const floors: FloorCell[] = [];
for (let dx = -3; dx < 3; dx++) {
  for (let dy = -3; dy < 3; dy++) {
    floors.push({ asset: 'office_floor_light', x: 35 + dx, y: 35 + dy });
  }
}

export const DEFAULT_MAP: MapData = {
  width: 200,
  height: 200,
  spawn: { x: 35, y: 35 },
  layers: { floors, walls: [], decor: [] },
};
