// Types shared between the scene and its subsystems (kept here to avoid imports
// looping back to NookScene).

export type BuildTool = 'tile' | 'wall' | 'room' | 'decor' | 'collision' | 'erase' | 'template';

export interface WallRegion {
  col: number;
  row: number;
  w: number;
  h: number;
}

export interface RoomRectPayload {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface WallRectPayload {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  region: WallRegion;
  mode: 'add' | 'remove';
}

export interface CollisionRectPayload {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mode: 'add' | 'remove';
}

export interface DecorPlacePayload {
  asset: string;
  x: number;
  y: number;
}

export interface DecorRemovePayload {
  x: number;
  y: number;
}

export interface CellErasePayload {
  x: number;
  y: number;
}

export interface RoomZone {
  channelId: string;
  name: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
}

export interface WorldObjectSpec {
  id: string;
  x: number;
  y: number;
  texture?: string;
  frame?: number | string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface NameTagUpdate {
  userId: string;
  name: string;
  worldX: number;
  worldY: number;
}

export interface ObjectLabelUpdate {
  id: string;
  label: string;
  worldX: number;
  worldY: number;
}

export interface VoiceRoomLabelUpdate {
  channelId: string;
  name: string;
  worldX: number;
  worldY: number;
}

export interface PlayerInteraction {
  userId: string;
  name: string;
  worldX: number;
  worldY: number;
}
