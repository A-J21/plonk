// Editor header: name, undo/redo, save status, view controls, export.
import { useMemo, useState } from 'react';
import { VIEWPORTS } from '../../lib/theme.js';
import { walk } from '../../lib/store.js';
import { inlineToText } from '../../lib/inline.js';
import { isMuted, setMuted, sfx } from '../../lib/sfx.js';
import { openSitePreview } from '../../lib/export.js';

export const LogoMini = () => (
  <svg viewBox="0 0 64 64" width="34" height="34">
    <rect x="6" y="24" width="30" height="30" rx="7" fill="#FF4FA3" stroke="#140F2D" strokeWidth="4" />
    <rect x="28" y="8" width="30" height="30" rx="7" fill="#FFD23F" stroke="#140F2D" strokeWidth="4" />
  </svg>
);

const WORDY = ['text', 'heading', 'list', 'quote', 'callout', 'table', 'checklist', 'footnote', 'badges'];
export function useStats(project) {
  return useMemo(() => {
    if (project.mode !== 'doc') return '';
    let words = 0;
    const count = (v) => {
      if (typeof v === 'string') words += inlineToText(v).split(/\s+/).filter((w) => /\w/.test(w)).length;
      else if (Array.isArray(v)) v.forEach(count);
      else if (v && typeof v === 'object') Object.values(v).forEach(count);
    };
    walk(project.blocks, (b) => WORDY.includes(b.type) && count(b.props));
    return `${words} words · ~${Math.max(1, Math.round(words / 230))} min read`;
  }, [project]);
}

export default function TopBar({ ed, onExport, onHelp }) {
  const { s, site } = ed;
  const [muted, setMute] = useState(isMuted);
  const stats = useStats(s.project);
  return (
    <header className="ed-top">
      <a href="#/" className="logo-mini" title="Home"><LogoMini /></a>
      <div className="ed-name">
        <input value={s.project.name} spellCheck={false} aria-label="Project name" onChange={(e) => ed.setName(e.target.value)} />
        <span className={`mode-chip ${site ? 'site' : 'doc'}`}>{site ? 'Website' : 'Document'}</span>
        {!site && <span className="stat-chip">{stats}</span>}
      </div>
      <div className="ed-tools">
        <button className="tb" title="Undo (Ctrl+Z)" onClick={ed.undo}>↶</button>
        <button className="tb" title="Redo (Ctrl+Shift+Z)" onClick={ed.redo}>↷</button>
        <span className={`save-dot${s.saved === 'saving…' ? ' busy' : s.saved === 'saved' ? '' : ' err'}`} title="Saved in this browser">{s.saved}</span>
        <span className="tb-sep" />
        {site && (
          <div className="vp-switch">
            {Object.keys(VIEWPORTS).map((k) => (
              <button key={k} className={s.viewport === k ? 'on' : ''} title={k} onClick={() => (ed.ui({ viewport: k }), sfx.tick())}>
                {{ desktop: '🖥', tablet: '📟', mobile: '📱' }[k]}
              </button>
            ))}
          </div>
        )}
        <select className="tb-select" title="Zoom" value={s.zoom} onChange={(e) => ed.ui({ zoom: e.target.value })}>
          <option value="fit">Fit</option>
          <option value="50">50%</option>
          <option value="75">75%</option>
          <option value="100">100%</option>
          <option value="125">125%</option>
        </select>
        <button className="tb" title="Sound effects" onClick={() => { setMuted(!muted); setMute(!muted); sfx.pick(); }}>{muted ? '🔇' : '🔊'}</button>
        <button className="tb" title="Keyboard shortcuts (?)" onClick={onHelp}>?</button>
        <button className="tb tb-wide" title="Preview without editing chrome (P)" onClick={() => ed.setPreview(!s.preview)}>
          {s.preview ? '✎ Back to editing' : '👁 Preview'}
        </button>
        {site && <button className="tb tb-wide" title="Open the whole site in a new tab" onClick={() => openSitePreview(s.project)}>↗ Open site</button>}
        <button className="btn-chunk export-btn" onClick={onExport}>Export ⤓</button>
      </div>
    </header>
  );
}
