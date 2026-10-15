import { useEffect, useRef, useState } from 'react';
import type { WorldId } from '../types/game';
import { defsForWorld } from '../data/objects';
import { ObjectThumb } from './ObjectThumb';
import { IconButton } from './IconButton';
import { audio } from '../game/systems/AudioSystem';

interface Props {
  world: WorldId;
  onPick: (type: string) => boolean;
  onClose: () => void;
}

/** The toy box: a drawer of illustrated things to add to the world. */
export function ObjectLibrary({ world, onPick, onClose }: Props) {
  const items = defsForWorld(world).filter((d) => d.library);
  const [shake, setShake] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button.lib-item')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="drawer-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="drawer paper" role="dialog" aria-modal="true" aria-label="Toy box">
        <div className="drawer__head">
          <IconButton icon="icon_cross" label="Close toy box" size="sm" onClick={onClose} />
        </div>
        <div className="drawer__grid">
          {items.map((d) => (
            <button
              key={d.type}
              type="button"
              className={`lib-item ${shake === d.type ? 'shake' : ''}`}
              aria-label={`Add ${d.label}`}
              title={d.label}
              onClick={() => {
                audio.unlock();
                if (onPick(d.type)) onClose();
                else {
                  setShake(d.type);
                  window.setTimeout(() => setShake(null), 500);
                }
              }}
            >
              <ObjectThumb def={d} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
