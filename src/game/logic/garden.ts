import type { AssetKey } from '../../data/asset-manifest';

/** Plant growth is a simple, deterministic sequence: empty → seed → sprout → bud → bloom. */
export const STAGES = ['empty', 'seed', 'sprout', 'bud', 'bloom'] as const;
export const MAX_STAGE = STAGES.length - 1;

export function plantKey(stage: number, species: string): AssetKey | null {
  const sp = species === 'sun' || species === 'daisy' ? species : 'tulip';
  switch (stage) {
    case 1: return 'plant_seed';
    case 2: return 'plant_sprout';
    case 3: return `plant_bud_${sp}` as AssetKey;
    case 4: return `plant_bloom_${sp}` as AssetKey;
    default: return null;
  }
}

/** Next growth stage when watered or rained on; seeds must be planted first and blooms stay blooms. */
export function nextStage(stage: number): number {
  if (stage < 1) return stage;
  return Math.min(MAX_STAGE, stage + 1);
}
