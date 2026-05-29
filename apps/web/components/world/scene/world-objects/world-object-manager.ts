import Phaser from 'phaser';
import type { ObjectLabelUpdate, WorldObjectSpec } from '../types';

type TransformObject = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;

// Clickable objects added by plugins (sprite if we have the texture, otherwise
// a little bouncing box).
export class WorldObjectManager {
  private readonly objects = new Map<string, Phaser.GameObjects.GameObject>();
  private readonly specs = new Map<string, WorldObjectSpec>();

  constructor(private readonly scene: Phaser.Scene) {}

  spawn(spec: WorldObjectSpec) {
    this.remove(spec.id);

    let obj: Phaser.GameObjects.GameObject;
    if (spec.texture && this.scene.textures.exists(spec.texture)) {
      obj = this.scene.add
        .sprite(spec.x, spec.y, spec.texture, spec.frame)
        .setScale(2)
        .setOrigin(0.5, 1)
        .setDepth(spec.y);
    } else {
      const rect = this.scene.add.rectangle(spec.x, spec.y, 32, 32, 0x6c63ff, 0.9);
      rect.setOrigin(0.5, 1).setDepth(spec.y);
      this.scene.tweens.add({
        targets: rect,
        y: spec.y - 4,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      obj = rect;
    }

    const go = obj as TransformObject & Phaser.GameObjects.Components.Size;
    go.setInteractive({ useHandCursor: true });
    go.on('pointerdown', () => this.scene.events.emit('world-object-clicked', spec.id));

    this.objects.set(spec.id, obj);
    this.specs.set(spec.id, spec);
  }

  remove(id: string) {
    this.objects.get(id)?.destroy();
    this.objects.delete(id);
    this.specs.delete(id);
  }

  collectLabels(buffer: ObjectLabelUpdate[]) {
    for (const [id, spec] of this.specs) {
      if (!spec.label) continue;
      const obj = this.objects.get(id) as TransformObject | undefined;
      if (!obj) continue;
      buffer.push({ id, label: spec.label, worldX: obj.x, worldY: obj.y - 20 });
    }
  }
}
