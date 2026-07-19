import {
  Bell,
  Camera,
  Clipboard,
  Code,
  Coffee,
  Dices,
  FileText,
  Folder,
  Gamepad2,
  Globe,
  Hash,
  Headphones,
  Home,
  Laptop,
  Layers,
  Lightbulb,
  Lock,
  Megaphone,
  MessageCircle,
  Mic,
  Monitor,
  Music,
  Palette,
  Pencil,
  Phone,
  Pin,
  Rocket,
  Settings,
  Star,
  Trophy,
  Users,
  Video,
  Volume2,
  Wrench,
  Zap,
} from 'lucide-vue-next';
import type { Component } from 'vue';

export interface ChannelIconEntry {
  name: string;
  component: Component;
}

export const CHANNEL_ICONS: ChannelIconEntry[] = [
  { name: 'hash', component: Hash },
  { name: 'message-circle', component: MessageCircle },
  { name: 'megaphone', component: Megaphone },
  { name: 'phone', component: Phone },
  { name: 'video', component: Video },
  { name: 'mic', component: Mic },
  { name: 'volume-2', component: Volume2 },
  { name: 'headphones', component: Headphones },
  { name: 'bell', component: Bell },
  { name: 'music', component: Music },
  { name: 'gamepad-2', component: Gamepad2 },
  { name: 'dices', component: Dices },
  { name: 'trophy', component: Trophy },
  { name: 'star', component: Star },
  { name: 'zap', component: Zap },
  { name: 'rocket', component: Rocket },
  { name: 'monitor', component: Monitor },
  { name: 'code', component: Code },
  { name: 'laptop', component: Laptop },
  { name: 'layers', component: Layers },
  { name: 'folder', component: Folder },
  { name: 'clipboard', component: Clipboard },
  { name: 'file-text', component: FileText },
  { name: 'pencil', component: Pencil },
  { name: 'pin', component: Pin },
  { name: 'palette', component: Palette },
  { name: 'camera', component: Camera },
  { name: 'lightbulb', component: Lightbulb },
  { name: 'settings', component: Settings },
  { name: 'wrench', component: Wrench },
  { name: 'lock', component: Lock },
  { name: 'users', component: Users },
  { name: 'globe', component: Globe },
  { name: 'home', component: Home },
  { name: 'coffee', component: Coffee },
];

export const CHANNEL_ICON_MAP: Record<string, Component> = Object.fromEntries(
  CHANNEL_ICONS.map((i) => [i.name, i.component]),
);

export const CHANNEL_TYPE_DEFAULTS: Record<string, Component> = {
  text: Hash,
  forum: Clipboard,
  voice: Volume2,
  game: Gamepad2,
  widget: Layers,
};

export const WIDGET_KIND_DEFAULTS: Record<string, Component> = {
  notes: FileText,
  gaming: Gamepad2,
};
