<script setup lang="ts">
import Phaser from 'phaser';
import { shallowRef } from 'vue';
import {
  NookScene,
  type NameTagUpdate,
  type WorldObjectSpec,
  type ObjectLabelUpdate,
  type VoiceRoomLabelUpdate,
} from './NookScene';
import type { PlayerState } from '@nookapp/protocol';
import { useCharacter } from '~/composables/useCharacter';
import { useLocalActivity } from '~/composables/useLocalActivity';
import { ICON_DEAFENED, ICON_MUTED, type NameTagStatus } from './name-tag/constants';
import NameTag from './name-tag/NameTag.vue';
import ActivityPicker from './name-tag/ActivityPicker.vue';
import CamBubble from './overlay/CamBubble.vue';
import VoiceRoomLabel from './overlay/VoiceRoomLabel.vue';
import ObjectLabel from './overlay/ObjectLabel.vue';

const serversStore = useServers().store;
const voice = useVoice();
const character = useCharacter();
const presence = usePresence();
const { localActivity } = useLocalActivity();

import type { MapData } from '@nookapp/protocol';
import type {
  BuildTool,
  DecorPlacePayload,
  DecorRemovePayload,
  WallCellPayload,
  RoomTemplatePayload,
  RoomCustomPayload,
} from './NookScene';
import { DISPLAY_SCALE } from './scene/constants';

type RectPayload = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mode: 'add' | 'remove';
  rot?: 0 | 90 | 180 | 270;
};

const props = defineProps<{
  serverId: string;
  userId: string;
  playerName: string;
  zonePickerActive?: boolean;
  mapData?: MapData | null;
  buildMode?: boolean;
  buildTool?: BuildTool;
  selectedDecor?: string | null;
  selectedFloor?: string | null;
  selectedWallFrame?: number | null;
  selectedRoomTemplate?: string | null;
  sidebarSide?: 'left' | 'right' | null;
}>();

const SIDEBAR_INSET_PX = 390;

const emit = defineEmits<{
  'zone-picked': [zone: { x: number; y: number; w: number; h: number }];
  'zone-cancel': [];
  'tiles-rect': [rect: RectPayload];
  'wall-cell': [payload: WallCellPayload];
  'room-template-stamp': [payload: RoomTemplatePayload];
  'room-custom-stamp': [payload: RoomCustomPayload];
  'decor-place': [payload: DecorPlacePayload];
  'decor-remove': [payload: DecorRemovePayload];
}>();

const zoneDrag = ref<{ startX: number; startY: number; curX: number; curY: number } | null>(null);

function onZoneMousedown(ev: MouseEvent) {
  const el = ev.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  zoneDrag.value = {
    startX: ev.clientX - rect.left,
    startY: ev.clientY - rect.top,
    curX: ev.clientX - rect.left,
    curY: ev.clientY - rect.top,
  };
}

function onZoneMousemove(ev: MouseEvent) {
  if (!zoneDrag.value) return;
  const el = ev.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  zoneDrag.value = { ...zoneDrag.value, curX: ev.clientX - rect.left, curY: ev.clientY - rect.top };
}

function onZoneMouseup(ev: MouseEvent) {
  if (!zoneDrag.value) return;
  const el = ev.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  const endX = ev.clientX - rect.left;
  const endY = ev.clientY - rect.top;

  const startX = zoneDrag.value.startX;
  const startY = zoneDrag.value.startY;

  zoneDrag.value = null;
  if (Math.abs(endX - startX) < 20 || Math.abs(endY - startY) < 20) return;

  const scene = game.value?.scene.scenes[0] as
    | { cameras: { main: Phaser.Cameras.Scene2D.Camera } }
    | undefined;
  if (!scene) return;

  // Overlay covers the canvas display 1:1; screen px → world coords uses the
  // inverse of projectToScreen: screen = (world - scroll) * zoom * DISPLAY_SCALE.
  const cam = scene.cameras.main;
  const k = cam.zoom * DISPLAY_SCALE;
  const wx1 = startX / k + cam.scrollX;
  const wy1 = startY / k + cam.scrollY;
  const wx2 = endX / k + cam.scrollX;
  const wy2 = endY / k + cam.scrollY;

  emit('zone-picked', {
    x: Math.round(Math.min(wx1, wx2)),
    y: Math.round(Math.min(wy1, wy2)),
    w: Math.round(Math.abs(wx2 - wx1)),
    h: Math.round(Math.abs(wy2 - wy1)),
  });
}

