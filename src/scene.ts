import Phaser from 'phaser';
import type { CharacterId } from './types.ts';

export class Companion {
  private game: Phaser.Game;
  private scene: FriendScene;
  constructor(parent: HTMLElement, character: CharacterId) {
    this.scene = new FriendScene(character, () => {
      if (parent.isConnected) parent.dataset.ready = 'true';
    });
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: 360,
      height: 360,
      transparent: true,
      banner: false,
      audio: { noAudio: true },
      fps: { target: 30, forceSetTimeOut: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true },
      scene: this.scene,
    });
  }
  celebrate(): void { this.scene.celebrate(); }
  destroy(): void { this.game.destroy(true); }
}

class FriendScene extends Phaser.Scene {
  private friend?: Phaser.GameObjects.Image;
  private character: CharacterId;
  private onReady: () => void;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(character: CharacterId, onReady: () => void) { super('friend'); this.character = character; this.onReady = onReady; }
  preload(): void { this.load.image('friends', '/assets/characters.png'); }
  create(): void {
    // Keep the generated illustration visible until the sprite has actually rendered.
    // Engine boot alone does not mean its image or first frame is ready on mobile.
    if (!this.textures.exists('friends')) return;
    const texture = this.textures.get('friends');
    const source = texture.getSourceImage() as HTMLImageElement;
    const width = Math.floor(source.width / 2);
    const height = Math.floor(source.height / 2);
    for (let i = 0; i < 4; i++) texture.add(String(i), 0, (i % 2) * width, Math.floor(i / 2) * height, width, height);
    this.friend = this.add.image(180, 190, 'friends', this.character === 'milo' ? '0' : '1').setDisplaySize(310, 310);
    this.game.events.once(Phaser.Core.Events.POST_RENDER, this.onReady);
    if (!this.reduced) this.tweens.add({ targets: this.friend, y: 183, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  celebrate(): void {
    if (!this.friend) return;
    this.fadePose(this.character === 'milo' ? '2' : '3');
    if (!this.reduced) this.tweens.add({ targets: this.friend, angle: { from: -3, to: 3 }, duration: 800, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
    this.time.delayedCall(4200, () => this.fadePose(this.character === 'milo' ? '0' : '1'));
  }
  private fadePose(frame: string): void {
    if (!this.friend) return;
    this.tweens.add({ targets: this.friend, alpha: 0, duration: 600, onComplete: () => {
      this.friend?.setFrame(frame);
      this.tweens.add({ targets: this.friend, alpha: 1, duration: 600 });
    } });
  }
}
