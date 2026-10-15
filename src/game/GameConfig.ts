import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TownScene } from './scenes/TownScene';
import { GardenScene } from './scenes/GardenScene';
import { WorkshopScene } from './scenes/WorkshopScene';
import { BuildScene } from './scenes/BuildScene';

export function createGameConfig(parent: HTMLElement, width: number, height: number, zoom: number): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: '#FFF7E8',
    banner: false,
    disableContextMenu: true,
    scale: { mode: Phaser.Scale.NONE, zoom, autoRound: true },
    render: { antialias: true, roundPixels: false, powerPreference: 'default', preserveDrawingBuffer: false },
    input: { activePointers: 4, windowEvents: true, touch: { capture: true } },
    fps: { target: 60, smoothStep: true },
    audio: { noAudio: true },
    scene: [BootScene, TownScene, GardenScene, WorkshopScene, BuildScene],
  };
}
