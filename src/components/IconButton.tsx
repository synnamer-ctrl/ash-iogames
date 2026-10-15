import type { ButtonHTMLAttributes } from 'react';
import type { AssetKey } from '../data/asset-manifest';
import { assetUrl } from '../data/assets';
import { audio } from '../game/systems/AudioSystem';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: AssetKey;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'paper' | 'sun' | 'coral' | 'leaf' | 'sky' | 'lavender';
  badge?: string | number;
  pressed?: boolean;
}

/** Round, hand-drawn style button with an illustrated icon and an accessible label. */
export function IconButton({ icon, label, size = 'md', tone = 'paper', badge, pressed, className = '', onClick, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`icon-btn icon-btn--${size} tone-${tone} ${pressed ? 'is-pressed' : ''} ${className}`}
      onClick={(e) => {
        audio.unlock();
        audio.play('click');
        onClick?.(e);
      }}
      {...rest}
    >
      <img src={assetUrl(icon)} alt="" draggable={false} />
      {badge !== undefined && <span className="icon-btn__badge">{badge}</span>}
    </button>
  );
}
