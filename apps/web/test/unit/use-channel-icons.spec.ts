import { describe, expect, it } from 'vitest';
import { Clipboard, FileText, Gamepad2, Hash, Layers, Volume2 } from 'lucide-vue-next';
import {
  CHANNEL_ICON_MAP,
  CHANNEL_ICONS,
  CHANNEL_TYPE_DEFAULTS,
  WIDGET_KIND_DEFAULTS,
} from '../../composables/useChannelIcons';

describe('useChannelIcons', () => {
  it('gives every palette icon a unique name', () => {
    const names = CHANNEL_ICONS.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('maps every palette entry name to its component', () => {
    expect(Object.keys(CHANNEL_ICON_MAP)).toHaveLength(CHANNEL_ICONS.length);
    for (const { name, component } of CHANNEL_ICONS) {
      expect(CHANNEL_ICON_MAP[name]).toBe(component);
    }
  });

  it('provides a default icon for every channel type', () => {
    expect(CHANNEL_TYPE_DEFAULTS).toEqual({
      text: Hash,
      forum: Clipboard,
      voice: Volume2,
      game: Gamepad2,
      widget: Layers,
    });
  });

  it('provides a default icon for every widget kind', () => {
    expect(WIDGET_KIND_DEFAULTS).toEqual({ notes: FileText, gaming: Gamepad2 });
  });
});
