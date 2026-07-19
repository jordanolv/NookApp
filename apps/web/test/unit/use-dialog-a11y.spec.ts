import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useDialogA11y } from '../../composables/useDialogA11y';
import { withSetup } from '../helpers/with-setup';

// happy-dom leaves offsetParent null on every element, which the composable
// uses as a visibility filter. Force it so the focusable scan sees the buttons.
function visible(el: HTMLElement) {
  Object.defineProperty(el, 'offsetParent', { get: () => document.body, configurable: true });
}

function buildPanel(labels: string[]) {
  const panel = document.createElement('div');
  panel.tabIndex = -1;
  for (const label of labels) {
    const button = document.createElement('button');
    button.textContent = label;
    panel.appendChild(button);
    visible(button);
  }
  document.body.appendChild(panel);
  return panel;
}

function press(key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  document.dispatchEvent(event);
  return event;
}

describe('useDialogA11y', () => {
  let teardown: (() => void) | null = null;

  function mountDialog(panelEl: HTMLElement | null, openInitially = false) {
    const open = ref(openInitially);
    const panel = ref<HTMLElement | null>(panelEl);
    const close = vi.fn(() => {
      open.value = false;
    });
    const { unmount } = withSetup(() => useDialogA11y(open, panel, close));
    teardown = unmount;
    return { open, panel, close };
  }

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    teardown?.();
    teardown = null;
  });

  describe('escape', () => {
    it('calls close when the dialog is open', async () => {
      const { open, close } = mountDialog(buildPanel(['a', 'b']));
      open.value = true;
      await nextTick();
      await nextTick();
      press('Escape');
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('does not react while the dialog is closed', () => {
      const { close } = mountDialog(buildPanel(['a']));
      press('Escape');
      expect(close).not.toHaveBeenCalled();
    });
  });

  describe('focus management', () => {
    it('focuses the first focusable element on open', async () => {
      const panelEl = buildPanel(['first', 'second']);
      const { open } = mountDialog(panelEl);
      open.value = true;
      await nextTick();
      await nextTick();
      expect(document.activeElement?.textContent).toBe('first');
    });

    it('falls back to the panel itself when it holds nothing focusable', async () => {
      const panelEl = buildPanel([]);
      const { open } = mountDialog(panelEl);
      open.value = true;
      await nextTick();
      await nextTick();
      expect(document.activeElement).toBe(panelEl);
    });

    it('restores focus to the element that opened the dialog', async () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      visible(trigger);
      trigger.focus();

      const { open } = mountDialog(buildPanel(['first', 'second']));
      open.value = true;
      await nextTick();
      await nextTick();
      expect(document.activeElement).not.toBe(trigger);

      open.value = false;
      await nextTick();
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe('focus trap', () => {
    it('wraps from the last element back to the first on Tab', async () => {
      const panelEl = buildPanel(['first', 'second']);
      const { open } = mountDialog(panelEl);
      open.value = true;
      await nextTick();
      await nextTick();

      const last = panelEl.querySelectorAll('button')[1]!;
      last.focus();
      const event = press('Tab');
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement?.textContent).toBe('first');
    });

    it('wraps from the first element back to the last on Shift+Tab', async () => {
      const panelEl = buildPanel(['first', 'second']);
      const { open } = mountDialog(panelEl);
      open.value = true;
      await nextTick();
      await nextTick();

      const event = press('Tab', { shiftKey: true });
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement?.textContent).toBe('second');
    });

    it('leaves Tab alone in the middle of the list', async () => {
      const panelEl = buildPanel(['first', 'second', 'third']);
      const { open } = mountDialog(panelEl);
      open.value = true;
      await nextTick();
      await nextTick();

      panelEl.querySelectorAll('button')[1]!.focus();
      expect(press('Tab').defaultPrevented).toBe(false);
      expect(document.activeElement?.textContent).toBe('second');
    });

    it('swallows Tab when the dialog holds nothing focusable', async () => {
      const { open } = mountDialog(buildPanel([]));
      open.value = true;
      await nextTick();
      await nextTick();
      expect(press('Tab').defaultPrevented).toBe(true);
    });

    it('pulls focus back inside when it escaped the panel', async () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      visible(outside);

      const { open } = mountDialog(buildPanel(['first', 'second']));
      open.value = true;
      await nextTick();
      await nextTick();

      outside.focus();
      press('Tab', { shiftKey: true });
      expect(document.activeElement?.textContent).toBe('second');
    });
  });

  describe('teardown', () => {
    it('stops handling keys after the component unmounts', async () => {
      const { open, close } = mountDialog(buildPanel(['a']));
      open.value = true;
      await nextTick();
      await nextTick();
      teardown?.();
      teardown = null;
      press('Escape');
      expect(close).not.toHaveBeenCalled();
    });
  });
});
