<script setup lang="ts">
definePageMeta({ layout: 'app' });

const route = useRoute();
const serverId = computed(() => route.params.serverId as string);

const { store, fetchServers } = useServers();
const { fetchChannels } = useChannels();
const { user, signOut } = useAuth();
const socket = useSocket();

if (!store.ready) await fetchServers();

const server = computed(() => store.list.find((s) => s.id === serverId.value) ?? null);

watch(
  serverId,
  async (id) => {
    const found = store.list.find((s) => s.id === id) ?? null;
    store.setCurrent(found);
    if (found) await fetchChannels(id);
  },
  { immediate: true },
);

const currentChannelId = computed(() => {
  const match = route.path.match(/\/channels\/([^/]+)/);
  return match?.[1] ?? null;
});

onMounted(() => {
  socket.connect();
  socket.joinServer(serverId.value);
});

onUnmounted(() => {
  socket.disconnect();
});

watch(serverId, (id) => socket.joinServer(id));

async function handleSignOut() {
  await signOut();
  await navigateTo('/auth/login');
}
</script>

<template>
  <div class="flex h-full w-full overflow-hidden">
    <!-- Sidebar -->
    <aside class="flex w-60 flex-shrink-0 flex-col border-r border-neutral-800 bg-neutral-900">
      <!-- Server header -->
      <div class="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <NuxtLink
          to="/app"
          class="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
        >
          <div
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold"
          >
            {{ server?.name[0]?.toUpperCase() }}
          </div>
          <span class="truncate text-sm font-semibold">{{ server?.name }}</span>
        </NuxtLink>
      </div>

      <!-- Channels -->
      <nav class="flex-1 overflow-y-auto py-3 px-2">
        <div v-if="store.textChannels.length">
          <p class="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Text channels
          </p>
          <ul class="space-y-0.5">
            <li v-for="ch in store.textChannels" :key="ch.id">
              <NuxtLink
                :to="`/app/${serverId}/channels/${ch.id}`"
                class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
                :class="{ 'bg-neutral-700 text-neutral-100': currentChannelId === ch.id }"
              >
                <span class="text-neutral-500">#</span>
                <span class="truncate">{{ ch.name }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>

        <div v-if="store.voiceChannels.length" class="mt-4">
          <p class="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Voice channels
          </p>
          <ul class="space-y-0.5">
            <li v-for="ch in store.voiceChannels" :key="ch.id">
              <button
                class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
              >
                <span class="text-neutral-500">🔊</span>
                <span class="truncate">{{ ch.name }}</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <!-- User bar -->
      <div class="border-t border-neutral-800 p-3 flex items-center gap-2">
        <div
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-700 text-xs font-semibold"
        >
          {{ user?.name[0]?.toUpperCase() }}
        </div>
        <span class="flex-1 truncate text-sm font-medium">{{ user?.name }}</span>
        <button
          class="text-neutral-500 hover:text-neutral-300 transition-colors text-xs"
          title="Sign out"
          @click="handleSignOut"
        >
          ↩
        </button>
      </div>
    </aside>

    <!-- Main content (nested route) -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <NuxtPage />
    </div>
  </div>
</template>
