// Export and keyboard-help modals.
import { useState } from 'react';
import { formatsFor, runExport } from '../../lib/export.js';
import { sfx, burst } from '../../lib/sfx.js';
import { toast } from '../../components/Toast.jsx';

function Modal({ onClose, className = '', children }) {
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-card ${className}`}>
        <button className="modal-x" onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
}

export function ExportModal({ project, pageId, onClose }) {
  const [busy, setBusy] = useState(null);
  const run = async (f, e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setBusy('Building your file…');
    try {
      await runExport(project, f, setBusy, pageId);
      sfx.tada();
      burst(r.left + r.width / 2, r.top + r.height / 2, 24);
      if (f !== 'print') toast('Downloaded! 🎉');
    } catch (err) {
      console.error(err);
      toast(`Export failed: ${err.message}`, 'err');
    } finally {
      setBusy(null);
    }
  };
  return (
    <Modal onClose={onClose}>
      <h2>Take it with you</h2>
      <p>Pick a format. Everything is generated right here in your browser.</p>
      <div className="fmt-grid">
        {formatsFor(project.mode).map((f, i) => (
          <button key={f.label} className="fmt-tile" data-format={f.id} style={{ '--c': f.color, '--i': i }} onClick={(e) => run(f.id, e)}>
            <b>{f.label}</b>
            <small>{f.desc}</small>
            <span>.{f.ext || '⎙'}</span>
          </button>
        ))}
      </div>
      {busy && (
        <div className="export-busy">
          <div className="spinner-blocks"><i /><i /><i /></div>
          <span>{busy}</span>
        </div>
      )}
    </Modal>
  );
}

const KEYS = [
  ['Click a brick', 'Add it after the selected block'],
  ['Drag a brick', 'Drop it exactly where the pink line shows'],
  ['Enter', 'New line inside the same paragraph'],
  ['Ctrl + Enter', 'Start a new paragraph block below'],
  ['Alt + ↑ / ↓', 'Move the selected block (also slides it to the top/bottom of a column)'],
  ['Ctrl + D', 'Duplicate block'],
  ['Ctrl + C / Ctrl + V', 'Copy a block, paste it anywhere — even on another page'],
  ['Del', 'Delete block'],
  ['Ctrl + Z / Ctrl + Shift + Z', 'Undo / redo'],
  ['Esc', 'Deselect · exit preview'],
  ['P', 'Toggle preview'],
  ['Pink handles', 'Drag the edges of a selected block to resize it'],
  ['Drop image files', 'Drag photos from your computer straight onto the page'],
];

export function HelpModal({ onClose }) {
  return (
    <Modal onClose={onClose} className="help-card">
      <h2>Shortcuts & tricks</h2>
      <div className="keys">
        {KEYS.map(([k, v]) => (
          <div key={k}><kbd>{k}</kbd><span>{v}</span></div>
        ))}
      </div>
    </Modal>
  );
}
