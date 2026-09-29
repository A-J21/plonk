// Editor state: the project (immutable, via immer), selection, view options,
// undo/redo history, autosave and every block operation.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { produce, current, isDraft } from 'immer';
import { BLOCKS, LOOKS, makeBlock, blockAllowed } from '../../blocks/catalog.jsx';
import { THEMES } from '../../lib/theme.js';
import { getProject, putProject, findBlock, resolveSlot, clone, reId, setPath, getPath, walk, uid } from '../../lib/store.js';
import { esc } from '../../lib/inline.js';
import { sfx, burst } from '../../lib/sfx.js';
import { toast } from '../../components/Toast.jsx';

const CLIP_KEY = 'plonk:clipboard';
const plain = (x) => JSON.parse(JSON.stringify(isDraft(x) ? current(x) : x));

// The block list on the canvas: the document, or the open page of a website.
export const listOf = (project, pageId) =>
  project.mode === 'site' ? (project.pages.find((p) => p.id === pageId) || project.pages[0]).blocks : project.blocks;

// Nav bars & footers are shared: editing one updates the matching block on every page.
function syncShared(d, b) {
  if (d.mode !== 'site' || !BLOCKS[b.type]?.shared) return;
  const props = plain(b.props);
  const style = plain(b.style);
  d.pages.forEach((pg) => walk(pg.blocks, (o) => o.id !== b.id && o.type === b.type && ((o.props = clone(props)), (o.style = clone(style)))));
}
// A newly added nav bar/footer copies the one the site already has.
function adoptShared(d, b) {
  if (d.mode !== 'site' || !BLOCKS[b.type]?.shared) return;
  let src = null;
  d.pages.forEach((pg) => walk(pg.blocks, (o) => (src ||= o.id !== b.id && o.type === b.type ? o : null)));
  if (src) {
    b.props = plain(src.props);
    b.style = plain(src.style);
  }
}

