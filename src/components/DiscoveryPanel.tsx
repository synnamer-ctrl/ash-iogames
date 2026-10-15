import type { WorldId } from '../types/game';
import { discoveriesFor } from '../data/discoveries';
import { assetUrl } from '../data/assets';
import { Modal } from './Modal';

/** A jar of surprises: found ones in colour, the rest as mystery silhouettes. */
export function DiscoveryPanel({ world, found, onClose }: { world: WorldId; found: ReadonlySet<string>; onClose: () => void }) {
  const list = discoveriesFor(world);
  const n = list.filter((d) => found.has(d.id)).length;
  return (
    <Modal title={`Surprises ${n} / ${list.length}`} onClose={onClose}>
      <ul className="discoveries">
        {list.map((d) => {
          const has = found.has(d.id);
          return (
            <li key={d.id} className={`discovery ${has ? 'is-found' : ''}`} title={has ? d.label : 'Not found yet'} aria-label={has ? d.label : 'A surprise not found yet'}>
              <img src={assetUrl(d.icon)} alt="" draggable={false} />
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
