<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus';
import { PanelLeft, PanelRight, Settings, Trash2 } from 'lucide-vue-next';
import type { ChannelPublic, CategoryPublic } from '@nookapp/protocol';

definePageMeta({ layout: 'app' });

const route = useRoute();
const serverId = computed(() => route.params.serverId as string);

const { store, fetchServers, updateServer } = useServers();
const { fetchChannels, updateChannel, deleteChannel } = useChannels();
const { fetchCategories, createCategory, updateCategory, deleteCategory } = useCategories();
const { user } = useAuth();
const { createInvite } = useInvites();
const socket = useSocket();
const voice = useVoice();
const { isAdmin, canManageChannels, canManageMap, canManageServer, loadMember } = useMember();
const {
  currentMap,
  buildMode,
  buildTool,
  isSaving: isMapSaving,
  loadMap,
  paintRect,
  paintWallsRect,
} = useMap();

// ── Chat: tab bar + floating windows ──
interface FloatingWin {
  channelId: string;
  x: number;
  y: number;
}
const chatTabChannelIds = ref<string[]>([]);
const chatTabActiveId = ref<string | null>(null);
const floatingWindows = ref<FloatingWin[]>([]);
let windowCounter = 0;

function openChannel(channelId: string, e: MouseEvent) {
  if (e.ctrlKey || e.metaKey) {
    const existing = floatingWindows.value.find((w) => w.channelId === channelId);
    if (existing) {
      focusFloating(channelId);
      return;
    }
    const stagger = (windowCounter % 6) * 28;
    const x = import.meta.client ? Math.round(window.innerWidth / 2 - 200) + stagger : 300;
    const y = import.meta.client ? Math.round(window.innerHeight / 2 - 270) + stagger : 100;
    windowCounter++;
    floatingWindows.value = [...floatingWindows.value, { channelId, x, y }];
  } else {
    if (!chatTabChannelIds.value.includes(channelId)) {
      chatTabChannelIds.value = [...chatTabChannelIds.value, channelId];
    }
    chatTabActiveId.value = channelId;
  }
}

function openChannelById(channelId: string) {
  openChannel(channelId, { ctrlKey: false, metaKey: false } as MouseEvent);
}

function closeAllTabs() {
  chatTabChannelIds.value = [];
  chatTabActiveId.value = null;
}

function closeTab(channelId: string) {
  const idx = chatTabChannelIds.value.indexOf(channelId);
  chatTabChannelIds.value = chatTabChannelIds.value.filter((id) => id !== channelId);
  if (chatTabActiveId.value === channelId) {
    chatTabActiveId.value = chatTabChannelIds.value[Math.max(0, idx - 1)] ?? null;
  }
}

function closeFloating(channelId: string) {
  floatingWindows.value = floatingWindows.value.filter((w) => w.channelId !== channelId);
}

function focusFloating(channelId: string) {
  const win = floatingWindows.value.find((w) => w.channelId === channelId);
  if (!win) return;
  floatingWindows.value = [...floatingWindows.value.filter((w) => w.channelId !== channelId), win];
}

function onTearOff(channelId: string, x: number, y: number) {
  closeTab(channelId);
  floatingWindows.value = [...floatingWindows.value, { channelId, x, y }];
}

const draggingFloatingId = ref<string | null>(null);

function dockToTabBar(channelId: string) {
  draggingFloatingId.value = null;
  closeFloating(channelId);
  if (!chatTabChannelIds.value.includes(channelId)) {
    chatTabChannelIds.value = [...chatTabChannelIds.value, channelId];
  }
  chatTabActiveId.value = channelId;
}

const activeChannelIds = computed(
  () => new Set([...chatTabChannelIds.value, ...floatingWindows.value.map((w) => w.channelId)]),
);

// ── Icon rail ──
type RailSide = 'left' | 'right';
const RAIL_PREFS_KEY = 'nookapp:rail:prefs';

const railExpanded = ref(true);
const railWidth = ref(210);
const railSide = ref<RailSide>('right');

if (import.meta.client) {
  try {
    const raw = localStorage.getItem(RAIL_PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { side?: RailSide; width?: number };
      if (p.side === 'left' || p.side === 'right') railSide.value = p.side;
      if (typeof p.width === 'number') railWidth.value = Math.max(180, Math.min(420, p.width));
    }
  } catch {
    // ignore corrupt prefs
  }
  watch([railSide, railWidth], ([side, width]) => {
    localStorage.setItem(RAIL_PREFS_KEY, JSON.stringify({ side, width }));
  });
}

const _railResize = ref<{ startX: number; origW: number } | null>(null);

const railStyle = computed(() => {
  const w = railExpanded.value ? railWidth.value : 52;
  const resizing = _railResize.value !== null;
  return {
    width: w + 'px',
    top: '16px',
    bottom: '16px',
    left: railSide.value === 'left' ? '16px' : 'auto',
    right: railSide.value === 'right' ? '16px' : 'auto',
    height: 'auto',
    transition: resizing
      ? 'none'
      : 'width 200ms cubic-bezier(0.4,0,0.2,1), left 220ms cubic-bezier(0.4,0,0.2,1), right 220ms cubic-bezier(0.4,0,0.2,1)',
    background: 'rgba(12, 12, 18, 0.75)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
  };
});

function startRailResize(e: MouseEvent) {
  _railResize.value = { startX: e.clientX, origW: railWidth.value };
  e.preventDefault();
  e.stopPropagation();
}

function onRailPointerMove(e: MouseEvent) {
  if (_railResize.value) {
    const dx = e.clientX - _railResize.value.startX;
    // When docked right, dragging the inner (left) edge leftward grows width.
    const signed = railSide.value === 'right' ? -dx : dx;
    const max = import.meta.client ? window.innerWidth - 200 : 420;
    railWidth.value = Math.max(180, Math.min(max, _railResize.value.origW + signed));
  }
}

function stopRailPointer() {
  _railResize.value = null;
}

