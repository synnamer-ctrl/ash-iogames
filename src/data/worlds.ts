import type { AssetKey } from './asset-manifest';
import type { WorldId } from '../types/game';

export interface WorldInfo {
  id: WorldId;
  name: string;
  card: AssetKey;
  background: AssetKey;
  /** Phaser scene key. */
  scene: string;
  /** Music: root MIDI note, pentatonic-ish scale offsets and tempo. */
  music: { root: number; scale: readonly number[]; bpm: number };
  accent: string;
}

export const WORLDS: readonly WorldInfo[] = [
  { id: 'town', name: 'Little Town', card: 'card_town', background: 'bg_town', scene: 'TownScene', music: { root: 60, scale: [0, 2, 4, 7, 9], bpm: 84 }, accent: '#F58F83' },
  { id: 'garden', name: 'Nature Garden', card: 'card_garden', background: 'bg_garden', scene: 'GardenScene', music: { root: 62, scale: [0, 2, 5, 7, 9], bpm: 72 }, accent: '#9BCF8A' },
  { id: 'workshop', name: 'Creative Workshop', card: 'card_workshop', background: 'bg_workshop', scene: 'WorkshopScene', music: { root: 65, scale: [0, 2, 4, 7, 11], bpm: 76 }, accent: '#C5B5F0' },
  { id: 'build', name: 'Build & Play', card: 'card_build', background: 'bg_build', scene: 'BuildScene', music: { root: 57, scale: [0, 3, 5, 7, 10], bpm: 92 }, accent: '#FFD66B' },
];

export const worldInfo = (id: WorldId): WorldInfo => {
  const w = WORLDS.find((x) => x.id === id);
  if (!w) throw new Error(`Unknown world ${id}`);
  return w;
};
