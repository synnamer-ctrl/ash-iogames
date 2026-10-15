import type { AssetKey } from '../data/asset-manifest';
import { assetUrl } from '../data/assets';
import { audio } from '../game/systems/AudioSystem';
import { Modal } from './Modal';

export interface ConfirmRequest {
  icon: AssetKey;
  title: string;
  message?: string;
  yes?: string;
  no?: string;
  onYes: () => void;
}

/** Child-friendly confirmation: one big picture, a big tick and a big cross. */
export function ConfirmDialog({ req, onClose }: { req: ConfirmRequest; onClose: () => void }) {
  return (
    <Modal title={req.title} onClose={onClose} className="confirm">
      <img className="confirm__art" src={assetUrl(req.icon)} alt="" />
      {req.message && <p className="confirm__msg">{req.message}</p>}
      <div className="confirm__actions">
        <button type="button" className="big-btn tone-paper" onClick={() => { audio.play('click'); onClose(); }} data-autofocus>
          <img src={assetUrl('icon_cross')} alt="" />
          <span>{req.no ?? 'Keep it'}</span>
        </button>
        <button type="button" className="big-btn tone-leaf" onClick={() => { audio.play('click'); req.onYes(); onClose(); }}>
          <img src={assetUrl('icon_check')} alt="" />
          <span>{req.yes ?? 'Yes'}</span>
        </button>
      </div>
    </Modal>
  );
}
