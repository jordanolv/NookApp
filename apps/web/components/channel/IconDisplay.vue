<script setup lang="ts">
import { Hash } from 'lucide-vue-next';
import { CHANNEL_ICON_MAP, CHANNEL_TYPE_DEFAULTS } from '~/composables/useChannelIcons';

const props = defineProps<{
  iconUrl: string | null;
  size?: number;
  type?: 'text' | 'voice' | 'forum' | 'game' | 'widget';
}>();

const { apiBase } = useRuntimeConfig().public;
const apiOrigin = new URL(apiBase as string).origin;

const sz = computed(() => props.size ?? 15);

const parsed = computed(() => {
  const url = props.iconUrl;
  if (!url) return { type: 'none' as const };
  if (url.startsWith('/')) return { type: 'image' as const, src: `${apiOrigin}${url}` };
  if (url.startsWith('icon:')) {
    const [, name, color] = url.split(':');
    return { type: 'lucide' as const, name, color: color ?? '#818cf8' };
  }
  return { type: 'emoji' as const, emoji: url };
});

const lucideComponent = computed(() =>
  parsed.value.type === 'lucide' ? (CHANNEL_ICON_MAP[parsed.value.name] ?? Hash) : null,
);

const defaultComponent = computed(() => CHANNEL_TYPE_DEFAULTS[props.type ?? 'text'] ?? Hash);
</script>

<template>
  <img
    v-if="parsed.type === 'image'"
    :src="parsed.src"
    :style="{ width: sz + 'px', height: sz + 'px' }"
    class="rounded object-cover flex-shrink-0"
  />
  <span
    v-else-if="parsed.type === 'emoji'"
    class="flex-shrink-0 leading-none select-none"
    :style="{ fontSize: sz + 'px' }"
    >{{ parsed.emoji }}</span
  >
  <component
    :is="lucideComponent"
    v-else-if="parsed.type === 'lucide'"
    :size="sz"
    :color="parsed.color"
    :stroke-width="1.75"
    class="flex-shrink-0"
  />
  <component
    :is="defaultComponent"
    v-else
    :size="sz"
    :stroke-width="1.75"
    class="flex-shrink-0"
    style="color: var(--ink-faint)"
  />
</template>
