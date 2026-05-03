import { Room, RoomEvent, Track, type LocalVideoTrack, type RemoteTrack } from 'livekit-client';
import type { VoiceParticipant, VoiceSnapshotPayload } from '@nookapp/protocol';

// Module-level singletons — voice state persists across component lifecycle
const room = shallowRef<Room | null>(null);
const currentChannelId = ref<string | null>(null);
const currentServerId = ref<string | null>(null);
const isMuted = ref(false);
const isDeafened = ref(false);
const isScreenSharing = ref(false);

// Camera track — tied to the LiveKit room, null when not in a voice channel or cam off
const localCameraTrack = shallowRef<LocalVideoTrack | null>(null);
const isCameraOn = computed(() => localCameraTrack.value !== null);

const activeSpeakers = ref<Set<string>>(new Set());

// channelId → participants in that channel
const voicePresence = ref<Map<string, VoiceParticipant[]>>(new Map());

// userId → { cam, screen } — populated from LiveKit TrackSubscribed (same channel only)
const participantMedia = ref<Map<string, { cam: boolean; screen: boolean }>>(new Map());

// Remote video/screen tracks for in-world bubbles — keyed by userId
const remoteVideoTracks = ref<Map<string, RemoteTrack>>(new Map());
const remoteScreenTracks = ref<Map<string, RemoteTrack>>(new Map());

// Audio elements keyed by participant identity (= userId)
const audioEls = new Map<string, HTMLAudioElement>();

// 'world' = cam bubbles above players; 'panel' = Discord-style floating grid
const mediaViewMode = ref<'world' | 'panel'>('world');
const mediaPanelFocusKey = ref<string | null>(null);

function applyVoiceSnapshot(payload: VoiceSnapshotPayload) {
  const map = new Map<string, VoiceParticipant[]>();
  for (const p of payload.participants) {
    if (!map.has(p.channelId)) map.set(p.channelId, []);
    map.get(p.channelId)!.push(p);
  }
  voicePresence.value = map;
}

function applyVoiceJoined(data: VoiceParticipant) {
  const map = new Map(voicePresence.value);
  const list = map.get(data.channelId) ?? [];
  if (!list.find((p) => p.userId === data.userId)) {
    map.set(data.channelId, [...list, data]);
  }
  voicePresence.value = map;
}

function applyVoiceLeft(data: { userId: string; channelId: string }) {
  const map = new Map(voicePresence.value);
  const list = (map.get(data.channelId) ?? []).filter((p) => p.userId !== data.userId);
  if (list.length === 0) map.delete(data.channelId);
  else map.set(data.channelId, list);
  voicePresence.value = map;
}

function cleanupAudio() {
  for (const el of audioEls.values()) el.remove();
  audioEls.clear();
}

function cleanupRoom() {
  room.value = null;
  currentChannelId.value = null;
  currentServerId.value = null;
  isScreenSharing.value = false;
  localCameraTrack.value = null;
  activeSpeakers.value = new Set();
  participantMedia.value = new Map();
  remoteVideoTracks.value = new Map();
  remoteScreenTracks.value = new Map();
  cleanupAudio();
}

function setParticipantMedia(userId: string, patch: Partial<{ cam: boolean; screen: boolean }>) {
  const map = new Map(participantMedia.value);
  map.set(userId, { ...(map.get(userId) ?? { cam: false, screen: false }), ...patch });
  participantMedia.value = map;
}

