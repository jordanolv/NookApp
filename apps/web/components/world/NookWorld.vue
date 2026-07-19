<script setup lang="ts">
import Phaser from 'phaser';
import { shallowRef } from 'vue';
import {
  NookScene,
  type WorldObjectSpec,
  type BuildTool,
  type DecorPlacePayload,
  type DecorRemovePayload,
  type CellErasePayload,
  type WallRectPayload,
  type RoomRectPayload,
} from './NookScene';
import type { PlayerState, MapData } from '@nookapp/protocol';
import { useCharacter } from '~/composables/useCharacter';
import {
  useWorldOverlays,
  type NameTagOverlay,
  type CamBubbleOverlay,
  type VoiceRoomOverlay,
  type ObjectLabelOverlay,
} from '~/composables/useWorldOverlays';
import { useWorldCameraOffset } from '~/composables/useWorldCameraOffset';
import WorldOverlays from './overlay/WorldOverlays.vue';
import ZonePicker from './ZonePicker.vue';
import WorldLoadingOverlay from './WorldLoadingOverlay.vue';

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
  selectedWallRegion?: { col: number; row: number; w: number; h: number } | null;
  sidebarSide?: 'left' | 'right' | null;
}>();

const emit = defineEmits<{
  'zone-picked': [zone: { x: number; y: number; w: number; h: number }];
  'zone-cancel': [];
  'tiles-rect': [rect: RectPayload];
  'wall-rect': [payload: WallRectPayload];
  'collision-rect': [rect: RectPayload];
  'room-rect': [payload: RoomRectPayload];
  'decor-place': [payload: DecorPlacePayload];
  'decor-remove': [payload: DecorRemovePayload];
  'cell-erase': [payload: CellErasePayload];
}>();

const serversStore = useServers().store;
const voice = useVoice();
const character = useCharacter();
const presence = usePresence();
const socket = useSocket();
const { t } = useI18n();

const canvasRef = ref<HTMLDivElement | null>(null);
const game = shallowRef<Phaser.Game | null>(null);
const playerPopup = ref<{ userId: string; name: string; x: number; y: number } | null>(null);

const loadingPhase = ref<'assets' | 'building' | 'syncing' | 'ready'>('assets');
const assetsProgress = ref(0);

const nameTagOverlays = shallowRef<NameTagOverlay[]>([]);
const camBubbleOverlays = shallowRef<CamBubbleOverlay[]>([]);
const voiceRoomOverlays = shallowRef<VoiceRoomOverlay[]>([]);
const objectLabelOverlays = shallowRef<ObjectLabelOverlay[]>([]);

let _scene: NookScene | null = null;
let stopRoomsWatch: (() => void) | null = null;
let pendingMapData: MapData | null = null;
let pendingMapApplyFrame: number | null = null;
let overlaysHandle: ReturnType<typeof useWorldOverlays> | null = null;

const cameraOffset = useWorldCameraOffset({
  canvasRef,
  getScene: () => _scene,
  sidebarSide: () => props.sidebarSide ?? null,
});

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

watch(
  () => props.mapData,
  (data) => {
    if (data && _scene) queueMapDataApply(data);
  },
);
watch(
  () => props.buildMode ?? false,
  (v) => _scene?.setBuildMode(v),
);
watch(
  () => props.buildTool ?? 'tile',
  (v) => _scene?.setBuildTool(v),
);
watch(
  () => props.selectedDecor ?? null,
  (v) => _scene?.setSelectedDecor(v),
);
watch(
  () => props.selectedFloor ?? 'office_floor_light',
  (v) => _scene?.setSelectedFloor(v),
);
watch(
  () => props.selectedWallRegion,
  (v) => {
    if (v) _scene?.setSelectedWallRegion(v);
  },
  { deep: true },
);
watch(
  () => character.appearance.value,
  (next) => {
    _scene?.applyAppearance(next);
    socket.emitPlayerAppearance(next);
  },
  { deep: true },
);

