import Phaser from 'phaser';
import type { LocalPlayer } from '../player/local-player';
import type { RemotePlayerManager } from '../player/remote-players';
import type { RoomZoneManager } from '../rooms/room-zones';
import type { WorldObjectManager } from '../world-objects/world-object-manager';
import type { InteractionManager } from '../interactions/interaction-manager';
import type { NameTagUpdate, ObjectLabelUpdate, VoiceRoomLabelUpdate } from '../types';

interface OverlaySources {
  localPlayer: LocalPlayer;
  remotePlayers: RemotePlayerManager;
  worldObjects: WorldObjectManager;
  rooms: RoomZoneManager;
  interactions: InteractionManager;
}

// Each frame, collects where the HTML overlays (name tags, labels, room pills)
// should be and sends them to the Vue side. Reuses the arrays to avoid garbage.
export class OverlayEmitter {
  private readonly nameTags: NameTagUpdate[] = [];
  private readonly objectLabels: ObjectLabelUpdate[] = [];
  private readonly roomLabels: VoiceRoomLabelUpdate[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sources: OverlaySources,
  ) {}

  emit() {
    const tags = this.nameTags;
    tags.length = 0;
    tags.push(this.sources.localPlayer.nameTag());
    this.sources.remotePlayers.collectNameTags(tags);
    this.scene.events.emit('name-tags', tags);

    const labels = this.objectLabels;
    labels.length = 0;
    this.sources.worldObjects.collectLabels(labels);
    this.sources.interactions.collectPromptLabel(labels);
    this.scene.events.emit('object-labels', labels);

    const rooms = this.roomLabels;
    rooms.length = 0;
    this.sources.rooms.collectRoomLabels(rooms);
    this.scene.events.emit('voice-rooms', rooms);
  }
}
