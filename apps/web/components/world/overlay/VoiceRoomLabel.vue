<script setup lang="ts">
defineProps<{
  name: string;
  members: Array<{ userId: string; name: string }>;
  speakingUserIds: Set<string>;
  x: number;
  y: number;
}>();
</script>

<template>
  <div
    class="pointer-events-none absolute z-10 -translate-x-1/2 flex flex-col items-center gap-1"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    <div
      class="rounded-full bg-indigo-600/90 px-2 py-0.5 text-xs font-semibold text-white whitespace-nowrap shadow-lg"
    >
      🔊 {{ name }}
    </div>
    <div
      v-if="members.length"
      class="flex flex-wrap items-center justify-center gap-1 max-w-[200px]"
    >
      <span
        v-for="m in members"
        :key="m.userId"
        class="rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap shadow"
        :class="
          speakingUserIds.has(m.userId) ? 'bg-green-500/90 text-white' : 'bg-black/60 text-white/85'
        "
      >
        {{ m.name }}
      </span>
    </div>
  </div>
</template>
