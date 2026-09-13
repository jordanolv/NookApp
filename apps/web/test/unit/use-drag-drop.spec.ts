import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDragDrop, type DragItem } from '../../composables/useDragDrop';

// happy-dom has no layout engine and no elementsFromPoint; stub it so the
// composable can resolve drop targets from real DOM elements.
const elementsFromPoint = vi.fn((): Element[] => []);

function item(overrides: Partial<DragItem> = {}): DragItem {
  return { id: 'c1', name: 'general', iconUrl: null, type: 'text', ...overrides };
}

function down(x = 0, y = 0, init: PointerEventInit = {}) {
  return new PointerEvent('pointerdown', { clientX: x, clientY: y, button: 0, ...init });
}

function move(x: number, y: number) {
  window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }));
}

function up() {
  window.dispatchEvent(new PointerEvent('pointerup'));
}

function press(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

function dropZone(id: string): HTMLElement {
  const el = document.createElement('div');
  el.dataset.dropTarget = id;
  document.body.appendChild(el);
  return el;
}

describe('useDragDrop', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    elementsFromPoint.mockReset().mockReturnValue([]);
    document.elementsFromPoint = elementsFromPoint;
  });

  afterEach(() => {
    vi.useRealTimers();
    // Ends any drag a failed assertion could have left running.
    up();
  });

  describe('drag start', () => {
    it('ignores presses from a non-left button', () => {
      const onDrop = vi.fn().mockResolvedValue(undefined);
      const dd = useDragDrop(onDrop);
      dd.start(down(0, 0, { button: 2 }), item());
      move(100, 100);
      expect(dd.isDragging.value).toBe(false);
    });

    it('does not turn a click below the threshold into a drag', () => {
      const onDrop = vi.fn().mockResolvedValue(undefined);
      const dd = useDragDrop(onDrop);
      dd.start(down(), item());
      move(3, 3);
      expect(dd.isDragging.value).toBe(false);
      up();
      expect(onDrop).not.toHaveBeenCalled();
      expect(dd.justDragged.value).toBe(false);
    });

    it('begins dragging once the pointer crosses the threshold', () => {
      const onDrop = vi.fn().mockResolvedValue(undefined);
      const dd = useDragDrop(onDrop);
      const dragged = item();
      dd.start(down(), dragged);
      move(10, 0);
      expect(dd.isDragging.value).toBe(true);
      expect(dd.draggingItem.value).toEqual(dragged);
      expect(dd.pointerX.value).toBe(10);
      expect(dd.pointerY.value).toBe(0);
      up();
    });
  });

  describe('drop target tracking', () => {
    it('picks the first element under the pointer carrying data-drop-target', () => {
      const plain = document.createElement('div');
      const zone = dropZone('cat1');
      elementsFromPoint.mockReturnValue([plain, zone]);
      const dd = useDragDrop(vi.fn().mockResolvedValue(undefined));
      dd.start(down(), item());
      move(10, 10);
      expect(dd.dropTargetId.value).toBe('cat1');
      up();
    });

    it('clears the target when the pointer leaves every zone', () => {
      elementsFromPoint.mockReturnValue([dropZone('cat1')]);
      const dd = useDragDrop(vi.fn().mockResolvedValue(undefined));
      dd.start(down(), item());
      move(10, 10);
      elementsFromPoint.mockReturnValue([document.createElement('div')]);
      move(20, 20);
      expect(dd.dropTargetId.value).toBeNull();
      up();
    });
  });

  describe('drop', () => {
    it('reports the drop with the target category id and resets the state', () => {
      elementsFromPoint.mockReturnValue([dropZone('cat1')]);
      const onDrop = vi.fn().mockResolvedValue(undefined);
      const dd = useDragDrop(onDrop);
      dd.start(down(), item({ id: 'c9' }));
      move(10, 10);
      up();
      expect(onDrop).toHaveBeenCalledWith('c9', 'cat1');
      expect(dd.isDragging.value).toBe(false);
      expect(dd.dropTargetId.value).toBeNull();
    });

    it('maps the none zone to a null category', () => {
      elementsFromPoint.mockReturnValue([dropZone('none')]);
      const onDrop = vi.fn().mockResolvedValue(undefined);
      const dd = useDragDrop(onDrop);
      dd.start(down(), item());
      move(10, 10);
      up();
      expect(onDrop).toHaveBeenCalledWith('c1', null);
    });

    it('drops nowhere when released outside every zone', () => {
      const onDrop = vi.fn().mockResolvedValue(undefined);
      const dd = useDragDrop(onDrop);
      dd.start(down(), item());
      move(10, 10);
      up();
      expect(onDrop).not.toHaveBeenCalled();
      expect(dd.isDragging.value).toBe(false);
    });

    it('suppresses the click fired right after a drag for 50ms', () => {
      vi.useFakeTimers();
      const dd = useDragDrop(vi.fn().mockResolvedValue(undefined));
      dd.start(down(), item());
      move(10, 10);
      up();
      expect(dd.justDragged.value).toBe(true);
      vi.advanceTimersByTime(50);
      expect(dd.justDragged.value).toBe(false);
    });
  });

  describe('escape', () => {
    it('cancels the drag and ignores the following pointerup', () => {
      elementsFromPoint.mockReturnValue([dropZone('cat1')]);
      const onDrop = vi.fn().mockResolvedValue(undefined);
      const dd = useDragDrop(onDrop);
      dd.start(down(), item());
      move(10, 10);
      press('Escape');
      expect(dd.isDragging.value).toBe(false);
      expect(dd.dropTargetId.value).toBeNull();
      up();
      expect(onDrop).not.toHaveBeenCalled();
    });

    it('leaves the drag alone on any other key', () => {
      const dd = useDragDrop(vi.fn().mockResolvedValue(undefined));
      dd.start(down(), item());
      move(10, 10);
      press('a');
      expect(dd.isDragging.value).toBe(true);
      up();
    });
  });
});
