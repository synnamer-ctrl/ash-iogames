import type { WorldId } from '../types/game';
import { WORLDS } from '../data/worlds';
import { assetUrl } from '../data/assets';
import { audio } from '../game/systems/AudioSystem';
import { IconButton } from './IconButton';

interface Props {
  onPick: (w: WorldId) => void;
  onSettings: () => void;
  foundCount: number;
  total: number;
}

/** Home screen: four illustrated, gently floating world cards on paper. */
export function WorldSelector({ onPick, onSettings, foundCount, total }: Props) {
  return (
    <main className="home">
      <div className="home__decor" aria-hidden="true">
        <img src={assetUrl('cloud_a')} className="home__cloud home__cloud--a" alt="" />
        <img src={assetUrl('cloud_b')} className="home__cloud home__cloud--b" alt="" />
        <img src={assetUrl('sun_face')} className="home__sun" alt="" />
        <img src={assetUrl('butterfly_pink')} className="home__butterfly" alt="" />
      </div>
      <header className="home__header">
        <h1 className="home__title">
          <span className="t1">Little</span> <span className="t2">Wonder</span> <span className="t3">World</span>
        </h1>
        <div className="home__corner">
          <span className="home__stars" aria-label={`${foundCount} of ${total} surprises found`} title={`${foundCount} of ${total} surprises found`}>
            <img src={assetUrl('icon_star')} alt="" /> {foundCount}
          </span>
          <IconButton icon="icon_settings" label="Settings" onClick={onSettings} />
        </div>
      </header>
      <nav className="home__grid" aria-label="Choose a world">
        {WORLDS.map((w, i) => (
          <button
            key={w.id}
            type="button"
            className="world-card"
            style={{ ['--accent' as string]: w.accent, ['--i' as string]: i }}
            onClick={() => {
              audio.unlock();
              audio.play('pop');
              onPick(w.id);
            }}
            aria-label={`Play in ${w.name}`}
            data-world={w.id}
          >
            <img src={assetUrl(w.card)} alt="" draggable={false} />
            <span className="world-card__name">{w.name}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
