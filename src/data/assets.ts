import { ASSET_MANIFEST, type AssetKey } from './asset-manifest';
import { defsForWorld } from './objects';
import { worldInfo } from './worlds';
import type { WorldId } from '../types/game';

export const assetUrl = (key: AssetKey): string => `${import.meta.env.BASE_URL}${ASSET_MANIFEST[key].path}`;

export function assetSize(key: AssetKey): { w: number; h: number } {
  const a = ASSET_MANIFEST[key];
  return { w: a.w, h: a.h };
}

export function assetAnchor(key: AssetKey, name: string): readonly [number, number] | undefined {
  const a = ASSET_MANIFEST[key] as { anchors?: Record<string, readonly [number, number]> };
  return a.anchors?.[name];
}

/** Effects and textures every world may use. */
const COMMON: AssetKey[] = [
  'fx_sparkle', 'fx_star', 'fx_heart', 'fx_drop', 'fx_leaf', 'fx_note', 'fx_zzz', 'fx_dot', 'fx_puff', 'fx_ring', 'fx_letter', 'fx_glow', 'fx_seed',
];

const EXTRA: Record<WorldId, AssetKey[]> = {
  town: ['moon', 'sun_face_happy', 'cloud_rain', 'bird_down', 'mailbox_open', 'cat_sleep', 'treat_croissant', 'treat_cupcake', 'treat_donut', 'treat_cookie', 'flower_red', 'flower_yellow', 'flower_blue'],
  garden: ['sun_face_happy', 'cloud_rain', 'bird_down', 'rainbow', 'hedgehog_ball', 'apple', 'plant_seed', 'plant_sprout', 'plant_bud_tulip', 'plant_bud_sun', 'plant_bud_daisy', 'plant_bloom_tulip', 'plant_bloom_sun', 'plant_bloom_daisy', 'soil'],
  workshop: [],
  build: ['ball_red', 'pinwheel_stick', 'seesaw_base'],
};

/** All textures a world needs: backgrounds, objects, parts, effects. */
export function worldAssetKeys(world: WorldId): AssetKey[] {
  const keys = new Set<AssetKey>(COMMON);
  keys.add(worldInfo(world).background);
  for (const d of defsForWorld(world)) {
    keys.add(d.key);
    for (const p of d.parts ?? []) keys.add(p.key);
  }
  for (const k of EXTRA[world]) keys.add(k);
  return [...keys];
}

/** Rasterisation scale for SVGs: crisp on high-DPI screens without wasting memory. */
export function svgScaleFor(key: AssetKey, dpr: number): number {
  const big = ASSET_MANIFEST[key].dir === 'backgrounds';
  if (big) return dpr >= 1.5 ? 1.25 : 1;
  return dpr >= 1.5 ? 2 : 1.4;
}
