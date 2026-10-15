import type { Settings } from '../app/settings';
import type { AssetKey } from '../data/asset-manifest';
import { assetUrl } from '../data/assets';
import { Modal } from './Modal';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

function Row({ icon, label, on, onToggle, volume, onVolume }: { icon: AssetKey; label: string; on: boolean; onToggle: () => void; volume?: number; onVolume?: (v: number) => void }) {
  return (
    <div className="setting">
      <img className="setting__icon" src={assetUrl(icon)} alt="" />
      <span className="setting__label">{label}</span>
      {volume !== undefined && onVolume && (
        <input
          className="setting__slider"
          type="range" min={0} max={1} step={0.05} value={volume} disabled={!on}
          aria-label={`${label} volume`}
          onChange={(e) => onVolume(Number(e.target.value))}
        />
      )}
      <button type="button" role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'is-on' : ''}`} onClick={onToggle}>
        <span className="toggle__knob" />
      </button>
    </div>
  );
}

export function SettingsPanel({ settings: s, onChange, onClose }: Props) {
  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="settings">
        <Row icon="icon_sound" label="Sound effects" on={s.sfxOn} onToggle={() => onChange({ ...s, sfxOn: !s.sfxOn })} volume={s.sfxVolume} onVolume={(v) => onChange({ ...s, sfxVolume: v })} />
        <Row icon="icon_music" label="Music" on={s.musicOn} onToggle={() => onChange({ ...s, musicOn: !s.musicOn })} volume={s.musicVolume} onVolume={(v) => onChange({ ...s, musicVolume: v })} />
        <Row icon="icon_motion" label="Calm motion" on={s.reducedMotion} onToggle={() => onChange({ ...s, reducedMotion: !s.reducedMotion })} />
        <p className="settings__note">No ads, no accounts, no tracking. Everything you make stays on this device.</p>
      </div>
    </Modal>
  );
}
