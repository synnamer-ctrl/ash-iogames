import type { DrawTool, StampShape } from '../types/game';
import type { ToolState } from '../game/GameBridge';
import type { AssetKey } from '../data/asset-manifest';
import { assetUrl } from '../data/assets';
import { BRUSH_SIZES, PAINT_COLORS } from '../data/palette';
import { STAMP_PATHS, STAMP_SHAPES } from '../data/stamps';
import { audio } from '../game/systems/AudioSystem';

const TOOLS: { id: DrawTool; icon: AssetKey; label: string }[] = [
  { id: 'brush', icon: 'icon_brush', label: 'Paintbrush' },
  { id: 'crayon', icon: 'icon_crayon', label: 'Crayon' },
  { id: 'eraser', icon: 'icon_eraser', label: 'Eraser' },
  { id: 'stamp', icon: 'icon_stamp', label: 'Stamps' },
  { id: 'bucket', icon: 'icon_bucket', label: 'Paint bucket' },
];

interface Props {
  tool: ToolState;
  onChange: (t: Partial<ToolState>) => void;
  onExport: () => void;
}

/** The art tray: tools, paint pots, brush sizes, stamp shapes and picture export. */
export function WorkshopTray({ tool, onChange, onExport }: Props) {
  const set = (t: Partial<ToolState>) => {
    audio.unlock();
    audio.play('click');
    onChange(t);
  };
  return (
    <div className="tray paper" role="toolbar" aria-label="Art tools">
      <div className="tray__group">
        {TOOLS.map((t) => (
          <button key={t.id} type="button" className={`tray-btn ${tool.tool === t.id ? 'is-on' : ''}`} aria-pressed={tool.tool === t.id} aria-label={t.label} title={t.label} onClick={() => set({ tool: t.id })}>
            <img src={assetUrl(t.icon)} alt="" draggable={false} />
          </button>
        ))}
      </div>
      <div className="tray__group tray__colors" role="radiogroup" aria-label="Colours">
        {PAINT_COLORS.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={tool.color === c} aria-label={`Colour ${c}`} className={`pot ${tool.color === c ? 'is-on' : ''}`} onClick={() => set({ color: c })}>
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <path d="M8 16 Q8 36 20 36 Q32 36 32 16 Z" fill="#fffdf7" stroke="#38454A" strokeWidth="2.4" strokeLinejoin="round" />
              <ellipse cx="20" cy="16" rx="13" ry="6" fill={c} stroke="#38454A" strokeWidth="2.4" />
              <ellipse cx="16" cy="14.5" rx="3.5" ry="1.4" fill="#fff" opacity=".5" />
            </svg>
          </button>
        ))}
      </div>
      {tool.tool === 'stamp' ? (
        <div className="tray__group" role="radiogroup" aria-label="Stamp shape">
          {STAMP_SHAPES.map((s: StampShape) => (
            <button key={s} type="button" role="radio" aria-checked={tool.stamp === s} aria-label={`${s} stamp`} className={`tray-btn tray-btn--sm ${tool.stamp === s ? 'is-on' : ''}`} onClick={() => set({ stamp: s })}>
              <svg viewBox="0 0 100 100" aria-hidden="true"><path d={STAMP_PATHS[s]} fill={tool.color} stroke="#38454A" strokeWidth="5" strokeLinejoin="round" /></svg>
            </button>
          ))}
        </div>
      ) : tool.tool !== 'bucket' ? (
        <div className="tray__group" role="radiogroup" aria-label="Brush size">
          {BRUSH_SIZES.map((sz) => (
            <button key={sz} type="button" role="radio" aria-checked={tool.size === sz} aria-label={`Size ${sz}`} className={`tray-btn tray-btn--sm ${tool.size === sz ? 'is-on' : ''}`} onClick={() => set({ size: sz })}>
              <span className="size-dot" style={{ width: 6 + sz * 0.45, height: 6 + sz * 0.45, background: tool.tool === 'eraser' ? '#fffdf7' : tool.color }} />
            </button>
          ))}
        </div>
      ) : null}
      <div className="tray__group">
        <button type="button" className="tray-btn" aria-label="Save picture" title="Save picture (PNG)" onClick={() => { audio.play('click'); onExport(); }}>
          <img src={assetUrl('icon_export')} alt="" draggable={false} />
        </button>
      </div>
    </div>
  );
}
