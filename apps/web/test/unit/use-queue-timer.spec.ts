import { afterEach, describe, expect, it, vi } from 'vitest';
import { useQueueTimer } from '../../composables/useQueueTimer';
import { withSetup } from '../helpers/with-setup';

describe('useQueueTimer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('format', () => {
    it('renders minutes and zero-padded seconds', () => {
      const { result, unmount } = withSetup(useQueueTimer);
      expect(result.format(0)).toBe('0:00');
      expect(result.format(9)).toBe('0:09');
      expect(result.format(75)).toBe('1:15');
      unmount();
    });

    it('keeps counting past an hour instead of wrapping', () => {
      const { result, unmount } = withSetup(useQueueTimer);
      expect(result.format(3600)).toBe('60:00');
      unmount();
    });
  });

  describe('toggle', () => {
    it('starts counting one second at a time', () => {
      vi.useFakeTimers();
      const { result, unmount } = withSetup(useQueueTimer);
      result.toggle();
      expect(result.active.value).toBe(true);
      vi.advanceTimersByTime(3000);
      expect(result.elapsed.value).toBe(3);
      unmount();
    });

    it('stops the timer on the second toggle', () => {
      vi.useFakeTimers();
      const { result, unmount } = withSetup(useQueueTimer);
      result.toggle();
      vi.advanceTimersByTime(2000);
      result.toggle();
      vi.advanceTimersByTime(5000);
      expect(result.active.value).toBe(false);
      expect(result.elapsed.value).toBe(2);
      unmount();
    });

    it('restarts from zero rather than resuming the previous run', () => {
      vi.useFakeTimers();
      const { result, unmount } = withSetup(useQueueTimer);
      result.toggle();
      vi.advanceTimersByTime(4000);
      result.toggle();
      result.toggle();
      expect(result.elapsed.value).toBe(0);
      vi.advanceTimersByTime(1000);
      expect(result.elapsed.value).toBe(1);
      unmount();
    });
  });

  describe('cleanup', () => {
    it('clears the interval when the component unmounts mid-run', () => {
      vi.useFakeTimers();
      const { result, unmount } = withSetup(useQueueTimer);
      result.toggle();
      vi.advanceTimersByTime(2000);
      unmount();
      vi.advanceTimersByTime(10_000);
      expect(result.elapsed.value).toBe(2);
    });
  });
});