export function useVoice() {
  const { public: runtimePublic } = useRuntimeConfig();
  const socket = useSocket();

  function setupListeners() {
    const offSnapshot = socket.onVoiceSnapshot(applyVoiceSnapshot);
    const offJoined = socket.onVoiceJoined(applyVoiceJoined);
    const offLeft = socket.onVoiceLeft(applyVoiceLeft);
    return () => {
      offSnapshot();
      offJoined();
      offLeft();
    };
  }

  async function join(serverId: string, channelId: string) {
    if (room.value) await leave();

    const { token } = await $fetch<{ token: string }>(
      `${runtimePublic.apiBase}/servers/${serverId}/channels/${channelId}/livekit-token`,
      { credentials: 'include' },
    );

    const lkRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      publishDefaults: {
        audioPreset: { maxBitrate: 96_000 },
        dtx: true,
        red: true,
      },
    });

    lkRoom.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
      const uid = participant.identity;

      if (track.kind === Track.Kind.Audio && pub.source !== Track.Source.ScreenShareAudio) {
        const el = track.attach() as HTMLAudioElement;
        el.style.display = 'none';
        el.muted = isDeafened.value;
        document.body.appendChild(el);
        audioEls.set(uid, el);
        return;
      }

      if (track.kind === Track.Kind.Video) {
        if (pub.source === Track.Source.Camera) {
          setParticipantMedia(uid, { cam: true });
          remoteVideoTracks.value = new Map(remoteVideoTracks.value).set(uid, track as RemoteTrack);
        } else if (pub.source === Track.Source.ScreenShare) {
          setParticipantMedia(uid, { screen: true });
          remoteScreenTracks.value = new Map(remoteScreenTracks.value).set(
            uid,
            track as RemoteTrack,
          );
        }
      }
    });

    lkRoom.on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
      const uid = participant.identity;

      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach((el) => el.remove());
        audioEls.delete(uid);
        return;
      }

      if (track.kind === Track.Kind.Video) {
        if (pub.source === Track.Source.Camera) {
          setParticipantMedia(uid, { cam: false });
          const vt = new Map(remoteVideoTracks.value);
          vt.delete(uid);
          remoteVideoTracks.value = vt;
        } else if (pub.source === Track.Source.ScreenShare) {
          setParticipantMedia(uid, { screen: false });
          const st = new Map(remoteScreenTracks.value);
          st.delete(uid);
          remoteScreenTracks.value = st;
        }
      }
    });

    lkRoom.on(RoomEvent.LocalTrackUnpublished, (pub) => {
      if (pub.source === Track.Source.ScreenShare) {
        isScreenSharing.value = false;
      }
      if (pub.source === Track.Source.Camera) {
        localCameraTrack.value = null;
      }
    });

    // setCameraEnabled(false) mutes the track rather than unpublishing — TrackUnsubscribed never fires.
    // TrackMuted/TrackUnmuted are the reliable signal for remote cam state changes.
    lkRoom.on(RoomEvent.TrackMuted, (pub, participant) => {
      const uid = participant.identity;
      if (pub.source === Track.Source.Camera) setParticipantMedia(uid, { cam: false });
      if (pub.source === Track.Source.ScreenShare) setParticipantMedia(uid, { screen: false });
    });

    lkRoom.on(RoomEvent.TrackUnmuted, (pub, participant) => {
      const uid = participant.identity;
      if (pub.source === Track.Source.Camera) setParticipantMedia(uid, { cam: true });
      if (pub.source === Track.Source.ScreenShare) setParticipantMedia(uid, { screen: true });
    });

    lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      activeSpeakers.value = new Set(speakers.map((p) => p.identity));
    });

    lkRoom.on(RoomEvent.Disconnected, cleanupRoom);

    await lkRoom.connect(runtimePublic.livekitUrl as string, token);
    await lkRoom.localParticipant.setMicrophoneEnabled(!isMuted.value);

    room.value = lkRoom;
    currentChannelId.value = channelId;
    currentServerId.value = serverId;

    socket.emitVoiceJoin({ channelId });
  }

  async function leave() {
    if (!room.value) return;
    socket.emitVoiceLeave();
    await room.value.disconnect();
    cleanupRoom();
  }

  async function toggleMute() {
    isMuted.value = !isMuted.value;
    await room.value?.localParticipant.setMicrophoneEnabled(!isMuted.value);
  }

  function toggleDeafen() {
    isDeafened.value = !isDeafened.value;
    for (const el of audioEls.values()) el.muted = isDeafened.value;
  }

  async function toggleCamera() {
    if (!room.value) return;
    const next = !isCameraOn.value;
    try {
      await room.value.localParticipant.setCameraEnabled(next);
      localCameraTrack.value = next
        ? ((room.value.localParticipant.getTrackPublication(Track.Source.Camera)
            ?.videoTrack as LocalVideoTrack) ?? null)
        : null;
    } catch (err) {
      console.warn('Camera error:', err);
    }
  }

  async function toggleScreenShare() {
    if (!room.value) return;
    const next = !isScreenSharing.value;
    try {
      await room.value.localParticipant.setScreenShareEnabled(next);
      isScreenSharing.value = next;
      const myId = room.value.localParticipant.identity;
      if (myId) setParticipantMedia(myId, { screen: next });
    } catch {
      // user cancelled the screen picker — no state change
    }
  }

  return {
    room: readonly(room),
    mediaViewMode: readonly(mediaViewMode),
    mediaPanelFocusKey: readonly(mediaPanelFocusKey),
    openMediaPanel: (focusKey?: string) => {
      if (focusKey) mediaPanelFocusKey.value = focusKey;
      mediaViewMode.value = 'panel';
    },
    closeMediaPanel: () => {
      mediaViewMode.value = 'world';
    },
    currentChannelId: readonly(currentChannelId),
    currentServerId: readonly(currentServerId),
    isMuted: readonly(isMuted),
    isDeafened: readonly(isDeafened),
    isCameraOn,
    isScreenSharing: readonly(isScreenSharing),
    localCameraTrack: readonly(localCameraTrack),
    activeSpeakers: readonly(activeSpeakers),
    voicePresence: readonly(voicePresence),
    participantMedia: readonly(participantMedia),
    remoteVideoTracks: readonly(remoteVideoTracks),
    remoteScreenTracks: readonly(remoteScreenTracks),
    setupListeners,
    join,
    leave,
    toggleMute,
    toggleDeafen,
    toggleCamera,
    toggleScreenShare,
  };
}
