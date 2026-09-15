import type { Room, LocalVideoTrack, RemoteTrack } from 'livekit-client';
import type { VoiceParticipant } from '@nookapp/protocol';

// Module-level singletons — voice state persists across component lifecycle.
// Anything imported from here is shared by every consumer of useVoice().

export const room = shallowRef<Room | null>(null);
export const currentChannelId = ref<string | null>(null);
export const currentServerId = ref<string | null>(null);

export const isMuted = ref(false);
export const isDeafened = ref(false);
export const isScreenSharing = ref(false);

export const localCameraTrack = shallowRef<LocalVideoTrack | null>(null);
export const localScreenTrack = shallowRef<LocalVideoTrack | null>(null);
export const isCameraOn = computed(() => localCameraTrack.value !== null);

export const activeSpeakers = ref<Set<string>>(new Set());

// channelId → participants in that channel (server-sourced via Socket.IO)
export const voicePresence = ref<Map<string, VoiceParticipant[]>>(new Map());

// userId → media flags, populated from LiveKit track events (same channel only)
export const participantMedia = ref<Map<string, { cam: boolean; screen: boolean }>>(new Map());

// Remote video tracks for in-world bubbles + media panel, keyed by userId
export const remoteVideoTracks = ref<Map<string, RemoteTrack>>(new Map());
export const remoteScreenTracks = ref<Map<string, RemoteTrack>>(new Map());

// Audio elements keyed by participant identity (= userId)
export const audioEls = new Map<string, HTMLAudioElement>();

// Feed the voice stage should enlarge, set when a cam bubble is clicked.
export const mediaPanelFocusKey = ref<string | null>(null);

// One-shot flag: when true, the next leave() should send the avatar back to
// spawn. Set by leaveExplicit() (dock button), cleared by the page watcher
// after teleporting. Walking out of a room calls plain leave() and leaves
// this false — the avatar stays where it is.
export const returnToSpawnOnLeave = ref(false);
