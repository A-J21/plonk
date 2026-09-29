// The builder: brick palette · live canvas · tweak panel.
import { BLOCKS, GROUPS, LOOKS, makeBlock, renderList, renderBlock, blockAllowed, collectHeadings } from '../blocks.js';
import { THEMES, PAGE_SIZES, VIEWPORTS, themeVars, docPad } from '../theme.js';
import { getProject, putProject, findBlock, resolveSlot, clone, reId, setPath, getPath, walk, uid, slugify } from '../store.js';
import { sanitizeInline, esc, inlineToText } from '../inline.js';
import { initDnd } from '../dnd.js';
import { renderInspector, bindInspector } from '../inspector.js';
import { formatsFor, runExport, openSitePreview, pageSlugs } from '../export.js';
import { sfx, burst, isMuted, setMuted } from '../sfx.js';
import { toast, navigate } from '../main.js';

const groupColor = (g) => GROUPS.find((x) => x.id === g)?.color || 'var(--pink)';
const CLIP_KEY = 'plonk:clipboard';

export function mountEditor(root, id) {
  const project = getProject(id);
  if (!project) {
    navigate('#/new');
    return () => {};
  }
  const ac = new AbortController();
  const on = (el, ev, fn, opts = {}) => el.addEventListener(ev, fn, { ...opts, signal: ac.signal });
  const site = project.mode === 'site';

  const st = {
    sel: null,
    hist: [],
    fut: [],
    viewport: 'desktop',
    zoom: 'fit',
    preview: false,
    overview: false,
    pageId: site ? project.pages[0].id : null,
  };

  // The block list currently on the canvas (a website edits one page at a time).
  const page = () => (site ? project.pages.find((p) => p.id === st.pageId) || project.pages[0] : null);
  const B = () => (site ? page().blocks : project.blocks);

  root.innerHTML = `
  <div class="ed ${site ? 'is-site' : 'is-doc'}">
    <header class="ed-top">
      <a href="#/" class="logo-mini" title="Home">${logoMini()}</a>
      <div class="ed-name"><input value="${esc(project.name)}" id="ed-name" spellcheck="false" aria-label="Project name"><span class="mode-chip ${site ? 'site' : 'doc'}">${site ? 'Website' : 'Document'}</span>${site ? '' : '<span class="stat-chip" id="stats"></span>'}</div>
      <div class="ed-tools">
        <button class="tb" id="undo" title="Undo (Ctrl+Z)">↶</button>
        <button class="tb" id="redo" title="Redo (Ctrl+Shift+Z)">↷</button>
        <span class="save-dot" id="save-dot" title="Saved in this browser">saved</span>
        <span class="tb-sep"></span>
        ${site ? `<div class="vp-switch" id="vp">${Object.keys(VIEWPORTS).map((k) => `<button data-vp="${k}" class="${k === 'desktop' ? 'on' : ''}" title="${k}">${{ desktop: '🖥', tablet: '📟', mobile: '📱' }[k]}</button>`).join('')}</div>` : ''}
        <select id="zoom" class="tb-select" title="Zoom"><option value="fit">Fit</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option><option value="125">125%</option></select>
        <button class="tb" id="mute" title="Sound effects">${isMuted() ? '🔇' : '🔊'}</button>
        <button class="tb" id="help" title="Keyboard shortcuts (?)">?</button>
        <button class="tb tb-wide" id="preview" title="Preview without editing chrome (P)">👁 Preview</button>
        ${site ? '<button class="tb tb-wide" id="open-site" title="Open the whole site in a new tab">↗ Open site</button>' : ''}
        <button class="btn-chunk export-btn" id="export">Export ⤓</button>
      </div>
    </header>
    <aside class="ed-left">
      <div class="pal-head"><h2>Brick box</h2><input id="pal-search" placeholder="Find a brick…" autocomplete="off"></div>
      <div class="pal" id="pal">${palette(project.mode)}</div>
      <p class="pal-tip">Drag a brick onto the page — or just click it to drop it in.</p>
    </aside>
    <main class="ed-stage" id="stage">
      <div class="paper-sizer" id="sizer"><div class="paper-wrap" id="wrap">
        ${site ? '<div class="browser-bar"><i></i><i></i><i></i><div class="ptabs" id="ptabs"></div><span id="url-pill"></span><button class="ov-btn" id="ov-btn" title="See every page">▦ All pages</button></div>' : ''}
        <div class="pk-doc paper" id="paper"></div>
        ${site ? '' : '<div class="page-guides" id="guides"></div>'}
      </div></div>
      <div class="overview" id="overview" hidden></div>
      <div class="overlay" id="overlay">
        <div class="blk-tag" id="blk-tag"></div>
        <div class="blk-bar" id="blk-bar">
          <button class="bb-drag" id="bb-drag" title="Drag to move">⠿</button>
          <button data-bb="parent" title="Select the container">⬑</button>
          <button data-bb="left" title="Move to the column on the left">←</button>
          <button data-bb="up" title="Move up (Alt+↑)">↑</button>
          <button data-bb="down" title="Move down (Alt+↓)">↓</button>
          <button data-bb="right" title="Move to the column on the right">→</button>
          <button data-bb="dup" title="Duplicate (Ctrl+D)">⧉</button>
          <button data-bb="del" title="Delete (Del)">✕</button>
        </div>
        <div class="rs rs-x" data-rs="x" title="Drag to change width"></div>
        <div class="rs rs-y" data-rs="y" title="Drag to change height"></div>
        <div class="rs rs-xy" data-rs="xy" title="Drag to resize"></div>
        <div class="rs-badge" id="rs-badge"></div>
      </div>
      <div class="fmt-bar" id="fmt">
        <button data-fmt="bold" title="Bold (Ctrl+B)"><b>B</b></button>
        <button data-fmt="italic" title="Italic (Ctrl+I)"><i>I</i></button>
        <button data-fmt="underline" title="Underline (Ctrl+U)"><u>U</u></button>
        <button data-fmt="strikeThrough" title="Strike"><s>S</s></button>
        <button data-fmt="link" title="Link">🔗</button>
        <button data-fmt="removeFormat" title="Clear formatting">⌫</button>
      </div>
    </main>
    <aside class="ed-right" id="insp"></aside>
    <button class="btn-chunk insp-toggle" id="insp-toggle">🎛 Tweak</button>
  </div>
  <div class="modal" id="export-modal" hidden>
    <div class="modal-card">
      <button class="modal-x" data-close>✕</button>
      <h2>Take it with you</h2>
      <p>Pick a format. Everything is generated right here in your browser.</p>
      <div class="fmt-grid">${formatsFor(project.mode).map((f, i) => `<button class="fmt-tile" data-format="${f.id}" style="--c:${f.color};--i:${i}"><b>${f.label}</b><small>${f.desc}</small><span>.${f.ext || '⎙'}</span></button>`).join('')}</div>
      <div class="export-busy" id="busy" hidden><div class="spinner-blocks"><i></i><i></i><i></i></div><span id="busy-msg">Building…</span></div>
    </div>
  </div>
  <div class="modal" id="help-modal" hidden>
    <div class="modal-card help-card">
      <button class="modal-x" data-close>✕</button>
      <h2>Shortcuts & tricks</h2>
      <div class="keys">
        ${[
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
        ].map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`).join('')}
      </div>
    </div>
  </div>`;

  const $ = (s) => root.querySelector(s);
  const edEl = $('.ed');
  const stage = $('#stage');
  const paper = $('#paper');
  const wrap = $('#wrap');
  const sizer = $('#sizer');
  const overlay = $('#overlay');
  const insp = $('#insp');
  const bar = $('#blk-bar');
  const tag = $('#blk-tag');
  const fmt = $('#fmt');
  const ov = $('#overview');

  // ---------------- rendering ----------------
  const pageHref = (pg) => `#/p/${pg.id}`;
  const ctx = () => ({
    editing: !st.preview,
    static: false,
    mode: project.mode,
    headings: collectHeadings(B()),
    ...(site ? { pages: project.pages, pageId: st.pageId, pageHref } : {}),
  });

  function render() {
    paper.style.cssText = themeVars(project.theme);
    paper.innerHTML = renderList(B(), ctx());
    decorate(paper);
    layoutPaper();
    markSelection();
    if (site) renderTabs();
    if (st.overview) renderOverview();
    updateStats();
  }

  function renderOne(bid) {
    const el = paper.querySelector(`.pk-b[data-id="${bid}"]`);
    const hit = findBlock(B(), bid);
    if (!el || !hit) return render();
    const tmp = document.createElement('div');
    tmp.innerHTML = renderBlock(hit.block, ctx());
    const fresh = tmp.firstChild;
    el.replaceWith(fresh);
    decorate(fresh);
    markSelection();
  }

  function decorate(scope) {
    if (st.preview) return;
    scope.querySelectorAll('[data-edit]').forEach((el) => {
      el.contentEditable = el.hasAttribute('data-plain') ? 'plaintext-only' : 'true';
      el.spellcheck = true;
    });
    scope.querySelectorAll('[data-edit-list]').forEach((el) => (el.contentEditable = 'true'));
    const slots = [...(scope.matches?.('.pk-slot') ? [scope] : []), ...scope.querySelectorAll('.pk-slot[data-slot]')];
    slots.forEach((s) => s.classList.toggle('is-empty', ![...s.children].some((c) => c.classList.contains('pk-b'))));
  }

  function layoutPaper() {
    let w;
    if (site) {
      w = VIEWPORTS[st.viewport];
      paper.style.width = `${w}px`;
      paper.style.padding = st.viewport === 'mobile' ? '0 16px 32px' : '0 40px 40px';
    } else {
      const size = PAGE_SIZES[project.pageSize || 'a4'];
      w = size.w;
      paper.style.width = `${w}px`;
      paper.style.minHeight = `${size.h}px`;
      paper.style.padding = `${docPad(project)}px`;
      $('#guides').style.setProperty('--ph', `${size.h}px`);
    }
    const avail = stage.clientWidth - 96;
    const scale = st.zoom === 'fit' ? Math.min(1, avail / w) : +st.zoom / 100;
    wrap.style.width = `${w}px`;
    wrap.style.transform = `scale(${scale})`;
    sizer.style.width = `${w * scale}px`;
    sizer.style.height = `${wrap.offsetHeight * scale}px`;
    st.scale = scale;
    placeChrome();
  }

  // ---------------- pages (websites) ----------------
  function renderTabs() {
    const slugs = pageSlugs(project);
    $('#ptabs').innerHTML =
      project.pages.map((pg, i) => `<button class="ptab${pg.id === st.pageId && !st.overview ? ' on' : ''}" data-ptab="${pg.id}" title="Double-click to rename">${i === 0 ? '🏠 ' : ''}${esc(pg.name)}</button>`).join('') +
      '<button class="ptab ptab-add" data-ptab-add title="Add a page">+</button>';
    $('#url-pill').textContent = `${slugify(project.name) || 'my-site'}.plonk.site/${slugs[st.pageId] === 'index' ? '' : slugs[st.pageId] + '.html'}`;
    $('#ov-btn').classList.toggle('on', st.overview);
  }

  function openPage(pid, anchor) {
    if (!project.pages.some((p) => p.id === pid)) return;
    const changed = pid !== st.pageId || st.overview;
    st.pageId = pid;
    st.overview = false;
    st.sel = null;
    edEl.classList.remove('overviewing');
    ov.hidden = true;
    render();
    refreshInspector();
    if (anchor) scrollToAnchor(anchor);
    else if (changed) stage.scrollTo({ top: 0, behavior: 'smooth' });
    if (changed) sfx.pick();
  }

  function scrollToAnchor(name) {
    const t = paper.querySelector(`[id="${CSS.escape(name)}"]`);
    if (t) return void t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Maybe it lives on another page.
    const other = site && project.pages.find((pg) => { let f = false; walk(pg.blocks, (b) => (f ||= b.props.anchor === name || `h-${b.id}` === name)); return f; });
    if (other && other.id !== st.pageId) openPage(other.id, name);
    else toast(`No section called “${name}” yet — set an Anchor name on a block.`);
  }

  function newPage(name, fromId) {
    const src = project.pages.find((p) => p.id === (fromId || st.pageId));
    // New pages start with the shared nav bar and footer so the site stays consistent.
    const top = src?.blocks.filter((b) => b.type === 'navbar').slice(0, 1) || [];
    const bottom = src?.blocks.filter((b) => b.type === 'footer').slice(-1) || [];
    const blocks = [...top.map((b) => reId(clone(b))), makeBlock('heading', { text: name }), makeBlock('text', { text: 'Start this page here.' }), ...bottom.map((b) => reId(clone(b)))];
    const pg = { id: uid(), name, blocks };
    project.pages.push(pg);
    commit();
    openPage(pg.id);
    toast(`Added “${name}” — it’s in your nav bar already.`);
  }

  function uniqueName(base) {
    let n = base;
    for (let k = 2; project.pages.some((p) => p.name === n); k++) n = `${base} ${k}`;
    return n;
  }

  function pageAction(act, pid) {
    const i = project.pages.findIndex((p) => p.id === pid);
    if (act === 'add') return newPage(uniqueName('New page'));
    if (act === 'up' && i > 0) [project.pages[i - 1], project.pages[i]] = [project.pages[i], project.pages[i - 1]];
    if (act === 'dup') {
      const c = clone(project.pages[i]);
      c.id = uid();
      c.name = uniqueName(`${c.name} copy`);
      c.blocks.forEach(reId);
      project.pages.splice(i + 1, 0, c);
    }
    if (act === 'del') {
      if (project.pages.length < 2) return;
      if (!confirm(`Delete the page “${project.pages[i].name}”? You can undo this.`)) return;
      project.pages.splice(i, 1);
      if (st.pageId === pid) st.pageId = project.pages[Math.max(0, i - 1)].id;
      st.sel = null;
      sfx.pop();
    }
    commit();
    render();
    refreshInspector(true);
  }

  function renamePage(pid, name) {
    const pg = project.pages.find((p) => p.id === pid);
    if (!pg) return;
    pg.name = name || 'Untitled';
    commit(true);
    renderTabs();
    // Nav bars list page names, so refresh them.
    paper.querySelectorAll('.pk-navbar[data-id]').forEach((n) => renderOne(n.dataset.id));
  }

  function renderOverview() {
    const W = 1200;
    ov.innerHTML = `<div class="ov-head"><h2>All pages</h2><p>Click a page to edit it. Your nav bar links to each of these.</p></div><div class="ov-grid">${project.pages
      .map((pg, i) => `<button class="ov-card" data-ptab="${pg.id}" style="--i:${i}">
        <div class="ov-prev"><div class="pk-doc ov-doc" style="${esc(themeVars(project.theme))};width:${W}px;padding:0 40px 40px">${renderList(pg.blocks, { editing: false, static: true, mode: 'site', pages: project.pages, pageId: pg.id, pageHref: () => '#' })}</div></div>
        <span class="ov-name">${i === 0 ? '🏠 ' : ''}${esc(pg.name)}<small>${pg.blocks.length} blocks</small></span></button>`)
      .join('')}<button class="ov-card ov-add" data-ptab-add><span>+</span>Add a page</button></div>`;
    requestAnimationFrame(() => ov.querySelectorAll('.ov-prev').forEach((pv) => (pv.firstChild.style.transform = `scale(${pv.clientWidth / W})`)));
  }

  function setOverview(v) {
    st.overview = v;
    st.sel = null;
    edEl.classList.toggle('overviewing', v);
    ov.hidden = !v;
    render();
    refreshInspector();
    stage.scrollTo({ top: 0 });
  }

  // Nav bars & footers are shared: editing one updates the matching block on every page.
  function syncShared(b) {
    if (!site || !BLOCKS[b.type]?.shared) return;
    project.pages.forEach((pg) =>
      walk(pg.blocks, (o) => {
        if (o !== b && o.type === b.type) {
          o.props = clone(b.props);
          o.style = clone(b.style);
        }
      }),
    );
  }

  // A newly added nav bar/footer copies the one the site already has.
  function adoptShared(b) {
    if (!site || !BLOCKS[b.type]?.shared) return;
    let src = null;
    project.pages.forEach((pg) => walk(pg.blocks, (o) => (src ||= o !== b && o.type === b.type ? o : null)));
    if (src) {
      b.props = clone(src.props);
      b.style = clone(src.style);
    }
  }

  // ---------------- selection & overlay chrome ----------------
  const selEl = () => (st.sel ? paper.querySelector(`.pk-b[data-id="${st.sel}"]`) : null);

  function markSelection() {
    paper.querySelectorAll('.is-selected').forEach((e) => e.classList.remove('is-selected'));
    selEl()?.classList.add('is-selected');
    placeChrome();
  }

  function slotInfo(bid) {
    const el = paper.querySelector(`.pk-b[data-id="${bid}"]`);
    const key = el?.parentElement?.dataset.slot || 'root';
    if (key === 'root') return { key };
    const [pid, si] = key.split(':');
    return { key, pid, si: +si, parent: findBlock(B(), pid) };
  }

  function placeChrome() {
    const el = selEl();
    const rs = overlay.querySelectorAll('.rs');
    if (!el || st.preview || st.overview) {
      bar.style.display = tag.style.display = 'none';
      rs.forEach((h) => (h.style.display = 'none'));
      return;
    }
    const base = overlay.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const hit = findBlock(B(), st.sel);
    if (!hit) return;
    const def = BLOCKS[hit.block.type];
    const info = slotInfo(st.sel);
    const inCols = info.parent?.block.type === 'columns';
    bar.querySelector('[data-bb="parent"]').style.display = info.parent ? '' : 'none';
    bar.querySelector('[data-bb="left"]').style.display = inCols ? '' : 'none';
    bar.querySelector('[data-bb="right"]').style.display = inCols ? '' : 'none';
    bar.querySelector('[data-bb="left"]').disabled = inCols && info.si === 0;
    bar.querySelector('[data-bb="right"]').disabled = inCols && info.si === info.parent.block.slots.length - 1;
    const top = Math.max(r.top - base.top - 38, stage.scrollTop + 4);
    bar.style.display = tag.style.display = 'flex';
    bar.style.top = `${top}px`;
    bar.style.left = `${Math.max(4, Math.min(r.right - base.left, base.width - 8) - bar.offsetWidth)}px`;
    tag.style.top = `${top}px`;
    tag.style.left = `${r.left - base.left}px`;
    tag.style.setProperty('--c', groupColor(def.group));
    tag.innerHTML = `${def.icon}<span>${def.label}</span>`;
    $('#bb-drag').dataset.dragId = st.sel;
    const L = r.left - base.left;
    const T = r.top - base.top;
    const [hx, hy, hxy] = rs;
    Object.assign(hx.style, { display: 'block', left: `${L + r.width + 4}px`, top: `${T + r.height / 2 - 16}px` });
    Object.assign(hy.style, { display: 'block', left: `${L + r.width / 2 - 16}px`, top: `${T + r.height + 4}px` });
    Object.assign(hxy.style, { display: 'block', left: `${L + r.width + 1}px`, top: `${T + r.height + 1}px` });
  }

  function select(bid, scroll = false) {
    if (st.sel === bid) return placeChrome();
    st.sel = bid;
    markSelection();
    refreshInspector();
    if (scroll && bid) selEl()?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------------- history & saving ----------------
  const snap = () => JSON.stringify({ b: project.blocks, pg: project.pages, t: project.theme, ps: project.pageSize, n: project.name, m: project.margin, pn: project.pageNumbers });
  let last = snap();
  let commitT;
  function commit(debounced = false) {
    clearTimeout(commitT);
    const go = () => {
      const now = snap();
      if (now === last) return;
      st.hist.push(last);
      if (st.hist.length > 150) st.hist.shift();
      st.fut = [];
      last = now;
      persist();
      updateStats();
    };
    debounced ? (commitT = setTimeout(go, 450)) : go();
  }
  function restore(s) {
    const o = JSON.parse(s);
    Object.assign(project, { blocks: o.b, pages: o.pg, theme: o.t, pageSize: o.ps, name: o.n, margin: o.m, pageNumbers: o.pn });
    if (!site) delete project.pages;
    else delete project.blocks;
    $('#ed-name').value = o.n;
    last = s;
    if (site && !project.pages.some((p) => p.id === st.pageId)) st.pageId = project.pages[0].id;
    if (st.sel && !findBlock(B(), st.sel)) st.sel = null;
    render();
    refreshInspector();
    persist();
  }
  function undo() {
    commit();
    if (!st.hist.length) return toast('Nothing to undo');
    st.fut.push(last);
    restore(st.hist.pop());
    sfx.tick();
  }
  function redo() {
    if (!st.fut.length) return toast('Nothing to redo');
    st.hist.push(last);
    restore(st.fut.pop());
    sfx.tick();
  }

  let saveT;
  const dot = $('#save-dot');
  function persist() {
    dot.textContent = 'saving…';
    dot.className = 'save-dot busy';
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const ok = putProject(project);
      dot.textContent = ok ? 'saved' : 'not saved!';
      dot.className = `save-dot${ok ? '' : ' err'}`;
      if (!ok) toast('Browser storage is full — try smaller images, or export a Plonk file to keep your work.', 'err');
    }, 350);
  }

  function updateStats() {
    const el = $('#stats');
    if (!el) return;
    let words = 0;
    const count = (v) => {
      if (typeof v === 'string') words += inlineToText(v).split(/\s+/).filter((w) => /\w/.test(w)).length;
      else if (Array.isArray(v)) v.forEach(count);
      else if (v && typeof v === 'object') Object.values(v).forEach(count);
    };
    walk(project.blocks, (b) => ['text', 'heading', 'list', 'quote', 'callout', 'table', 'checklist', 'footnote', 'badges'].includes(b.type) && count(b.props));
    el.textContent = `${words} words · ~${Math.max(1, Math.round(words / 230))} min read`;
  }

  // ---------------- block operations ----------------
  function insertBlock(b, slotKey, index, at) {
    const list = resolveSlot(B(), slotKey);
    if (!list) return;
    list.splice(index ?? list.length, 0, b);
    st.sel = b.id;
    adoptShared(b);
    render();
    refreshInspector();
    commit();
    landed(b.id, at);
  }

  function landed(bid, at) {
    const el = paper.querySelector(`.pk-b[data-id="${bid}"]`);
    if (!el) return;
    el.classList.add('plonk-in');
    setTimeout(() => el.classList.remove('plonk-in'), 600);
    const r = el.getBoundingClientRect();
    if (!at && (r.top < 0 || r.bottom > innerHeight)) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    sfx.plonk();
    setTimeout(() => {
      const r2 = el.getBoundingClientRect();
      burst(at?.x ?? r2.left + r2.width / 2, r2.top + 4);
    }, 120);
    const first = el.querySelector('[data-edit],[data-edit-list]');
    if (first && ['heading', 'text'].includes(findBlock(B(), bid)?.block.type)) setTimeout(() => focusEnd(first, true), 30);
  }

  function moveTo(bid, slotKey, index) {
    const hit = findBlock(B(), bid);
    if (!hit) return;
    const [b] = hit.list.splice(hit.index, 1);
    const list = resolveSlot(B(), slotKey);
    if (!list) {
      hit.list.splice(hit.index, 0, b);
      return;
    }
    list.splice(Math.min(index, list.length), 0, b);
    render();
    commit();
    bounce(selEl());
    sfx.plonk();
  }

  const bounce = (el) => {
    el?.classList.add('plonk-in');
    setTimeout(() => el?.classList.remove('plonk-in'), 600);
  };

  function removeBlock(bid) {
    const hit = findBlock(B(), bid);
    if (!hit) return;
    const el = paper.querySelector(`.pk-b[data-id="${bid}"]`);
    const next = hit.list[hit.index + 1] || hit.list[hit.index - 1];
    const parent = slotInfo(bid).pid || null;
    const doIt = () => {
      hit.list.splice(hit.index, 1);
      st.sel = next?.id || parent;
      render();
      refreshInspector();
      commit();
    };
    sfx.pop();
    if (el) {
      el.classList.add('poof');
      setTimeout(doIt, 180);
    } else doIt();
  }

  function duplicate(bid) {
    const hit = findBlock(B(), bid);
    if (!hit) return;
    const copy = reId(clone(hit.block));
    hit.list.splice(hit.index + 1, 0, copy);
    st.sel = copy.id;
    render();
    refreshInspector();
    commit();
    landed(copy.id);
  }

  // Up/down. At the edge of a column the block first slides to the column's
  // middle/bottom, then pops out of the columns block entirely.
  function nudge(bid, dir) {
    const hit = findBlock(B(), bid);
    if (!hit) return;
    const j = hit.index + dir;
    if (j >= 0 && j < hit.list.length) {
      [hit.list[hit.index], hit.list[j]] = [hit.list[j], hit.list[hit.index]];
      render();
      commit();
      bounce(selEl());
      return sfx.tick();
    }
    const info = slotInfo(bid);
    if (!info.parent) return toast(`Already at the ${dir > 0 ? 'bottom' : 'top'} of the page`);
    const pb = info.parent.block;
    if (pb.type === 'columns') {
      const order = ['start', 'center', 'end'];
      const ca = (pb.props.colAlign ||= []);
      const cur = order.indexOf(ca[info.si] || (pb.props.valign === 'stretch' ? 'start' : pb.props.valign) || 'start');
      const nk = cur + dir;
      if (nk >= 0 && nk <= 2) {
        ca[info.si] = order[nk];
        render();
        // No spare room in the column? Make the whole columns block taller so the move is visible.
        const col = paper.querySelector(`.pk-b[data-id="${bid}"]`)?.closest('.pk-col');
        const slotEl = col?.querySelector(':scope > .pk-slot');
        if (col && slotEl && slotEl.offsetHeight >= col.clientHeight - 4 && nk !== 0) {
          const colsEl = col.closest('.pk-b');
          pb.style.minh = Math.round(colsEl.offsetHeight + 140);
          render();
          toast('Made the columns taller — drag the pink bottom handle to fine-tune.');
        } else toast(`Moved to the ${['top', 'middle', 'bottom'][nk]} of the column`);
        commit();
        bounce(selEl());
        return sfx.tick();
      }
    }
    // Pop out of the container.
    hit.list.splice(hit.index, 1);
    info.parent.list.splice(info.parent.index + (dir > 0 ? 1 : 0), 0, hit.block);
    render();
    commit();
    bounce(selEl());
    sfx.plonk();
    toast(`Moved out of the ${BLOCKS[pb.type].label.toLowerCase()}`);
  }

  function shiftColumn(bid, dir) {
    const info = slotInfo(bid);
    const pb = info.parent?.block;
    if (pb?.type !== 'columns') return;
    const to = info.si + dir;
    if (to < 0 || to >= pb.slots.length) return;
    const hit = findBlock(B(), bid);
    hit.list.splice(hit.index, 1);
    pb.slots[to].splice(Math.min(hit.index, pb.slots[to].length), 0, hit.block);
    render();
    commit();
    bounce(selEl());
    sfx.tick();
  }

  // Where does a click-added brick go? Right after the selection, else the end.
  function clickAdd(type) {
    if (!blockAllowed(type, project.mode)) return;
    const b = makeBlock(type);
    const hit = st.sel && findBlock(B(), st.sel);
    if (hit) {
      hit.list.splice(hit.index + 1, 0, b);
      st.sel = b.id;
      adoptShared(b);
      render();
      refreshInspector();
      commit();
      landed(b.id);
    } else insertBlock(b, 'root');
  }

  function newParagraphAfter(bid) {
    const hit = findBlock(B(), bid);
    if (!hit) return;
    const b = makeBlock('text', { text: '' });
    hit.list.splice(hit.index + 1, 0, b);
    st.sel = b.id;
    render();
    refreshInspector();
    commit();
    paper.querySelector(`.pk-b[data-id="${b.id}"] [data-edit]`)?.focus();
    sfx.tick();
  }

  // ---------------- clipboard (blocks) ----------------
  function copyBlock(bid) {
    const hit = findBlock(B(), bid);
    if (!hit) return;
    try {
      localStorage.setItem(CLIP_KEY, JSON.stringify(hit.block));
    } catch {}
    st.clip = clone(hit.block);
    toast(`Copied ${BLOCKS[hit.block.type].label} — Ctrl+V to paste`);
  }
  function pasteBlock() {
    let b = st.clip;
    try {
      b = JSON.parse(localStorage.getItem(CLIP_KEY)) || b;
    } catch {}
    if (!b) return toast('Nothing copied yet');
    let ok = true;
    walk([b], (x) => (ok &&= blockAllowed(x.type, project.mode)));
    if (!ok) return toast(`That block doesn’t fit in a ${site ? 'website' : 'document'}`, 'err');
    const copy = reId(clone(b));
    const hit = st.sel && findBlock(B(), st.sel);
    if (hit) {
      hit.list.splice(hit.index + 1, 0, copy);
      st.sel = copy.id;
      render();
      refreshInspector();
      commit();
      landed(copy.id);
    } else insertBlock(copy, 'root');
  }

  // ---------------- inspector API ----------------
  const api = {
    get project() { return project; },
    get blocks() { return B(); },
    get pageId() { return st.pageId; },
    get sel() { return st.sel ? findBlock(B(), st.sel)?.block : null; },
    groupColor,
    stats: () => $('#stats')?.textContent || '',
    setProp(path, v, live, refresh) {
      const b = api.sel;
      if (!b) return;
      setPath(b.props, path, v);
      if (b.type === 'columns' && path === 'n') resizeColumns(b, +v);
      syncShared(b);
      renderOne(b.id);
      if (b.type === 'heading') refreshToc();
      commit(live);
      // Only redraw the panel when a field's options change — never while typing.
      if (refresh || (b.type === 'badges' && path === 'layout') || (b.type === 'pricing' && !live)) refreshInspector(true);
    },
    setStyle(patch, live) {
      const b = api.sel;
      if (!b) return;
      Object.entries(patch).forEach(([k, v]) => (v === '' || v == null || v === false ? delete b.style[k] : (b.style[k] = v)));
      if (b.style.maxw >= 100) delete b.style.maxw;
      if (b.style.opacity === 100) delete b.style.opacity;
      if (b.style.rotate === 0) delete b.style.rotate;
      if (!b.style.minh) delete b.style.minh;
      if (b.style.size === 10 && patch.size === 10) delete b.style.size;
      syncShared(b);
      renderOne(b.id);
      placeChrome();
      commit(live);
    },
    applyLook(k) {
      if (!api.sel) return;
      api.setStyle({ ...LOOKS[k].style });
      sfx.pick();
      refreshInspector(true);
    },
    setTheme(patch, live) {
      Object.assign(project.theme, patch);
      project.theme.preset = null;
      paper.style.cssText = insp.style.cssText = themeVars(project.theme);
      layoutPaper();
      commit(live);
    },
    setThemePreset(k) {
      project.theme = { ...THEMES[k], base: project.theme.base, preset: k };
      render();
      refreshInspector(true);
      commit();
      sfx.pick();
    },
    setMeta(patch) {
      Object.assign(project, patch);
      render();
      refreshInspector(true);
      commit();
    },
    select,
    refreshInspector: () => refreshInspector(true),
    action(a) {
      if (a === 'deselect') select(null);
      if (a === 'dup' && st.sel) duplicate(st.sel);
      if (a === 'del' && st.sel) removeBlock(st.sel);
      if (a === 'copy' && st.sel) copyBlock(st.sel);
      if (a === 'reset-style' && api.sel) {
        const b = api.sel;
        b.style = BLOCKS[b.type].style?.() || {};
        syncShared(b);
        renderOne(b.id);
        refreshInspector(true);
        commit();
      }
    },
    tableSize(op) {
      const b = api.sel;
      const rows = b.props.rows;
      const cols = rows[0].length;
      if (op === 'row+') rows.push(Array(cols).fill(''));
      if (op === 'row-' && rows.length > 1) rows.pop();
      if (op === 'col+') rows.forEach((r) => r.push(''));
      if (op === 'col-' && cols > 1) rows.forEach((r) => r.pop());
      renderOne(b.id);
      refreshInspector(true);
      commit();
    },
    countChange(key, d) {
      const b = api.sel;
      const f = BLOCKS[b.type].fields.find((x) => x.key === key);
      const arr = getPath(b.props, key);
      if (d > 0) arr.push(f.make());
      else if (arr.length > 1) arr.pop();
      if (b.type === 'pricing' && +b.props.featured >= arr.length) b.props.featured = arr.length - 1;
      renderOne(b.id);
      refreshInspector(true);
      commit();
      sfx.tick();
    },
    // Editable string lists (tags): set / add / del / up.
    listOp(key, op, i, value = '') {
      const b = api.sel;
      if (!b) return;
      const arr = getPath(b.props, key);
      const clean = esc(String(value).trim());
      if (op === 'set') {
        arr[i] = clean;
        renderOne(b.id);
        return commit(true); // keep typing — no panel redraw
      }
      if (op === 'add') {
        if (!clean) return toast('Type a tag first');
        arr.push(clean);
      }
      if (op === 'del') {
        if (arr.length <= 1) return toast('Keep at least one tag — or delete the whole block');
        arr.splice(i, 1);
      }
      if (op === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      renderOne(b.id);
      commit();
      refreshInspector(true);
      sfx.tick();
      if (op === 'add') insp.querySelector('[data-tag-new]')?.focus();
    },
    async addImages(key, files) {
      const b = api.sel;
      const urls = await Promise.all(files.filter((f) => f.type.startsWith('image/')).map(shrinkImage));
      getPath(b.props, key).push(...urls);
      renderOne(b.id);
      refreshInspector(true);
      commit();
    },
    removeImage(i) {
      const b = api.sel;
      b.props.images.splice(i, 1);
      renderOne(b.id);
      refreshInspector(true);
      commit();
    },
    openPage: (pid) => openPage(pid),
    pageAction,
    renamePage,
    uploadImage: shrinkImage,
  };

  function refreshToc() {
    clearTimeout(st.tocT);
    st.tocT = setTimeout(() => {
      walk(B(), (x) => x.type === 'toc' && renderOne(x.id));
    }, 300);
  }

  function resizeColumns(b, n) {
    while (b.slots.length < n) b.slots.push([]);
    while (b.slots.length > n) {
      const extra = b.slots.pop();
      b.slots.at(-1).push(...extra);
    }
    b.props.colAlign = (b.props.colAlign || []).slice(0, n);
  }

  function refreshInspector(keep = false) {
    const sc = insp.scrollTop;
    insp.style.cssText = themeVars(project.theme);
    renderInspector(insp, api);
    insp.scrollTop = keep ? sc : 0;
  }
  bindInspector(insp, api);

  // ---------------- canvas events ----------------
  on(paper, 'input', (e) => {
    const el = e.target.closest('[data-edit],[data-edit-list]');
    const blkEl = e.target.closest('.pk-b[data-id]');
    if (!el || !blkEl) return;
    const hit = findBlock(B(), blkEl.dataset.id);
    if (!hit) return;
    if (el.dataset.editList) {
      const items = [...el.querySelectorAll('li')].map((li) => sanitizeInline(li.innerHTML));
      setPath(hit.block.props, el.dataset.editList, items.length ? items : ['']);
    } else {
      const v = el.hasAttribute('data-plain') ? el.innerText.replace(/\n$/, '') : sanitizeInline(el.innerHTML);
      setPath(hit.block.props, el.dataset.edit, v);
    }
    if (BLOCKS[hit.block.type].shared) syncShared(hit.block);
    if (hit.block.type === 'heading' || hit.block.type === 'hero') refreshToc();
    commit(true);
    placeChrome();
    layoutPaperSoon();
  });

  let lpT;
  const layoutPaperSoon = () => {
    cancelAnimationFrame(lpT);
    lpT = requestAnimationFrame(layoutPaper);
  };

  on(paper, 'keydown', (e) => {
    const el = e.target.closest?.('[data-edit]');
    const blkEl = e.target.closest?.('.pk-b[data-id]');
    if (!blkEl) return;
    const hit = findBlock(B(), blkEl.dataset.id);
    if (!hit) return;
    const type = hit.block.type;

    // Ctrl/Cmd+Enter anywhere: start a fresh paragraph block below.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      return newParagraphAfter(hit.block.id);
    }
    if (!el) return; // lists handle their own Enter
    if (type === 'checklist') return checklistKeys(e, el, hit.block);

    if (e.key === 'Enter' && !el.hasAttribute('data-plain')) {
      e.preventDefault();
      if (type === 'heading') return newParagraphAfter(hit.block.id);
      // Paragraphs (and other text) keep going in the same block.
      if (['text', 'quote', 'callout', 'footnote', 'testimonial', 'faq', 'features', 'hero', 'contact', 'footer', 'toc'].includes(type) || e.shiftKey) {
        document.execCommand('insertLineBreak');
      } else el.blur();
      return;
    }
    if (e.key === 'Backspace' && type === 'text' && !el.textContent && !el.querySelector('img') && hit.list.length > 1) {
      e.preventDefault();
      const prev = hit.list[hit.index - 1];
      hit.list.splice(hit.index, 1);
      st.sel = prev?.id || null;
      render();
      refreshInspector();
      commit();
      const pe = prev && paper.querySelector(`.pk-b[data-id="${prev.id}"] [data-edit]`);
      if (pe) focusEnd(pe);
    }
  });

  function checklistKeys(e, el, b) {
    const i = +el.dataset.edit.split('.')[1];
    if (e.key === 'Enter') {
      e.preventDefault();
      b.props.items.splice(i + 1, 0, { t: '', done: false });
      renderOne(b.id);
      commit();
      paper.querySelector(`.pk-b[data-id="${b.id}"] [data-edit="items.${i + 1}.t"]`)?.focus();
    } else if (e.key === 'Backspace' && !el.textContent && b.props.items.length > 1) {
      e.preventDefault();
      b.props.items.splice(i, 1);
      renderOne(b.id);
      commit();
      const prev = paper.querySelector(`.pk-b[data-id="${b.id}"] [data-edit="items.${Math.max(0, i - 1)}.t"]`);
      if (prev) focusEnd(prev);
    }
  }

  on(paper, 'paste', (e) => {
    if (!e.target.closest?.('[data-edit],[data-edit-list]')) return;
    const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
    e.preventDefault();
    if (file) return void shrinkImage(file).then((src) => addImage(src));
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  });

  // Links: page links and #anchors work inside the editor, like a real site.
  on(paper, 'click', (e) => {
    const box = e.target.closest('[data-check]');
    if (box && !st.preview) {
      const hit = findBlock(B(), box.closest('.pk-b[data-id]').dataset.id);
      const it = hit.block.props.items[+box.dataset.check];
      it.done = !it.done;
      renderOne(hit.block.id);
      commit();
      return sfx.tick();
    }
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    const editable = a.isContentEditable && !st.preview;
    const follow = !editable || e.ctrlKey || e.metaKey;
    if (!follow) return;
    if (a.dataset.page) return openPage(a.dataset.page);
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#') && href.length > 1) return scrollToAnchor(decodeURIComponent(href.slice(1)));
    if (/^(https?:|mailto:|tel:)/.test(href) && st.preview) window.open(href, '_blank', 'noopener');
  });

  on(stage, 'pointerdown', (e) => {
    if (st.preview || st.overview || e.target.closest('.blk-bar,.fmt-bar,.rs,.browser-bar')) return;
    const blk = e.target.closest('.pk-b[data-id]');
    if (blk) select(blk.dataset.id);
    else if (!e.target.closest('.paper')) select(null);
  });

  let hoverEl = null;
  on(paper, 'pointerover', (e) => {
    const b = e.target.closest('.pk-b[data-id]');
    if (b === hoverEl) return;
    hoverEl?.classList.remove('is-hover');
    hoverEl = b;
    b?.classList.add('is-hover');
  });
  on(paper, 'pointerleave', () => {
    hoverEl?.classList.remove('is-hover');
    hoverEl = null;
  });

  on(bar, 'click', (e) => {
    const btn = e.target.closest('[data-bb]');
    if (!btn || btn.disabled || !st.sel) return;
    const a = btn.dataset.bb;
    if (a === 'up') nudge(st.sel, -1);
    if (a === 'down') nudge(st.sel, 1);
    if (a === 'left') shiftColumn(st.sel, -1);
    if (a === 'right') shiftColumn(st.sel, 1);
    if (a === 'dup') duplicate(st.sel);
    if (a === 'del') removeBlock(st.sel);
    if (a === 'parent') select(slotInfo(st.sel).pid);
  });

  // ---------------- resize handles ----------------
  on(overlay, 'pointerdown', (e) => {
    const h = e.target.closest('[data-rs]');
    if (!h || !st.sel) return;
    e.preventDefault();
    e.stopPropagation();
    const kind = h.dataset.rs;
    const b = api.sel;
    const el = selEl();
    const r0 = el.getBoundingClientRect();
    const parentW = el.parentElement.getBoundingClientRect().width;
    const s = b.style;
    const pos = s.balign || (s.align === 'left' || s.align === 'right' ? s.align : 'center');
    const k = pos === 'center' ? 2 : 1;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const h0 = r0.height / st.scale;
    const badge = $('#rs-badge');
    document.body.classList.add('is-resizing');
    const move = (ev) => {
      if (kind.includes('x')) {
        const w = r0.width + k * (ev.clientX - x0);
        const pct = Math.max(10, Math.min(100, Math.round((w / parentW) * 100)));
        if (pct >= 100) delete s.maxw;
        else s.maxw = pct;
      }
      if (kind.includes('y')) s.minh = Math.max(24, Math.round((h0 + (ev.clientY - y0) / st.scale) / 4) * 4);
      renderOne(b.id);
      const r = selEl().getBoundingClientRect();
      const base = overlay.getBoundingClientRect();
      badge.style.display = 'block';
      badge.style.left = `${r.right - base.left + 12}px`;
      badge.style.top = `${r.bottom - base.top + 12}px`;
      badge.textContent = `${s.maxw || 100}% × ${s.minh ? s.minh + 'px' : 'auto'}`;
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.body.classList.remove('is-resizing');
      badge.style.display = 'none';
      syncShared(b);
      commit();
      refreshInspector(true);
      sfx.tick();
    };
    document.addEventListener('pointermove', move, { signal: ac.signal });
    document.addEventListener('pointerup', up, { once: true, signal: ac.signal });
  });
  on(overlay, 'dblclick', (e) => {
    const h = e.target.closest('[data-rs]');
    if (!h || !api.sel) return;
    // Double-click a handle to reset that dimension.
    const s = api.sel.style;
    if (h.dataset.rs.includes('x')) delete s.maxw;
    if (h.dataset.rs.includes('y')) delete s.minh;
    renderOne(st.sel);
    commit();
    refreshInspector(true);
    toast('Size reset');
  });

  on(stage, 'scroll', () => placeFmt(), { passive: true });
  new ResizeObserver(() => layoutPaperSoon()).observe(stage);
  new ResizeObserver(() => {
    sizer.style.height = `${wrap.offsetHeight * (st.scale || 1)}px`;
    placeChrome();
  }).observe(wrap);

  // Drop image files straight from the desktop.
  on(stage, 'dragover', (e) => {
    if ([...e.dataTransfer.items].some((i) => i.kind === 'file')) {
      e.preventDefault();
      stage.classList.add('file-over');
    }
  });
  on(stage, 'dragleave', () => stage.classList.remove('file-over'));
  on(stage, 'drop', (e) => {
    stage.classList.remove('file-over');
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    files.forEach((f) => shrinkImage(f).then((src) => addImage(src)));
  });

  function addImage(src) {
    const b = makeBlock('image', { src });
    const hit = st.sel && findBlock(B(), st.sel);
    (hit ? hit.list : B()).splice(hit ? hit.index + 1 : B().length, 0, b);
    st.sel = b.id;
    render();
    refreshInspector();
    commit();
    landed(b.id);
  }

  // ---------------- page tabs & overview ----------------
  if (site) {
    const bb = root.querySelector('.browser-bar');
    const onTab = (e) => {
      if (e.target.closest('[data-ptab-add]')) return newPage(uniqueName('New page'));
      const t = e.target.closest('[data-ptab]');
      if (t) openPage(t.dataset.ptab);
    };
    on(bb, 'click', (e) => (e.target.closest('#ov-btn') ? setOverview(!st.overview) : onTab(e)));
    on(ov, 'click', onTab);
    on(bb, 'dblclick', (e) => {
      const t = e.target.closest('[data-ptab]');
      if (!t) return;
      const pg = project.pages.find((p) => p.id === t.dataset.ptab);
      const name = prompt('Rename page', pg.name);
      if (name?.trim()) {
        renamePage(pg.id, name.trim());
        commit();
        refreshInspector(true);
      }
    });
  }

  // ---------------- floating format bar ----------------
  function placeFmt() {
    const sel = document.getSelection();
    const node = sel?.anchorNode;
    const host = node && (node.nodeType === 1 ? node : node.parentElement)?.closest('[data-edit]:not([data-plain]),[data-edit-list]');
    if (!host || sel.isCollapsed || !paper.contains(host)) {
      fmt.classList.remove('on');
      return;
    }
    const r = sel.getRangeAt(0).getBoundingClientRect();
    const base = stage.getBoundingClientRect();
    fmt.classList.add('on');
    fmt.style.left = `${r.left + r.width / 2 - base.left + stage.scrollLeft - fmt.offsetWidth / 2}px`;
    fmt.style.top = `${r.top - base.top + stage.scrollTop - 48}px`;
  }
  on(document, 'selectionchange', placeFmt);
  on(fmt, 'pointerdown', (e) => e.preventDefault());
  on(fmt, 'click', (e) => {
    const c = e.target.closest('[data-fmt]')?.dataset.fmt;
    if (!c) return;
    if (c === 'link') {
      const url = prompt('Link to where? (https://… or #anchor)', 'https://');
      if (url) document.execCommand('createLink', false, url);
    } else document.execCommand(c);
    sfx.tick();
  });

  // ---------------- drag & drop ----------------
  initDnd({
    stage,
    overlay,
    signal: ac.signal,
    ghostFor: (type, bid) => {
      const t = type || findBlock(B(), bid)?.block.type;
      const def = BLOCKS[t];
      return `<div class="brick" style="--c:${groupColor(def.group)}"><span class="brick-ico">${def.icon}</span>${def.label}</div>`;
    },
    onStart: () => {
      sfx.pick();
      fmt.classList.remove('on');
    },
    onClickNew: clickAdd,
    onDrop: ({ type, id: bid, slot, index, x, y }) => {
      if (st.overview) return;
      if (type) insertBlock(makeBlock(type), slot, index, { x, y });
      else moveTo(bid, slot, index);
    },
  });

  // ---------------- top bar ----------------
  on($('#ed-name'), 'input', (e) => {
    project.name = e.target.value || 'Untitled';
    if (site) renderTabs();
    commit(true);
  });
  on($('#insp-toggle'), 'click', () => edEl.classList.toggle('show-insp'));
  on($('#undo'), 'click', undo);
  on($('#redo'), 'click', redo);
  on($('#zoom'), 'change', (e) => {
    st.zoom = e.target.value;
    layoutPaper();
  });
  on($('#mute'), 'click', (e) => {
    setMuted(!isMuted());
    e.currentTarget.textContent = isMuted() ? '🔇' : '🔊';
    sfx.pick();
  });
  $('#vp') &&
    on($('#vp'), 'click', (e) => {
      const v = e.target.closest('[data-vp]')?.dataset.vp;
      if (!v) return;
      st.viewport = v;
      $('#vp').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.vp === v));
      layoutPaper();
      setTimeout(placeChrome, 380);
      sfx.tick();
    });
  on($('#preview'), 'click', () => setPreview(!st.preview));
  $('#open-site') && on($('#open-site'), 'click', () => openSitePreview(project));

  function setPreview(v) {
    st.preview = v;
    edEl.classList.toggle('previewing', v);
    $('#preview').textContent = v ? '✎ Back to editing' : '👁 Preview';
    if (v && st.overview) setOverview(false);
    render();
    setTimeout(layoutPaper, 320);
    if (v) toast(site ? 'Preview — click the nav links to hop between pages. Esc to exit.' : 'Preview — Esc to exit.');
  }

  const modal = $('#export-modal');
  const help = $('#help-modal');
  on($('#help'), 'click', () => (help.hidden = false));
  on(help, 'click', (e) => (e.target === help || e.target.closest('[data-close]')) && (help.hidden = true));

  on($('#export'), 'click', () => {
    commit();
    modal.hidden = false;
    sfx.pick();
  });
  on(modal, 'click', async (e) => {
    if (e.target === modal || e.target.closest('[data-close]')) return void (modal.hidden = true);
    const tile = e.target.closest('[data-format]');
    if (!tile) return;
    const f = tile.dataset.format;
    const busy = $('#busy');
    busy.hidden = false;
    $('#busy-msg').textContent = 'Building your file…';
    try {
      await runExport(project, f, (m) => ($('#busy-msg').textContent = m), st.pageId);
      sfx.tada();
      const r = tile.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 24);
      if (f !== 'print') toast('Downloaded! 🎉');
    } catch (err) {
      console.error(err);
      toast(`Export failed: ${err.message}`, 'err');
    } finally {
      busy.hidden = true;
    }
  });

  // ---------------- keyboard ----------------
  on(document, 'keydown', (e) => {
    const typing = e.target.closest?.('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"]');
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z') {
      e.preventDefault();
      return e.shiftKey ? redo() : undo();
    }
    if (mod && k === 'y') return void (e.preventDefault(), redo());
    if (mod && k === 's') return void (e.preventDefault(), commit(), toast('Saved in this browser ✓'));
    if (e.key === 'Escape') {
      if (!modal.hidden) return void (modal.hidden = true);
      if (!help.hidden) return void (help.hidden = true);
      if (st.preview) return setPreview(false);
      if (typing) return void e.target.blur();
      if (st.overview) return setOverview(false);
      return select(null);
    }
    if (typing) return;
    if (e.key === '?') return void (help.hidden = !help.hidden);
    if (k === 'p' && !mod) return setPreview(!st.preview);
    if (mod && k === 'v') return void (e.preventDefault(), pasteBlock());
    if (!st.sel) return;
    if (e.key === 'Delete' || e.key === 'Backspace') return void (e.preventDefault(), removeBlock(st.sel));
    if (mod && k === 'd') return void (e.preventDefault(), duplicate(st.sel));
    if (mod && k === 'c' && !getSelection().toString()) return void (e.preventDefault(), copyBlock(st.sel));
    if (e.altKey && e.key === 'ArrowUp') return void (e.preventDefault(), nudge(st.sel, -1));
    if (e.altKey && e.key === 'ArrowDown') return void (e.preventDefault(), nudge(st.sel, 1));
  });

  // ---------------- palette search ----------------
  on($('#pal-search'), 'input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    root.querySelectorAll('.pal [data-new-type]').forEach((b) => (b.hidden = q && !b.textContent.toLowerCase().includes(q)));
    root.querySelectorAll('.pal-group').forEach((g) => (g.hidden = ![...g.querySelectorAll('[data-new-type]')].some((b) => !b.hidden)));
  });

  render();
  refreshInspector();
  document.title = `${project.name} — Plonk`;
  return () => ac.abort();
}

