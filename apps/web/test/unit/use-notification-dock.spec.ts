import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationDock } from '../../composables/useNotificationDock';

describe('useNotificationDock', () => {
  beforeEach(() => {
    // The queue is module-level state shared by every caller.
    useNotificationDock().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('push', () => {
    it('queues a notification and exposes it as the current one', () => {
      const dock = useNotificationDock();
      const id = dock.push({ kind: 'info', title: 'Salon cree' });
      expect(dock.items.value).toHaveLength(1);
      expect(dock.current.value?.id).toBe(id);
      expect(dock.current.value?.title).toBe('Salon cree');
    });

    it('keeps the first pushed notification at the head of the queue', () => {
      const dock = useNotificationDock();
      const first = dock.push({ kind: 'info', title: 'A' });
      dock.push({ kind: 'error', title: 'B' });
      expect(dock.items.value).toHaveLength(2);
      expect(dock.current.value?.id).toBe(first);
    });

    it('hands back unique ids for identical payloads', () => {
      const dock = useNotificationDock();
      expect(dock.push({ kind: 'info', title: 'A' })).not.toBe(
        dock.push({ kind: 'info', title: 'A' }),
      );
    });

    it('exposes no current notification on an empty queue', () => {
      expect(useNotificationDock().current.value).toBeNull();
    });
  });

  describe('auto-dismiss', () => {
    it('removes a notification once its timeout elapses', () => {
      vi.useFakeTimers();
      const dock = useNotificationDock();
      dock.push({ kind: 'success', title: 'Enregistre', timeoutMs: 3000 });
      vi.advanceTimersByTime(2999);
      expect(dock.items.value).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(dock.items.value).toHaveLength(0);
    });

    it('keeps a notification without timeout sticky', () => {
      vi.useFakeTimers();
      const dock = useNotificationDock();
      dock.push({ kind: 'error', title: 'Connexion perdue' });
      dock.push({ kind: 'error', title: 'Zero est sticky aussi', timeoutMs: 0 });
      vi.advanceTimersByTime(60_000);
      expect(dock.items.value).toHaveLength(2);
    });
  });

  describe('dismiss', () => {
    it('removes only the targeted notification', () => {
      const dock = useNotificationDock();
      const a = dock.push({ kind: 'info', title: 'A' });
      dock.push({ kind: 'info', title: 'B' });
      dock.dismiss(a);
      expect(dock.items.value.map((n) => n.title)).toEqual(['B']);
    });

    it('ignores an unknown id', () => {
      const dock = useNotificationDock();
      dock.push({ kind: 'info', title: 'A' });
      dock.dismiss('n_unknown');
      expect(dock.items.value).toHaveLength(1);
    });

    it('cancels the pending timer so a recycled slot cannot be dropped twice', () => {
      vi.useFakeTimers();
      const dock = useNotificationDock();
      const id = dock.push({ kind: 'info', title: 'A', timeoutMs: 1000 });
      dock.dismiss(id);
      dock.push({ kind: 'info', title: 'B' });
      vi.advanceTimersByTime(5000);
      expect(dock.items.value.map((n) => n.title)).toEqual(['B']);
    });
  });

  describe('clear', () => {
    it('empties the queue and cancels every pending timer', () => {
      vi.useFakeTimers();
      const dock = useNotificationDock();
      dock.push({ kind: 'info', title: 'A', timeoutMs: 1000 });
      dock.push({ kind: 'info', title: 'B', timeoutMs: 2000 });
      dock.clear();
      expect(dock.items.value).toHaveLength(0);
      dock.push({ kind: 'info', title: 'C' });
      vi.advanceTimersByTime(5000);
      expect(dock.items.value.map((n) => n.title)).toEqual(['C']);
    });
  });
});
