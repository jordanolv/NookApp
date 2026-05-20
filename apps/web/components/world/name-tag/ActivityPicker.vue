<script setup lang="ts">
import { ref } from 'vue';
import { ACTIVITY_PRESETS } from './constants';
import { useLocalActivity } from '~/composables/useLocalActivity';

const { localActivity, setLocalActivity } = useLocalActivity();
const open = ref(false);

function pick(icon: string | null) {
  setLocalActivity(icon);
  open.value = false;
}
</script>

<template>
  <div class="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="open"
        class="flex items-center gap-1.5 rounded-xl bg-zinc-900/85 backdrop-blur-md ring-1 ring-white/10 p-1.5 shadow-xl"
      >
        <button
          v-for="preset in ACTIVITY_PRESETS"
          :key="preset"
          type="button"
          class="w-8 h-8 rounded-lg text-lg leading-none transition hover:bg-white/10"
          :class="localActivity === preset ? 'bg-indigo-500/40 ring-1 ring-indigo-300/60' : ''"
          @click="pick(preset)"
        >
          {{ preset }}
        </button>
        <button
          type="button"
          class="w-8 h-8 rounded-lg text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          @click="pick(null)"
        >
          ✕
        </button>
      </div>
    </Transition>
    <button
      type="button"
      class="flex items-center gap-1.5 rounded-full bg-zinc-900/80 backdrop-blur-md ring-1 ring-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 shadow-lg transition hover:bg-zinc-800/85"
      @click="open = !open"
    >
      <span class="text-base leading-none">{{ localActivity ?? '➕' }}</span>
      <span>{{ localActivity ? 'Statut' : 'Définir un statut' }}</span>
    </button>
  </div>
</template>
