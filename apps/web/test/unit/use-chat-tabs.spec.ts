import { describe, expect, it } from 'vitest';
import { useChatTabs } from '../../composables/useChatTabs';

describe('useChatTabs', () => {
  describe('openChannel', () => {
    it('opens a channel as a tab and focuses it', () => {
      const tabs = useChatTabs();
      tabs.openChannel('c1');
      expect(tabs.tabIds.value).toEqual(['c1']);
      expect(tabs.activeId.value).toBe('c1');
    });

    it('does not duplicate an already open tab', () => {
      const tabs = useChatTabs();
      tabs.openChannel('c1');
      tabs.openChannel('c2');
      tabs.openChannel('c1');
      expect(tabs.tabIds.value).toEqual(['c1', 'c2']);
      expect(tabs.activeId.value).toBe('c1');
    });

    it('raises the floating window instead of creating a tab for a torn-off channel', () => {
      const tabs = useChatTabs();
      tabs.openChannel('c1');
      tabs.openChannel('c2');
      tabs.tearOff('c1', 10, 20);
      tabs.openChannel('c1');
      expect(tabs.tabIds.value).toEqual(['c2']);
      expect(tabs.floating.value.map((w) => w.channelId)).toEqual(['c1']);
    });
  });

  describe('closeTab', () => {
    it('activates the tab on the left of the one closed', () => {
      const tabs = useChatTabs();
      tabs.openChannel('c1');
      tabs.openChannel('c2');
      tabs.openChannel('c3');
      tabs.closeTab('c3');
      expect(tabs.activeId.value).toBe('c2');
    });

    it('falls back to the new first tab when closing the leftmost one', () => {
      const tabs = useChatTabs();
      tabs.openChannel('c1');
      tabs.openChannel('c2');
      tabs.activeId.value = 'c1';
      tabs.closeTab('c1');
      expect(tabs.activeId.value).toBe('c2');
    });

    it('clears the active tab when the last one is closed', () => {
      const tabs = useChatTabs();
      tabs.openChannel('c1');
      tabs.closeTab('c1');
      expect(tabs.tabIds.value).toEqual([]);
      expect(tabs.activeId.value).toBeNull();
    });

    it('keeps the active tab when a background tab is closed', () => {
      const tabs = useChatTabs();
      tabs.openChannel('c1');
      tabs.openChannel('c2');
      tabs.closeTab('c1');
      expect(tabs.activeId.value).toBe('c2');
    });
  });

  describe('focusFloating', () => {
    it('moves the window last so it renders on top', () => {
      const tabs = useChatTabs();
      tabs.openChannel('c1');
      tabs.tearOff('c1', 0, 0);
      tabs.openChannel('c2');
      tabs.tearOff('c2', 0, 0);
      tabs.focusFloating('c1');
      expect(tabs.floating.value.map((w) => w.channelId)).toEqual(['c2', 'c1']);
    });

    it('ignores a channel that has no floating window', () => {
      const tabs = useChatTabs();
      tabs.focusFloating('ghost');
      expect(tabs.floating.value).toEqual([]);
    });
  });

  describe('tearOff and dockToTabBar', () => {
    it('converts a tab into a floating window at the drop position', () => {
      const tabs = useChatTabs();
      tabs.openChannel('c1');
      tabs.tearOff('c1', 120, 240);
      expect(tabs.tabIds.value).toEqual([]);
      expect(tabs.floating.value).toEqual([{ channelId: 'c1', x: 120, y: 240 }]);
    });

    it('docks a floating window back as the active tab and ends the drag', () => {
      const tabs = useChatTabs();
      tabs.openChannel('c1');
      tabs.tearOff('c1', 0, 0);
      tabs.draggingId.value = 'c1';
      tabs.dockToTabBar('c1');
      expect(tabs.floating.value).toEqual([]);
      expect(tabs.tabIds.value).toEqual(['c1']);
      expect(tabs.activeId.value).toBe('c1');
      expect(tabs.draggingId.value).toBeNull();
    });
  });

  describe('activeChannelIds', () => {
    it('unions docked tabs and floating windows', () => {
      const tabs = useChatTabs();
      tabs.openChannel('c1');
      tabs.openChannel('c2');
      tabs.tearOff('c2', 0, 0);
      expect([...tabs.activeChannelIds.value].sort()).toEqual(['c1', 'c2']);
    });

    it('is empty once every tab is closed', () => {
      const tabs = useChatTabs();
      tabs.openChannel('c1');
      tabs.closeAllTabs();
      expect(tabs.activeChannelIds.value.size).toBe(0);
      expect(tabs.activeId.value).toBeNull();
    });
  });
});
