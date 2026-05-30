import Phaser from 'phaser';
import type { ShallowRef } from 'vue';
import {
  NookScene,
  type NameTagUpdate,
  type ObjectLabelUpdate,
  type VoiceRoomLabelUpdate,
} from '~/components/world/NookScene';
import {
  ICON_DEAFENED,
  ICON_MUTED,
  type NameTagStatus,
} from '~/components/world/name-tag/constants';
import { useLocalActivity } from './useLocalActivity';

type AttachableTrack = {
  attach: (el: HTMLVideoElement) => HTMLVideoElement;
  detach: (el: HTMLVideoElement) => HTMLVideoElement;
};

export type NameTagOverlay = {
  userId: string;
  name: string;
  status: NameTagStatus;
  mediaIconHtml: string;
  activity: string | null;
  x: number;
  y: number;
};

export type CamBubbleOverlay = {
  userId: string;
  track: AttachableTrack;
  mirror: boolean;
  speaking: boolean;
  feedKey: string;
  x: number;
  y: number;
};

export type VoiceRoomOverlay = {
  channelId: string;
  name: string;
  x: number;
  y: number;
  members: Array<{ userId: string; name: string }>;
  speakingUserIds: Set<string>;
};

export type ObjectLabelOverlay = { id: string; label: string; x: number; y: number };

const NAME_TAG_Y_OFFSET = 60;
const CAM_BUBBLE_Y_OFFSET = 50;

export function useWorldOverlays(opts: {
  scene: NookScene;
  game: Phaser.Game;
  cachedRect: ShallowRef<DOMRect | null>;
  localUserId: string;
  // translator passed from the component (the scene has no i18n context)
  t: (key: string) => string;
  out: {
    nameTags: ShallowRef<NameTagOverlay[]>;
    camBubbles: ShallowRef<CamBubbleOverlay[]>;
    voiceRooms: ShallowRef<VoiceRoomOverlay[]>;
    objectLabels: ShallowRef<ObjectLabelOverlay[]>;
  };
}) {
  const voice = useVoice();
  const { localActivity } = useLocalActivity();

  const screenRingArcs = new Map<string, Phaser.GameObjects.Arc>();

  function ensureScreenRing(userId: string): Phaser.GameObjects.Arc {
    let arc = screenRingArcs.get(userId);
    if (!arc) {
      arc = opts.scene.add.arc(0, 0, 22, 0, 360, false);
      arc.setStrokeStyle(1.5, 0x93c5fd, 0.85);
      arc.setFillStyle();
      opts.scene.tweens.add({
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

  let latestTags: NameTagUpdate[] = [];
  let latestLabels: ObjectLabelUpdate[] = [];
  let latestRooms: VoiceRoomLabelUpdate[] = [];

  function recompute(cam: Phaser.Cameras.Scene2D.Camera) {
    const rect = opts.cachedRect.value;
    if (!rect) return;

    const worldMode = voice.mediaViewMode.value === 'world';
    const localUserId = opts.localUserId;
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

    for (const t of latestTags) {
      const isLocal = t.userId === localUserId;
      const tag = NookScene.projectToScreen(cam, rect, t.worldX, t.worldY - NAME_TAG_Y_OFFSET);
      nextNameTags.push({
        userId: t.userId,
        name: t.name,
        status: isLocal ? localStatus : 'online',
        mediaIconHtml: isLocal ? localMediaIcon : '',
        activity: isLocal ? localActivity.value : null,
        x: tag.x,
        y: tag.y,
      });

      const media = isLocal
        ? { cam: localCam, screen: localScreen }
        : participantMedia.get(t.userId);
      const camTrack = isLocal
        ? localCamTrack
        : ((remoteVideoTracks.get(t.userId) as AttachableTrack | undefined) ?? null);

      if (worldMode && media?.cam && camTrack) {
        const b = NookScene.projectToScreen(cam, rect, t.worldX, t.worldY - CAM_BUBBLE_Y_OFFSET);
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
        arc.x = t.worldX;
        arc.y = t.worldY;
        arc.setDepth(t.worldY - 0.5);
      }
    }
    for (const userId of screenRingArcs.keys()) {
      if (!seenScreens.has(userId)) removeScreenRing(userId);
    }

    opts.out.nameTags.value = nextNameTags;
    opts.out.camBubbles.value = nextBubbles;

    opts.out.objectLabels.value = latestLabels.map((l) => {
      const { x, y } = NookScene.projectToScreen(cam, rect, l.worldX, l.worldY);
      // the interaction prompt ships an i18n key; everything else is display text
      const label = l.id === 'interaction-prompt' ? opts.t(l.label) : l.label;
      return { id: l.id, label, x, y };
    });

    const presence = voice.voicePresence.value;
    opts.out.voiceRooms.value = latestRooms.map((r) => {
      const { x, y } = NookScene.projectToScreen(cam, rect, r.worldX, r.worldY);
      const presenceMembers = presence.get(r.channelId) ?? [];
      return {
        channelId: r.channelId,
        name: r.name,
        x,
        y,
        members: presenceMembers.map((m) => ({ userId: m.userId, name: m.name })),
        speakingUserIds: new Set(activeSpeakers),
      };
    });
  }

  opts.scene.events.on('name-tags', (tags: NameTagUpdate[]) => {
    latestTags = tags;
  });
  opts.scene.events.on('object-labels', (labels: ObjectLabelUpdate[]) => {
    latestLabels = labels;
  });
  opts.scene.events.on('voice-rooms', (rooms: VoiceRoomLabelUpdate[]) => {
    latestRooms = rooms;
  });
  opts.game.events.on(Phaser.Core.Events.POST_RENDER, () => {
    recompute(opts.scene.cameras.main);
  });

  function reset() {
    opts.out.nameTags.value = [];
    opts.out.camBubbles.value = [];
    opts.out.voiceRooms.value = [];
    opts.out.objectLabels.value = [];
    for (const arc of screenRingArcs.values()) arc.destroy();
    screenRingArcs.clear();
  }

  return { removeScreenRing, reset };
}
