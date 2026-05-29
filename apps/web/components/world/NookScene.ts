import Phaser from 'phaser';
import type { MapData, PlayerMovedPayload } from '@nookapp/protocol';
import { DEFAULT_APPEARANCE, type Appearance } from '~/composables/useCharacter';
import { drawGrassBackground } from './scene/background';
import { BuildOverlay } from './scene/build-overlay';
import { DISPLAY_SCALE, WORLD_H, WORLD_W } from './scene/constants';
import { DecorRenderer } from './scene/decor-renderer';
import { FloorRenderer } from './scene/floor-renderer';
import { MapModel } from './scene/map-model';
import { WallRenderer, WALL_TEXTURE_KEYS } from './scene/wall-renderer';
import { preloadWorldAssets } from './scene/assets/preload';
import { BuildController } from './scene/build/build-controller';
import { LocalPlayer } from './scene/player/local-player';
import { RemotePlayerManager } from './scene/player/remote-players';
import { RoomZoneManager } from './scene/rooms/room-zones';
import { OverlayEmitter } from './scene/overlays/overlay-emitter';
import { WorldObjectManager } from './scene/world-objects/world-object-manager';
import type { BuildTool, RoomZone, WallRegion, WorldObjectSpec } from './scene/types';

export type {
  BuildTool,
  WallRegion,
  RoomZone,
  WorldObjectSpec,
  RoomRectPayload,
  WallRectPayload,
  DecorPlacePayload,
  DecorRemovePayload,
  CellErasePayload,
  NameTagUpdate,
  ObjectLabelUpdate,
  VoiceRoomLabelUpdate,
} from './scene/types';

// Ties the world together: holds the renderers and the subsystems (players,
// build, rooms, objects, overlays) and forwards calls to them. The real logic
// lives in those subsystems, not here.
export class NookScene extends Phaser.Scene {
  localUserId: string;
  readonly localUserName: string;
  onReady?: () => void;
  onLoadProgress?: (value: number) => void;
  onLoadComplete?: () => void;

  private appearance: Appearance = { ...DEFAULT_APPEARANCE };

  private floorRenderer!: FloorRenderer;
  private wallRenderer!: WallRenderer;
  private decorRenderer!: DecorRenderer;
  private buildOverlay!: BuildOverlay;
  private model: MapModel | null = null;
  private wallCollider?: Phaser.Physics.Arcade.Collider;
  private decorCollider?: Phaser.Physics.Arcade.Collider;

  private localPlayer!: LocalPlayer;
  private remotePlayers!: RemotePlayerManager;
  private buildController!: BuildController;
  private roomZones!: RoomZoneManager;
  private worldObjects!: WorldObjectManager;
  private overlayEmitter!: OverlayEmitter;

  private pendingRestorePosition: { x: number; y: number } | null = null;

  constructor(localUserId: string, localUserName: string, initialAppearance?: Appearance) {
    super({ key: 'NookScene' });
    this.localUserId = localUserId;
    this.localUserName = localUserName;
    if (initialAppearance) this.appearance = { ...initialAppearance };
  }

  get localBody(): Phaser.Physics.Arcade.Sprite {
    return this.localPlayer.body;
  }

  setLocalUserId(userId: string) {
    if (this.localUserId === userId) return;
    this.localUserId = userId;
    this.removeRemotePlayer(userId);
  }

  preload() {
    preloadWorldAssets(this, {
      onProgress: (value) => this.onLoadProgress?.(value),
      onComplete: () => this.onLoadComplete?.(),
    });
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setZoom(1);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#cdd0d4');

    for (const { key } of WALL_TEXTURE_KEYS) {
      this.textures.get(key)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    drawGrassBackground(this);

    this.floorRenderer = new FloorRenderer(this);
    this.wallRenderer = new WallRenderer(this);
    this.decorRenderer = new DecorRenderer(this);
    this.buildOverlay = new BuildOverlay(this);
    this.roomZones = new RoomZoneManager(this);
    this.worldObjects = new WorldObjectManager(this);
    this.buildController = new BuildController(this, this.buildOverlay, () => this.model);

    this.input.on('pointerdown', this.buildController.onPointerDown, this.buildController);
    this.input.on('pointermove', this.buildController.onPointerMove, this.buildController);
    this.input.on('pointerup', this.buildController.onPointerUp, this.buildController);

    this.localPlayer = new LocalPlayer(this, this.appearance, {
      getUserId: () => this.localUserId,
      userName: this.localUserName,
    });
    this.localPlayer.centerCamera();
    this.remotePlayers = new RemotePlayerManager(this, () => this.localUserId);

    this.wallCollider = this.wallRenderer.collideWith(this.localBody);
    this.decorCollider = this.decorRenderer.collideWith(this.localBody);

    this.overlayEmitter = new OverlayEmitter(this, {
      localPlayer: this.localPlayer,
      remotePlayers: this.remotePlayers,
      worldObjects: this.worldObjects,
      rooms: this.roomZones,
    });

    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate, this);

    this.onReady?.();
  }

