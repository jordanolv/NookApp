<script setup lang="ts">
definePageMeta({ layout: 'app' });

const route = useRoute();
const serverId = computed(() => route.params.serverId as string);

const { store, fetchServers } = useServers();
const { fetchChannels } = useChannels();
const { user, signOut } = useAuth();
const { createInvite } = useInvites();
const socket = useSocket();
const voice = useVoice();

// ── Multi-window chat ──
interface ChatWin {
  channelId: string;
  x: number;
  y: number;
}
const openWindows = ref<ChatWin[]>([]);
let windowCounter = 0;

function openChannel(channelId: string, e: MouseEvent) {
  const alreadyOpen = openWindows.value.find((w) => w.channelId === channelId);
  if (alreadyOpen) {
    focusWindow(channelId);
    return;
  }
  const stagger = (windowCounter % 6) * 28;
  const x = import.meta.client ? Math.round(window.innerWidth / 2 - 200) + stagger : 300;
  const y = import.meta.client ? Math.round(window.innerHeight / 2 - 270) + stagger : 100;
  windowCounter++;

  if (e.ctrlKey || e.metaKey) {
    openWindows.value = [...openWindows.value, { channelId, x, y }];
  } else {
    openWindows.value = [{ channelId, x, y }];
  }
}

function closeWindow(channelId: string) {
  openWindows.value = openWindows.value.filter((w) => w.channelId !== channelId);
}

function focusWindow(channelId: string) {
  const win = openWindows.value.find((w) => w.channelId === channelId);
  if (!win) return;
  openWindows.value = [...openWindows.value.filter((w) => w.channelId !== channelId), win];
}

const activeChannelIds = computed(() => new Set(openWindows.value.map((w) => w.channelId)));

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

async function handleVoiceChannelClick(channelId: string) {
  if (voice.currentChannelId.value === channelId) {
    await voice.leave();
  } else {
    await voice.join(serverId.value, channelId);
  }
}

let teardownVoiceListeners: (() => void) | null = null;

onMounted(() => {
  socket.connect();
  teardownVoiceListeners = voice.setupListeners();
});

onUnmounted(async () => {
  if (voice.currentChannelId.value) await voice.leave();
  teardownVoiceListeners?.();
  socket.disconnect();
});

async function handleSignOut() {
  await signOut();
  await navigateTo('/auth/login');
}
</script>