function toggleRail() {
  railExpanded.value = !railExpanded.value;
}

function toggleRailSide() {
  railSide.value = railSide.value === 'right' ? 'left' : 'right';
}

const forumPanelOffset = computed(() => (railExpanded.value ? railWidth.value : 52) + 24);

// ── Server picker ──
const showServerPicker = ref(false);
const serverPickerAnchor = ref<DOMRect | null>(null);
const serversExpanded = ref(false);
const showServerSettings = ref(false);

function openServerPicker(e: MouseEvent) {
  const btn = (e.currentTarget as HTMLElement).closest(
    '[data-server-header]',
  ) as HTMLElement | null;
  serverPickerAnchor.value = btn?.getBoundingClientRect() ?? null;
  serversExpanded.value = false;
  showServerPicker.value = !showServerPicker.value;
}

function switchServer(id: string) {
  showServerPicker.value = false;
  serversExpanded.value = false;
  navigateTo(`/app/${id}`);
}

const pickerTop = computed(() => {
  if (!serverPickerAnchor.value) return 64;
  return serverPickerAnchor.value.bottom + 8;
});

// ── Channel creation ──
const showCreateModal = ref(false);

// ── Channel editing ──
const editingChannel = ref<import('@nookapp/protocol').ChannelPublic | null>(null);

const channelMenu = ref<{
  x: number;
  y: number;
  channel: import('@nookapp/protocol').ChannelPublic;
} | null>(null);

function openChannelMenu(e: MouseEvent, channel: import('@nookapp/protocol').ChannelPublic) {
  if (!canManageChannels.value) return;
  e.preventDefault();
  e.stopPropagation();
  channelMenu.value = { x: e.clientX, y: e.clientY, channel };
}

function closeChannelMenu() {
  channelMenu.value = null;
}

function editChannelFromMenu() {
  if (!channelMenu.value) return;
  editingChannel.value = channelMenu.value.channel;
  closeChannelMenu();
}

async function deleteChannelFromMenu() {
  if (!channelMenu.value) return;
  const ch = channelMenu.value.channel;
  closeChannelMenu();
  if (!confirm(`Supprimer le salon « ${ch.name} » ?`)) return;
  await deleteChannel(serverId.value, ch.id);
}

// ── Categories & ordered top-level layout ──
type ChannelItem = { kind: 'channel'; id: string; channel: ChannelPublic };
type CategoryItem = {
  kind: 'category';
  id: string;
  category: CategoryPublic;
  children: ChannelItem[];
};
type TopItem = ChannelItem | CategoryItem;

const topItems = ref<TopItem[]>([]);
const isCommitting = ref(false);

function rebuildTopItems() {
  const items: TopItem[] = [];
  for (const cat of store.categories) {
    items.push({
      kind: 'category',
      id: `cat:${cat.id}`,
      category: cat,
      children: store.channels
        .filter((c) => c.categoryId === cat.id && !c.parentId)
        .sort((a, b) => a.position - b.position)
        .map((ch) => ({ kind: 'channel' as const, id: `ch:${ch.id}`, channel: ch })),
    });
  }
  for (const ch of store.channels.filter((c) => !c.categoryId && !c.parentId)) {
    items.push({ kind: 'channel', id: `ch:${ch.id}`, channel: ch });
  }
  items.sort((a, b) => {
    const ap = a.kind === 'channel' ? a.channel.position : a.category.position;
    const bp = b.kind === 'channel' ? b.channel.position : b.category.position;
    return ap - bp;
  });
  topItems.value = items;
}

watch(
  [() => store.channels, () => store.categories],
  () => {
    if (isCommitting.value) return;
    rebuildTopItems();
  },
  { immediate: true, deep: true },
);

async function commitOrder() {
  if (isCommitting.value) return;
  isCommitting.value = true;
  try {
    const updates: Promise<unknown>[] = [];
    for (let i = 0; i < topItems.value.length; i++) {
      const item = topItems.value[i];
      if (item.kind === 'channel') {
        const ch = item.channel;
        if (ch.position !== i || ch.categoryId !== null) {
          updates.push(updateChannel(serverId.value, ch.id, { position: i, categoryId: null }));
        }
      } else {
        const cat = item.category;
        if (cat.position !== i) {
          updates.push(updateCategory(serverId.value, cat.id, { position: i }));
        }
        for (let j = 0; j < item.children.length; j++) {
          const ch = item.children[j].channel;
          if (ch.position !== j || ch.categoryId !== cat.id) {
            updates.push(updateChannel(serverId.value, ch.id, { position: j, categoryId: cat.id }));
          }
        }
      }
    }
    await Promise.all(updates);
  } finally {
    isCommitting.value = false;
    rebuildTopItems();
  }
}

function innerPut(_to: unknown, _from: unknown, dragEl: HTMLElement) {
  return dragEl.dataset.kind === 'channel';
}