const zoneDragRect = computed(() => {
  if (!zoneDrag.value) return null;
  return {
    left: Math.min(zoneDrag.value.startX, zoneDrag.value.curX),
    top: Math.min(zoneDrag.value.startY, zoneDrag.value.curY),
    width: Math.abs(zoneDrag.value.curX - zoneDrag.value.startX),
    height: Math.abs(zoneDrag.value.curY - zoneDrag.value.startY),
  };
});

const canvasRef = ref<HTMLDivElement | null>(null);
const game = ref<Phaser.Game | null>(null);
const playerPopup = ref<{ userId: string; name: string; x: number; y: number } | null>(null);

const socket = useSocket();

type AttachableTrack = {
  attach: (_el: HTMLVideoElement) => HTMLVideoElement;
  detach: (_el: HTMLVideoElement) => HTMLVideoElement;
};

type NameTagOverlay = {
  userId: string;
  name: string;
  status: NameTagStatus;
  mediaIconHtml: string;
  activity: string | null;
  x: number;
  y: number;
};

type CamBubbleOverlay = {
  userId: string;
  track: AttachableTrack;
  mirror: boolean;
  speaking: boolean;
  feedKey: string;
  x: number;
  y: number;
};

type VoiceRoomOverlay = {
  channelId: string;
  name: string;
  x: number;
  y: number;
  members: Array<{ userId: string; name: string }>;
  speakingUserIds: Set<string>;
};

type ObjectLabelOverlay = { id: string; label: string; x: number; y: number };

const nameTagOverlays = shallowRef<NameTagOverlay[]>([]);
const camBubbleOverlays = shallowRef<CamBubbleOverlay[]>([]);
const voiceRoomOverlays = shallowRef<VoiceRoomOverlay[]>([]);
const objectLabelOverlays = shallowRef<ObjectLabelOverlay[]>([]);

let cachedRect: DOMRect | null = null;

let _scene: NookScene | null = null;
let stopRoomsWatch: (() => void) | null = null;
let pendingMapData: MapData | null = null;
let pendingMapApplyFrame: number | null = null;
const screenRingArcs = new Map<string, Phaser.GameObjects.Arc>();

function applyPendingMapData() {
  pendingMapApplyFrame = null;
  if (!pendingMapData || !_scene) return;
  const data = pendingMapData;
  pendingMapData = null;
  _scene.applyMapData(data);
}

function queueMapDataApply(data: MapData) {
  pendingMapData = data;
  if (pendingMapApplyFrame !== null) return;
  pendingMapApplyFrame = requestAnimationFrame(applyPendingMapData);
}

function computeCameraOffset(
  side: 'left' | 'right' | null | undefined,
  scene: NookScene,
  rect: DOMRect | null,
): { x: number; y: number } {
  if (!rect) return { x: 0, y: 0 };
  const insetLeft = side === 'left' ? SIDEBAR_INSET_PX : 0;
  const insetRight = side === 'right' ? SIDEBAR_INSET_PX : 0;
  // The CSS transform stretches canvas internal pixels by DISPLAY_SCALE,
  // so the visible center in canvas coords = screen center / DISPLAY_SCALE.
  const visibleCenterScreenX = (insetLeft + (rect.width - insetRight)) / 2;
  const visibleCenterScreenY = rect.height / 2;
  const cam = scene.cameras.main;
  return {
    x: visibleCenterScreenX / DISPLAY_SCALE - cam.width / 2,
    y: visibleCenterScreenY / DISPLAY_SCALE - cam.height / 2,
  };
}