export function useEditor(id) {
  const [s, setS] = useState(() => {
    const project = getProject(id);
    return {
      project,
      sel: null,
      pageId: project?.mode === 'site' ? project.pages[0].id : null,
      preview: false,
      overview: false,
      viewport: 'desktop',
      zoom: 'fit',
      saved: 'saved',
    };
  });
  const sRef = useRef(s);
  sRef.current = s;
  const site = s.project?.mode === 'site';

  // ---------------- side effects queued until after the next render ----------------
  const fx = useRef([]);
  const after = (fn) => fx.current.push(fn);
  useEffect(() => {
    const q = fx.current.splice(0);
    q.forEach((fn) => fn());
  });

  // ---------------- history & autosave ----------------
  const hist = useRef({ past: [], future: [], base: s.project, mode: 'now', timer: 0 });
  const commitNow = useCallback(() => {
    const h = hist.current;
    clearTimeout(h.timer);
    const p = sRef.current.project;
    if (p === h.base) return;
    h.past.push(h.base);
    if (h.past.length > 150) h.past.shift();
    h.future = [];
    h.base = p;
  }, []);
  useEffect(() => {
    const h = hist.current;
    if (h.mode === 'skip') h.base = s.project;
    else if (h.mode === 'debounce') {
      clearTimeout(h.timer);
      h.timer = setTimeout(commitNow, 450);
    } else commitNow();
    h.mode = 'now';
  }, [s.project, commitNow]);

  useEffect(() => {
    if (!s.project) return;
    setS((p) => (p.saved === 'saving…' ? p : { ...p, saved: 'saving…' }));
    const t = setTimeout(() => {
      const ok = putProject(s.project);
      setS((p) => ({ ...p, saved: ok ? 'saved' : 'not saved!' }));
      if (!ok) toast('Browser storage is full — try smaller images, or export a Plonk file to keep your work.', 'err');
    }, 350);
    return () => clearTimeout(t);
  }, [s.project]);

  // Apply a change to the project. `recipe(draft, list, state)` may return extra UI state (e.g. { sel }).
  const edit = useCallback((recipe, { history = 'now' } = {}) => {
    hist.current.mode = history;
    setS((prev) => {
      let extra;
      const project = produce(prev.project, (d) => {
        extra = recipe(d, listOf(d, prev.pageId), prev);
      });
      return project === prev.project && !extra ? prev : { ...prev, ...(extra || {}), project };
    });
  }, []);
  const ui = useCallback((patch) => setS((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) })), []);

  const undo = () => {
    document.activeElement?.blur?.();
    commitNow();
    const h = hist.current;
    if (!h.past.length) return toast('Nothing to undo');
    h.future.push(h.base);
    restore(h.past.pop());
  };
  const redo = () => {
    document.activeElement?.blur?.();
    const h = hist.current;
    if (!h.future.length) return toast('Nothing to redo');
    h.past.push(h.base);
    restore(h.future.pop());
  };
  const restore = (project) => {
    hist.current.mode = 'skip';
    setS((prev) => {
      const pageId = project.mode === 'site' && !project.pages.some((p) => p.id === prev.pageId) ? project.pages[0].id : prev.pageId;
      const sel = prev.sel && findBlock(listOf(project, pageId), prev.sel) ? prev.sel : null;
      return { ...prev, project, pageId, sel };
    });
    sfx.tick();
  };

  // ---------------- DOM helpers ----------------
  const elOf = (bid) => document.querySelector(`.paper .pk-b[data-id="${bid}"]`);
  // Which container (and which of its slots) holds a block; { key: 'root' } at top level.
  const slotInfo = (bid, list = listOf(sRef.current.project, sRef.current.pageId)) => {
    let hit = null;
    walk(list, (b) => (b.slots || []).forEach((sl, i) => sl.some((x) => x.id === bid) && (hit = { pid: b.id, si: i })));
    if (!hit) return { key: 'root' };
    return { key: `${hit.pid}:${hit.si}`, ...hit, parent: findBlock(list, hit.pid) };
  };
  const bounce = (bid) => {
    const el = elOf(bid);
    el?.classList.add('plonk-in');
    setTimeout(() => el?.classList.remove('plonk-in'), 600);
  };
  const focusEnd = (el, selectAll = false) => {
    if (!el) return;
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    if (!selectAll) r.collapse(false);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  };
  const landed = (bid, at) =>
    after(() => {
      const el = elOf(bid);
      if (!el) return;
      bounce(bid);
      const r = el.getBoundingClientRect();
      if (!at && (r.top < 0 || r.bottom > innerHeight)) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      sfx.plonk();
      setTimeout(() => {
        const r2 = el.getBoundingClientRect();
        burst(at?.x ?? r2.left + r2.width / 2, r2.top + 4);
      }, 120);
      const first = el.querySelector('[data-edit],[data-edit-list]');
      const type = findBlock(listOf(sRef.current.project, sRef.current.pageId), bid)?.block.type;
      if (first && ['heading', 'text'].includes(type)) setTimeout(() => focusEnd(first, true), 30);
    });

  // ---------------- block operations ----------------
  const select = (bid, scroll = false) => {
    ui({ sel: bid });
    if (scroll && bid) after(() => elOf(bid)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const insertBlock = (b, slotKey = 'root', index, at) => {
    edit((d, list) => {
      const target = resolveSlot(list, slotKey);
      if (!target) return;
      adoptShared(d, b);
      target.splice(index ?? target.length, 0, b);
      return { sel: b.id };
    });
    landed(b.id, at);
  };

  // Click a brick: add it right after the selection, else at the end.
  const clickAdd = (type) => {
    const { project, sel, pageId } = sRef.current;
    if (!blockAllowed(type, project.mode)) return;
    const b = makeBlock(type);
    const hit = sel && findBlock(listOf(project, pageId), sel);
    if (!hit) return insertBlock(b);
    edit((d, list) => {
      const h = findBlock(list, sel);
      adoptShared(d, b);
      h.list.splice(h.index + 1, 0, b);
      return { sel: b.id };
    });
    landed(b.id);
  };

  const moveTo = (bid, slotKey, index) => {
    edit((d, list) => {
      const hit = findBlock(list, bid);
      if (!hit) return;
      const [b] = hit.list.splice(hit.index, 1);
      const target = resolveSlot(list, slotKey);
      if (!target) return void hit.list.splice(hit.index, 0, b);
      target.splice(Math.min(index, target.length), 0, b);
    });
    after(() => bounce(bid));
    sfx.plonk();
  };

  const removeBlock = (bid) => {
    const { project, pageId } = sRef.current;
    const hit = findBlock(listOf(project, pageId), bid);
    if (!hit) return;
    const next = hit.list[hit.index + 1] || hit.list[hit.index - 1];
    const parent = slotInfo(bid).pid || null;
    sfx.pop();
    elOf(bid)?.classList.add('poof');
    setTimeout(() => {
      edit((d, list) => {
        const h = findBlock(list, bid);
        if (h) h.list.splice(h.index, 1);
        return { sel: next?.id || parent };
      });
    }, 180);
  };

  const duplicate = (bid) => {
    const { project, pageId } = sRef.current;
    const hit = findBlock(listOf(project, pageId), bid);
    if (!hit) return;
    const copy = reId(clone(hit.block));
    edit((d, list) => {
      const h = findBlock(list, bid);
      h.list.splice(h.index + 1, 0, copy);
      return { sel: copy.id };
    });
    landed(copy.id);
  };

  // Up/down. At the edge of a column the block first slides to the column's
  // middle/bottom, then pops out of the columns block entirely.
  const nudge = (bid, dir) => {
    const { project, pageId } = sRef.current;
    const list = listOf(project, pageId);
    const hit = findBlock(list, bid);
    if (!hit) return;
    const j = hit.index + dir;
    if (j >= 0 && j < hit.list.length) {
      edit((d, l) => {
        const h = findBlock(l, bid);
        [h.list[h.index], h.list[j]] = [h.list[j], h.list[h.index]];
      });
      after(() => bounce(bid));
      return sfx.tick();
    }
    const info = slotInfo(bid, list);
    if (!info.parent) return toast(`Already at the ${dir > 0 ? 'bottom' : 'top'} of the page`);
    const pb = info.parent.block;
    if (pb.type === 'columns') {
      const order = ['start', 'center', 'end'];
      const cur = order.indexOf(pb.props.colAlign?.[info.si] || (pb.props.valign === 'stretch' ? 'start' : pb.props.valign) || 'start');
      const nk = cur + dir;
      if (nk >= 0 && nk <= 2) {
        edit((d, l) => {
          const p = findBlock(l, pb.id).block;
          p.props.colAlign ||= [];
          p.props.colAlign[info.si] = order[nk];
        });
        after(() => {
          // No spare room in the column? Make the columns block taller so the move shows.
          const col = elOf(bid)?.closest('.pk-col');
          const slotEl = col?.querySelector(':scope > .pk-slot');
          if (col && slotEl && nk !== 0 && slotEl.offsetHeight >= col.clientHeight - 4) {
            const h = Math.round(col.closest('.pk-b').offsetHeight + 140);
            edit((d, l) => void (findBlock(l, pb.id).block.style.minh = h), { history: 'skip' });
            toast('Made the columns taller — drag the pink bottom handle to fine-tune.');
          } else toast(`Moved to the ${['top', 'middle', 'bottom'][nk]} of the column`);
          bounce(bid);
        });
        return sfx.tick();
      }
    }
    edit((d, l) => {
      const h = findBlock(l, bid);
      const p = findBlock(l, pb.id);
      const [b] = h.list.splice(h.index, 1);
      p.list.splice(p.index + (dir > 0 ? 1 : 0), 0, b);
    });
    after(() => bounce(bid));
    sfx.plonk();
    toast(`Moved out of the ${BLOCKS[pb.type].label.toLowerCase()}`);
  };

  const shiftColumn = (bid, dir) => {
    const info = slotInfo(bid);
    const pb = info.parent?.block;
    if (pb?.type !== 'columns') return;
    const to = info.si + dir;
    if (to < 0 || to >= pb.slots.length) return;
    edit((d, l) => {
      const h = findBlock(l, bid);
      const p = findBlock(l, pb.id).block;
      const [b] = h.list.splice(h.index, 1);
      p.slots[to].splice(Math.min(h.index, p.slots[to].length), 0, b);
    });
    after(() => bounce(bid));
    sfx.tick();
  };

  const newParagraphAfter = (bid) => {
    const b = makeBlock('text', { text: '' });
    edit((d, l) => {
      const h = findBlock(l, bid);
      if (h) h.list.splice(h.index + 1, 0, b);
      return { sel: b.id };
    });
    after(() => elOf(b.id)?.querySelector('[data-edit]')?.focus());
    sfx.tick();
  };

  const removeEmptyText = (bid) => {
    const { project, pageId } = sRef.current;
    const hit = findBlock(listOf(project, pageId), bid);
    if (!hit || hit.block.type !== 'text' || hit.list.length < 2) return false;
    const prev = hit.list[hit.index - 1];
    edit((d, l) => {
      const h = findBlock(l, bid);
      h.list.splice(h.index, 1);
      return { sel: prev?.id || null };
    });
    if (prev) after(() => focusEnd(elOf(prev.id)?.querySelector('[data-edit]')));
    return true;
  };

  // Typing on the canvas.
  const typeText = (bid, path, value) =>
    edit(
      (d, l) => {
        const h = findBlock(l, bid);
        if (!h) return;
        setPath(h.block.props, path, value);
        syncShared(d, h.block);
      },
      { history: 'debounce' },
    );

  const toggleCheck = (bid, i) => {
    edit((d, l) => {
      const it = findBlock(l, bid).block.props.items[i];
      it.done = !it.done;
    });
    sfx.tick();
  };

  const checklistEnter = (bid, i) => {
    edit((d, l) => void findBlock(l, bid).block.props.items.splice(i + 1, 0, { t: '', done: false }));
    after(() => elOf(bid)?.querySelector(`[data-edit="items.${i + 1}.t"]`)?.focus());
  };
  const checklistBackspace = (bid, i) => {
    const items = findBlock(listOf(sRef.current.project, sRef.current.pageId), bid)?.block.props.items;
    if (!items || items.length < 2) return false;
    edit((d, l) => void findBlock(l, bid).block.props.items.splice(i, 1));
    after(() => focusEnd(elOf(bid)?.querySelector(`[data-edit="items.${Math.max(0, i - 1)}.t"]`)));
    return true;
  };

  const addImage = (src) => {
    const b = makeBlock('image', { src });
    const { project, sel, pageId } = sRef.current;
    const hit = sel && findBlock(listOf(project, pageId), sel);
    if (!hit) return insertBlock(b);
    edit((d, l) => {
      const h = findBlock(l, sel);
      h.list.splice(h.index + 1, 0, b);
      return { sel: b.id };
    });
    landed(b.id);
  };

  // ---------------- inspector operations (act on the selected block) ----------------
  const onSel = (fn, opts) =>
    edit((d, l, prev) => {
      const b = prev.sel && findBlock(l, prev.sel)?.block;
      if (!b) return;
      fn(b, d);
      syncShared(d, b);
    }, opts);

  const setProp = (path, v, live) =>
    onSel((b) => {
      setPath(b.props, path, v);
      if (b.type === 'columns' && path === 'n') {
        const n = +v;
        while (b.slots.length < n) b.slots.push([]);
        while (b.slots.length > n) b.slots.at(-1).push(...b.slots.pop());
        b.props.colAlign = (b.props.colAlign || []).slice(0, n);
      }
    }, { history: live ? 'debounce' : 'now' });

  const setStyle = (patch, live) =>
    onSel((b) => {
      Object.entries(patch).forEach(([k, v]) => (v === '' || v == null || v === false ? delete b.style[k] : (b.style[k] = v)));
      if (b.style.maxw >= 100) delete b.style.maxw;
      if (b.style.opacity === 100) delete b.style.opacity;
      if (b.style.rotate === 0) delete b.style.rotate;
      if (!b.style.minh) delete b.style.minh;
    }, { history: live ? 'debounce' : 'now' });

  const applyLook = (k) => {
    setStyle({ ...LOOKS[k].style });
    sfx.pick();
  };
  const resetStyle = () => onSel((b) => void (b.style = BLOCKS[b.type].style?.() || {}));

  const tableSize = (op) =>
    onSel((b) => {
      const rows = b.props.rows;
      const cols = rows[0].length;
      if (op === 'row+') rows.push(Array(cols).fill(''));
      if (op === 'row-' && rows.length > 1) rows.pop();
      if (op === 'col+') rows.forEach((r) => r.push(''));
      if (op === 'col-' && cols > 1) rows.forEach((r) => r.pop());
    });

  const countChange = (key, dlt) => {
    onSel((b) => {
      const f = BLOCKS[b.type].fields.find((x) => x.key === key);
      const arr = getPath(b.props, key);
      if (dlt > 0) arr.push(f.make());
      else if (arr.length > 1) arr.pop();
      if (b.type === 'pricing' && +b.props.featured >= arr.length) b.props.featured = arr.length - 1;
    });
    sfx.tick();
  };

  // Tag list: set / add / del / up.
  const listOp = (key, op, i, value = '') => {
    const clean = esc(String(value).trim());
    if (op === 'add' && !clean) return toast('Type a tag first');
    const sel = findBlock(listOf(sRef.current.project, sRef.current.pageId), sRef.current.sel)?.block;
    if (op === 'del' && getPath(sel.props, key).length <= 1) return toast('Keep at least one tag — or delete the whole block');
    onSel(
      (b) => {
        const arr = getPath(b.props, key);
        if (op === 'set') arr[i] = clean;
        if (op === 'add') arr.push(clean);
        if (op === 'del') arr.splice(i, 1);
        if (op === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      },
      { history: op === 'set' ? 'debounce' : 'now' },
    );
    if (op !== 'set') sfx.tick();
  };

  const addImages = (key, urls) => onSel((b) => void getPath(b.props, key).push(...urls));
  const removeImage = (i) => onSel((b) => void b.props.images.splice(i, 1));

  // Resize handles: live changes, then one history entry on release.
  const resizeSel = (patch, done) => {
    onSel((b) => {
      Object.assign(b.style, patch);
      if (!b.style.maxw || b.style.maxw >= 100) delete b.style.maxw;
      if (!b.style.minh) delete b.style.minh;
    }, { history: done ? 'now' : 'debounce' });
  };

  // ---------------- theme & document settings ----------------
  const setTheme = (patch, live) =>
    edit((d) => void Object.assign(d.theme, patch, { preset: null }), { history: live ? 'debounce' : 'now' });
  const setThemePreset = (k) => {
    edit((d) => void (d.theme = { ...THEMES[k], base: d.theme.base, preset: k }));
    sfx.pick();
  };
  const setMeta = (patch) => edit((d) => void Object.assign(d, patch));
  const setName = (name) => edit((d) => void (d.name = name), { history: 'debounce' });

  // ---------------- clipboard ----------------
  const copyBlock = (bid) => {
    const hit = findBlock(listOf(sRef.current.project, sRef.current.pageId), bid);
    if (!hit) return;
    try {
      localStorage.setItem(CLIP_KEY, JSON.stringify(hit.block));
    } catch {}
    toast(`Copied ${BLOCKS[hit.block.type].label} — Ctrl+V to paste`);
  };
  const pasteBlock = () => {
    let b = null;
    try {
      b = JSON.parse(localStorage.getItem(CLIP_KEY));
    } catch {}
    if (!b) return toast('Nothing copied yet');
    let ok = true;
    walk([b], (x) => (ok &&= blockAllowed(x.type, sRef.current.project.mode)));
    if (!ok) return toast(`That block doesn’t fit in a ${site ? 'website' : 'document'}`, 'err');
    const copy = reId(clone(b));
    const { project, sel, pageId } = sRef.current;
    const hit = sel && findBlock(listOf(project, pageId), sel);
    if (!hit) return insertBlock(copy);
    edit((d, l) => {
      const h = findBlock(l, sel);
      h.list.splice(h.index + 1, 0, copy);
      return { sel: copy.id };
    });
    landed(copy.id);
  };

  // ---------------- pages (websites) ----------------
  const uniqueName = (base) => {
    let n = base;
    for (let k = 2; sRef.current.project.pages.some((p) => p.name === n); k++) n = `${base} ${k}`;
    return n;
  };
  const openPage = (pid, anchor) => {
    const { pageId, overview, project } = sRef.current;
    if (!project.pages.some((p) => p.id === pid)) return;
    const changed = pid !== pageId || overview;
    ui({ pageId: pid, overview: false, sel: null });
    after(() => {
      if (anchor) scrollToAnchor(anchor);
      else if (changed) document.querySelector('.ed-stage')?.scrollTo({ top: 0, behavior: 'smooth' });
    });
    if (changed) sfx.pick();
  };
  const scrollToAnchor = (name) => {
    const t = document.querySelector(`.paper [id="${CSS.escape(name)}"]`);
    if (t) return void t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const { project, pageId } = sRef.current;
    const other = project.mode === 'site' && project.pages.find((pg) => { let f = false; walk(pg.blocks, (b) => (f ||= b.props.anchor === name || `h-${b.id}` === name)); return f; });
    if (other && other.id !== pageId) openPage(other.id, name);
    else toast(`No section called “${name}” yet — set an Anchor name on a block.`);
  };
  const newPage = (name = uniqueName('New page')) => {
    const pgId = uid();
    edit((d, l, prev) => {
      const src = d.pages.find((p) => p.id === prev.pageId);
      // New pages start with the shared nav bar and footer so the site stays consistent.
      const top = src.blocks.filter((b) => b.type === 'navbar').slice(0, 1).map((b) => reId(plain(b)));
      const bottom = src.blocks.filter((b) => b.type === 'footer').slice(-1).map((b) => reId(plain(b)));
      d.pages.push({ id: pgId, name, blocks: [...top, makeBlock('heading', { text: name }), makeBlock('text', { text: 'Start this page here.' }), ...bottom] });
      return { pageId: pgId, overview: false, sel: null };
    });
    toast(`Added “${name}” — it’s in your nav bar already.`);
    sfx.pick();
  };
  const pageAction = (act, pid) => {
    const pages = sRef.current.project.pages;
    const i = pages.findIndex((p) => p.id === pid);
    if (act === 'add') return newPage();
    if (act === 'del') {
      if (pages.length < 2 || !confirm(`Delete the page “${pages[i].name}”? You can undo this.`)) return;
      sfx.pop();
    }
    edit((d, l, prev) => {
      if (act === 'up' && i > 0) [d.pages[i - 1], d.pages[i]] = [d.pages[i], d.pages[i - 1]];
      if (act === 'dup') {
        const c = plain(d.pages[i]);
        c.id = uid();
        c.name = uniqueName(`${c.name} copy`);
        c.blocks.forEach(reId);
        d.pages.splice(i + 1, 0, c);
      }
      if (act === 'del') {
        d.pages.splice(i, 1);
        if (prev.pageId === pid) return { pageId: d.pages[Math.max(0, i - 1)].id, sel: null };
      }
    });
  };
  const renamePage = (pid, name, live = true) =>
    edit((d) => void (d.pages.find((p) => p.id === pid).name = name || 'Untitled'), { history: live ? 'debounce' : 'now' });

  // ---------------- view ----------------
  const setPreview = (v) => {
    ui((prev) => ({ preview: v, overview: v ? false : prev.overview, sel: v ? null : prev.sel }));
    if (v) toast(site ? 'Preview — click the nav links to hop between pages. Esc to exit.' : 'Preview — Esc to exit.');
  };
  const setOverview = (v) => {
    ui({ overview: v, sel: null });
    after(() => document.querySelector('.ed-stage')?.scrollTo({ top: 0 }));
  };

  const blocks = useMemo(() => (s.project ? listOf(s.project, s.pageId) : []), [s.project, s.pageId]);
  const selBlock = useMemo(() => (s.sel ? findBlock(blocks, s.sel)?.block || null : null), [blocks, s.sel]);

  return {
    s, site, blocks, selBlock, ui, edit, undo, redo, commitNow,
    select, insertBlock, clickAdd, moveTo, removeBlock, duplicate, nudge, shiftColumn, slotInfo,
    newParagraphAfter, removeEmptyText, typeText, toggleCheck, checklistEnter, checklistBackspace, addImage,
    setProp, setStyle, applyLook, resetStyle, tableSize, countChange, listOp, addImages, removeImage, resizeSel,
    setTheme, setThemePreset, setMeta, setName, copyBlock, pasteBlock,
    openPage, scrollToAnchor, newPage, pageAction, renamePage, setPreview, setOverview,
  };
}