const collapsedCategories = ref<Set<string>>(new Set());
function toggleCategory(id: string) {
  const s = new Set(collapsedCategories.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  collapsedCategories.value = s;
}

const editingCategoryId = ref<string | null>(null);
const editingCategoryName = ref('');
function startEditCategory(cat: import('@nookapp/protocol').CategoryPublic) {
  editingCategoryId.value = cat.id;
  editingCategoryName.value = cat.name;
}
async function submitEditCategory() {
  if (!editingCategoryId.value || !editingCategoryName.value.trim()) {
    editingCategoryId.value = null;
    return;
  }
  await updateCategory(serverId.value, editingCategoryId.value, {
    name: editingCategoryName.value.trim(),
  });
  editingCategoryId.value = null;
}
async function handleDeleteCategory(categoryId: string) {
  await deleteCategory(serverId.value, categoryId);
}

const showCreateCategory = ref(false);
const newCategoryName = ref('');
async function submitCreateCategory() {
  if (!newCategoryName.value.trim()) return;
  await createCategory(serverId.value, { name: newCategoryName.value.trim() });
  newCategoryName.value = '';
  showCreateCategory.value = false;
}

function isChannelActive(ch: import('@nookapp/protocol').ChannelPublic): boolean {
  if (ch.type === 'voice') return voice.currentChannelId.value === ch.id;
  if (ch.type === 'forum') return forumPanelChannelId.value === ch.id;
  return activeChannelIds.value.has(ch.id);
}
function channelActiveStyle(ch: import('@nookapp/protocol').ChannelPublic): string {
  if (activeChannelIds.value.has(ch.id) && ch.type !== 'voice' && ch.type !== 'forum')
    return 'font-weight: 600';
  return '';
}

function channelLabelStyle(ch: import('@nookapp/protocol').ChannelPublic): string {
  if (ch.type === 'voice' && voice.currentChannelId.value === ch.id) return 'color: #4ade80';
  if (ch.type === 'forum' && forumPanelChannelId.value === ch.id)
    return 'color: rgba(252,211,77,1)';
  if (activeChannelIds.value.has(ch.id)) return 'color: rgba(199,210,254,1)';
  return 'color: rgba(255,255,255,0.45)';
}
function channelIndicatorClass(ch: import('@nookapp/protocol').ChannelPublic): string {
  if (ch.type === 'voice') return 'bg-green-400';
  if (ch.type === 'forum') return 'bg-yellow-400';
  return 'bg-indigo-400';
}
function handleChannelClick(ch: import('@nookapp/protocol').ChannelPublic, e: MouseEvent) {
  if (ch.type === 'voice') {
    handleVoiceChannelClick(ch.id);
    return;
  }
  if (ch.type === 'forum') {
    openForumPanel(ch.id, ch.name, e);
    return;
  }
  if (ch.type === 'widget') {
    openWidgetWindow(ch);
    return;
  }
  openChannel(ch.id, e);
}

// ── Forum panel ──
const forumPanelChannelId = ref<string | null>(null);
const forumPanelChannelName = ref('');

function openForumPanel(channelId: string, channelName: string, e: MouseEvent) {
  if (forumPanelChannelId.value === channelId) {
    forumPanelChannelId.value = null;
    return;
  }
  forumPanelChannelId.value = channelId;
  forumPanelChannelName.value = channelName;
  e.stopPropagation();
}

// ── Widget windows ──
const widgetWindows = ref<
  { channelId: string; channelName: string; widgetKind: string | null; x: number; y: number }[]
>([]);
let widgetWindowCounter = 0;

function openWidgetWindow(ch: import('@nookapp/protocol').ChannelPublic) {
  const existing = widgetWindows.value.find((w) => w.channelId === ch.id);
  if (existing) {
    focusWidgetWindow(ch.id);
    return;
  }
  const stagger = (widgetWindowCounter % 6) * 28;
  const x = import.meta.client ? Math.round(window.innerWidth / 2 - 360) + stagger : 200;
  const y = import.meta.client ? Math.round(window.innerHeight / 2 - 280) + stagger : 100;
  widgetWindowCounter++;
  widgetWindows.value = [
    ...widgetWindows.value,
    { channelId: ch.id, channelName: ch.name, widgetKind: ch.widgetKind, x, y },
  ];
}

function closeWidgetWindow(channelId: string) {
  widgetWindows.value = widgetWindows.value.filter((w) => w.channelId !== channelId);
}

function focusWidgetWindow(channelId: string) {
  const w = widgetWindows.value.find((x) => x.channelId === channelId);
  if (!w) return;
  widgetWindows.value = [...widgetWindows.value.filter((x) => x.channelId !== channelId), w];
}

// ── Zone picker ──
const zonePickerActive = ref(false);
const pendingVoiceChannelId = ref<string | null>(null);

function onChannelCreated(channelId: string, type: string) {
  showCreateModal.value = false;
  if (type === 'voice') {
    pendingVoiceChannelId.value = channelId;
    zonePickerActive.value = true;
  }
}

async function onZonePicked(zone: { x: number; y: number; w: number; h: number }) {
  zonePickerActive.value = false;
  if (!pendingVoiceChannelId.value) return;
  await updateChannel(serverId.value, pendingVoiceChannelId.value, { mapZone: zone });
  pendingVoiceChannelId.value = null;
}

function onZoneCancel() {
  zonePickerActive.value = false;
  pendingVoiceChannelId.value = null;
}

const api = useApi();
const { apiBase } = useRuntimeConfig().public;
const apiOrigin = new URL(apiBase as string).origin;

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? `${apiOrigin}${url}` : url;
}

const bannerUploading = ref(false);
async function uploadBanner(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  bannerUploading.value = true;
  try {
    const form = new FormData();
    form.append('file', file);
    const { url } = await api.postForm<{ url: string }>('/uploads', form);
    await updateServer(serverId.value, { bannerUrl: url });
  } finally {
    bannerUploading.value = false;
  }
}

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
    if (!found) return;
    // Each request is isolated: a 404 on /map (e.g. API not yet deployed with
    // the new module) must not block the channel list or member fetch.
    await Promise.all([
      fetchChannels(id),
      fetchCategories(id),
      loadMember(id).catch((err) => console.warn('loadMember failed', err)),
      loadMap(id).catch((err) => console.warn('loadMap failed', err)),
    ]);
  },
  { immediate: true },
);

type RectPayload = { x1: number; y1: number; x2: number; y2: number; mode: 'add' | 'remove' };

function onTilesRect(rect: RectPayload) {
  if (!canManageMap.value || !buildMode.value) return;
  paintRect(rect.x1, rect.y1, rect.x2, rect.y2, rect.mode);
}

function onWallsRect(rect: RectPayload) {
  if (!canManageMap.value || !buildMode.value) return;
  paintWallsRect(rect.x1, rect.y1, rect.x2, rect.y2, rect.mode);
}

function toggleBuildMode() {
  buildMode.value = !buildMode.value;
}

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
  window.addEventListener('mousemove', onRailPointerMove);
  window.addEventListener('mouseup', stopRailPointer);
});

