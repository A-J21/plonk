// "What are we making?" — choose doc or website, then a starter template.
import { TEMPLATES } from '../templates.js';
import { THEMES, themeVars, PAGE_SIZES } from '../theme.js';
import { renderList } from '../blocks.js';
import { uid, putProject, loadAll, deleteProject } from '../store.js';
import { esc } from '../inline.js';
import { sfx, burst } from '../sfx.js';
import { navigate, toast } from '../main.js';

export function stashHTML(projects) {
  const ago = (t) => {
    const s = (Date.now() - t) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };
  return `<div class="stash">${projects
    .map((p, i) => `<a class="stash-card ${p.mode}" href="#/edit/${p.id}" style="--r:${((i % 3) - 1) * 1.2}deg;--bg:${esc(p.theme.bg)};--ac:${esc(p.theme.accent)}">
      <span class="stash-mode">${p.mode === 'site' ? '🌐 Website' : '📄 Document'}</span>
      <b>${esc(p.name)}</b><small>edited ${ago(p.updated)}</small>
      <button class="stash-del" data-del="${p.id}" title="Delete">✕</button></a>`)
    .join('')}</div>`;
}

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

function previewHTML(t, mode) {
  if (mode === 'doc') return renderList(t.blocks(), { editing: false, static: true, mode });
  const pages = t.pages().map((pg) => ({ ...pg, id: pg.id || pg.name }));
  return renderList(pages[0].blocks, { editing: false, static: true, mode, pages, pageId: pages[0].id, pageHref: () => '#' });
}

export function mountCreate(root) {
  const ac = new AbortController();
  const on = (el, ev, fn) => el.addEventListener(ev, fn, { signal: ac.signal });
  const projects = loadAll();

  root.innerHTML = `
  <div class="grain"></div>
  <nav class="h-nav">
    <a href="#/" class="wordmark">plonk<span>.</span></a>
    <div class="h-nav-links">
      <label class="btn-chunk ghost small"><input type="file" accept=".json,application/json" id="import" hidden>⬆ Open a Plonk file</label>
    </div>
  </nav>
  <section class="c-wrap">
    <h1 class="c-title">What are we <em>making</em> today?</h1>
    <div class="c-choices">
      <button class="choice choice-doc" data-mode="doc">
        <div class="choice-art doc-art"><i></i><i></i><i></i><span></span></div>
        <h2>Document</h2>
        <p>Résumés, letters, reports, zines. Paged paper you can print or export as PDF & Word.</p>
        <span class="choice-go">Pick paper →</span>
      </button>
      <span class="c-or">or</span>
      <button class="choice choice-site" data-mode="site">
        <div class="choice-art site-art"><div class="sa-bar"><i></i><i></i><i></i></div><div class="sa-hero"></div><div class="sa-row"><i></i><i></i><i></i></div></div>
        <h2>Website</h2>
        <p>Landing pages, portfolios, event pages. Responsive previews and a clean HTML export.</p>
        <span class="choice-go">Pick web →</span>
      </button>
    </div>
    <div class="c-templates" id="tpls" hidden></div>
    ${projects.length ? `<div class="c-stash"><h2 class="h-sec-title small">…or jump back in</h2>${stashHTML(projects)}</div>` : ''}
  </section>`;

  const tpls = root.querySelector('#tpls');
  on(root.querySelector('.c-choices'), 'click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    const mode = btn.dataset.mode;
    root.querySelectorAll('.choice').forEach((c) => c.classList.toggle('chosen', c === btn));
    root.querySelector('.c-choices').classList.add('has-choice');
    sfx.plonk();
    const r = btn.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + 30, 16);
    showTemplates(mode);
  });

  function showTemplates(mode) {
    const w = mode === 'doc' ? PAGE_SIZES.letter.w : 1200;
    tpls.hidden = false;
    tpls.innerHTML = `<h2 class="h-sec-title small">Start from…</h2><div class="tpl-grid">${TEMPLATES[mode]
      .map((t, i) => {
        const th = THEMES[t.theme];
        return `<button class="tpl" data-tpl="${t.id}" data-mode="${mode}" style="--i:${i}">
          <div class="tpl-prev ${mode}"><div class="pk-doc tpl-doc" style="${esc(themeVars({ ...th, base: 16 }))};width:${w}px;padding:${mode === 'doc' ? 72 : '0 40px 40px'}px">${previewHTML(t, mode)}</div></div>
          <span class="tpl-name">${t.emoji} ${t.name}${mode === 'site' ? `<small>${t.pages().length} pages</small>` : ''}</span></button>`;
      })
      .join('')}</div>`;
    tpls.querySelectorAll('.tpl-prev').forEach((pv) => {
      const doc = pv.firstChild;
      const k = pv.clientWidth / w;
      doc.style.transform = `scale(${k})`;
    });
    tpls.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  on(tpls, 'click', (e) => {
    const b = e.target.closest('[data-tpl]');
    if (!b) return;
    const tpl = TEMPLATES[b.dataset.mode].find((t) => t.id === b.dataset.tpl);
    const p = createProject(b.dataset.mode, tpl);
    sfx.tada();
    b.classList.add('launch');
    setTimeout(() => navigate(`#/edit/${p.id}`), 380);
  });

  on(root.querySelector('#import'), 'change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!(data.blocks || data.pages) || !data.mode) throw new Error('not a Plonk file');
      delete data.plonk;
      data.id = uid();
      putProject(data);
      navigate(`#/edit/${data.id}`);
    } catch (err) {
      toast(`Couldn’t open that file (${err.message}).`, 'err');
    }
  });

  on(root, 'click', (e) => {
    const del = e.target.closest('[data-del]');
    if (!del) return;
    e.preventDefault();
    if (confirm('Delete this project? This can’t be undone.')) {
      deleteProject(del.dataset.del);
      del.closest('.stash-card').remove();
      sfx.pop();
    }
  });

  return () => ac.abort();
}
