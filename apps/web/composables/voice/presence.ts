import type { VoiceParticipant, VoiceSnapshotPayload } from '@nookapp/protocol';
import { voicePresence } from './state';

// Voice presence is sourced from the Socket.IO gateway, independent of LiveKit.
// These handlers translate server events into voicePresence map updates.

export function applyVoiceSnapshot(payload: VoiceSnapshotPayload) {
  const map = new Map<string, VoiceParticipant[]>();
  for (const p of payload.participants) {
    if (!map.has(p.channelId)) map.set(p.channelId, []);
    map.get(p.channelId)!.push(p);
  }
  voicePresence.value = map;
}

export function applyVoiceJoined(data: VoiceParticipant) {
  const map = new Map(voicePresence.value);
  const list = map.get(data.channelId) ?? [];
  if (!list.find((p) => p.userId === data.userId)) {
    map.set(data.channelId, [...list, data]);
  }
  voicePresence.value = map;
}

export function applyVoiceLeft(data: { userId: string; channelId: string }) {
  const map = new Map(voicePresence.value);
  const list = (map.get(data.channelId) ?? []).filter((p) => p.userId !== data.userId);
  if (list.length === 0) map.delete(data.channelId);
  else map.set(data.channelId, list);
  voicePresence.value = map;
}
