import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withSetup } from '../helpers/with-setup';

// The composable relies on the Nuxt auto-imported useUiLayout; provide it as a
// global before the module is loaded.
const layoutStore = new Map<string, unknown>();
const uiLayoutSet = vi.fn((key: string, value: unknown) => layoutStore.set(key, value));
const uiLayoutRemove = vi.fn((key: string) => layoutStore.delete(key));

vi.stubGlobal('useUiLayout', () => ({
  ensureLoaded: () => Promise.resolve(),
  get: (key: string) => layoutStore.get(key) ?? null,
  set: uiLayoutSet,
  remove: uiLayoutRemove,
}));

const { useSidebar } = await import('../../composables/useSidebar');

async function flushMounted() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('useSidebar', () => {
  let teardown: (() => void) | null = null;

  function mount(allKeys: string[], defaults: string[] = []) {
    const { result, unmount } = withSetup(() => useSidebar(allKeys, defaults));
    teardown = unmount;
    return result;
  }

  beforeEach(() => {
    layoutStore.clear();
    uiLayoutSet.mockClear();
    uiLayoutRemove.mockClear();
  });

  afterEach(() => {
    teardown?.();
    teardown = null;
  });

  describe('defaults', () => {
    it('activates only the default keys that exist in the section list', () => {
      const sidebar = mount(['chat', 'voice'], ['chat', 'ghost']);
      expect([...sidebar.activeSet.value]).toEqual(['chat']);
    });

    it('starts with no heights and no detached windows', () => {
      const sidebar = mount(['chat']);
      expect(sidebar.sectionHeights.value).toEqual({});
      expect(sidebar.detached.value).toEqual([]);
    });
  });

  describe('toggleSection', () => {
    it('activates an inactive section and persists the state', () => {
      const sidebar = mount(['chat', 'voice']);
      sidebar.toggleSection('voice');
      expect(sidebar.activeSet.value.has('voice')).toBe(true);
      expect(uiLayoutSet).toHaveBeenCalledWith(
        'sidebar:state',
        expect.objectContaining({ active: ['voice'] }),
      );
    });

    it('deactivates a section that is already active', () => {
      const sidebar = mount(['chat'], ['chat']);
      sidebar.toggleSection('chat');
      expect(sidebar.activeSet.value.size).toBe(0);
    });

    it('ignores a key outside the section list', () => {
      const sidebar = mount(['chat']);
      sidebar.toggleSection('ghost');
      expect(sidebar.activeSet.value.size).toBe(0);
      expect(uiLayoutSet).not.toHaveBeenCalled();
    });
  });

  describe('setSectionHeight', () => {
    it('rounds the height and persists it', () => {
      const sidebar = mount(['chat']);
      sidebar.setSectionHeight('chat', 150.4);
      expect(sidebar.sectionHeights.value.chat).toBe(150);
      expect(uiLayoutSet).toHaveBeenCalledWith(
        'sidebar:state',
        expect.objectContaining({ heights: { chat: 150 } }),
      );
    });

    it('clamps the height to the 80px minimum', () => {
      const sidebar = mount(['chat']);
      sidebar.setSectionHeight('chat', 12);
      expect(sidebar.sectionHeights.value.chat).toBe(80);
    });
  });

  describe('detachSection', () => {
    it('creates a window carrying the initial position', () => {
      const sidebar = mount(['chat']);
      const id = sidebar.detachSection('chat', { initialX: 10, initialY: 20 });
      expect(sidebar.detached.value).toEqual([
        { id, sectionKey: 'chat', initialX: 10, initialY: 20 },
      ]);
    });

    it('persists windows without their transient position', () => {
      const sidebar = mount(['chat']);
      const id = sidebar.detachSection('chat', { initialX: 10, initialY: 20 });
      expect(uiLayoutSet).toHaveBeenCalledWith(
        'sidebar:state',
        expect.objectContaining({ detached: [{ id, sectionKey: 'chat' }] }),
      );
    });

    it('refuses a key outside the section list', () => {
      const sidebar = mount(['chat']);
      expect(sidebar.detachSection('ghost')).toBeNull();
      expect(sidebar.detached.value).toEqual([]);
    });

    it('hands back a unique id per window', () => {
      const sidebar = mount(['chat']);
      expect(sidebar.detachSection('chat')).not.toBe(sidebar.detachSection('chat'));
      expect(sidebar.detached.value).toHaveLength(2);
    });
  });

  describe('dockWindow', () => {
    it('removes the window and drops its saved layout entry', () => {
      const sidebar = mount(['chat']);
      const id = sidebar.detachSection('chat');
      uiLayoutSet.mockClear();
      sidebar.dockWindow(id!);
      expect(sidebar.detached.value).toEqual([]);
      expect(uiLayoutRemove).toHaveBeenCalledWith(`sidebar:window:${id}`);
      expect(uiLayoutSet).toHaveBeenCalledTimes(1);
    });

    it('does nothing for an unknown window id', () => {
      const sidebar = mount(['chat']);
      sidebar.detachSection('chat');
      uiLayoutSet.mockClear();
      sidebar.dockWindow('ghost');
      expect(sidebar.detached.value).toHaveLength(1);
      expect(uiLayoutRemove).not.toHaveBeenCalled();
      expect(uiLayoutSet).not.toHaveBeenCalled();
    });
  });

  describe('restore on mount', () => {
    it('loads active sections, heights and detached windows from the saved state', async () => {
      layoutStore.set('sidebar:state', {
        active: ['voice', 'ghost'],
        heights: { voice: 120 },
        detached: [
          { id: 'w1', sectionKey: 'voice' },
          { id: 'w2', sectionKey: 'ghost' },
          { id: 42, sectionKey: 'voice' },
          null,
        ],
      });
      const sidebar = mount(['chat', 'voice'], ['chat']);
      await flushMounted();
      expect([...sidebar.activeSet.value]).toEqual(['voice']);
      expect(sidebar.sectionHeights.value).toEqual({ voice: 120 });
      expect(sidebar.detached.value).toEqual([{ id: 'w1', sectionKey: 'voice' }]);
    });

    it('keeps the defaults when nothing was saved', async () => {
      const sidebar = mount(['chat'], ['chat']);
      await flushMounted();
      expect([...sidebar.activeSet.value]).toEqual(['chat']);
    });

    it('ignores malformed saved fields', async () => {
      layoutStore.set('sidebar:state', { active: 'nope', heights: null, detached: 'nope' });
      const sidebar = mount(['chat'], ['chat']);
      await flushMounted();
      expect([...sidebar.activeSet.value]).toEqual(['chat']);
      expect(sidebar.sectionHeights.value).toEqual({});
      expect(sidebar.detached.value).toEqual([]);
    });
  });
});
