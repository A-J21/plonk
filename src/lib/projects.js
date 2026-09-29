// Creating and importing projects.
import { THEMES } from './theme.js';
import { uid, putProject } from './store.js';

export function createProject(mode, tpl) {
  const t = THEMES[tpl.theme] || THEMES.pop;
  const p = {
    id: uid(),
    name: tpl.id === 'blank' ? (mode === 'doc' ? 'Untitled document' : 'My new site') : tpl.name,
    mode,
    pageSize: 'letter',
    theme: { ...t, preset: tpl.theme, base: 16 },
    created: Date.now(),
  };
  if (mode === 'site') p.pages = tpl.pages().map((pg) => ({ id: pg.id || uid(), name: pg.name, blocks: pg.blocks }));
  else p.blocks = tpl.blocks();
  putProject(p);
  return p;
}

// Reads a .plonk.json file; returns the saved project.
export async function importProject(file) {
  const data = JSON.parse(await file.text());
  if (!(data.blocks || data.pages) || !data.mode) throw new Error('not a Plonk file');
  delete data.plonk;
  data.id = uid();
  putProject(data);
  return data;
}
