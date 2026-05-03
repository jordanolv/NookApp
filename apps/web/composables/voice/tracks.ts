import type { RemoteTrack } from 'livekit-client';
import {
  audioEls,
  isDeafened,
  participantMedia,
  remoteScreenTracks,
  remoteVideoTracks,
} from './state';

// Track helpers — invoked from bindRoomEvents() handlers and from toggleScreenShare().

export function setParticipantMedia(
  uid: string,
  patch: Partial<{ cam: boolean; screen: boolean }>,
) {
  const next = new Map(participantMedia.value);
  next.set(uid, { ...(next.get(uid) ?? { cam: false, screen: false }), ...patch });
  participantMedia.value = next;
}

export function attachRemoteAudio(track: RemoteTrack, uid: string) {
  const el = track.attach() as HTMLAudioElement;
  el.style.display = 'none';
  el.muted = isDeafened.value;
  document.body.appendChild(el);
  audioEls.set(uid, el);
}

export function detachRemoteAudio(track: RemoteTrack, uid: string) {
  track.detach().forEach((el) => el.remove());
  audioEls.delete(uid);
}

function videoMapFor(source: 'cam' | 'screen') {
  return source === 'cam' ? remoteVideoTracks : remoteScreenTracks;
}

export function attachRemoteVideo(uid: string, source: 'cam' | 'screen', track: RemoteTrack) {
  setParticipantMedia(uid, { [source]: true });
  const map = videoMapFor(source);
  map.value = new Map(map.value).set(uid, track);
}

export function detachRemoteVideo(uid: string, source: 'cam' | 'screen') {
  setParticipantMedia(uid, { [source]: false });
  const map = videoMapFor(source);
  const next = new Map(map.value);
  next.delete(uid);
  map.value = next;
}
