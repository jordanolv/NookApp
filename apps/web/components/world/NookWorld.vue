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

const props = defineProps<{ serverId: string; userId: string; playerName: string }>();

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
      'pointer-events-none absolute z-10 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap';
    nameTagsContainer.value?.appendChild(el);
    nameTagEls.set(userId, el);
  }
  if (el.textContent !== name) el.textContent = name;
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
      scene.setRooms(voiceChannels.map((ch) => ({ channelId: ch.id, name: ch.name, x: 0, y: 0 })));
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
  </div>
</template>
