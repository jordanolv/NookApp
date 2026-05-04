<script setup lang="ts">
const route = useRoute();
const serverId = computed(() => route.params.serverId as string);
const { listForServer, enable, disable } = usePlugins();

const plugins = ref<Awaited<ReturnType<typeof listForServer>>>([]);
const loading = ref(true);
const toggling = ref<string | null>(null);

async function load() {
  loading.value = true;
  try {
    plugins.value = await listForServer(serverId.value);
  } finally {
    loading.value = false;
  }
}

async function toggle(pluginId: string, currentlyEnabled: boolean) {
  toggling.value = pluginId;
  try {
    if (currentlyEnabled) {
      await disable(serverId.value, pluginId);
    } else {
      await enable(serverId.value, pluginId);
    }
    await load();
  } finally {
    toggling.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="border-b border-neutral-800 px-4 py-3">
      <h2 class="text-sm font-semibold">Plugins</h2>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div
          class="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
        />
      </div>

      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="plugin in plugins"
          :key="plugin.id"
          class="rounded-lg border border-neutral-800 bg-neutral-900 p-4 flex items-start gap-3"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold">{{ plugin.displayName }}</span>
              <span class="text-xs text-neutral-500">v{{ plugin.version }}</span>
            </div>
            <p class="mt-0.5 text-xs text-neutral-400">{{ plugin.description }}</p>
            <p class="mt-1 text-xs text-neutral-600">by {{ plugin.author }}</p>
          </div>

          <button
            class="flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            :class="
              plugin.enabled
                ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            "
            :disabled="toggling === plugin.id"
            @click="toggle(plugin.id, plugin.enabled)"
          >
            {{ plugin.enabled ? 'Disable' : 'Enable' }}
          </button>
        </li>

        <li v-if="!plugins.length" class="text-sm text-neutral-500 text-center py-8">
          No plugins available.
        </li>
      </ul>
    </div>
  </div>
</template>
