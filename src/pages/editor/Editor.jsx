// The builder: brick palette · live canvas · tweak panel.
import { useEffect, useState } from 'react';
import { useEditor } from './useEditor.js';
import TopBar from './TopBar.jsx';
import Palette from './Palette.jsx';
import Canvas from './Canvas.jsx';
import Inspector from './Inspector.jsx';
import { ExportModal, HelpModal } from './Modals.jsx';
import { navigate } from '../../lib/nav.js';
import { sfx } from '../../lib/sfx.js';
import { toast } from '../../components/Toast.jsx';

export default function Editor({ id }) {
  const ed = useEditor(id);
  const { s, site } = ed;
  const [modal, setModal] = useState(null); // 'export' | 'help' | null
  const [showInsp, setShowInsp] = useState(false);

  useEffect(() => {
    if (!s.project) navigate('#/new');
  }, [s.project]);
  useEffect(() => {
    if (s.project) document.title = `${s.project.name || 'Untitled'} — Plonk`;
  }, [s.project?.name]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e) => {
      const typing = e.target.closest?.('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"]');
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') return void (e.preventDefault(), e.shiftKey ? ed.redo() : ed.undo());
      if (mod && k === 'y') return void (e.preventDefault(), ed.redo());
      if (mod && k === 's') return void (e.preventDefault(), ed.commitNow(), toast('Saved in this browser ✓'));
      if (e.key === 'Escape') {
        if (modal) return setModal(null);
        if (ed.s.preview) return ed.setPreview(false);
        if (typing) return void e.target.blur();
        if (ed.s.overview) return ed.setOverview(false);
        return ed.select(null);
      }
      if (typing) return;
      if (e.key === '?') return setModal((m) => (m === 'help' ? null : 'help'));
      if (k === 'p' && !mod) return ed.setPreview(!ed.s.preview);
      if (mod && k === 'v') return void (e.preventDefault(), ed.pasteBlock());
      const sel = ed.s.sel;
      if (!sel) return;
      if (e.key === 'Delete' || e.key === 'Backspace') return void (e.preventDefault(), ed.removeBlock(sel));
      if (mod && k === 'd') return void (e.preventDefault(), ed.duplicate(sel));
      if (mod && k === 'c' && !getSelection().toString()) return void (e.preventDefault(), ed.copyBlock(sel));
      if (e.altKey && e.key === 'ArrowUp') return void (e.preventDefault(), ed.nudge(sel, -1));
      if (e.altKey && e.key === 'ArrowDown') return void (e.preventDefault(), ed.nudge(sel, 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!s.project) return null;
  const cls = ['ed', site ? 'is-site' : 'is-doc', s.preview && 'previewing', s.overview && 'overviewing', showInsp && 'show-insp'].filter(Boolean).join(' ');

  return (
    <>
      <div className={cls}>
        <TopBar ed={ed} onExport={() => (ed.commitNow(), setModal('export'), sfx.pick())} onHelp={() => setModal('help')} />
        <Palette mode={s.project.mode} />
        <Canvas ed={ed} />
        <Inspector ed={ed} />
        <button className="btn-chunk insp-toggle" onClick={() => setShowInsp((v) => !v)}>🎛 Tweak</button>
      </div>
      {modal === 'export' && <ExportModal project={s.project} pageId={s.pageId} onClose={() => setModal(null)} />}
      {modal === 'help' && <HelpModal onClose={() => setModal(null)} />}
    </>
  );
}
