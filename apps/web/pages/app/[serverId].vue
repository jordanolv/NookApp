<script setup lang="ts">
import { computed, markRaw, onMounted, onUnmounted, ref, watch } from 'vue';
import { Hash, Pin, Users } from 'lucide-vue-next';
import type { CategoryPublic, ChannelPublic } from '@nookapp/protocol';
import { type HomePinKind } from '~/composables/useHomePins';
import { useInterfacePreferences } from '~/composables/useInterfacePreferences';
import { useChatTabs } from '~/composables/useChatTabs';
import { useServerPicker } from '~/composables/useServerPicker';
import { useInviteFlow } from '~/composables/useInviteFlow';
import type ClassicLayout from '~/components/classic/Layout.vue';
import type PhaserApp from '~/components/world/PhaserApp.vue';

definePageMeta({ layout: 'app' });

const route = useRoute();
const serverId = computed(() => route.params.serverId as string);

const { store, fetchServers } = useServers();
const { fetchChannels } = useChannels();
const { fetchCategories } = useCategories();
const { store: messagesStore, fetchMessageCounts } = useMessages();
const { user } = useAuth();
const socket = useSocket();
const voice = useVoice();
const presence = usePresence();
const { isAdmin, canManageChannels, canManageMap, loadMember } = useMember();
const interfacePrefs = useInterfacePreferences();
const classicEnabled = computed(() => interfacePrefs.prefs.value.useClassicInterface);
const { loadMap } = useMap();

if (!store.ready) await fetchServers();
const server = computed(() => store.list.find((s) => s.id === serverId.value) ?? null);

const { resolveUrl } = useResolveUrl();

// ── Sidebar config ─────────────────────────────────────────────────────
const SIDEBAR_SECTIONS = markRaw([
  { key: 'channels', label: 'Salons', icon: Hash },
  { key: 'members', label: 'Membres', icon: Users },
  { key: 'pinned', label: 'Épinglés', icon: Pin },
]);
const sidebar = useSidebar(
  SIDEBAR_SECTIONS.map((s) => s.key),
  ['channels'],
);

function classicPad(side: 'left' | 'right'): number {
  const keys = side === 'left' ? sidebar.leftKeys.value : sidebar.rightKeys.value;
  const hasSections = keys.length > 0;
  const hasContent =
    hasSections || sidebar.serverHeaderSide.value === side || sidebar.userDockSide.value === side;
  if (!hasContent) return side === 'left' ? 70 : 0;
  return hasSections ? 400 : 280;
}
const classicLeftPad = computed(() => classicPad('left'));
const classicRightPad = computed(() => classicPad('right'));

// ── Shared state ───────────────────────────────────────────────────────
const chatTabs = useChatTabs();
const serverPicker = useServerPicker();
const invite = useInviteFlow(serverId);

const showCreateModal = ref(false);
const showServerSettings = ref(false);
const editingChannel = ref<ChannelPublic | null>(null);
const editingCategory = ref<CategoryPublic | null>(null);

function openChannelEdit(channelId: string) {
  editingChannel.value = store.channels.find((c) => c.id === channelId) ?? null;
}
function openCategoryEdit(categoryId: string) {
  editingCategory.value = store.categories.find((c) => c.id === categoryId) ?? null;
}

// ── Channel routing ────────────────────────────────────────────────────
const classicLayoutRef = ref<InstanceType<typeof ClassicLayout> | null>(null);
const phaserAppRef = ref<InstanceType<typeof PhaserApp> | null>(null);

async function joinOrLeaveVoice(channelId: string) {
  if (voice.currentChannelId.value === channelId) await voice.leave();
  else await voice.join(serverId.value, channelId);
}

function handleChannelClick(ch: ChannelPublic, e: MouseEvent) {
  if (ch.type === 'voice') {
    void joinOrLeaveVoice(ch.id);
    return;
  }
  if (classicEnabled.value) {
    classicLayoutRef.value?.openChannel(ch.id);
    return;
  }
  phaserAppRef.value?.openChannel(ch, e);
}

function openHomePinnedItem(channel: ChannelPublic, kind: HomePinKind) {
  if (kind === 'game' && phaserAppRef.value) {
    phaserAppRef.value.openTopicWindow(channel);
    return;
  }
  handleChannelClick(channel, new MouseEvent('click'));
}

function onChannelCreated(channelId: string, type: string) {
  showCreateModal.value = false;
  phaserAppRef.value?.onChannelCreated(channelId, type);
}

