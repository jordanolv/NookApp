import { Track, type LocalVideoTrack } from 'livekit-client';
import { cleanupRoom } from './voice/cleanup';
import { applyVoiceJoined, applyVoiceLeft, applyVoiceSnapshot } from './voice/presence';
import { bindRoomEvents, createRoom } from './voice/room';
import { setParticipantMedia } from './voice/tracks';
import {
  activeSpeakers,
  audioEls,
  currentChannelId,
  currentServerId,
  isCameraOn,
  isDeafened,
  isMuted,
  isScreenSharing,
  localCameraTrack,
  mediaPanelFocusKey,
  mediaViewMode,
  participantMedia,
  remoteScreenTracks,
  remoteVideoTracks,
  returnToSpawnOnLeave,
  room,
  voicePresence,
} from './voice/state';

// Cancellation token: bumped by every join() and leave(). An in-flight join()
// captures this at start and re-checks after every await — if it changed, a
// newer call has superseded this one and it must abort.
let joinSeq = 0;

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

  async function fetchToken(serverId: string, channelId: string): Promise<string> {
    const { token } = await $fetch<{ token: string }>(
      `${runtimePublic.apiBase}/servers/${serverId}/channels/${channelId}/livekit-token`,
      { credentials: 'include' },
    );
    return token;
  }

  // Tear down the active room without bumping joinSeq. Used by both leave()
  // (user-facing) and join() (when switching channels). cleanupRoom() runs
  // synchronously so the UI updates instantly and concurrent callers see a
  // null room.value and short-circuit.
  async function disconnectActiveRoom() {
    const lkRoom = room.value;
    if (!lkRoom) return;
    cleanupRoom();
    socket.emitVoiceLeave();
    await lkRoom.disconnect();
  }

  async function join(serverId: string, channelId: string) {
    const seq = ++joinSeq;
    const stale = () => seq !== joinSeq;

    await disconnectActiveRoom();
    if (stale()) return;

    const token = await fetchToken(serverId, channelId);
    if (stale()) return;

    const lkRoom = createRoom();
    bindRoomEvents(lkRoom);
    await lkRoom.connect(runtimePublic.livekitUrl as string, token);
    if (stale()) {
      await lkRoom.disconnect();
      return;
    }

    // Commit state BEFORE the last await so a concurrent leave() sees room.value
    // set and can disconnect this room properly instead of returning a no-op.
    room.value = lkRoom;
    currentChannelId.value = channelId;
    currentServerId.value = serverId;
    socket.emitVoiceJoin({ channelId });

    // setMicrophoneEnabled may reject if a concurrent leave() already disconnected
    // the room — that's fine, the state already reflects the user's final intent.
    await lkRoom.localParticipant.setMicrophoneEnabled(!isMuted.value).catch(() => {});
  }

  async function leave() {
    joinSeq++; // invalidates any in-flight join()
    await disconnectActiveRoom();
  }

  // Explicit user-triggered disconnect (the leave button in the dock). Sets a
  // one-shot flag so the page can teleport the avatar back to spawn — walking
  // out of the room calls plain leave() instead and the avatar stays put.
  async function leaveExplicit() {
    returnToSpawnOnLeave.value = true;
    await leave();
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
    leaveExplicit,
    returnToSpawnOnLeave,
    toggleMute,
    toggleDeafen,
    toggleCamera,
    toggleScreenShare,
  };
}
