import Phaser from 'phaser';

/** First scene: nothing to load up front (worlds load their own art), it just idles until a world is chosen. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.game.events.emit('booted');
  }
}
