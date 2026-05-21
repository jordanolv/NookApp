<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Circle, CircleCheck, Slash } from 'lucide-vue-next';
import { useServerPlugins, type ServerPluginItem } from '~/composables/useServerPlugins';

const props = defineProps<{ serverId: string }>();

const { t } = useI18n();
const { list, install, uninstall } = useServerPlugins();

const plugins = ref<ServerPluginItem[]>([]);
const loading = ref(true);
const loadError = ref<string | null>(null);
const toggling = ref<string | null>(null);

async function load() {
  loading.value = true;
  loadError.value = null;
  try {
    plugins.value = await list(props.serverId);
  } catch (e) {
    loadError.value = (e as { data?: { message?: string } })?.data?.message ?? (e as Error).message;
  } finally {
    loading.value = false;
  }
}

async function toggle(plugin: ServerPluginItem) {
  toggling.value = plugin.id;
  try {
    if (plugin.installed) {
      await uninstall(props.serverId, plugin.id);
    } else {
      await install(props.serverId, plugin.id);
    }
    await load();
  } finally {
    toggling.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="border-b border-white/10 px-4 py-3">
      <h2 class="text-sm font-semibold" style="color: rgba(255, 255, 255, 0.9)">
        {{ t('serverSettings.plugins.heading') }}
      </h2>
      <p class="mt-0.5 text-xs" style="color: rgba(255, 255, 255, 0.45)">
        {{ t('serverSettings.plugins.description') }}
      </p>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div
          class="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
        />
      </div>

      <div v-else-if="loadError" class="text-sm" style="color: rgba(248, 113, 113, 0.9)">
        {{ loadError }}
      </div>

      <ul v-else-if="plugins.length" class="flex flex-col gap-2">
        <li
          v-for="plugin in plugins"
          :key="plugin.id"
          class="rounded-lg p-3 flex items-start gap-3"
          style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06)"
        >
          <component
            :is="plugin.connected ? CircleCheck : Circle"
            :size="14"
            :stroke-width="2"
            class="mt-0.5 shrink-0"
            :style="{
              color: plugin.connected ? 'rgb(74, 222, 128)' : 'rgba(255, 255, 255, 0.25)',
            }"
          />

          <div class="flex-1 min-w-0 space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold" style="color: rgba(255, 255, 255, 0.9)">
                {{ plugin.name }}
              </span>
              <span class="text-[11px]" style="color: rgba(255, 255, 255, 0.35)">
                {{ plugin.slug }}
              </span>
            </div>

            <p v-if="plugin.description" class="text-xs" style="color: rgba(255, 255, 255, 0.5)">
              {{ plugin.description }}
            </p>

            <div
              v-if="plugin.capabilities && plugin.capabilities.features.length"
              class="flex flex-wrap gap-1.5 text-[11px]"
              style="color: rgba(255, 255, 255, 0.45)"
            >
              <span
                v-for="feature in plugin.capabilities.features"
                :key="feature.id"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                style="background: rgba(99, 102, 241, 0.12)"
              >
                <span>{{ feature.icon }}</span>
                {{ feature.name }}
              </span>
            </div>
          </div>

          <button
            type="button"
            class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
            :style="
              plugin.installed
                ? { background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.85)' }
                : { background: 'rgba(99, 102, 241, 0.9)', color: 'white' }
            "
            :disabled="toggling === plugin.id"
            @click="toggle(plugin)"
          >
            <Slash v-if="plugin.installed" :size="11" :stroke-width="2" />
            {{
              plugin.installed
                ? t('serverSettings.plugins.uninstall')
                : t('serverSettings.plugins.install')
            }}
          </button>
        </li>
      </ul>

      <div v-else class="text-center py-8 text-xs" style="color: rgba(255, 255, 255, 0.4)">
        {{ t('serverSettings.plugins.empty') }}
      </div>
    </div>
  </div>
</template>
