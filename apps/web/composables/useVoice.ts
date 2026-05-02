import { Room, RoomEvent, Track } from 'livekit-client';
import type { VoiceParticipant, VoiceSnapshotPayload } from '@nookapp/protocol';

// Module-level singletons — voice state persists across component lifecycle
const room = shallowRef<Room | null>(null);
const currentChannelId = ref<string | null>(null);
const currentServerId = ref<string | null>(null);
const isMuted = ref(false);
const isDeafened = ref(false);
const isCameraOn = ref(false);
const activeSpeakers = ref<Set<string>>(new Set());

// channelId → participants in that channel
const voicePresence = ref<Map<string, VoiceParticipant[]>>(new Map());

// Audio elements keyed by participant identity (= userId)
const audioEls = new Map<string, HTMLAudioElement>();

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
  activeSpeakers.value = new Set();
  cleanupAudio();
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

    lkRoom.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach() as HTMLAudioElement;
        el.style.display = 'none';
        el.muted = isDeafened.value;
        document.body.appendChild(el);
        audioEls.set(participant.identity, el);
      }
    });

    lkRoom.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      track.detach().forEach((el) => el.remove());
      audioEls.delete(participant.identity);
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
    isCameraOn.value = !isCameraOn.value;
    await room.value?.localParticipant.setCameraEnabled(isCameraOn.value);
  }

  return {
    room: readonly(room),
    currentChannelId: readonly(currentChannelId),
    currentServerId: readonly(currentServerId),
    isMuted: readonly(isMuted),
    isDeafened: readonly(isDeafened),
    isCameraOn: readonly(isCameraOn),
    activeSpeakers: readonly(activeSpeakers),
    voicePresence: readonly(voicePresence),
    setupListeners,
    join,
    leave,
    toggleMute,
    toggleDeafen,
    toggleCamera,
  };
}
