import {
  activeSpeakers,
  audioEls,
  currentChannelId,
  currentServerId,
  isScreenSharing,
  localCameraTrack,
  participantMedia,
  remoteScreenTracks,
  remoteVideoTracks,
  room,
} from './state';

function cleanupAudio() {
  for (const el of audioEls.values()) el.remove();
  audioEls.clear();
}

// Reset every piece of room-bound state. Idempotent — calling twice is a no-op.
// Wired both as the LiveKit Disconnected event handler and as the eager reset
// in disconnectActiveRoom() for snappy UI updates.
export function cleanupRoom() {
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
