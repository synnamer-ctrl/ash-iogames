import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorldId } from '../types/game';
import { GameHost } from '../game/Game';
import { bridge, type ToolState } from '../game/GameBridge';
import { audio } from '../game/systems/AudioSystem';
import { saveSystem } from '../game/systems/SaveSystem';
import { discoveryStore } from '../game/systems/DiscoveryStore';
import { DISCOVERIES, discoveriesFor } from '../data/discoveries';
import { KNOWN_TYPES } from '../data/objects';
import { worldInfo } from '../data/worlds';
import { assetUrl } from '../data/assets';
import { validateSnapshot } from '../utils/validation';
import { loadSettings, storeSettings, type Settings } from './settings';
import { WorldSelector } from '../components/WorldSelector';
import { GameToolbar } from '../components/GameToolbar';
import { ObjectLibrary } from '../components/ObjectLibrary';
import { SaveDialog } from '../components/SaveDialog';
import { SettingsPanel } from '../components/SettingsPanel';
import { DiscoveryPanel } from '../components/DiscoveryPanel';
import { ConfirmDialog, type ConfirmRequest } from '../components/ConfirmDialog';
import { WorkshopTray } from '../components/WorkshopTray';

type Panel = 'library' | 'save' | 'settings' | 'discoveries' | null;
interface Toast {
  id: number;
  msg: string;
  kind: 'ok' | 'error' | 'star';
  icon?: string;
}

declare global {
  interface Window {
    __LWW__?: { host: GameHost; bridge: typeof bridge; saveSystem: typeof saveSystem; discoveryStore: typeof discoveryStore };
  }
}

