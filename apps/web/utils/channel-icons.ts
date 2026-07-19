import type { Component } from 'vue';
import {
  BookOpen,
  Camera,
  Code2,
  Coffee,
  Flame,
  Gamepad2,
  Hash,
  Heart,
  Leaf,
  Megaphone,
  MessageSquare,
  Music,
  Pin,
  Sparkles,
  Star,
  Zap,
} from 'lucide-vue-next';

export const CHANNEL_ICON_LIBRARY: Record<string, Component> = {
  hash: Hash,
  message: MessageSquare,
  megaphone: Megaphone,
  pin: Pin,
  star: Star,
  heart: Heart,
  gamepad: Gamepad2,
  coffee: Coffee,
  book: BookOpen,
  music: Music,
  camera: Camera,
  sparkles: Sparkles,
  flame: Flame,
  leaf: Leaf,
  zap: Zap,
  code: Code2,
};

export const CHANNEL_ICON_NAMES = Object.keys(CHANNEL_ICON_LIBRARY);

export function iconComponentByName(name: string | null | undefined): Component | null {
  if (!name) return null;
  return CHANNEL_ICON_LIBRARY[name] ?? null;
}