// ── Data loaders ───────────────────────────────────────────────────────
watch(
  serverId,
  async (id) => {
    const found = store.list.find((s) => s.id === id) ?? null;
    store.setCurrent(found);
    if (!found) return;
    await Promise.all([
      fetchChannels(id),
      fetchCategories(id),
      fetchMessageCounts(id).catch((err) => console.warn('fetchMessageCounts failed', err)),
      loadMember(id).catch((err) => console.warn('loadMember failed', err)),
      loadMap(id).catch((err) => console.warn('loadMap failed', err)),
    ]);
  },
  { immediate: true },
);

// ── Lifecycle ──────────────────────────────────────────────────────────
let teardownVoiceListeners: (() => void) | null = null;
let teardownMessageCounter: (() => void) | null = null;

onMounted(() => {
  socket.connect();
  teardownVoiceListeners = voice.setupListeners();
  teardownMessageCounter = socket.onMessage((msg) => {
    if (msg.authorId.startsWith('plugin:')) return;
    messagesStore.incrementCount(msg.channelId);
  });
});

onUnmounted(async () => {
  if (voice.currentChannelId.value) await voice.leave();
  teardownVoiceListeners?.();
  teardownMessageCounter?.();
  socket.disconnect();
});

// ── Memoized derived data ──────────────────────────────────────────────
const sidebarChannels = computed(() =>
  store.channels.filter((c) => c.serverId === serverId.value && c.type !== 'voice'),
);
const sidebarCategories = computed(() =>
  store.categories.filter((c) => c.serverId === serverId.value),
);
const voiceChannels = computed(() =>
  store.channels.filter((c) => c.type === 'voice' && c.serverId === serverId.value),
);
const serverBannerUrl = computed(() => resolveUrl(server.value?.bannerUrl) ?? null);
</script>

<template>
  <div class="page-root">
    <LayoutNookSidebars
      :sidebar="sidebar"
      :sections="SIDEBAR_SECTIONS"
      :channels="sidebarChannels"
      :categories="sidebarCategories"
      :active-channel-ids="chatTabs.activeChannelIds.value"
      :current-voice-id="voice.currentChannelId.value"
      :can-manage="canManageChannels"
      :server-id="serverId"
      :server-name="server?.name ?? ''"
      :banner-url="serverBannerUrl"
      @select-channel="handleChannelClick"
      @edit-channel="openChannelEdit"
      @edit-category="openCategoryEdit"
      @open-server-switcher="serverPicker.openSwitcher"
      @open-server-menu="serverPicker.openMenu"
      @create-channel="showCreateModal = true"
      @open-pinned="openHomePinnedItem"
    />

    <ClassicLayout
      v-if="classicEnabled"
      ref="classicLayoutRef"
      :server-id="serverId"
      class="classic-shell"
      :style="{ paddingLeft: classicLeftPad + 'px', paddingRight: classicRightPad + 'px' }"
    />

    <WorldPhaserApp
      v-else-if="user"
      ref="phaserAppRef"
      :server-id="serverId"
      :user="{ id: user.id, name: user.name }"
      :voice="voice"
      :presence="presence"
      :chat-tabs="chatTabs"
      :can-manage-map="canManageMap"
      :voice-channels="voiceChannels"
    />

    <LayoutServerPickerDropdown
      :mode="serverPicker.dropdown.value"
      :servers="store.list"
      :current-server-id="serverId"
      :current-server-name="server?.name"
      :top="serverPicker.top.value"
      :left="serverPicker.left.value"
      :is-admin="isAdmin"
      @close="serverPicker.close"
      @switch-server="serverPicker.switchServer"
      @invite="invite.open"
      @open-settings="showServerSettings = true"
    />

    <LayoutInviteModal
      :open="invite.isOpen.value"
      :server-name="server?.name"
      :url="invite.url.value"
      :loading="invite.loading.value"
      :copied="invite.copied.value"
      @close="invite.close"
      @copy="invite.copy"
    />

    <LayoutServerModals
      :server-id="serverId"
      :server-name="server?.name"
      v-model:show-settings="showServerSettings"
      v-model:show-create="showCreateModal"
      v-model:editing-channel="editingChannel"
      v-model:editing-category="editingCategory"
      @channel-created="onChannelCreated"
    />
  </div>
</template>

<style scoped>
.classic-shell {
  position: absolute;
  inset: 0;
  z-index: 5;
}

.page-root {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
