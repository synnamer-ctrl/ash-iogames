import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WorldId } from '../types/game';
import type { CreationSummary } from '../types/persistence';
import { StorageError } from '../types/persistence';
import { saveSystem } from '../game/systems/SaveSystem';
import type { GameController } from '../game/GameBridge';
import { KNOWN_TYPES } from '../data/objects';
import { worldInfo } from '../data/worlds';
import { validateSnapshot } from '../utils/validation';
import { assetUrl } from '../data/assets';
import { Modal } from './Modal';
import type { ConfirmRequest } from './ConfirmDialog';

interface Props {
  world: WorldId;
  controller: GameController;
  onClose: () => void;
  confirm: (r: ConfirmRequest) => void;
  toast: (msg: string, kind?: 'ok' | 'error') => void;
}

export function storageMessage(e: unknown): string {
  if (e instanceof StorageError) {
    if (e.kind === 'quota') return 'Storage is full. Delete an old creation to make room.';
    if (e.kind === 'unavailable') return 'Saving is not available in this browser mode.';
    if (e.kind === 'not-found') return 'That creation could not be found.';
  }
  return 'Something went wrong while saving.';
}

function Thumb({ blob }: { blob: Blob | null }) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url ? <img className="creation__thumb" src={url} alt="" /> : <span className="creation__thumb creation__thumb--empty" />;
}

/** "My creations": save the current scene, open, rename or delete saved ones. */
export function SaveDialog({ world, controller, onClose, confirm, toast }: Props) {
  const [items, setItems] = useState<CreationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const refresh = useCallback(async () => {
    try {
      setItems(await saveSystem.listCreations(world));
      setError(null);
    } catch (e) {
      setItems([]);
      setError(storageMessage(e));
    }
  }, [world]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveNew = async () => {
    const snap = controller.snapshot();
    if (!snap) return;
    setBusy(true);
    try {
      const thumb = await controller.thumbnail();
      const n = (items?.length ?? 0) + 1;
      await saveSystem.saveCreation({ worldId: world, name: `${worldInfo(world).name} ${n}`, snapshot: snap, thumbnail: thumb });
      toast('Saved!', 'ok');
      await refresh();
    } catch (e) {
      toast(storageMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const overwrite = (c: CreationSummary) =>
    confirm({
      icon: 'icon_save', title: `Save over “${c.name}”?`, yes: 'Save over', no: 'Cancel',
      onYes: async () => {
        const snap = controller.snapshot();
        if (!snap) return;
        try {
          const thumb = await controller.thumbnail();
          await saveSystem.saveCreation({ id: c.id, worldId: world, name: c.name, snapshot: snap, thumbnail: thumb });
          toast('Saved!', 'ok');
          await refresh();
        } catch (e) {
          toast(storageMessage(e), 'error');
        }
      },
    });

  const open = async (c: CreationSummary) => {
    try {
      const rec = await saveSystem.getCreation(c.id);
      const v = validateSnapshot(rec.snapshot, KNOWN_TYPES, world);
      if (!v.ok) throw new Error(v.error);
      controller.loadSnapshot(v.snapshot);
      onClose();
    } catch (e) {
      toast(e instanceof StorageError ? storageMessage(e) : 'This creation could not be opened.', 'error');
    }
  };

  const remove = (c: CreationSummary) =>
    confirm({
      icon: 'icon_trash', title: `Delete “${c.name}”?`, message: 'It will be gone for good.', yes: 'Delete', no: 'Keep it',
      onYes: async () => {
        try {
          await saveSystem.deleteCreation(c.id);
          await refresh();
        } catch (e) {
          toast(storageMessage(e), 'error');
        }
      },
    });

  const commitRename = async (c: CreationSummary) => {
    setRenaming(null);
    if (!draft.trim() || draft.trim() === c.name) return;
    try {
      await saveSystem.renameCreation(c.id, draft);
      await refresh();
    } catch (e) {
      toast(storageMessage(e), 'error');
    }
  };

  return (
    <Modal title="My creations" onClose={onClose} wide>
      <div className="creations">
        <button type="button" className="creation creation--new" onClick={saveNew} disabled={busy || !!error} data-autofocus aria-label="Save what I made">
          <img src={assetUrl('icon_plus')} alt="" />
          <span>{busy ? 'Saving…' : 'Save'}</span>
        </button>
        {items?.map((c) => (
          <div key={c.id} className="creation">
            <button type="button" className="creation__open" onClick={() => void open(c)} aria-label={`Open ${c.name}`}>
              <Thumb blob={c.thumbnail} />
            </button>
            {renaming === c.id ? (
              <input
                className="creation__rename"
                value={draft}
                maxLength={40}
                autoFocus
                aria-label="New name"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => void commitRename(c)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void commitRename(c);
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setRenaming(null);
                  }
                }}
              />
            ) : (
              <span className="creation__name">{c.name}</span>
            )}
            <div className="creation__actions">
              <button type="button" className="mini-btn" aria-label={`Rename ${c.name}`} title="Rename" onClick={() => { setRenaming(c.id); setDraft(c.name); }}>
                <img src={assetUrl('icon_pencil')} alt="" />
              </button>
              <button type="button" className="mini-btn" aria-label={`Save over ${c.name}`} title="Save over" onClick={() => overwrite(c)}>
                <img src={assetUrl('icon_save')} alt="" />
              </button>
              <button type="button" className="mini-btn" aria-label={`Delete ${c.name}`} title="Delete" onClick={() => remove(c)}>
                <img src={assetUrl('icon_trash')} alt="" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="creations__error" role="alert">{error}</p>}
      {items && items.length === 0 && !error && <p className="creations__empty">Nothing saved yet — tap the big plus!</p>}
    </Modal>
  );
}
