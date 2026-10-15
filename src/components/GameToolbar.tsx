import { IconButton } from './IconButton';

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  soundOn: boolean;
  found: number;
  total: number;
  starPulse: number;
  onHome: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onLibrary: () => void;
  onSave: () => void;
  onClear: () => void;
  onToggleSound: () => void;
  onSettings: () => void;
  onDiscoveries: () => void;
}

/** Minimal corner controls so the illustration fills the screen. */
export function GameToolbar(p: Props) {
  return (
    <>
      <div className="hud hud--tl">
        <IconButton icon="icon_home" label="Back to worlds" onClick={p.onHome} tone="sun" />
        <IconButton icon="icon_undo" label="Undo" onClick={p.onUndo} disabled={!p.canUndo} size="sm" />
        <IconButton icon="icon_redo" label="Redo" onClick={p.onRedo} disabled={!p.canRedo} size="sm" />
      </div>
      <div className="hud hud--tr">
        <IconButton
          key={p.starPulse}
          icon="icon_star"
          label={`Surprises found: ${p.found} of ${p.total}`}
          onClick={p.onDiscoveries}
          size="sm"
          badge={p.found}
          className={p.starPulse ? 'pulse' : ''}
        />
        <IconButton icon={p.soundOn ? 'icon_sound' : 'icon_sound_off'} label={p.soundOn ? 'Sound off' : 'Sound on'} onClick={p.onToggleSound} size="sm" pressed={!p.soundOn} />
        <IconButton icon="icon_settings" label="Settings" onClick={p.onSettings} size="sm" />
      </div>
      <div className="hud hud--bl">
        <IconButton icon="icon_clear" label="Start over" onClick={p.onClear} size="sm" />
      </div>
      <div className="hud hud--br">
        <IconButton icon="icon_save" label="My creations" onClick={p.onSave} tone="lavender" />
        <IconButton icon="icon_toybox" label="Toy box" onClick={p.onLibrary} tone="coral" size="lg" />
      </div>
    </>
  );
}
