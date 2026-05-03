<script setup lang="ts">
import Phaser from 'phaser';
import {
  NookScene,
  type NameTagUpdate,
  type WorldObjectSpec,
  type ObjectLabelUpdate,
} from './NookScene';
import type { PlayerState } from '@nookapp/protocol';

const serversStore = useServers().store;
const voice = useVoice();

const props = defineProps<{
  serverId: string;
  userId: string;
  playerName: string;
  zonePickerActive?: boolean;
}>();

const emit = defineEmits<{
  'zone-picked': [zone: { x: number; y: number; w: number; h: number }];
  'zone-cancel': [];
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

  const screenX = Math.min(zoneDrag.value.startX, endX);
  const screenY = Math.min(zoneDrag.value.startY, endY);
  const screenW = Math.abs(endX - zoneDrag.value.startX);
  const screenH = Math.abs(endY - zoneDrag.value.startY);

  zoneDrag.value = null;
  if (screenW < 20 || screenH < 20) return;

  const scene = game.value?.scene.scenes[0] as
    | { cameras: { main: Phaser.Cameras.Scene2D.Camera } }
    | undefined;
  if (scene) {
    const wv = scene.cameras.main.worldView;
    emit('zone-picked', {
      x: Math.round(wv.x + (screenX / rect.width) * wv.width),
      y: Math.round(wv.y + (screenY / rect.height) * wv.height),
      w: Math.round((screenW / rect.width) * wv.width),
      h: Math.round((screenH / rect.height) * wv.height),
    });
  }
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
const nameTagsContainer = ref<HTMLDivElement | null>(null);
const game = ref<Phaser.Game | null>(null);

const socket = useSocket();

// Direct DOM name tag management — no Vue reactivity in the 60fps render path
const nameTagEls = new Map<string, HTMLDivElement>();
let cachedRect: DOMRect | null = null;

function ensureNameTag(userId: string, name: string): HTMLDivElement {
  let el = nameTagEls.get(userId);
  if (!el) {
    el = document.createElement('div');
    el.className =
      'pointer-events-none absolute z-10 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap flex items-center gap-1';
    const nameSpan = document.createElement('span');
    const iconSpan = document.createElement('span');
    el.appendChild(nameSpan);
    el.appendChild(iconSpan);
    nameTagsContainer.value?.appendChild(el);
    nameTagEls.set(userId, el);
  }
  const nameSpan = el.childNodes[0] as HTMLSpanElement;
  if (nameSpan.textContent !== name) nameSpan.textContent = name;
  return el;
}

function removeNameTag(userId: string) {
  const el = nameTagEls.get(userId);
  if (el) {
    el.remove();
    nameTagEls.delete(userId);
  }
}

const objectLabelEls = new Map<string, HTMLDivElement>();

function ensureObjectLabel(id: string, label: string): HTMLDivElement {
  let el = objectLabelEls.get(id);
  if (!el) {
    el = document.createElement('div');
    el.className =
      'pointer-events-none absolute z-10 -translate-x-1/2 rounded-full bg-indigo-600/90 px-2 py-0.5 text-xs font-semibold text-white whitespace-nowrap shadow-lg';
    nameTagsContainer.value?.appendChild(el);
    objectLabelEls.set(id, el);
  }
  if (el.textContent !== label) el.textContent = label;
  return el;
}

function removeObjectLabel(id: string) {
  objectLabelEls.get(id)?.remove();
  objectLabelEls.delete(id);
}

function updateObjectLabels(labels: ObjectLabelUpdate[], cam: Phaser.Cameras.Scene2D.Camera) {
  if (!cachedRect) return;
  const seen = new Set<string>();
  for (const l of labels) {
    seen.add(l.id);
    const el = ensureObjectLabel(l.id, l.label);
    const { x, y } = NookScene.projectToScreen(cam, cachedRect, l.worldX, l.worldY);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }
  for (const id of objectLabelEls.keys()) {
    if (!seen.has(id)) removeObjectLabel(id);
  }
}

const ICON_MUTED =
  '<svg width="10" height="10" viewBox="0 0 24 24" fill="rgb(248,113,113)" style="flex-shrink:0"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>';
const ICON_DEAFENED =
  '<svg width="10" height="10" viewBox="0 0 24 24" fill="rgb(248,113,113)" style="flex-shrink:0"><path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9zM1 12l2 2 2-2-2-2-2 2zm18 0l2 2 2-2-2-2-2 2z"/></svg>';

function updateNameTags(tags: NameTagUpdate[], cam: Phaser.Cameras.Scene2D.Camera) {
  if (!cachedRect) return;
  const seen = new Set<string>();
  for (const t of tags) {
    seen.add(t.userId);
    const el = ensureNameTag(t.userId, t.name);
    // Project 60 world-units above the body anchor (head top ≈ y - 54) so the offset scales with zoom
    const { x, y } = NookScene.projectToScreen(cam, cachedRect, t.worldX, t.worldY - 60);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    if (t.userId === props.userId) {
      const iconSpan = el.childNodes[1] as HTMLSpanElement;
      const icon = voice.isDeafened.value ? ICON_DEAFENED : voice.isMuted.value ? ICON_MUTED : '';
      if (iconSpan.innerHTML !== icon) iconSpan.innerHTML = icon;
    }
  }
  // Remove tags for players no longer present
  for (const userId of nameTagEls.keys()) {
    if (!seen.has(userId)) removeNameTag(userId);
  }
}

onMounted(() => {
  if (!canvasRef.value) return;

  // CRITICAL: ensure the socket exists before registering listeners.
  // Vue mounts children before parents, so we cannot rely on the parent's
  // onMounted to have called connect() yet — without this, socket?.on(...)
  // is a silent no-op and every listener is lost.
  socket.connect();

  const ro = new ResizeObserver(() => {
    cachedRect = canvasRef.value?.getBoundingClientRect() ?? null;
  });
  ro.observe(canvasRef.value);
  cachedRect = canvasRef.value.getBoundingClientRect();

  const scene = new NookScene(props.userId, props.playerName);

  game.value = new Phaser.Game({
    type: Phaser.AUTO,
    parent: canvasRef.value,
    backgroundColor: '#cdd0d4',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { pixelArt: true, antialias: false },
    input: { keyboard: true },
  });

  // ─── Wire socket listeners FIRST, then send hello ───
  // Order matters: snapshot/joined events that arrive between hello-send and
  // listener-registration are silently lost.

  const offSnapshot = socket.onSnapshot(({ you, others }) => {
    // Authoritative userId from the server, in case props.userId was stale
    scene.setLocalUserId(you.userId);
    for (const p of others) {
      scene.updateRemotePlayer(
        { userId: p.userId, x: p.x, y: p.y, dir: p.dir, moving: false },
        p.name,
      );
    }
  });

  const offJoined = socket.onPlayerJoined((state: PlayerState) => {
    scene.updateRemotePlayer(
      { userId: state.userId, x: state.x, y: state.y, dir: state.dir, moving: false },
      state.name,
    );
  });

  const offMoved = socket.onPlayerMoved((payload) => {
    if (!scene.hasRemotePlayer(payload.userId)) return;
    scene.updateRemotePlayer(payload, null);
  });

  const offLeft = socket.onPlayerLeft(({ userId }) => {
    scene.removeRemotePlayer(userId);
    removeNameTag(userId);
  });

  // World object socket listeners
  const rawSocket = socket.raw();
  const onWorldSnapshot = (payload: { objects: WorldObjectSpec[] }) => {
    for (const spec of payload.objects) scene.spawnWorldObject(spec);
  };
  const onWorldSpawn = (spec: WorldObjectSpec) => scene.spawnWorldObject(spec);
  const onWorldRemove = ({ id }: { id: string }) => {
    scene.removeWorldObject(id);
    removeObjectLabel(id);
  };
  rawSocket.on('world:object:snapshot', onWorldSnapshot);
  rawSocket.on('world:object:spawn', onWorldSpawn);
  rawSocket.on('world:object:remove', onWorldRemove);

  // Scene-level wiring once the scene is fully created
  scene.onReady = () => {
    scene.events.on('player-moved', (payload: Parameters<typeof socket.emitPlayerMoved>[0]) => {
      socket.emitPlayerMoved(payload);
    });

    scene.events.on('world-object-clicked', (objectId: string) => {
      rawSocket.emit('world:object:click', { objectId });
    });

    // Voice rooms — build zones from the server's voice channels and auto-join on proximity
    const voiceChannels = serversStore.voiceChannels;
    if (voiceChannels.length) {
      scene.setRooms(
        voiceChannels.map((ch) => ({
          channelId: ch.id,
          name: ch.name,
          x: ch.mapZone?.x ?? 0,
          y: ch.mapZone?.y ?? 0,
          w: ch.mapZone?.w,
          h: ch.mapZone?.h,
        })),
      );
    }

    scene.events.on('room:entered', ({ channelId }: { channelId: string }) => {
      void voice.join(props.serverId, channelId);
    });

    scene.events.on('room:left', () => {
      void voice.leave();
    });

    // Store latest tag/label positions but only project them in POST_RENDER, after
    // cameras.update() has applied the lerp — projecting in POST_UPDATE gives
    // a 1-frame-stale worldView which makes stationary tags jitter when the camera moves.
    let latestTags: NameTagUpdate[] = [];
    let latestLabels: ObjectLabelUpdate[] = [];
    scene.events.on('name-tags', (tags: NameTagUpdate[]) => {
      latestTags = tags;
    });
    scene.events.on('object-labels', (labels: ObjectLabelUpdate[]) => {
      latestLabels = labels;
    });
    game.value!.events.on(Phaser.Core.Events.POST_RENDER, () => {
      updateNameTags(latestTags, scene.cameras.main);
      updateObjectLabels(latestLabels, scene.cameras.main);
    });

    // Now that everything is wired up, announce ourselves
    socket.hello({
      serverId: props.serverId,
      name: props.playerName,
      x: scene.localBody.x,
      y: scene.localBody.y,
      dir: 'down',
    });
  };

  onUnmounted(() => {
    offSnapshot();
    offJoined();
    offMoved();
    offLeft();
    rawSocket.off('world:object:snapshot', onWorldSnapshot);
    rawSocket.off('world:object:spawn', onWorldSpawn);
    rawSocket.off('world:object:remove', onWorldRemove);
    ro.disconnect();
    game.value?.destroy(true);
    game.value = null;
    nameTagEls.clear();
    objectLabelEls.clear();
  });

  nextTick(() => {
    const canvas = canvasRef.value?.querySelector('canvas');
    if (canvas) {
      canvas.setAttribute('tabindex', '0');
      canvas.focus();
    }
  });
});
</script>

<template>
  <div class="relative w-full h-full overflow-hidden">
    <div ref="canvasRef" class="absolute inset-0" />
    <div ref="nameTagsContainer" class="absolute inset-0 pointer-events-none" />

    <!-- Zone picker overlay — admin draws a rect to define a voice room area -->
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
      <!-- Instructions -->
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

      <!-- Cancel button -->
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

      <!-- Live selection rect -->
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
