// "Your stash": saved projects as sticker cards.
import { deleteProject } from '../lib/store.js';
import { sfx } from '../lib/sfx.js';

const ago = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function Stash({ projects, onChange }) {
  const del = (e, id) => {
    e.preventDefault();
    if (!confirm('Delete this project? This can’t be undone.')) return;
    deleteProject(id);
    sfx.pop();
    onChange?.();
  };
  return (
    <div className="stash">
      {projects.map((p, i) => (
        <a
          key={p.id}
          className={`stash-card ${p.mode} seen`}
          href={`#/edit/${p.id}`}
          style={{ '--r': `${((i % 3) - 1) * 1.2}deg`, '--bg': p.theme.bg, '--ac': p.theme.accent }}
        >
          <span className="stash-mode">{p.mode === 'site' ? '🌐 Website' : '📄 Document'}</span>
          <b>{p.name}</b>
          <small>edited {ago(p.updated)}</small>
          <button className="stash-del" title="Delete" onClick={(e) => del(e, p.id)}>✕</button>
        </a>
      ))}
    </div>
  );
}