onUnmounted(async () => {
  if (voice.currentChannelId.value) await voice.leave();
  teardownVoiceListeners?.();
  socket.disconnect();
  window.removeEventListener('mousemove', onRailPointerMove);
  window.removeEventListener('mouseup', stopRailPointer);
});
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
        :zone-picker-active="zonePickerActive"
        :map-data="currentMap"
        :build-mode="buildMode"
        :build-tool="buildTool"
        @zone-picked="onZonePicked"
        @zone-cancel="onZoneCancel"
        @tiles-rect="onTilesRect"
        @walls-rect="onWallsRect"
      />
    </ClientOnly>

    <!-- ── Icon rail ── -->
    <div
      class="fixed z-40 flex flex-col rounded-2xl py-2 gap-1 overflow-hidden group/rail"
      :style="railStyle"
    >
      <!-- Inner edge: resize width (right edge if docked left, left edge if docked right) -->
      <div
        class="absolute top-0 bottom-0 w-1 z-50 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity"
        :class="railSide === 'left' ? 'right-0 rounded-r-2xl' : 'left-0 rounded-l-2xl'"
        style="background: rgba(99, 102, 241, 0.5)"
        @mousedown="startRailResize"
      />
      <!-- Server header -->
      <template v-if="railExpanded">
        <!-- Banner block -->
        <div
          class="relative flex-shrink-0 -mt-2 overflow-hidden group/banner"
          style="aspect-ratio: 2/1; border-radius: 16px 16px 0 0"
        >
          <img
            v-if="server?.bannerUrl"
            :src="resolveUrl(server.bannerUrl) ?? undefined"
            class="w-full h-full object-cover"
          />
          <div
            class="absolute inset-0"
            :style="
              server?.bannerUrl
                ? 'background: linear-gradient(to top, rgba(12,12,18,0.88) 0%, rgba(12,12,18,0.35) 50%, transparent 100%)'
                : 'background: rgba(12,12,18,0.3)'
            "
          />
          <!-- Admin upload button -->
          <label
            v-if="canManageServer"
            class="absolute top-2 right-2 opacity-0 group-hover/banner:opacity-100 transition-opacity cursor-pointer z-10"
          >
            <span
              class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
              style="background: rgba(0, 0, 0, 0.65); color: rgba(255, 255, 255, 0.75)"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"
                />
              </svg>
              {{ bannerUploading ? '…' : server?.bannerUrl ? 'Changer' : 'Bannière' }}
            </span>
            <input type="file" accept="image/*" class="hidden" @change="uploadBanner" />
          </label>
          <!-- Server name + picker trigger -->
          <button
            data-server-header
            class="absolute bottom-0 left-0 right-0 px-2.5 py-2 flex items-center gap-2 outline-none"
            @click="openServerPicker"
          >
            <div class="relative flex-shrink-0">
              <div
                class="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold text-white select-none"
                style="background: linear-gradient(135deg, #6366f1, #4338ca)"
              >
                {{ server?.name?.[0]?.toUpperCase() }}
              </div>
              <span
                class="absolute -bottom-1 -left-1 flex h-3.5 w-3.5 items-center justify-center rounded-full"
                style="
                  background: rgba(20, 20, 30, 0.95);
                  border: 1px solid rgba(255, 255, 255, 0.12);
                "
              >
                <svg
                  class="transition-transform duration-200"
                  :class="{ 'rotate-180': showServerPicker }"
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style="color: rgba(255, 255, 255, 0.6)"
                >
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </span>
            </div>
            <span
              class="flex-1 truncate text-xs font-semibold text-left min-w-0"
              style="color: rgba(255, 255, 255, 0.85)"
              >{{ server?.name }}</span
            >
          </button>
        </div>
      </template>

      <!-- Collapsed header -->
      <template v-else>
        <button
          data-server-header
          class="flex justify-center relative flex-shrink-0 outline-none"
          @click="openServerPicker"
        >
          <div
            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white select-none relative"
            style="background: linear-gradient(135deg, #6366f1, #4338ca)"
          >
            {{ server?.name?.[0]?.toUpperCase() }}
            <span
              class="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full"
              style="background: rgba(30, 30, 40, 0.95); border: 1px solid rgba(255, 255, 255, 0.1)"
            >
              <svg
                class="transition-transform duration-200"
                :class="{ 'rotate-180': showServerPicker }"
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="currentColor"
                style="color: rgba(255, 255, 255, 0.5)"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </span>
          </div>
        </button>
      </template>

      <!-- Channel list (scrollable) -->
      <div
        class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-0.5 px-1.5 py-0.5 relative z-10"
        style="scrollbar-width: none"
      >
        <!-- ── Expanded: full draggable structure with categories ── -->
        <VueDraggable
          v-if="railExpanded"
          v-model="topItems"
          class="flex flex-col"
          :group="{ name: 'channels', pull: true, put: true }"
          :animation="180"
          :force-fallback="true"
          :delay="180"
          :delay-on-touch-only="false"
          :touch-start-threshold="3"
          :handle="'.drag-handle'"
          ghost-class="dnd-ghost"
          chosen-class="dnd-chosen"
          drag-class="dnd-drag"
          fallback-class="dnd-fallback"
          @end="commitOrder"
        >
          <div v-for="item in topItems" :key="item.id" :data-kind="item.kind" :data-id="item.id">
            <!-- Top-level uncategorized channel -->
            <template v-if="item.kind === 'channel'">
              <div
                class="relative group"
                :class="{ 'drag-handle cursor-grab active:cursor-grabbing': canManageChannels }"
                @contextmenu="openChannelMenu($event, item.channel)"
              >
                <button
                  class="relative flex h-7 w-full items-center gap-2.5 rounded-lg px-2 justify-start transition-all duration-150 hover:bg-white/[0.06]"
                  :style="channelActiveStyle(item.channel)"
                  @click="handleChannelClick(item.channel, $event)"
                >
                  <span
                    v-if="isChannelActive(item.channel)"
                    class="absolute -left-1.5 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full"
                    :class="channelIndicatorClass(item.channel)"
                  />
                  <div class="relative flex-shrink-0">
                    <ChannelIconDisplay
                      :icon-url="item.channel.iconUrl"
                      :type="item.channel.type"
                      :size="15"
                    />
                    <span
                      v-if="
                        item.channel.type === 'voice' &&
                        voice.voicePresence.value.get(item.channel.id)?.length
                      "
                      class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500"
                      style="border: 1.5px solid rgba(12, 12, 18, 0.9)"
                    />
                  </div>
                  <span
                    class="truncate text-xs font-medium flex-1 text-left min-w-0"
                    :style="channelLabelStyle(item.channel)"
                    >{{ item.channel.name }}</span
                  >
                  <span
                    v-if="
                      item.channel.type === 'voice' &&
                      voice.voicePresence.value.get(item.channel.id)?.length
                    "
                    class="flex items-center flex-shrink-0 -space-x-1 ml-1"
                    :title="
                      voice.voicePresence.value
                        .get(item.channel.id)
                        ?.map((p) => p.name)
                        .join(', ')
                    "
                  >
                    <span
                      v-for="p in voice.voicePresence.value.get(item.channel.id)?.slice(0, 3)"
                      :key="p.userId"
                      class="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style="background: linear-gradient(135deg, #6366f1, #4f46e5)"
                    >
                      {{ p.name?.[0]?.toUpperCase() }}
                    </span>
                    <span
                      v-if="(voice.voicePresence.value.get(item.channel.id)?.length ?? 0) > 3"
                      class="h-4 px-1 rounded-full flex items-center justify-center text-[8px] font-semibold"
                      style="
                        background: rgba(255, 255, 255, 0.12);
                        color: rgba(255, 255, 255, 0.75);
                      "
                    >
                      +{{ (voice.voicePresence.value.get(item.channel.id)?.length ?? 0) - 3 }}
                    </span>
                  </span>
                </button>
              </div>
            </template>

            <!-- Top-level category block -->
            <template v-else>
              <div class="category-block rounded-lg transition-colors duration-150">
                <!-- Category header -->
                <div class="flex h-6 items-center gap-1 px-1 group/cat">
                  <button
                    class="flex flex-1 items-center gap-1 min-w-0"
                    @click="toggleCategory(item.category.id)"
                  >
                    <svg
                      class="flex-shrink-0 transition-transform duration-150"
                      :style="
                        collapsedCategories.has(item.category.id) ? 'transform:rotate(-90deg)' : ''
                      "
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      style="color: rgba(255, 255, 255, 0.25)"
                    >
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
                    <span
                      v-if="editingCategoryId !== item.category.id"
                      class="cat-label truncate text-[10px] font-semibold uppercase tracking-wider transition-colors"
                      style="color: rgba(255, 255, 255, 0.3)"
                      >{{ item.category.name }}</span
                    >
                    <input
                      v-else
                      v-model="editingCategoryName"
                      class="flex-1 min-w-0 bg-transparent text-[10px] font-semibold uppercase tracking-wider outline-none border-b"
                      style="color: rgba(255, 255, 255, 0.7); border-color: rgba(99, 102, 241, 0.6)"
                      @keydown.enter="submitEditCategory"
                      @keydown.escape="editingCategoryId = null"
                      @blur="submitEditCategory"
                      @click.stop
                    />
                  </button>
                  <div
                    v-if="canManageChannels"
                    class="flex items-center gap-0.5 opacity-0 group-hover/cat:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <div
                      class="drag-handle flex items-center cursor-grab px-0.5"
                      style="color: rgba(255, 255, 255, 0.3)"
                      @click.stop
                    >
                      <svg width="8" height="10" viewBox="0 0 8 12" fill="currentColor">
                        <circle cx="2" cy="2" r="1.5" />
                        <circle cx="6" cy="2" r="1.5" />
                        <circle cx="2" cy="6" r="1.5" />
                        <circle cx="6" cy="6" r="1.5" />
                        <circle cx="2" cy="10" r="1.5" />
                        <circle cx="6" cy="10" r="1.5" />
                      </svg>
                    </div>
                    <button
                      class="rounded p-0.5 hover:bg-white/10"
                      style="color: rgba(255, 255, 255, 0.3)"
                      title="Renommer"
                      @click.stop="startEditCategory(item.category)"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path
                          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                        />
                      </svg>
                    </button>
                    <button
                      class="rounded p-0.5 hover:bg-white/10"
                      style="color: rgba(255, 255, 255, 0.3)"
                      title="Supprimer"
                      @click.stop="handleDeleteCategory(item.category.id)"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path
                          d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Inner sortable: channels inside this category -->
                <VueDraggable
                  v-show="!collapsedCategories.has(item.category.id)"
                  v-model="item.children"
                  class="flex flex-col gap-0.5 min-h-[6px] pl-2"
                  :group="{ name: 'channels', pull: true, put: innerPut }"
                  :animation="180"
                  :empty-insert-threshold="0"
                  :force-fallback="true"
                  :delay="180"
                  :delay-on-touch-only="false"
                  :touch-start-threshold="3"
                  :handle="'.drag-handle'"
                  ghost-class="dnd-ghost"
                  chosen-class="dnd-chosen"
                  drag-class="dnd-drag"
                  fallback-class="dnd-fallback"
                  @end="commitOrder"
                >
                  <div
                    v-for="childItem in item.children"
                    :key="childItem.id"
                    :data-kind="'channel'"
                    :data-id="childItem.id"
                    class="relative group"
                    :class="{ 'drag-handle cursor-grab active:cursor-grabbing': canManageChannels }"
                    @contextmenu="openChannelMenu($event, childItem.channel)"
                  >
                    <button
                      class="relative flex h-7 w-full items-center gap-2.5 rounded-lg px-2 justify-start transition-all duration-150 hover:bg-white/[0.06]"
                      :style="channelActiveStyle(childItem.channel)"
                      @click="handleChannelClick(childItem.channel, $event)"
                    >
                      <span
                        v-if="isChannelActive(childItem.channel)"
                        class="absolute -left-1.5 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full"
                        :class="channelIndicatorClass(childItem.channel)"
                      />
                      <div class="relative flex-shrink-0">
                        <ChannelIconDisplay
                          :icon-url="childItem.channel.iconUrl"
                          :type="childItem.channel.type"
                          :size="18"
                        />
                        <span
                          v-if="
                            childItem.channel.type === 'voice' &&
                            voice.voicePresence.value.get(childItem.channel.id)?.length
                          "
                          class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500"
                          style="border: 1.5px solid rgba(12, 12, 18, 0.9)"
                        />
                      </div>
                      <span
                        class="truncate text-xs font-medium flex-1 text-left min-w-0"
                        :style="channelLabelStyle(childItem.channel)"
                        >{{ childItem.channel.name }}</span
                      >
                      <span
                        v-if="
                          childItem.channel.type === 'voice' &&
                          voice.voicePresence.value.get(childItem.channel.id)?.length
                        "
                        class="flex items-center flex-shrink-0 -space-x-1 ml-1"
                        :title="
                          voice.voicePresence.value
                            .get(childItem.channel.id)
                            ?.map((p) => p.name)
                            .join(', ')
                        "
                      >
                        <span
                          v-for="p in voice.voicePresence.value
                            .get(childItem.channel.id)
                            ?.slice(0, 3)"
                          :key="p.userId"
                          class="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                          style="background: linear-gradient(135deg, #6366f1, #4f46e5)"
                        >
                          {{ p.name?.[0]?.toUpperCase() }}
                        </span>
                        <span
                          v-if="
                            (voice.voicePresence.value.get(childItem.channel.id)?.length ?? 0) > 3
                          "
                          class="h-4 px-1 rounded-full flex items-center justify-center text-[8px] font-semibold"
                          style="
                            background: rgba(255, 255, 255, 0.12);
                            color: rgba(255, 255, 255, 0.75);
                          "
                        >
                          +{{
                            (voice.voicePresence.value.get(childItem.channel.id)?.length ?? 0) - 3
                          }}
                        </span>
                      </span>
                    </button>
                  </div>
                </VueDraggable>
              </div>
            </template>
          </div>
        </VueDraggable>

        <!-- ── Collapsed: flat icons, mirrors topItems order ── -->
        <template v-else>
          <template v-for="item in topItems" :key="item.id">
            <template v-if="item.kind === 'channel'">
              <button
                class="relative flex h-8 w-full items-center justify-center rounded-xl transition-all duration-150"
                :style="channelActiveStyle(item.channel)"
                :title="item.channel.name"
                @click="handleChannelClick(item.channel, $event)"
              >
                <span
                  v-if="isChannelActive(item.channel)"
                  class="absolute -left-1.5 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full"
                  :class="channelIndicatorClass(item.channel)"
                />
                <div class="relative flex-shrink-0">
                  <ChannelIconDisplay
                    :icon-url="item.channel.iconUrl"
                    :type="item.channel.type"
                    :size="18"
                  />
                  <span
                    v-if="
                      item.channel.type === 'voice' &&
                      voice.voicePresence.value.get(item.channel.id)?.length
                    "
                    class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500"
                    style="border: 1.5px solid rgba(12, 12, 18, 0.9)"
                  />
                </div>
              </button>
            </template>
            <template v-else>
              <button
                v-for="childItem in item.children"
                :key="childItem.id"
                class="relative flex h-8 w-full items-center justify-center rounded-xl transition-all duration-150"
                :style="channelActiveStyle(childItem.channel)"
                :title="childItem.channel.name"
                @click="handleChannelClick(childItem.channel, $event)"
              >
                <span
                  v-if="isChannelActive(childItem.channel)"
                  class="absolute -left-1.5 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full"
                  :class="channelIndicatorClass(childItem.channel)"
                />
                <div class="relative flex-shrink-0">
                  <ChannelIconDisplay
                    :icon-url="childItem.channel.iconUrl"
                    :type="childItem.channel.type"
                    :size="15"
                  />
                  <span
                    v-if="
                      childItem.channel.type === 'voice' &&
                      voice.voicePresence.value.get(childItem.channel.id)?.length
                    "
                    class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500"
                    style="border: 1.5px solid rgba(12, 12, 18, 0.9)"
                  />
                </div>
              </button>
            </template>
          </template>
        </template>

        <!-- ── New category inline input ── -->
        <div v-if="showCreateCategory && railExpanded" class="mt-2 px-0.5">
          <div
            class="flex h-8 items-center gap-2 rounded-xl px-2"
            style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(99, 102, 241, 0.4)"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="currentColor"
              style="flex-shrink: 0; color: rgba(99, 102, 241, 0.7)"
            >
              <path
                d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
              />
            </svg>
            <input
              v-model="newCategoryName"
              placeholder="Nom de la catégorie"
              autofocus
              class="flex-1 min-w-0 bg-transparent text-xs outline-none"
              style="color: rgba(255, 255, 255, 0.8)"
              @keydown.enter="submitCreateCategory"
              @keydown.escape="
                showCreateCategory = false;
                newCategoryName = '';
              "
            />
          </div>
        </div>
      </div>

      <!-- Bottom actions -->
      <div class="px-1.5">
        <div class="mx-1 mb-1" style="height: 1px; background: rgba(255, 255, 255, 0.04)" />

        <div
          :class="
            railExpanded
              ? 'flex flex-row flex-wrap items-center justify-center gap-1 py-1'
              : 'flex flex-col gap-0.5'
          "
        >
          <!-- Build mode (admin-only) -->
          <button
            v-if="canManageMap"
            class="relative flex h-8 items-center justify-center gap-2 rounded-xl transition-all duration-150"
            :class="railExpanded ? 'w-8' : 'w-full px-2'"
            :style="
              buildMode
                ? 'background: rgba(99,102,241,0.25); color: rgba(165,180,252,1)'
                : 'color: rgba(255,255,255,0.3)'
            "
            :title="buildMode ? 'Quitter le mode build' : 'Mode build'"
            @click="toggleBuildMode"
          >
            <svg
              class="flex-shrink-0"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M22 9l-3.39-.34-1.46-3.15-2.91 1.81L11 6l-1.24 3.32-2.91-1.81L5.39 10.66 2 11l1.81 2.91L2 16.83l3.39.34 1.46 3.15 2.91-1.81L11 22l1.24-3.32 2.91 1.81 1.46-3.15L22 17l-1.81-2.91z"
              />
            </svg>
            <span
              v-if="isMapSaving"
              class="absolute right-1 top-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400"
              title="Sauvegarde…"
            />
          </button>

          <!-- Create channel -->
          <button
            v-if="canManageChannels"
            class="relative flex h-8 items-center justify-center gap-2 rounded-xl transition-colors hover:bg-white/5"
            :class="railExpanded ? 'w-8' : 'w-full px-2'"
            style="color: rgba(255, 255, 255, 0.25)"
            title="Nouveau canal"
            @click="showCreateModal = true"
          >
            <svg
              class="flex-shrink-0"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>

          <!-- Create category (admin + expanded only) -->
          <button
            v-if="canManageChannels && railExpanded"
            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white/5"
            style="color: rgba(255, 255, 255, 0.25)"
            title="Nouvelle catégorie"
            @click="showCreateCategory = true"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
              />
            </svg>
          </button>

          <!-- Dock side toggle -->
          <button
            class="flex h-8 items-center justify-center gap-2 rounded-xl transition-all duration-150 hover:bg-white/[0.06]"
            :class="railExpanded ? 'w-8' : 'w-full px-2 mt-1'"
            style="color: rgba(255, 255, 255, 0.35)"
            :title="railSide === 'right' ? 'Ancrer à gauche' : 'Ancrer à droite'"
            @click="toggleRailSide"
          >
            <component
              :is="railSide === 'right' ? PanelLeft : PanelRight"
              :size="14"
              class="flex-shrink-0"
            />
          </button>

          <!-- Expand / collapse toggle -->
          <button
            class="flex h-8 items-center justify-center gap-2 rounded-xl transition-all duration-150"
            :class="railExpanded ? 'w-8' : 'w-full px-2 mt-1'"
            style="color: rgba(255, 255, 255, 0.2)"
            :title="railExpanded ? 'Réduire' : 'Déplier'"
            @click="toggleRail"
          >
            <svg
              class="flex-shrink-0 transition-transform duration-200"
              :style="
                (railExpanded && railSide === 'right') || (!railExpanded && railSide === 'left')
                  ? 'transform: rotate(180deg)'
                  : ''
              "
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Server picker dropdown ── -->
    <Teleport to="body">
      <div v-if="showServerPicker" class="fixed inset-0 z-[55]" @click="showServerPicker = false" />
      <div
        v-if="showServerPicker"
        class="fixed z-[56] flex flex-col rounded-2xl overflow-hidden py-1.5"
        :style="{
          top: pickerTop + 'px',
          right: '16px',
          minWidth: '200px',
          background: 'rgba(10, 10, 16, 0.95)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
        }"
      >
        <!-- Nook select (collapsed by default — click to expand list) -->
        <div class="px-1.5 pt-1.5">
          <button
            class="server-picker-row flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors"
            :style="serversExpanded ? 'background: rgba(255,255,255,0.05)' : ''"
            @click="serversExpanded = !serversExpanded"
          >
            <div
              class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              style="background: linear-gradient(135deg, #6366f1, #4338ca)"
            >
              {{ server?.name?.[0]?.toUpperCase() }}
            </div>
            <span
              class="flex-1 truncate text-xs font-medium"
              style="color: rgba(255, 255, 255, 0.85)"
              >{{ server?.name }}</span
            >
            <svg
              class="flex-shrink-0 transition-transform duration-150"
              :style="serversExpanded ? 'transform: rotate(180deg)' : ''"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              style="color: rgba(255, 255, 255, 0.4)"
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </button>

          <div v-if="serversExpanded" class="mt-1 flex flex-col gap-0.5">
            <button
              v-for="s in store.list.filter((s) => s.id !== serverId)"
              :key="s.id"
              class="server-picker-row flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors"
              @click="switchServer(s.id)"
            >
              <div
                class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style="background: linear-gradient(135deg, #6366f1, #4338ca)"
              >
                {{ s.name[0]?.toUpperCase() }}
              </div>
              <span class="truncate text-xs font-medium" style="color: rgba(255, 255, 255, 0.7)">{{
                s.name
              }}</span>
            </button>
          </div>
        </div>

        <div class="mx-3 my-1.5" style="height: 1px; background: rgba(255, 255, 255, 0.06)" />

        <!-- Current server actions -->
        <button
          class="flex items-center gap-3 px-3 py-2 text-left transition-colors server-picker-row"
          @click="
            showServerPicker = false;
            handleInvite();
          "
        >
          <div
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style="background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.55)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
              />
            </svg>
          </div>
          <span class="text-xs font-medium" style="color: rgba(255, 255, 255, 0.75)"
            >Inviter des gens</span
          >
        </button>
        <NuxtLink
          :to="`/app/${serverId}/plugins`"
          class="flex items-center gap-3 px-3 py-2 transition-colors server-picker-row"
          @click="showServerPicker = false"
        >
          <div
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style="background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.55)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"
              />
            </svg>
          </div>
          <span class="text-xs font-medium" style="color: rgba(255, 255, 255, 0.75)">Plugins</span>
        </NuxtLink>
        <button
          v-if="isAdmin"
          class="flex items-center gap-3 px-3 py-2 text-left transition-colors server-picker-row"
          @click="
            showServerPicker = false;
            showServerSettings = true;
          "
        >
          <div
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style="background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.55)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
              />
            </svg>
          </div>
          <span class="text-xs font-medium" style="color: rgba(255, 255, 255, 0.75)"
            >Paramètres du serveur</span
          >
        </button>

        <div class="mx-3 my-1" style="height: 1px; background: rgba(255, 255, 255, 0.06)" />
        <NuxtLink
          to="/app"
          class="flex items-center gap-3 px-3 py-2 transition-colors server-picker-row"
          @click="showServerPicker = false"
        >
          <div
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style="background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.4)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          <span class="text-xs font-medium" style="color: rgba(255, 255, 255, 0.4)">Accueil</span>
        </NuxtLink>
      </div>
    </Teleport>

    <!-- ── Forum panel ── -->
    <ChannelForumPanel
      v-if="forumPanelChannelId"
      :server-id="serverId"
      :channel-id="forumPanelChannelId"
      :channel-name="forumPanelChannelName"
      :side="railSide"
      :offset="forumPanelOffset"
      @close="forumPanelChannelId = null"
      @open-post="openChannelById"
    />

    <!-- ── Widget windows ── -->
    <WidgetWindow
      v-for="(w, i) in widgetWindows"
      :key="w.channelId"
      :server-id="serverId"
      :channel-id="w.channelId"
      :channel-name="w.channelName"
      :widget-kind="w.widgetKind"
      :initial-x="w.x"
      :initial-y="w.y"
      :z-index="70 + i"
      @close="closeWidgetWindow(w.channelId)"
      @focus="focusWidgetWindow(w.channelId)"
      @drag-end="
        (x, y) => {
          w.x = x;
          w.y = y;
        }
      "
    />

    <!-- ── Server settings modal ── -->
    <ServerSettingsModal
      v-if="showServerSettings"
      :server-id="serverId"
      :server-name="server?.name"
      @close="showServerSettings = false"
    />

    <!-- ── Create channel modal ── -->
    <ChannelCreateChannelModal
      v-if="showCreateModal"
      :server-id="serverId"
      @close="showCreateModal = false"
      @created="onChannelCreated"
    />

    <!-- ── Edit channel modal ── -->
    <ChannelEditChannelModal
      v-if="editingChannel"
      :server-id="serverId"
      :channel="editingChannel"
      @close="editingChannel = null"
      @updated="editingChannel = null"
    />

    <!-- ── Chat tab bar ── -->
    <ChatTabBar
      v-if="chatTabChannelIds.length > 0"
      :channel-ids="chatTabChannelIds"
      :active-id="chatTabActiveId"
      :dragging-channel-id="draggingFloatingId"
      @close="closeAllTabs"
      @close-tab="closeTab"
      @set-active="chatTabActiveId = $event"
      @tear-off="onTearOff"
      @dock="dockToTabBar"
    />

    <!-- ── Floating chat windows (Ctrl+click or torn off) ── -->
    <ChatWindow
      v-for="(win, i) in floatingWindows"
      :key="win.channelId"
      :channel-id="win.channelId"
      :initial-x="win.x"
      :initial-y="win.y"
      :z-index="45 + i"
      @close="closeFloating(win.channelId)"
      @focus="focusFloating(win.channelId)"
      @drag-start="draggingFloatingId = win.channelId"
      @drag-end="draggingFloatingId = null"
    />

    <!-- Voice panel -->
    <ClientOnly>
      <VoicePanel />
    </ClientOnly>

    <!-- Build panel (admin + build mode only) -->
    <ClientOnly>
      <WorldBuildPanel
        v-if="canManageMap && buildMode"
        :tool="buildTool"
        :is-saving="isMapSaving"
        @update:tool="buildTool = $event"
        @close="toggleBuildMode"
      />
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

    <Teleport to="body">
      <template v-if="channelMenu">
        <div
          class="fixed inset-0 z-[80]"
          @click="closeChannelMenu"
          @contextmenu.prevent="closeChannelMenu"
        />
        <div
          class="fixed z-[81] flex flex-col py-1 rounded-lg overflow-hidden min-w-[180px]"
          :style="{
            left: channelMenu.x + 'px',
            top: channelMenu.y + 'px',
            background: 'rgba(15, 15, 20, 0.95)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
          }"
        >
          <div
            class="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider truncate"
            style="color: rgba(255, 255, 255, 0.35)"
          >
            {{ channelMenu.channel.name }}
          </div>
          <button
            class="flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.06]"
            style="color: rgba(255, 255, 255, 0.85)"
            @click="editChannelFromMenu"
          >
            <Settings :size="13" :stroke-width="1.75" />
            <span>Modifier</span>
          </button>
          <button
            class="flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-red-500/10"
            style="color: rgb(248, 113, 113)"
            @click="deleteChannelFromMenu"
          >
            <Trash2 :size="13" :stroke-width="1.75" />
            <span>Supprimer</span>
          </button>
        </div>
      </template>
    </Teleport>
  </div>
</template>

<style scoped>
.server-picker-row {
  transition: background 120ms;
}
.server-picker-row:hover {
  background: rgba(255, 255, 255, 0.05);
}
.server-picker-row--active {
  background: rgba(99, 102, 241, 0.1);
}

.dnd-ghost {
  opacity: 0.35;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 12px;
}

.dnd-fallback {
  opacity: 0.95 !important;
  cursor: grabbing !important;
  transform: scale(1.02);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.5);
  border-radius: 12px;
}

.category-block:has(.dnd-ghost) {
  background: rgba(99, 102, 241, 0.12);
  box-shadow: inset 0 0 0 1px rgba(165, 180, 252, 0.5);
}
.category-block:has(.dnd-ghost) .cat-label {
  color: rgba(199, 210, 254, 0.95) !important;
}
</style>
