import type { ObjectDef } from '../types/game';
import { assetAnchor, assetSize, assetUrl } from '../data/assets';

/** Composes an object's main image and visible parts (wheels, arms…) for menus. */
export function ObjectThumb({ def }: { def: ObjectDef }) {
  const { w, h } = assetSize(def.key);
  const parts = (def.parts ?? []).filter((p) => p.visible !== false && p.name !== 'blink');
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const box = Math.max(w, h);
  return (
    <span className="thumb" style={{ aspectRatio: '1 / 1' }}>
      <span className="thumb__inner" style={{ width: pct(w, box), height: pct(h, box) }}>
        {parts.filter((p) => p.behind).map((p) => <Part key={p.name} def={def} part={p} w={w} h={h} />)}
        <img className="thumb__main" src={assetUrl(def.key)} alt="" draggable={false} />
        {parts.filter((p) => !p.behind).map((p) => <Part key={p.name} def={def} part={p} w={w} h={h} />)}
      </span>
    </span>
  );
}

function Part({ def, part, w, h }: { def: ObjectDef; part: NonNullable<ObjectDef['parts']>[number]; w: number; h: number }) {
  const at = typeof part.at === 'string' ? assetAnchor(def.key, part.at) : part.at;
  if (!at) return null;
  const ps = assetSize(part.key);
  const [ox, oy] = part.origin ?? [0.5, 0.5];
  return (
    <img
      className="thumb__part"
      src={assetUrl(part.key)}
      alt=""
      draggable={false}
      style={{ left: `${((at[0] - ps.w * ox) / w) * 100}%`, top: `${((at[1] - ps.h * oy) / h) * 100}%`, width: `${(ps.w / w) * 100}%`, height: `${(ps.h / h) * 100}%` }}
    />
  );
}