export function App() {
  const hostEl = useRef<HTMLDivElement>(null);
  const host = useRef<GameHost | null>(null);
  const [world, setWorld] = useState<WorldId | null>(null);
  const [loading, setLoading] = useState<{ world: WorldId; progress: number } | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [panel, setPanel] = useState<Panel>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [found, setFound] = useState<ReadonlySet<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [starPulse, setStarPulse] = useState(0);
  const [tool, setToolState] = useState<ToolState>({ tool: 'brush', color: '#E2706A', size: 18, stamp: 'star' });
  const [storageWarned, setStorageWarned] = useState(false);

  const toast = useCallback((msg: string, kind: Toast['kind'] = 'ok', icon?: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg, kind, icon }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 4200 : 2200);
  }, []);

  // ---- game host lifetime
  useEffect(() => {
    if (!hostEl.current || host.current) return;
    const h = new GameHost(hostEl.current);
    host.current = h;
    h.setReducedMotion(settings.reducedMotion);
    h.game.loop.sleep();
    if (location.search.includes('e2e')) window.__LWW__ = { host: h, bridge, saveSystem, discoveryStore };
    return () => {
      h.destroy();
      host.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- bridge events
  useEffect(() => {
    const offs = [
      bridge.on('history', setHistory),
      bridge.on('loadProgress', (p) => setLoading((l) => (l ? { ...l, progress: p } : l))),
      bridge.on('discovery', ({ id }) => {
        const d = DISCOVERIES.find((x) => x.id === id);
        setStarPulse((n) => n + 1);
        if (d) toast(d.label, 'star', assetUrl(d.icon));
      }),
      bridge.on('autosave', (e) => {
        if (!e.ok && !storageWarned) {
          setStorageWarned(true);
          toast(e.kind === 'quota' ? 'Storage is full — your changes may not be kept.' : 'This browser can’t keep your changes automatically.', 'error');
        }
      }),
      discoveryStore.on('changed', (s) => setFound(new Set(s))),
    ];
    void discoveryStore.load();
    return () => offs.forEach((off) => off());
  }, [toast, storageWarned]);

  // ---- settings → audio / motion
  useEffect(() => {
    storeSettings(settings);
    audio.setSettings(settings);
    host.current?.setReducedMotion(settings.reducedMotion);
    document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion);
  }, [settings]);

  // ---- unlock audio on first gesture; pause when hidden
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    const vis = () => audio.setHidden(document.hidden);
    document.addEventListener('visibilitychange', vis);
    const beforeUnload = () => void host.current?.flushAutosave();
    window.addEventListener('pagehide', beforeUnload);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('pagehide', beforeUnload);
    };
  }, []);

  // ---- keyboard shortcuts inside a world
  useEffect(() => {
    if (!world) return;
    const onKey = (e: KeyboardEvent) => {
      if (panel || confirm) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) host.current?.redo();
        else host.current?.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        host.current?.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [world, panel, confirm]);

  const enter = useCallback(async (w: WorldId) => {
    const h = host.current;
    if (!h) return;
    setLoading({ world: w, progress: 0 });
    let snapshot = undefined;
    try {
      const rec = await saveSystem.loadAutosave(w);
      if (rec) {
        const v = validateSnapshot(rec.snapshot, KNOWN_TYPES, w);
        if (v.ok) snapshot = v.snapshot;
      }
    } catch {
      /* no autosave available: start fresh */
    }
    setWorld(w);
    setPanel(null);
    if (w === 'workshop') h.setTool(tool);
    await h.enterWorld(w, snapshot);
    setLoading(null);
  }, [tool]);

  const goHome = useCallback(() => {
    const h = host.current;
    if (!h) return;
    const leave = () => {
      h.leaveWorld();
      setWorld(null);
      setPanel(null);
    };
    if (h.hasUnsavedChanges()) {
      setConfirm({ icon: 'icon_home', title: 'Leave this world?', message: 'Your latest changes could not be kept on this device. Save them in “My creations” first, or leave anyway.', yes: 'Leave', no: 'Stay', onYes: leave });
    } else {
      void h.flushAutosave().then((ok) => {
        if (ok) leave();
        else setConfirm({ icon: 'icon_home', title: 'Leave this world?', message: 'Your latest changes could not be kept on this device.', yes: 'Leave', no: 'Stay', onYes: leave });
      });
    }
  }, []);

  const changeTool = useCallback((t: Partial<ToolState>) => {
    setToolState((prev) => {
      const next = { ...prev, ...t };
      host.current?.setTool(next);
      return next;
    });
  }, []);

  const exportPicture = useCallback(async () => {
    const blob = await host.current?.exportPicture();
    if (!blob) {
      toast('The picture could not be made.', 'error');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `little-wonder-world-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Picture saved!', 'ok');
  }, [toast]);

  const total = world ? discoveriesFor(world).length : DISCOVERIES.length;
  const foundHere = world ? discoveriesFor(world).filter((d) => found.has(d.id)).length : found.size;

  return (
    <div className={`app ${world ? 'in-world' : 'at-home'} ${world ? `world-${world}` : ''}`}>
      <div ref={hostEl} className="game-host" aria-hidden={!world} data-testid="game-host" />

      {!world && (
        <WorldSelector onPick={(w) => void enter(w)} onSettings={() => setPanel('settings')} foundCount={found.size} total={DISCOVERIES.length} />
      )}

      {world && !loading && (
        <GameToolbar
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          soundOn={settings.sfxOn || settings.musicOn}
          found={foundHere}
          total={total}
          starPulse={starPulse}
          onHome={goHome}
          onUndo={() => host.current?.undo()}
          onRedo={() => host.current?.redo()}
          onLibrary={() => setPanel('library')}
          onSave={() => setPanel('save')}
          onClear={() =>
            setConfirm({
              icon: 'icon_clear',
              title: world === 'workshop' ? 'Clear the paper?' : 'Start this world over?',
              message: 'You can still undo it afterwards.',
              yes: 'Start over',
              no: 'Keep playing',
              onYes: () => host.current?.resetScene(),
            })
          }
          onToggleSound={() => {
            const anyOn = settings.sfxOn || settings.musicOn;
            setSettings({ ...settings, sfxOn: !anyOn, musicOn: !anyOn });
          }}
          onSettings={() => setPanel('settings')}
          onDiscoveries={() => setPanel('discoveries')}
        />
      )}

      {world === 'workshop' && !loading && <WorkshopTray tool={tool} onChange={changeTool} onExport={() => void exportPicture()} />}

      {loading && (
        <div className="curtain" role="status" aria-live="polite" aria-label={`Opening ${worldInfo(loading.world).name}`}>
          <img className="curtain__sun" src={assetUrl('sun_face')} alt="" />
          <div className="curtain__bar"><span style={{ width: `${Math.round(loading.progress * 100)}%` }} /></div>
        </div>
      )}

      {world && panel === 'library' && <ObjectLibrary world={world} onPick={(t) => host.current?.spawn(t) ?? false} onClose={() => setPanel(null)} />}
      {world && panel === 'save' && host.current && (
        <SaveDialog world={world} controller={host.current} onClose={() => setPanel(null)} confirm={setConfirm} toast={(m, k) => toast(m, k ?? 'ok')} />
      )}
      {world && panel === 'discoveries' && <DiscoveryPanel world={world} found={found} onClose={() => setPanel(null)} />}
      {panel === 'settings' && <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setPanel(null)} />}
      {confirm && <ConfirmDialog req={confirm} onClose={() => setConfirm(null)} />}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            {t.icon && <img src={t.icon} alt="" />}
            {t.kind === 'star' && !t.icon && <img src={assetUrl('icon_star')} alt="" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

