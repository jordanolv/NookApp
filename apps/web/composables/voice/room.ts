import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';
import { activeSpeakers, isScreenSharing, localCameraTrack } from './state';
import {
  attachRemoteAudio,
  attachRemoteVideo,
  detachRemoteAudio,
  detachRemoteVideo,
  setParticipantMedia,
} from './tracks';
import { cleanupRoom } from './cleanup';

export function createRoom(): Room {
  return new Room({
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
}

export function bindRoomEvents(lkRoom: Room) {
  lkRoom.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
    const uid = participant.identity;
    if (track.kind === Track.Kind.Audio && pub.source !== Track.Source.ScreenShareAudio) {
      attachRemoteAudio(track as RemoteTrack, uid);
      return;
    }
    if (track.kind !== Track.Kind.Video) return;
    if (pub.source === Track.Source.Camera) attachRemoteVideo(uid, 'cam', track as RemoteTrack);
    else if (pub.source === Track.Source.ScreenShare)
      attachRemoteVideo(uid, 'screen', track as RemoteTrack);
  });

  lkRoom.on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
    const uid = participant.identity;
    if (track.kind === Track.Kind.Audio) {
      detachRemoteAudio(track as RemoteTrack, uid);
      return;
    }
    if (track.kind !== Track.Kind.Video) return;
    if (pub.source === Track.Source.Camera) detachRemoteVideo(uid, 'cam');
    else if (pub.source === Track.Source.ScreenShare) detachRemoteVideo(uid, 'screen');
  });

  lkRoom.on(RoomEvent.LocalTrackUnpublished, (pub) => {
    if (pub.source === Track.Source.ScreenShare) isScreenSharing.value = false;
    if (pub.source === Track.Source.Camera) localCameraTrack.value = null;
  });

  // setCameraEnabled(false) mutes the track rather than unpublishing — TrackUnsubscribed
  // never fires. TrackMuted/TrackUnmuted are the reliable signal for remote cam state.
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
}
