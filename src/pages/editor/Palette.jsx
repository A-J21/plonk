// Left panel: the Brick box. Bricks are dragged by the pointer DnD engine
// (data-new-type) or clicked to add.
import { useState } from 'react';
import { BLOCKS, GROUPS, blockAllowed } from '../../blocks/catalog.jsx';
import { Icon } from '../../blocks/primitives.jsx';

export default function Palette({ mode }) {
  const [q, setQ] = useState('');
  const groups = GROUPS.filter((g) => !g.modes || g.modes.includes(mode))
    .map((g) => ({ ...g, items: Object.entries(BLOCKS).filter(([k, d]) => d.group === g.id && blockAllowed(k, mode)) }))
    .filter((g) => g.items.length);
  const match = (d) => !q.trim() || d.label.toLowerCase().includes(q.trim().toLowerCase());

  return (
    <aside className="ed-left">
      <div className="pal-head">
        <h2>Brick box</h2>
        <input placeholder="Find a brick…" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="pal">
        {groups.map((g) => {
          const items = g.items.filter(([, d]) => match(d));
          if (!items.length) return null;
          return (
            <div key={g.id} className="pal-group">
              <h3 style={{ '--c': g.color }}>{g.label}</h3>
              <div className="pal-grid">
                {items.map(([k, d], i) => (
                  <button key={k} className="brick" data-new-type={k} style={{ '--c': g.color, '--i': i }} title="Drag or click to add">
                    {d.shared && mode === 'site' && <i className="brick-shared" title="Shared on every page">🔗</i>}
                    <Icon svg={d.icon} />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="pal-tip">Drag a brick onto the page — or just click it to drop it in.</p>
    </aside>
  );
}
