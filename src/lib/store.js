// Project persistence (localStorage) + block-tree helpers.

const KEY = 'plonk:projects:v1';

export const uid = () => Math.random().toString(36).slice(2, 9);

export function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false; // quota exceeded (usually big images)
  }
}

export function getProject(id) {
  const p = loadAll().find((x) => x.id === id);
  return p ? migrate(p) : null;
}

// Websites hold several pages; older saves kept one list in `blocks`.
export function migrate(p) {
  if (p.mode === 'site' && !p.pages) {
    p.pages = [{ id: uid(), name: 'Home', blocks: p.blocks || [] }];
    delete p.blocks;
  }
  if (p.mode === 'site') walk(p.pages.flatMap((pg) => pg.blocks), (b) => {
    if (b.type === 'navbar' && b.props.auto === undefined) b.props.auto = false;
  });
  return p;
}

export const slugify = (s) => (s || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';

// Blocks of every page (websites) or the single list (documents).
export const allBlocks = (p) => (p.mode === 'site' ? p.pages.flatMap((pg) => pg.blocks) : p.blocks);

// Saves a copy (React state is immutable, so never mutate the project passed in).
export function putProject(project) {
  const list = loadAll().filter((p) => p.id !== project.id);
  list.unshift({ ...project, updated: Date.now() });
  return saveAll(list);
}

export function deleteProject(id) {
  saveAll(loadAll().filter((p) => p.id !== id));
}

export const clone = (o) => JSON.parse(JSON.stringify(o));

// Give every block (recursively) a fresh id — used for duplication & templates.
export function reId(block) {
  block.id = uid();
  (block.slots || []).forEach((s) => s.forEach(reId));
  return block;
}

// Find a block anywhere in the tree. Returns { block, list, index } or null.
export function findBlock(list, id) {
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (b.id === id) return { block: b, list, index: i };
    for (const slot of b.slots || []) {
      const hit = findBlock(slot, id);
      if (hit) return hit;
    }
  }
  return null;
}

// Resolve a slot key ("root" or "<blockId>:<slotIndex>") to the array it names.
export function resolveSlot(blocks, key) {
  if (!key || key === 'root') return blocks;
  const [id, i] = key.split(':');
  const hit = findBlock(blocks, id);
  return hit?.block.slots?.[+i] || null;
}

export function walk(list, fn) {
  list.forEach((b) => {
    fn(b);
    (b.slots || []).forEach((s) => walk(s, fn));
  });
}

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k) => {
    if (o[k] == null) o[k] = {};
    o = o[k];
  });
  o[keys.at(-1)] = value;
}
