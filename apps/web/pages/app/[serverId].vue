<script setup lang="ts">
import { computed, markRaw, onMounted, onUnmounted, ref, watch } from 'vue';
import { Hammer, Map as MapIcon, Pin, Users } from 'lucide-vue-next';
import type { CategoryPublic, ChannelPublic } from '@nookapp/protocol';
import { type HomePinKind } from '~/composables/useHomePins';
import { useInterfacePreferences } from '~/composables/useInterfacePreferences';
import { useChatTabs } from '~/composables/useChatTabs';
import { useServerPicker } from '~/composables/useServerPicker';
import { useInviteFlow } from '~/composables/useInviteFlow';
import { useChannelReadState } from '~/composables/useChannelReadState';
import { useSidebarSectionOrder } from '~/composables/useSidebarSectionOrder';
import { useChannelEditing } from '~/composables/useChannelEditing';
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
const SECTION_LABELS: Record<string, string> = {
  channels: 'Salons',
  members: 'Membres',
  pinned: 'Épinglés',
  map: 'Carte',
};
const PANEL_SECTIONS = markRaw([
  { key: 'members', label: 'Membres', icon: Users },
  { key: 'pinned', label: 'Épinglés', icon: Pin },
  { key: 'map', label: 'Carte', icon: MapIcon },
]);
const sectionOrder = useSidebarSectionOrder('right');

const rightSections = computed(() => {
  const sections: Array<{
    key: string;
    label: string;
    icon: typeof Hammer;
    mode?: 'panel' | 'toggle';
    active?: boolean;
    onToggle?: () => void;
  }> = [...PANEL_SECTIONS];
  return sectionOrder.applyOrder(sections);
});

function onReorderSections(fromKey: string, toKey: string) {
  sectionOrder.move(
    fromKey,
    toKey,
    rightSections.value.map((s) => s.key),
  );
}
const sidebar = useSidebar(['channels', ...PANEL_SECTIONS.map((s) => s.key)]);

const classicLeftPad = computed(() => 300);
const classicRightPad = computed(() => (sidebar.activeSet.value.size > 0 ? 352 : 72));

// ── Shared state ───────────────────────────────────────────────────────
const chatTabs = useChatTabs();
const serverPicker = useServerPicker();
const invite = useInviteFlow(serverId);

const showServerSettings = ref(false);
const showPlugins = ref(false);
const showUserSettings = ref(false);
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

const readState = useChannelReadState();

function handleChannelClick(ch: ChannelPublic, e: MouseEvent | KeyboardEvent) {
  if (ch.type === 'voice') {
    void joinOrLeaveVoice(ch.id);
    return;
  }
  readState.markRead(ch.id);
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

const { createChannel: createChannelApi } = useChannels();
const channelEditing = useChannelEditing();

async function onInlineCreateChannel(opts: { type: 'text' | 'voice'; categoryId: string | null }) {
  const defaultName = opts.type === 'voice' ? 'nouveau vocal' : 'nouveau channel';
  const ch = await createChannelApi(serverId.value, {
    name: defaultName,
    type: opts.type,
    showStat: true,
  });
  if (opts.categoryId) {
    try {
      const { updateChannel } = useChannels();
      await updateChannel(serverId.value, ch.id, { categoryId: opts.categoryId });
    } catch {
      /* ignore */
    }
  }
  channelEditing.startEditing(ch.id);
  phaserAppRef.value?.onChannelCreated(ch.id, ch.type);
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
const dmRealtime = useDmRealtime();
let teardownVoiceListeners: (() => void) | null = null;
let teardownMessageCounter: (() => void) | null = null;
let teardownDmRealtime: (() => void) | null = null;

onMounted(() => {
  socket.connect();
  teardownVoiceListeners = voice.setupListeners();
  teardownMessageCounter = socket.onMessage((msg) => {
    messagesStore.incrementCount(msg.channelId);
    if (msg.authorId !== user.value?.id)
      messagesStore.noteLastMessage(msg.channelId, msg.createdAt);
  });
  teardownDmRealtime = dmRealtime.setup();
});

onUnmounted(async () => {
  if (voice.currentChannelId.value) await voice.leave();
  teardownVoiceListeners?.();
  teardownMessageCounter?.();
  teardownDmRealtime?.();
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
      :right-sections="rightSections"
      :channels="sidebarChannels"
      :voice-channels="voiceChannels"
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
      @create-channel="onInlineCreateChannel"
      @open-pinned="openHomePinnedItem"
      @open-user-settings="showUserSettings = true"
      @minimap-teleport="(x, y) => phaserAppRef?.teleport(x, y)"
      @reorder-sections="onReorderSections"
    />

    <LayoutNotificationDock />

    <LayoutBottomDock
      :server-name="server?.name ?? ''"
      :banner-url="serverBannerUrl"
      :can-manage-map="canManageMap"
      @open-server-menu="serverPicker.openMenu"
    />

    <DmHub />

    <UserSettingsModal v-if="showUserSettings" @close="showUserSettings = false" />

    <LayoutSidebarDetachedWindows
      :sidebar="sidebar"
      :section-labels="SECTION_LABELS"
      :channels="sidebarChannels"
      :categories="sidebarCategories"
      :active-channel-ids="chatTabs.activeChannelIds.value"
      :current-voice-id="voice.currentChannelId.value"
      :can-manage="canManageChannels"
      :server-id="serverId"
      @select-channel="handleChannelClick"
      @edit-channel="openChannelEdit"
      @edit-category="openCategoryEdit"
      @create-channel="onInlineCreateChannel"
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
      :placement="serverPicker.placement.value"
      :is-admin="isAdmin"
      @close="serverPicker.close"
      @switch-server="serverPicker.switchServer"
      @switch-nooks="serverPicker.showSwitcher"
      @invite="invite.open"
      @open-settings="showServerSettings = true"
      @open-plugins="showPlugins = true"
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
      v-model:show-plugins="showPlugins"
      v-model:editing-channel="editingChannel"
      v-model:editing-category="editingCategory"
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
