import Phaser from 'phaser';

// Movement keys (ZQSD + arrows) and the E interaction key.
export class WorldKeyboard {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private readonly interactKey: Phaser.Input.Keyboard.Key;
  private interactWasDown = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    kb.disableGlobalCapture();
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z, false),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q, false),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
    };
    this.interactKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E, false);
    kb.clearCaptures();
  }

  vector(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) x -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) x += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) y -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) y += 1;
    return { x, y };
  }

  // true once each time E is pressed (not every frame it's held)
  interactPressedEdge(): boolean {
    const now = this.interactKey.isDown;
    const edge = now && !this.interactWasDown;
    this.interactWasDown = now;
    return edge;
  }

  isTypingInField(): boolean {
    const tag = (document.activeElement?.tagName ?? '').toLowerCase();
    return tag === 'input' || tag === 'textarea';
  }
}
