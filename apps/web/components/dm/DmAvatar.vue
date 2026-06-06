<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    name: string;
    avatarUrl?: string | null;
    size?: number;
  }>(),
  { avatarUrl: null, size: 36 },
);

const { resolveUrl } = useResolveUrl();
const src = computed(() => resolveUrl(props.avatarUrl) ?? null);
const initials = computed(() =>
  props.name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase(),
);
const style = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }));
</script>

<template>
  <span class="dm-avatar" :style="style">
    <img v-if="src" :src="src" :alt="name" class="dm-avatar__img" />
    <span v-else class="dm-avatar__initials" :style="{ fontSize: `${size * 0.36}px` }">
      {{ initials }}
    </span>
  </span>
</template>

<style scoped>
.dm-avatar {
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  overflow: hidden;
  isolation: isolate;
  background: linear-gradient(135deg, var(--accent-violet), var(--accent-cool));
  color: #fff;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px var(--surface-border);
}
.dm-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.dm-avatar__initials {
  line-height: 1;
}
</style>
