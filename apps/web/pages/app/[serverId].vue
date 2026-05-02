<script setup lang="ts">
definePageMeta({ layout: 'app' });

const route = useRoute();
const serverId = computed(() => route.params.serverId as string);

const { store, fetchServers } = useServers();
const { fetchChannels } = useChannels();
const { user, signOut } = useAuth();
const { createInvite } = useInvites();
const socket = useSocket();

const showInviteModal = ref(false);
const inviteUrl = ref('');
const inviteLoading = ref(false);
const inviteCopied = ref(false);

async function handleInvite() {
  showInviteModal.value = true;
  if (inviteUrl.value) return;
  inviteLoading.value = true;
  try {
    const invite = await createInvite(serverId.value);
    inviteUrl.value = `${window.location.origin}/invite/${invite.code}`;
  } finally {
    inviteLoading.value = false;
  }
}

async function copyInviteUrl() {
  await navigator.clipboard.writeText(inviteUrl.value);
  inviteCopied.value = true;
  setTimeout(() => (inviteCopied.value = false), 2000);
}

function closeInviteModal() {
  showInviteModal.value = false;
}

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
        <button
          class="flex-shrink-0 text-neutral-500 hover:text-neutral-300 transition-colors"
          title="Invite people"
          @click="handleInvite"
        >
          +
        </button>
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

    <!-- Invite modal -->
    <Teleport to="body">
      <div
        v-if="showInviteModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        @click.self="closeInviteModal"
      >
        <div
          class="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 flex flex-col gap-4"
        >
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-sm">Invite people to {{ server?.name }}</h2>
            <button
              class="text-neutral-500 hover:text-neutral-300 transition-colors"
              @click="closeInviteModal"
            >
              ✕
            </button>
          </div>

          <div v-if="inviteLoading" class="flex items-center justify-center py-4">
            <div
              class="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
            />
          </div>

          <div v-else class="flex flex-col gap-2">
            <p class="text-xs text-neutral-500">Share this link with anyone you want to invite.</p>
            <div class="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2">
              <span class="flex-1 truncate text-xs text-neutral-300 font-mono">{{
                inviteUrl
              }}</span>
              <button
                class="flex-shrink-0 rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium hover:bg-indigo-500 transition-colors"
                @click="copyInviteUrl"
              >
                {{ inviteCopied ? 'Copied!' : 'Copy' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
