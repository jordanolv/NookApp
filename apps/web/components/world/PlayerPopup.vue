<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useVoice } from '~/composables/useVoice';

const props = defineProps<{
  userId: string;
  name: string;
  x: number;
  y: number;
}>();

const emit = defineEmits<{ close: [] }>();

const voice = useVoice();

const isScreenSharing = computed(
  () => voice.participantMedia.value.get(props.userId)?.screen ?? false,
);

const initials = computed(() =>
  props.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase(),
);

function viewScreenShare() {
  voice.openMediaPanel(`screen-${props.userId}`);
  emit('close');
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 z-40" @click="emit('close')" />

  <!-- Card -->
  <div
    class="player-popup pointer-events-auto absolute z-50 w-72 overflow-hidden rounded-2xl"
    :style="{
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translateX(-50%) translateY(calc(-100% - 12px))',
      background: 'linear-gradient(180deg, #2a2734 0%, #1d1b26 100%)',
      boxShadow: '0 18px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06) inset',
    }"
    @click.stop
  >
    <!-- Banner -->
    <div
      class="relative h-20"
      style="
        background:
          radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.18), transparent 60%),
          linear-gradient(135deg, #6f7cff 0%, #a76fff 50%, #ff6fbf 100%);
      "
    >
      <button
        class="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-md text-sm text-white transition-colors hover:bg-red-500/60"
        style="background: rgba(0, 0, 0, 0.35)"
        @click="emit('close')"
      >
        ✕
      </button>

      <!-- Avatar overlapping the banner bottom -->
      <div
        class="absolute flex items-center justify-center rounded-full border-4 text-2xl font-bold text-white"
        style="
          left: 18px;
          bottom: -34px;
          width: 68px;
          height: 68px;
          background: linear-gradient(135deg, #6f3cff, #ff6fbf);
          border-color: #1d1b26;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
        "
      >
        {{ initials }}
        <!-- Presence dot -->
        <span
          class="absolute rounded-full border-2"
          style="
            right: -2px;
            bottom: -2px;
            width: 16px;
            height: 16px;
            background: #2bd47b;
            border-color: #1d1b26;
            box-shadow: 0 0 6px rgba(43, 212, 123, 0.7);
          "
        />
      </div>
    </div>

    <!-- Body -->
    <div class="pb-0 pl-5 pr-5 pt-12">
      <p class="text-lg font-bold" style="color: #f3f0ff">{{ name }}</p>
      <p class="mt-0.5 text-xs" style="color: #8a90a8">En ligne</p>
    </div>

    <!-- Actions -->
    <div class="mt-4 flex flex-col gap-2 px-4 pb-4">
      <button
        v-if="isScreenSharing"
        class="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-white transition-all"
        style="
          background: linear-gradient(135deg, #6f7cff, #a76fff);
          box-shadow: 0 4px 12px rgba(111, 124, 255, 0.35);
        "
        @click="viewScreenShare"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        Voir le partage d'écran
      </button>

      <button
        class="flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-colors"
        style="background: rgba(255, 255, 255, 0.08); color: #f3f0ff"
        @click="emit('close')"
      >
        👋 Wave
      </button>
    </div>
  </div>
</template>

<style scoped>
.player-popup {
  animation: up-pop 0.15s ease-out;
}

@keyframes up-pop {
  from {
    opacity: 0;
    scale: 0.92;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}
</style>
