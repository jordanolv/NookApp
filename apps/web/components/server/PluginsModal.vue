<script setup lang="ts">
const props = defineProps<{ serverId: string; serverName?: string | null }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();

interface ServerPlugin {
  id: string;
  icon: string;
  nameKey: string;
  descriptionKey: string;
  installed: boolean;
}

const plugins = ref<ServerPlugin[]>([]);
</script>

<template>
  <UiFloatingWindow
    :title="
      props.serverName ? t('plugins.titleWithName', { name: props.serverName }) : t('plugins.title')
    "
    :initial-width="720"
    :initial-height="540"
    :min-width="520"
    :min-height="360"
    @close="emit('close')"
  >
    <div class="h-full flex flex-col">
      <header class="px-6 pt-5 pb-4 border-b border-surface-border">
        <p class="text-xs" style="color: var(--ink-muted)">
          {{ t('plugins.subtitle') }}
        </p>
      </header>

      <div class="flex-1 min-h-0 overflow-auto p-6">
        <div
          v-if="plugins.length === 0"
          class="h-full flex items-center justify-center text-center"
        >
          <div class="max-w-xs">
            <div
              class="mx-auto mb-3 h-10 w-10 flex items-center justify-center rounded-xl text-xl"
              style="background: var(--surface-tinted); color: var(--ink-muted)"
            >
              ⊞
            </div>
            <p class="text-xs" style="color: var(--ink-muted)">
              {{ t('plugins.empty') }}
            </p>
          </div>
        </div>

        <ul v-else class="grid grid-cols-1 gap-2">
          <li
            v-for="plugin in plugins"
            :key="plugin.id"
            class="plugin-card flex items-start gap-3 rounded-xl p-3"
          >
            <span class="plugin-card__icon">{{ plugin.icon }}</span>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-ink truncate">{{ t(plugin.nameKey) }}</h3>
              <p class="text-xs mt-0.5" style="color: var(--ink-muted)">
                {{ t(plugin.descriptionKey) }}
              </p>
            </div>
            <button
              class="plugin-card__btn"
              :class="{ 'plugin-card__btn--installed': plugin.installed }"
            >
              {{ plugin.installed ? t('plugins.installed') : t('plugins.install') }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </UiFloatingWindow>
</template>

<style scoped>
.plugin-card {
  background: var(--surface-tinted);
  border: 1px solid var(--surface-tinted);
  transition: background 120ms;
}
.plugin-card:hover {
  background: var(--surface-tinted);
}
.plugin-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  font-size: 18px;
  background: var(--accent-violet-soft);
  color: var(--accent-violet);
}
.plugin-card__btn {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.85);
  color: white;
  border: none;
  cursor: pointer;
  transition: opacity 120ms;
}
.plugin-card__btn:hover {
  opacity: 0.85;
}
.plugin-card__btn--installed {
  background: var(--surface-tinted);
  color: var(--ink-muted);
}
</style>
