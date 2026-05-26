import { computed } from 'vue';
import type { UiLayoutEntry } from '@nookapp/protocol';

export type HudVisibilityKey = 'ui:hud:onlineWidgetHidden' | 'ui:voiceHidden';

export function useHudVisibility() {
  const uiLayout = useUiLayout();

  function readHidden(key: HudVisibilityKey): boolean {
    const entry = uiLayout.get<UiLayoutEntry>(key);
    return (entry as { hidden?: unknown } | null)?.hidden === true;
  }

  function isHidden(key: HudVisibilityKey) {
    return computed<boolean>(() => readHidden(key));
  }

  function setHidden(key: HudVisibilityKey, v: boolean) {
    uiLayout.set(key, { hidden: v } as UiLayoutEntry);
  }

  function toggle(key: HudVisibilityKey) {
    setHidden(key, !readHidden(key));
  }

  return { isHidden, setHidden, toggle };
}