<template>
  <div class="relative h-full w-full overflow-hidden">
    <!-- World fills everything -->
    <ClientOnly>
      <WorldNookWorld
        v-if="user?.id"
        :server-id="serverId"
        :user-id="user.id"
        :player-name="user.name"
      />
    </ClientOnly>

    <!-- ── Icon rail ── -->
    <div
      class="fixed top-4 right-4 bottom-4 z-40 flex flex-col rounded-2xl py-2 gap-1"
      style="
        width: 52px;
        background: rgba(12, 12, 18, 0.75);
        backdrop-filter: blur(24px) saturate(160%);
        -webkit-backdrop-filter: blur(24px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.07);
        box-shadow:
          0 8px 40px rgba(0, 0, 0, 0.5),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
      "
    >
      <!-- Server icon / back -->
      <NuxtLink
        to="/app"
        class="mx-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-70"
        style="background: linear-gradient(135deg, #6366f1, #4338ca)"
        :title="server?.name"
      >
        {{ server?.name?.[0]?.toUpperCase() }}
      </NuxtLink>

      <!-- Divider -->
      <div
        class="mx-3 my-1 flex-shrink-0"
        style="height: 1px; background: rgba(255, 255, 255, 0.06)"
      />

      <!-- Text channels -->
      <div class="flex flex-col gap-0.5 px-1.5">
        <button
          v-for="ch in store.textChannels"
          :key="ch.id"
          class="relative flex h-8 w-8 mx-auto items-center justify-center rounded-xl transition-all duration-150"
          :style="
            activeChannelIds.has(ch.id)
              ? 'background: rgba(99,102,241,0.25); color: rgba(165,180,252,1)'
              : 'color: rgba(255,255,255,0.3)'
          "
          :title="ch.name + ' (Ctrl+click to open multiple)'"
          @click="openChannel(ch.id, $event)"
        >
          <span
            v-if="activeChannelIds.has(ch.id)"
            class="absolute -left-1.5 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-indigo-400"
          />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </button>
      </div>

      <!-- Voice channels -->
      <div v-if="store.voiceChannels.length" class="flex flex-col gap-0.5 px-1.5">
        <div class="mx-1 my-1" style="height: 1px; background: rgba(255, 255, 255, 0.04)" />
        <button
          v-for="ch in store.voiceChannels"
          :key="ch.id"
          class="relative flex h-8 w-8 mx-auto items-center justify-center rounded-xl transition-all duration-150"
          :style="
            voice.currentChannelId.value === ch.id
              ? 'background: rgba(34,197,94,0.15); color: #4ade80'
              : 'color: rgba(255,255,255,0.3)'
          "
          :title="ch.name"
          @click="handleVoiceChannelClick(ch.id)"
        >
          <span
            v-if="voice.currentChannelId.value === ch.id"
            class="absolute -left-1.5 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-green-400"
          />
          <!-- Speaking indicator -->
          <span
            v-if="voice.voicePresence.value.get(ch.id)?.length"
            class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500"
            style="border: 1.5px solid rgba(12, 12, 18, 0.9)"
          />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
            />
          </svg>
        </button>
      </div>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- Plugins -->
      <div class="flex flex-col gap-0.5 px-1.5">
        <div class="mx-1 mb-1" style="height: 1px; background: rgba(255, 255, 255, 0.04)" />
        <NuxtLink
          :to="`/app/${serverId}/plugins`"
          class="flex h-8 w-8 mx-auto items-center justify-center rounded-xl transition-all duration-150"
          :style="
            route.path.endsWith('/plugins')
              ? 'background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8)'
              : 'color: rgba(255,255,255,0.3)'
          "
          title="Plugins"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"
            />
          </svg>
        </NuxtLink>

        <!-- Invite -->
        <button
          class="flex h-8 w-8 mx-auto items-center justify-center rounded-xl transition-all duration-150"
          style="color: rgba(255, 255, 255, 0.3)"
          title="Invite people"
          @click="handleInvite"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
        </button>

        <!-- Sign out -->
        <button
          class="flex h-8 w-8 mx-auto items-center justify-center rounded-xl transition-all duration-150"
          style="color: rgba(255, 255, 255, 0.2)"
          title="Sign out"
          @click="handleSignOut"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Chat windows ── -->
    <ChatWindow
      v-for="(win, i) in openWindows"
      :key="win.channelId"
      :channel-id="win.channelId"
      :initial-x="win.x"
      :initial-y="win.y"
      :z-index="45 + i"
      @close="closeWindow(win.channelId)"
      @focus="focusWindow(win.channelId)"
    />

    <!-- Voice panel -->
    <ClientOnly>
      <VoicePanel />
    </ClientOnly>

    <!-- Invite modal -->
    <Teleport to="body">
      <div
        v-if="showInviteModal"
        class="fixed inset-0 z-[60] flex items-center justify-center"
        style="background: rgba(0, 0, 0, 0.55)"
        @click.self="closeInviteModal"
      >
        <div
          class="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
          style="
            background: rgba(12, 12, 18, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
          "
        >
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-sm" style="color: rgba(255, 255, 255, 0.85)">
              Invite people to {{ server?.name }}
            </h2>
            <button style="color: rgba(255, 255, 255, 0.3)" @click="closeInviteModal">✕</button>
          </div>

          <div v-if="inviteLoading" class="flex items-center justify-center py-4">
            <div
              class="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
            />
          </div>

          <div v-else class="flex flex-col gap-2">
            <p class="text-xs" style="color: rgba(255, 255, 255, 0.3)">
              Share this link to invite people.
            </p>
            <div
              class="flex items-center gap-2 rounded-xl px-3 py-2"
              style="
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.08);
              "
            >
              <span
                class="flex-1 truncate text-xs font-mono"
                style="color: rgba(255, 255, 255, 0.6)"
                >{{ inviteUrl }}</span
              >
              <button
                class="flex-shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors"
                style="background: rgb(99, 102, 241); color: white"
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