  // --- Map ---

  applyMapData(data: MapData) {
    this.model = new MapModel(data);
    this.floorRenderer.apply(this.model);
    this.wallRenderer.apply(this.model);
    this.decorRenderer.apply(this.model);
    if (!this.buildOverlay.isActive()) this.localPlayer.unstickFrom(this.model);
  }

  // --- Players ---

  applyAppearance(next: Appearance) {
    this.appearance = { ...next };
    this.localPlayer?.setAppearance(next);
  }

  setRemoteAppearance(userId: string, appearance: Appearance) {
    this.remotePlayers?.setAppearance(userId, appearance);
  }

  updateRemotePlayer(payload: PlayerMovedPayload, name: string | null) {
    this.remotePlayers?.upsert(payload, name);
  }

  hasRemotePlayer(userId: string): boolean {
    return this.remotePlayers?.has(userId) ?? false;
  }

  removeRemotePlayer(userId: string) {
    this.remotePlayers?.remove(userId);
  }

  teleport(x: number, y: number) {
    this.localPlayer?.teleport(x, y);
  }

  emitCurrentPosition() {
    this.localPlayer?.emitCurrentPosition();
  }

  setCameraOffset(x: number, y: number) {
    this.localPlayer?.setCameraOffset(x, y);
  }

  // --- Build ---

  setBuildMode(active: boolean) {
    if (this.buildOverlay.isActive() === active) return;
    this.buildOverlay.setActive(active);

    if (active) {
      if (this.wallCollider) this.wallCollider.active = false;
      if (this.decorCollider) this.decorCollider.active = false;
    } else {
      this.buildController.onExitBuild();
      if (this.model) this.localPlayer.unstickFrom(this.model);
      if (this.wallCollider) this.wallCollider.active = true;
      if (this.decorCollider) this.decorCollider.active = true;
    }
  }

  setBuildTool(tool: BuildTool) {
    this.buildController?.setTool(tool);
  }

  setSelectedFloor(assetId: string) {
    this.buildController?.setSelectedFloor(assetId);
  }

  setSelectedWallRegion(region: WallRegion) {
    this.buildController?.setSelectedWallRegion(region);
  }

  setSelectedDecor(assetId: string | null) {
    this.buildController?.setSelectedDecor(assetId);
  }

  // --- Rooms ---

  setRooms(zones: RoomZone[]) {
    this.roomZones?.setRooms(zones);
    this.tryRestore();
  }

  setRestorePosition(x: number, y: number) {
    this.pendingRestorePosition = { x, y };
    this.tryRestore();
  }

  private tryRestore() {
    if (!this.pendingRestorePosition || !this.localPlayer || !this.roomZones) return;
    const target = this.roomZones.computeRestoreTarget(
      this.pendingRestorePosition.x,
      this.pendingRestorePosition.y,
    );
    if (!target) return;
    this.pendingRestorePosition = null;
    this.localPlayer.teleport(target.x, target.y);
  }

  // --- World objects (plugins) ---

  spawnWorldObject(spec: WorldObjectSpec) {
    this.worldObjects?.spawn(spec);
  }

  removeWorldObject(id: string) {
    this.worldObjects?.remove(id);
  }

  // --- Loop ---

  override update() {
    // don't move while the user is typing in a chat input
    if (this.localPlayer.isTyping()) {
      this.localPlayer.halt();
      return;
    }

    this.localPlayer.update();

    // press E to open the nearest player's profile (not in build mode)
    if (this.localPlayer.interactPressed() && !this.buildOverlay.isActive()) {
      const target = this.remotePlayers.nearest(
        this.localBody.x,
        this.localBody.y,
        this.localPlayer.radius,
      );
      if (target) this.events.emit('player:interact', target);
    }

    this.remotePlayers.update();
  }

  // runs after physics moved everything — read final positions here, not in update()
  private onPostUpdate() {
    this.localPlayer.snapAndSync();
    this.localPlayer.maybeEmit(this.time.now);
    this.roomZones.updateProximity(this.localBody.x, this.localBody.y);
    this.overlayEmitter.emit();
  }

  // world position -> pixel position on screen
  static projectToScreen(
    cam: Phaser.Cameras.Scene2D.Camera,
    _rect: DOMRect,
    worldX: number,
    worldY: number,
  ): { x: number; y: number } {
    return {
      x: (worldX - cam.scrollX) * cam.zoom * DISPLAY_SCALE,
      y: (worldY - cam.scrollY) * cam.zoom * DISPLAY_SCALE,
    };
  }
}
