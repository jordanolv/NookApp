import { describe, expect, it } from 'vitest';
import {
  CG_SHEET_COLS,
  CG_WALK_FRAME_COUNT,
  DIRECTIONS,
  directionFromVelocity,
  frameToCell,
  idleFrame,
  sitFrame,
  walkAnimKey,
  walkFrames,
} from '../../utils/cg-sheet';

describe('cg-sheet', () => {
  describe('idleFrame', () => {
    it('maps each direction to its row 0 frame', () => {
      expect(idleFrame('right')).toBe(0);
      expect(idleFrame('up')).toBe(1);
      expect(idleFrame('left')).toBe(2);
      expect(idleFrame('down')).toBe(3);
    });

    it('keeps every idle frame inside the first sheet row', () => {
      for (const dir of DIRECTIONS) {
        expect(frameToCell(idleFrame(dir)).row).toBe(0);
      }
    });
  });

  describe('sitFrame', () => {
    it('maps the side- and back-facing seats to their own poses', () => {
      expect(sitFrame('right')).toBe(224);
      expect(sitFrame('left')).toBe(230);
      expect(sitFrame('up')).toBe(233);
    });

    it('falls back to the most frontal pose for down, which has no true frame', () => {
      expect(sitFrame('down')).toBe(227);
    });
  });

  describe('walkFrames', () => {
    it('returns six consecutive frames starting at the direction offset', () => {
      expect(walkFrames('right')).toEqual([112, 113, 114, 115, 116, 117]);
      expect(walkFrames('down')).toEqual([130, 131, 132, 133, 134, 135]);
    });

    it('gives every direction a distinct, non-overlapping frame range', () => {
      const all = DIRECTIONS.flatMap((dir) => walkFrames(dir));
      expect(all).toHaveLength(DIRECTIONS.length * CG_WALK_FRAME_COUNT);
      expect(new Set(all).size).toBe(all.length);
    });

    it('keeps every walk frame on sheet row 2', () => {
      for (const dir of DIRECTIONS) {
        for (const frame of walkFrames(dir)) {
          expect(frameToCell(frame).row).toBe(2);
        }
      }
    });
  });

  describe('walkAnimKey', () => {
    it('namespaces the animation by direction and body sheet', () => {
      expect(walkAnimKey('left', 'body-01')).toBe('walk-left-body-01');
    });

    it('produces different keys for two bodies facing the same way', () => {
      expect(walkAnimKey('up', 'a')).not.toBe(walkAnimKey('up', 'b'));
    });
  });

  describe('directionFromVelocity', () => {
    it('faces the dominant axis', () => {
      expect(directionFromVelocity(5, 1)).toBe('right');
      expect(directionFromVelocity(-5, 1)).toBe('left');
      expect(directionFromVelocity(1, 5)).toBe('down');
      expect(directionFromVelocity(1, -5)).toBe('up');
    });

    it('prefers the vertical axis on a perfect diagonal', () => {
      expect(directionFromVelocity(3, 3)).toBe('down');
      expect(directionFromVelocity(3, -3)).toBe('up');
    });

    it('resolves a standing still player to a stable direction', () => {
      expect(directionFromVelocity(0, 0)).toBe('up');
    });
  });

  describe('frameToCell', () => {
    it('converts a frame index to its column and row', () => {
      expect(frameToCell(0)).toEqual({ col: 0, row: 0 });
      expect(frameToCell(112)).toEqual({ col: 0, row: 2 });
      expect(frameToCell(135)).toEqual({ col: 23, row: 2 });
    });

    it('wraps exactly at the sheet width', () => {
      expect(frameToCell(CG_SHEET_COLS - 1)).toEqual({ col: CG_SHEET_COLS - 1, row: 0 });
      expect(frameToCell(CG_SHEET_COLS)).toEqual({ col: 0, row: 1 });
    });
  });
});