function ensureScreenRing(userId: string): Phaser.GameObjects.Arc | null {
  if (!_scene) return null;
  let arc = screenRingArcs.get(userId);
  if (!arc) {
    arc = _scene.add.arc(0, 0, 22, 0, 360, false);
    arc.setStrokeStyle(1.5, 0x93c5fd, 0.85);
    arc.setFillStyle();
    _scene.tweens.add({
      targets: arc,
      scaleX: { from: 0.9, to: 1.1 },
      scaleY: { from: 0.9, to: 1.1 },
      alpha: { from: 0.55, to: 0.95 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    screenRingArcs.set(userId, arc);
  }
  return arc;
}

function removeScreenRing(userId: string) {
  const arc = screenRingArcs.get(userId);
  if (arc) {
    arc.destroy();
    screenRingArcs.delete(userId);
  }
}

const NAME_TAG_Y_OFFSET = 60;
const CAM_BUBBLE_Y_OFFSET = 50;

function recomputeOverlays(
  tags: NameTagUpdate[],
  labels: ObjectLabelUpdate[],
  rooms: VoiceRoomLabelUpdate[],
  cam: Phaser.Cameras.Scene2D.Camera,
) {
  if (!cachedRect) return;

  const worldMode = voice.mediaViewMode.value === 'world';
  const localUserId = props.userId;
  const isDeafened = voice.isDeafened.value;
  const isMuted = voice.isMuted.value;
  const localStatus: NameTagStatus = isDeafened ? 'dnd' : isMuted ? 'muted' : 'online';
  const localMediaIcon = isDeafened ? ICON_DEAFENED : isMuted ? ICON_MUTED : '';
  const localCam = voice.isCameraOn.value;
  const localScreen = voice.isScreenSharing.value;
  const localCamTrack = voice.localCameraTrack.value as AttachableTrack | null;
  const participantMedia = voice.participantMedia.value;
  const remoteVideoTracks = voice.remoteVideoTracks.value;
  const activeSpeakers = voice.activeSpeakers.value;

  const nextNameTags: NameTagOverlay[] = [];
  const nextBubbles: CamBubbleOverlay[] = [];
  const seenScreens = new Set<string>();

  for (const t of tags) {
    const isLocal = t.userId === localUserId;
    const tag = NookScene.projectToScreen(cam, cachedRect, t.worldX, t.worldY - NAME_TAG_Y_OFFSET);
    nextNameTags.push({
      userId: t.userId,
      name: t.name,
      status: isLocal ? localStatus : 'online',
      mediaIconHtml: isLocal ? localMediaIcon : '',
      activity: isLocal ? localActivity.value : null,
      x: tag.x,
      y: tag.y,
    });

    const media = isLocal ? { cam: localCam, screen: localScreen } : participantMedia.get(t.userId);
    const camTrack = isLocal
      ? localCamTrack
      : ((remoteVideoTracks.get(t.userId) as AttachableTrack | undefined) ?? null);

    if (worldMode && media?.cam && camTrack) {
      const b = NookScene.projectToScreen(
        cam,
        cachedRect,
        t.worldX,
        t.worldY - CAM_BUBBLE_Y_OFFSET,
      );
      nextBubbles.push({
        userId: t.userId,
        track: camTrack,
        mirror: isLocal,
        speaking: activeSpeakers.has(t.userId),
        feedKey: isLocal ? 'local-cam' : `cam-${t.userId}`,
        x: b.x,
        y: b.y,
      });
    }

    if (worldMode && media?.screen) {
      seenScreens.add(t.userId);
      const arc = ensureScreenRing(t.userId);
      if (arc) {
        arc.x = t.worldX;
        arc.y = t.worldY;
        arc.setDepth(t.worldY - 0.5);
      }
    }
  }
  for (const userId of screenRingArcs.keys()) {
    if (!seenScreens.has(userId)) removeScreenRing(userId);
  }

  nameTagOverlays.value = nextNameTags;
  camBubbleOverlays.value = nextBubbles;

  const nextLabels: ObjectLabelOverlay[] = labels.map((l) => {
    const { x, y } = NookScene.projectToScreen(cam, cachedRect!, l.worldX, l.worldY);
    return { id: l.id, label: l.label, x, y };
  });
  objectLabelOverlays.value = nextLabels;

  const presence = voice.voicePresence.value;
  const nextRooms: VoiceRoomOverlay[] = rooms.map((r) => {
    const { x, y } = NookScene.projectToScreen(cam, cachedRect!, r.worldX, r.worldY);
    const presenceMembers = presence.get(r.channelId) ?? [];
    const members = presenceMembers.map((m) => ({ userId: m.userId, name: m.name }));
    return {
      channelId: r.channelId,
      name: r.name,
      x,
      y,
      members,
      speakingUserIds: new Set(activeSpeakers),
    };
  });
  voiceRoomOverlays.value = nextRooms;
}

watch(
  () => props.mapData,
  (data) => {
    if (data && _scene) queueMapDataApply(data);
  },
);

watch(
  () => props.buildMode ?? false,
  (active) => {
    if (_scene) _scene.setBuildMode(active);
  },
);

watch(
  () => props.buildTool ?? 'tile',
  (tool) => {
    if (_scene) _scene.setBuildTool(tool);
  },
);

watch(
  () => props.selectedDecor ?? null,
  (asset) => {
    if (_scene) _scene.setSelectedDecor(asset);
  },
);

watch(
  () => props.selectedFloor ?? 'office_floor_light',
  (asset) => {
    if (_scene) _scene.setSelectedFloor(asset);
  },
);

watch(
  () => props.selectedWallFrame ?? 33,
  (frame) => {
    if (_scene) _scene.setSelectedWallFrame(frame);
  },
);

watch(
  () => props.selectedRoomTemplate ?? 'drywall_small',
  (id) => {
    if (_scene) _scene.setSelectedRoomTemplate(id);
  },
);

watch(
  () => character.appearance.value,
  (next) => {
    _scene?.applyAppearance(next);
    socket.emitPlayerAppearance(next);
  },
  { deep: true },
);

watch(
  () => props.sidebarSide ?? null,
  (side) => {
    if (!_scene) return;
    const offset = computeCameraOffset(side, _scene, cachedRect);
    _scene.setCameraOffset(offset.x, offset.y);
  },
);

onMounted(() => {
  if (!canvasRef.value) return;

  // Children mount before parents — connect here, not from the parent's onMounted.
  socket.connect();

  const ro = new ResizeObserver(() => {
    cachedRect = canvasRef.value?.getBoundingClientRect() ?? null;
    if (_scene) {
      const offset = computeCameraOffset(props.sidebarSide ?? null, _scene, cachedRect);
      _scene.setCameraOffset(offset.x, offset.y);
    }
  });
  ro.observe(canvasRef.value);
  cachedRect = canvasRef.value.getBoundingClientRect();

  const scene = new NookScene(props.userId, props.playerName, character.appearance.value);

  game.value = new Phaser.Game({
    type: Phaser.AUTO,
    parent: canvasRef.value,
    backgroundColor: '#cdd0d4',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
    render: { pixelArt: true, antialias: false, roundPixels: true },
    input: { keyboard: true },
  });

  // Register listeners before hello() — events fired between hello and listener-bind are lost.
  const offSnapshot = socket.onSnapshot(({ you, others }) => {
    scene.setLocalUserId(you.userId);
    scene.setRestorePosition(you.x, you.y);
    for (const p of others) {
      scene.updateRemotePlayer(
        { userId: p.userId, x: p.x, y: p.y, dir: p.dir, moving: false },
        p.name,
      );
      if (p.appearance) scene.setRemoteAppearance(p.userId, p.appearance);
    }
  });

  const offJoined = socket.onPlayerJoined((state: PlayerState) => {
    scene.updateRemotePlayer(
      { userId: state.userId, x: state.x, y: state.y, dir: state.dir, moving: false },
      state.name,
    );
    if (state.appearance) scene.setRemoteAppearance(state.userId, state.appearance);
  });

  const offAppearance = socket.onPlayerAppearance(({ userId, appearance }) => {
    scene.setRemoteAppearance(userId, appearance);
  });

  const offMoved = socket.onPlayerMoved((payload) => {
    if (!scene.hasRemotePlayer(payload.userId)) return;
    scene.updateRemotePlayer(payload, null);
  });

  const offLeft = socket.onPlayerLeft(({ userId }) => {
    scene.removeRemotePlayer(userId);
    removeScreenRing(userId);
  });

  const rawSocket = socket.raw();
  const onWorldSnapshot = (payload: { objects: WorldObjectSpec[] }) => {
    for (const spec of payload.objects) scene.spawnWorldObject(spec);
  };
  const onWorldSpawn = (spec: WorldObjectSpec) => scene.spawnWorldObject(spec);
  const onWorldRemove = ({ id }: { id: string }) => {
    scene.removeWorldObject(id);
  };
  rawSocket.on('world:object:snapshot', onWorldSnapshot);
  rawSocket.on('world:object:spawn', onWorldSpawn);
  rawSocket.on('world:object:remove', onWorldRemove);

  scene.onReady = () => {
    _scene = scene;
    scene.events.on('player-moved', (payload: Parameters<typeof socket.emitPlayerMoved>[0]) => {
      socket.emitPlayerMoved(payload);
      presence.setLocalPlayer({
        userId: props.userId,
        name: props.playerName,
        x: payload.x,
        y: payload.y,
      });
    });

    scene.events.on('world-object-clicked', (objectId: string) => {
      rawSocket.emit('world:object:click', { objectId });
    });

    scene.events.on('tiles-rect', (rect: RectPayload) => emit('tiles-rect', rect));
    scene.events.on('wall-cell', (payload: WallCellPayload) => emit('wall-cell', payload));
    scene.events.on('room-stamp', (payload: RoomTemplatePayload) =>
      emit('room-template-stamp', payload),
    );
    scene.events.on('room-custom-stamp', (payload: RoomCustomPayload) =>
      emit('room-custom-stamp', payload),
    );
    scene.events.on('decor-place', (p: DecorPlacePayload) => emit('decor-place', p));
    scene.events.on('decor-remove', (p: DecorRemovePayload) => emit('decor-remove', p));

    scene.events.on(
      'player:interact',
      (payload: { userId: string; name: string; worldX: number; worldY: number }) => {
        if (!cachedRect) return;
        const cam = scene.cameras.main;
        const { x, y } = NookScene.projectToScreen(
          cam,
          cachedRect,
          payload.worldX,
          payload.worldY - 60,
        );
        playerPopup.value = { userId: payload.userId, name: payload.name, x, y };
      },
    );

    if (props.mapData) queueMapDataApply(props.mapData);
    if (props.buildTool) scene.setBuildTool(props.buildTool);
    if (props.selectedDecor) scene.setSelectedDecor(props.selectedDecor);
    scene.setSelectedFloor(props.selectedFloor ?? 'office_floor_light');
    scene.setSelectedWallFrame(props.selectedWallFrame ?? 33);
    scene.setSelectedRoomTemplate(props.selectedRoomTemplate ?? 'drywall_small');
    if (props.buildMode) scene.setBuildMode(true);

    const offset = computeCameraOffset(props.sidebarSide ?? null, scene, cachedRect);
    scene.setCameraOffset(offset.x, offset.y);

    const syncRooms = () =>
      scene.setRooms(
        serversStore.voiceChannels.map((ch) => ({
          channelId: ch.id,
          name: ch.name,
          x: ch.mapZone?.x ?? 0,
          y: ch.mapZone?.y ?? 0,
          w: ch.mapZone?.w,
          h: ch.mapZone?.h,
        })),
      );
    syncRooms();
    stopRoomsWatch = watch(
      () =>
        serversStore.voiceChannels.map(
          (c) =>
            `${c.id}:${c.mapZone?.x ?? 0}:${c.mapZone?.y ?? 0}:${c.mapZone?.w ?? 0}:${c.mapZone?.h ?? 0}`,
        ),
      () => syncRooms(),
    );

    scene.events.on('room:entered', ({ channelId }: { channelId: string }) => {
      void voice.join(props.serverId, channelId);
    });

    scene.events.on('room:left', () => {
      void voice.leave();
    });

    let latestTags: NameTagUpdate[] = [];
    let latestLabels: ObjectLabelUpdate[] = [];
    let latestRooms: VoiceRoomLabelUpdate[] = [];
    scene.events.on('name-tags', (tags: NameTagUpdate[]) => {
      latestTags = tags;
    });
    scene.events.on('object-labels', (labels: ObjectLabelUpdate[]) => {
      latestLabels = labels;
    });
    scene.events.on('voice-rooms', (rooms: VoiceRoomLabelUpdate[]) => {
      latestRooms = rooms;
    });
    game.value!.events.on(Phaser.Core.Events.POST_RENDER, () => {
      recomputeOverlays(latestTags, latestLabels, latestRooms, scene.cameras.main);
    });

    socket.hello({
      serverId: props.serverId,
      name: props.playerName,
      x: scene.localBody.x,
      y: scene.localBody.y,
      dir: 'down',
      appearance: character.appearance.value,
    });
  };

  onUnmounted(() => {
    offSnapshot();
    offJoined();
    offMoved();
    offLeft();
    offAppearance();
    rawSocket.off('world:object:snapshot', onWorldSnapshot);
    rawSocket.off('world:object:spawn', onWorldSpawn);
    rawSocket.off('world:object:remove', onWorldRemove);
    ro.disconnect();
    stopRoomsWatch?.();
    stopRoomsWatch = null;
    if (pendingMapApplyFrame !== null) {
      cancelAnimationFrame(pendingMapApplyFrame);
      pendingMapApplyFrame = null;
    }
    pendingMapData = null;
    game.value?.destroy(true);
    game.value = null;
    nameTagOverlays.value = [];
    camBubbleOverlays.value = [];
    voiceRoomOverlays.value = [];
    objectLabelOverlays.value = [];
    for (const arc of screenRingArcs.values()) arc.destroy();
    screenRingArcs.clear();
    _scene = null;
  });

  nextTick(() => {
    const canvas = canvasRef.value?.querySelector('canvas');
    if (canvas) {
      canvas.setAttribute('tabindex', '0');
      canvas.focus();
    }
  });
});

defineExpose({
  teleport(x: number, y: number) {
    _scene?.teleport(x, y);
  },
});
</script>

<template>
  <div class="relative w-full h-full overflow-hidden">
    <div
      ref="canvasRef"
      class="absolute top-0 left-0"
      :style="{
        width: 'calc(100% / 1.5)',
        height: 'calc(100% / 1.5)',
        transform: 'scale(1.5)',
        transformOrigin: '0 0',
        imageRendering: 'pixelated',
      }"
    />
    <div ref="nameTagsContainer" class="absolute inset-0 pointer-events-none">
      <NameTag
        v-for="t in nameTagOverlays"
        :key="t.userId"
        :name="t.name"
        :status="t.status"
        :media-icon-html="t.mediaIconHtml"
        :activity="t.activity"
        :x="t.x"
        :y="t.y"
      />
      <CamBubble
        v-for="b in camBubbleOverlays"
        :key="b.feedKey"
        :track="b.track"
        :mirror="b.mirror"
        :speaking="b.speaking"
        :x="b.x"
        :y="b.y"
      />
      <VoiceRoomLabel
        v-for="r in voiceRoomOverlays"
        :key="r.channelId"
        :name="r.name"
        :members="r.members"
        :speaking-user-ids="r.speakingUserIds"
        :x="r.x"
        :y="r.y"
      />
      <ObjectLabel
        v-for="l in objectLabelOverlays"
        :key="l.id"
        :label="l.label"
        :x="l.x"
        :y="l.y"
      />
    </div>

    <ActivityPicker />

    <WorldPlayerPopup
      v-if="playerPopup"
      :user-id="playerPopup.userId"
      :name="playerPopup.name"
      :x="playerPopup.x"
      :y="playerPopup.y"
      @close="playerPopup = null"
    />

    <VoiceMediaPanel />

    <div
      v-if="zonePickerActive"
      class="absolute inset-0 z-50 cursor-crosshair select-none"
      style="background: rgba(99, 102, 241, 0.08); border: 2px dashed rgba(99, 102, 241, 0.5)"
      @mousedown="onZoneMousedown"
      @mousemove="onZoneMousemove"
      @mouseup="onZoneMouseup"
      @keydown.esc="emit('zone-cancel')"
      tabindex="0"
    >
      <div
        class="absolute top-4 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2 text-xs font-medium pointer-events-none"
        style="
          background: rgba(12, 12, 18, 0.85);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.4);
        "
      >
        Glisse pour définir la zone vocale · Échap pour annuler
      </div>

      <button
        class="absolute top-4 right-4 rounded-xl px-3 py-1.5 text-xs font-medium"
        style="
          background: rgba(12, 12, 18, 0.85);
          color: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
        "
        @click.stop="emit('zone-cancel')"
      >
        Annuler
      </button>

      <div
        v-if="zoneDragRect"
        class="absolute pointer-events-none"
        :style="{
          left: zoneDragRect.left + 'px',
          top: zoneDragRect.top + 'px',
          width: zoneDragRect.width + 'px',
          height: zoneDragRect.height + 'px',
          background: 'rgba(99,102,241,0.15)',
          border: '2px solid rgba(99,102,241,0.8)',
          borderRadius: '4px',
        }"
      />
    </div>
  </div>
</template>
