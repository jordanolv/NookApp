import type { Component } from 'vue';
import { FileText, Gamepad2 } from 'lucide-vue-next';
import type { WidgetKind } from '@nookapp/protocol';
import WidgetNotes from './WidgetNotes.vue';
import WidgetGaming from './WidgetGaming.vue';

export interface WidgetDefinition {
  label: string;
  description: string;
  component: Component;
  icon: Component;
  defaultSize: { width: number; height: number };
  minSize?: { width: number; height: number };
}

export const WIDGET_REGISTRY: Record<WidgetKind, WidgetDefinition> = {
  notes: {
    label: 'Notes',
    description: 'Notes rapides et colorées',
    component: WidgetNotes,
    icon: FileText,
    defaultSize: { width: 720, height: 560 },
    minSize: { width: 480, height: 360 },
  },
  gaming: {
    label: 'Gaming',
    description: 'Library de jeux + discussions',
    component: WidgetGaming,
    icon: Gamepad2,
    defaultSize: { width: 820, height: 600 },
    minSize: { width: 560, height: 400 },
  },
};

export function getWidget(kind: string | null | undefined): WidgetDefinition | null {
  if (!kind || !(kind in WIDGET_REGISTRY)) return null;
  return WIDGET_REGISTRY[kind as WidgetKind];
}
