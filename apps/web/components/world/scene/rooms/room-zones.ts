import Phaser from 'phaser';
import { TILE_SIZE, WORLD_H } from '../constants';
import type { RoomZone, VoiceRoomLabelUpdate } from '../types';

const ROOM_W = TILE_SIZE * 9; // 288px
const ROOM_H = TILE_SIZE * 8; // 256px

// default spots for rooms that don't have a custom zone yet
const ROOM_POSITIONS = [
  { x: 192, y: 192 },
  { x: 832, y: 192 },
  { x: 192, y: 832 },
  { x: 832, y: 832 },
  { x: 512, y: 192 },
  { x: 512, y: 832 },
];

interface ActiveRoom extends RoomZone {
  bounds: Phaser.Geom.Rectangle;
  doorLabelWorldX: number;
  doorLabelWorldY: number;
}

// The voice-room zones: their boxes, the dashed outlines, and detecting when
// the player walks in or out of one.
export class RoomZoneManager {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private rooms: ActiveRoom[] = [];
  private currentChannelId: string | null = null;
  private ready = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(0.5);
  }

  get initialized(): boolean {
    return this.ready;
  }

  setRooms(zones: RoomZone[]) {
    this.rooms = zones.slice(0, ROOM_POSITIONS.length).map((zone, i) => {
      const hasCustomZone = zone.x !== 0 || zone.y !== 0;
      const pos = hasCustomZone ? { x: zone.x, y: zone.y } : ROOM_POSITIONS[i]!;
      const w = zone.w ?? ROOM_W;
      const h = zone.h ?? ROOM_H;
      return {
        ...zone,
        x: pos.x,
        y: pos.y,
        bounds: new Phaser.Geom.Rectangle(pos.x, pos.y, w, h),
        doorLabelWorldX: pos.x + w / 2,
        doorLabelWorldY: pos.y + h + 8,
      };
    });
    this.ready = true;
    this.redraw();
  }

  // where to drop the player when reconnecting: just below the door if the saved
  // spot is inside a room, otherwise the same spot. null until rooms are loaded.
  computeRestoreTarget(x: number, y: number): { x: number; y: number } | null {
    if (!this.ready) return null;
    for (const room of this.rooms) {
      if (Phaser.Geom.Rectangle.Contains(room.bounds, x, y)) {
        return {
          x: room.bounds.x + room.bounds.width / 2,
          y: Math.min(room.bounds.y + room.bounds.height + TILE_SIZE, WORLD_H - 16),
        };
      }
    }
    return { x, y };
  }

  updateProximity(px: number, py: number) {
    if (!this.rooms.length) return;
    let inside: ActiveRoom | null = null;
    for (const room of this.rooms) {
      if (Phaser.Geom.Rectangle.Contains(room.bounds, px, py)) {
        inside = room;
        break;
      }
    }
    const next = inside?.channelId ?? null;
    if (next === this.currentChannelId) return;
    const prev = this.currentChannelId;
    this.currentChannelId = next;
    this.redraw();
    if (prev) this.scene.events.emit('room:left', { channelId: prev });
    if (next) this.scene.events.emit('room:entered', { channelId: next });
  }

  collectRoomLabels(buffer: VoiceRoomLabelUpdate[]) {
    for (const room of this.rooms) {
      buffer.push({
        channelId: room.channelId,
        name: room.name,
        worldX: room.doorLabelWorldX,
        worldY: room.doorLabelWorldY,
      });
    }
  }

  private redraw() {
    const g = this.graphics;
    g.clear();
    for (const room of this.rooms) {
      const rw = room.bounds.width;
      const rh = room.bounds.height;
      const isActive = room.channelId === this.currentChannelId;
      g.fillStyle(isActive ? 0x6366f1 : 0x8b8df0, isActive ? 0.18 : 0.1);
      g.fillRect(room.x, room.y, rw, rh);
      g.lineStyle(2, isActive ? 0x818cf8 : 0xc8bfff, isActive ? 1 : 0.85);
      strokeDashedRect(g, room.x, room.y, rw, rh, 8, 5);
    }
  }
}

function strokeDashedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  dash: number,
  gap: number,
) {
  strokeDashedLine(g, x, y, x + w, y, dash, gap);
  strokeDashedLine(g, x + w, y, x + w, y + h, dash, gap);
  strokeDashedLine(g, x + w, y + h, x, y + h, dash, gap);
  strokeDashedLine(g, x, y + h, x, y, dash, gap);
}

function strokeDashedLine(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number,
  gap: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / len;
  const ny = dy / len;
  let pos = 0;
  let drawing = true;
  while (pos < len) {
    const seg = Math.min(drawing ? dash : gap, len - pos);
    if (drawing) {
      g.beginPath();
      g.moveTo(x1 + nx * pos, y1 + ny * pos);
      g.lineTo(x1 + nx * (pos + seg), y1 + ny * (pos + seg));
      g.strokePath();
    }
    pos += seg;
    drawing = !drawing;
  }
}