onMounted(() => {
  if (!canvasRef.value) return;

  // Children mount before parents — connect here, not from the parent's onMounted.
  socket.connect();

  cameraOffset.start();

  const scene = new NookScene(props.userId, props.playerName, character.appearance.value);
  scene.onLoadProgress = (value) => {
    assetsProgress.value = value;
  };
  scene.onLoadComplete = () => {
    if (loadingPhase.value === 'assets') loadingPhase.value = 'building';
  };

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
        { userId: p.userId, x: p.x, y: p.y, dir: p.dir, moving: false, pose: p.pose },
        p.name,
      );
      if (p.appearance) scene.setRemoteAppearance(p.userId, p.appearance);
    }
    loadingPhase.value = 'ready';
  });

  const offJoined = socket.onPlayerJoined((state: PlayerState) => {
    scene.updateRemotePlayer(
      {
        userId: state.userId,
        x: state.x,
        y: state.y,
        dir: state.dir,
        moving: false,
        pose: state.pose,
      },
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
    overlaysHandle?.removeScreenRing(userId);
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
    if (loadingPhase.value !== 'ready') loadingPhase.value = 'syncing';

    overlaysHandle = useWorldOverlays({
      scene,
      game: game.value!,
      cachedRect: cameraOffset.cachedRect,
      localUserId: props.userId,
      t,
      out: {
        nameTags: nameTagOverlays,
        camBubbles: camBubbleOverlays,
        voiceRooms: voiceRoomOverlays,
        objectLabels: objectLabelOverlays,
      },
    });

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
    scene.events.on('wall-rect', (p: WallRectPayload) => emit('wall-rect', p));
    scene.events.on('collision-rect', (rect: RectPayload) => emit('collision-rect', rect));
    scene.events.on('room-rect', (p: RoomRectPayload) => emit('room-rect', p));
    scene.events.on('decor-place', (p: DecorPlacePayload) => emit('decor-place', p));
    scene.events.on('decor-remove', (p: DecorRemovePayload) => emit('decor-remove', p));
    scene.events.on('cell-erase', (p: CellErasePayload) => emit('cell-erase', p));

    scene.events.on(
      'player:interact',
      (payload: { userId: string; name: string; worldX: number; worldY: number }) => {
        const rect = cameraOffset.cachedRect.value;
        if (!rect) return;
        const { x, y } = NookScene.projectToScreen(
          scene.cameras.main,
          rect,
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
    if (props.selectedWallRegion) scene.setSelectedWallRegion(props.selectedWallRegion);
    if (props.buildMode) scene.setBuildMode(true);

    cameraOffset.apply();

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
    cameraOffset.dispose();
    stopRoomsWatch?.();
    stopRoomsWatch = null;
    if (pendingMapApplyFrame !== null) {
      cancelAnimationFrame(pendingMapApplyFrame);
      pendingMapApplyFrame = null;
    }
    pendingMapData = null;
    overlaysHandle?.reset();
    overlaysHandle = null;
    game.value?.destroy(true);
    game.value = null;
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

    <WorldOverlays
      :name-tags="nameTagOverlays"
      :cam-bubbles="camBubbleOverlays"
      :voice-rooms="voiceRoomOverlays"
      :object-labels="objectLabelOverlays"
    />

    <WorldPlayerPopup
      v-if="playerPopup"
      :user-id="playerPopup.userId"
      :name="playerPopup.name"
      :x="playerPopup.x"
      :y="playerPopup.y"
      @close="playerPopup = null"
    />

    <VoiceMediaPanel />

    <ZonePicker
      v-if="zonePickerActive"
      :game="game"
      @zone-picked="emit('zone-picked', $event)"
      @zone-cancel="emit('zone-cancel')"
    />

    <Transition name="loading-fade">
      <WorldLoadingOverlay
        v-if="loadingPhase !== 'ready'"
        :phase="loadingPhase"
        :assets-progress="assetsProgress"
        :appearance="character.appearance.value"
      />
    </Transition>
  </div>
</template>

<style scoped>
.loading-fade-leave-active {
  transition: opacity 350ms ease-out;
}
.loading-fade-leave-to {
  opacity: 0;
}
</style>
