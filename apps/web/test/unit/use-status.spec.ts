import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { withSetup } from '../helpers/with-setup';

const STATUS_STORAGE_KEY = 'nook:user-status';
const IDLE_THRESHOLD_MS = 15 * 60 * 1000;

// useVoice is a Nuxt auto-import; outside Nuxt it has to be provided as a
// global before the composable runs.
const currentChannelId = ref<string | null>(null);
vi.stubGlobal('useVoice', () => ({ currentChannelId }));

type UseStatus = typeof import('../../composables/useStatus').useStatus;

// The manual status and idle clock are module-level singletons, so every test
// gets a fresh copy of the module.
async function loadUseStatus(): Promise<UseStatus> {
  vi.resetModules();
  return (await import('../../composables/useStatus')).useStatus;
}

describe('useStatus', () => {
  beforeEach(() => {
    window.localStorage.clear();
    currentChannelId.value = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to online with no override', async () => {
    const useStatus = await loadUseStatus();
    const { result, unmount } = withSetup(() => useStatus());
    expect(result.manualStatus.value).toBe('online');
    expect(result.effectiveStatus.value).toBe('online');
    expect(result.autoOverride.value).toBeNull();
    expect(result.isIdle.value).toBe(false);
    expect(result.inVoice.value).toBe(false);
    unmount();
  });

  describe('stored status', () => {
    it('restores a valid persisted status', async () => {
      window.localStorage.setItem(STATUS_STORAGE_KEY, 'busy');
      const useStatus = await loadUseStatus();
      const { result, unmount } = withSetup(() => useStatus());
      expect(result.manualStatus.value).toBe('busy');
      expect(result.effectiveStatus.value).toBe('busy');
      unmount();
    });

    it('ignores an unknown persisted value', async () => {
      window.localStorage.setItem(STATUS_STORAGE_KEY, 'napping');
      const useStatus = await loadUseStatus();
      const { result, unmount } = withSetup(() => useStatus());
      expect(result.manualStatus.value).toBe('online');
      unmount();
    });
  });

  describe('setManualStatus', () => {
    it('updates the status and persists it', async () => {
      const useStatus = await loadUseStatus();
      const { result, unmount } = withSetup(() => useStatus());
      result.setManualStatus('away');
      expect(result.effectiveStatus.value).toBe('away');
      expect(result.autoOverride.value).toBeNull();
      expect(window.localStorage.getItem(STATUS_STORAGE_KEY)).toBe('away');
      unmount();
    });

    it('is shared across every caller', async () => {
      const useStatus = await loadUseStatus();
      const a = withSetup(() => useStatus());
      const b = withSetup(() => useStatus());
      a.result.setManualStatus('busy');
      expect(b.result.effectiveStatus.value).toBe('busy');
      a.unmount();
      b.unmount();
    });
  });

  describe('voice override', () => {
    it('reports busy while connected to a voice channel', async () => {
      const useStatus = await loadUseStatus();
      const { result, unmount } = withSetup(() => useStatus());
      currentChannelId.value = 'voice-1';
      expect(result.inVoice.value).toBe(true);
      expect(result.effectiveStatus.value).toBe('busy');
      expect(result.autoOverride.value).toBe('voice');
      unmount();
    });

    it('does not flag an override when the status is already busy', async () => {
      const useStatus = await loadUseStatus();
      const { result, unmount } = withSetup(() => useStatus());
      result.setManualStatus('busy');
      currentChannelId.value = 'voice-1';
      expect(result.effectiveStatus.value).toBe('busy');
      expect(result.autoOverride.value).toBeNull();
      unmount();
    });

    it('never outranks a manual away', async () => {
      const useStatus = await loadUseStatus();
      const { result, unmount } = withSetup(() => useStatus());
      result.setManualStatus('away');
      currentChannelId.value = 'voice-1';
      expect(result.effectiveStatus.value).toBe('away');
      expect(result.autoOverride.value).toBeNull();
      unmount();
    });
  });

  describe('idle detection', () => {
    it('turns away after 15 minutes without activity', async () => {
      vi.useFakeTimers();
      const useStatus = await loadUseStatus();
      const { result, unmount } = withSetup(() => useStatus());
      vi.advanceTimersByTime(IDLE_THRESHOLD_MS);
      expect(result.isIdle.value).toBe(true);
      expect(result.effectiveStatus.value).toBe('away');
      expect(result.autoOverride.value).toBe('idle');
      unmount();
    });

    it('idle wins over a manual busy', async () => {
      vi.useFakeTimers();
      const useStatus = await loadUseStatus();
      const { result, unmount } = withSetup(() => useStatus());
      result.setManualStatus('busy');
      vi.advanceTimersByTime(IDLE_THRESHOLD_MS);
      expect(result.effectiveStatus.value).toBe('away');
      unmount();
    });

    it('clears on the next user activity', async () => {
      vi.useFakeTimers();
      const useStatus = await loadUseStatus();
      const { result, unmount } = withSetup(() => useStatus());
      vi.advanceTimersByTime(IDLE_THRESHOLD_MS);
      expect(result.isIdle.value).toBe(true);
      window.dispatchEvent(new Event('mousemove'));
      expect(result.isIdle.value).toBe(false);
      expect(result.effectiveStatus.value).toBe('online');
      unmount();
    });

    it('resets the idle clock when the status is set manually', async () => {
      vi.useFakeTimers();
      const useStatus = await loadUseStatus();
      const { result, unmount } = withSetup(() => useStatus());
      vi.advanceTimersByTime(IDLE_THRESHOLD_MS);
      expect(result.isIdle.value).toBe(true);
      result.setManualStatus('online');
      expect(result.isIdle.value).toBe(false);
      expect(result.effectiveStatus.value).toBe('online');
      unmount();
    });
  });

  describe('listener lifecycle', () => {
    it('attaches once and detaches when the last consumer unmounts', async () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const mousemoveCalls = (spy: typeof addSpy) =>
        spy.mock.calls.filter(([event]) => String(event) === 'mousemove').length;

      const useStatus = await loadUseStatus();
      const a = withSetup(() => useStatus());
      const b = withSetup(() => useStatus());
      expect(mousemoveCalls(addSpy)).toBe(1);
      a.unmount();
      expect(mousemoveCalls(removeSpy)).toBe(0);
      b.unmount();
      expect(mousemoveCalls(removeSpy)).toBe(1);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
