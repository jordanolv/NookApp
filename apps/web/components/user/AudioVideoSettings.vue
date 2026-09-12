<script setup lang="ts">
import { Camera, Mic, Volume2 } from 'lucide-vue-next';
import type { Component } from 'vue';
import { useMediaDevices } from '~/composables/useMediaDevices';
import type { MediaDeviceKind } from '~/utils/media-device-prefs';

const { t } = useI18n();
const media = useMediaDevices();

const rows: { kind: MediaDeviceKind; icon: Component; labelKey: string }[] = [
  { kind: 'audioinput', icon: Mic, labelKey: 'settings.user.audio.microphone' },
  { kind: 'audiooutput', icon: Volume2, labelKey: 'settings.user.audio.speaker' },
  { kind: 'videoinput', icon: Camera, labelKey: 'settings.user.audio.camera' },
];

const lists = {
  audioinput: media.byKind('audioinput'),
  audiooutput: media.byKind('audiooutput'),
  videoinput: media.byKind('videoinput'),
};

const selectedMic = computed(() => media.prefs.value.audioinput);

function onChange(kind: MediaDeviceKind, e: Event) {
  const value = (e.target as HTMLSelectElement).value;
  void media.select(kind, value || null);
}

onMounted(async () => {
  // Labels are empty until the browser has granted at least one media permission.
  await media.refresh(true);
  media.listen();
});
</script>

<template>
  <section class="space-y-6">
    <header>
      <h3 class="text-base font-semibold" :style="{ color: 'var(--ink)' }">
        {{ t('settings.user.audio.heading') }}
      </h3>
      <p class="text-xs mt-0.5" :style="{ color: 'var(--ink-muted)' }">
        {{ t('settings.user.audio.description') }}
      </p>
    </header>

    <div
      v-for="row in rows"
      :key="row.kind"
      class="rounded-xl p-4 flex items-center gap-4"
      :style="{ background: 'var(--surface-tinted)', border: '1px solid var(--surface-border)' }"
    >
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <component
            :is="row.icon"
            class="h-4 w-4"
            :stroke-width="1.75"
            :style="{ color: 'var(--ink-muted)' }"
          />
          <label
            :for="`media-${row.kind}`"
            class="text-sm font-medium"
            :style="{ color: 'var(--ink)' }"
          >
            {{ t(row.labelKey) }}
          </label>
        </div>
        <div v-if="row.kind === 'audioinput'" class="mt-3">
          <UserMicLevelMeter :device-id="selectedMic" />
          <p class="text-[11px] mt-1.5" :style="{ color: 'var(--ink-muted)' }">
            {{ t('settings.user.audio.micTestHint') }}
          </p>
        </div>
      </div>
      <select
        :id="`media-${row.kind}`"
        class="text-xs rounded-md px-2 py-1.5 outline-none shrink-0 max-w-[220px]"
        style="
          background: var(--surface-tinted-strong);
          border: 1px solid var(--surface-border);
          color: var(--ink);
        "
        :value="media.prefs.value[row.kind] ?? ''"
        @change="onChange(row.kind, $event)"
      >
        <option value="">{{ t('settings.user.audio.systemDefault') }}</option>
        <option v-for="d in lists[row.kind].value" :key="d.deviceId" :value="d.deviceId">
          {{ d.label || d.deviceId.slice(0, 8) }}
        </option>
      </select>
    </div>
  </section>
</template>