function palette(mode) {
  return GROUPS.filter((g) => !g.modes || g.modes.includes(mode))
    .map((g) => {
      const items = Object.entries(BLOCKS).filter(([k, d]) => d.group === g.id && blockAllowed(k, mode));
      if (!items.length) return '';
      return `<div class="pal-group"><h3 style="--c:${g.color}">${g.label}</h3><div class="pal-grid">${items
        .map(([k, d], i) => `<button class="brick" data-new-type="${k}" style="--c:${g.color};--i:${i}" title="Drag or click to add">${d.shared && mode === 'site' ? '<i class="brick-shared" title="Shared on every page">🔗</i>' : ''}<span class="brick-ico">${d.icon}</span>${d.label}</button>`)
        .join('')}</div></div>`;
    })
    .join('');
}

function focusEnd(el, selectAll = false) {
  el.focus();
  const r = document.createRange();
  r.selectNodeContents(el);
  if (!selectAll) r.collapse(false);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

// Downscale big photos so projects fit in browser storage.
export function shrinkImage(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => {
      if (/gif|svg/.test(file.type)) return res(fr.result);
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const max = 1600;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

export function logoMini() {
  return `<svg viewBox="0 0 64 64" width="34" height="34"><rect x="6" y="24" width="30" height="30" rx="7" fill="#FF4FA3" stroke="#140F2D" stroke-width="4"/><rect x="28" y="8" width="30" height="30" rx="7" fill="#FFD23F" stroke="#140F2D" stroke-width="4"/></svg>`;
}
