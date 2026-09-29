// Right-hand "Tweak" panel: block content fields, style controls and page settings.
import { BLOCKS, LOOKS } from './blocks.js';
import { FONTS, THEMES, fontStack, PAGE_SIZES, MARGINS } from './theme.js';
import { esc, inlineToText } from './inline.js';
import { getPath } from './store.js';

const SWATCHES = ['#140F2D', '#FFFFFF', '#FFF6E5', '#FF4FA3', '#FFD23F', '#3A5BFF', '#B6F23D', '#FF7A1A', '#8B5CF6', '#1FD1B5'];
const THEME_SW = [['var(--pk-accent)', 'Accent'], ['var(--pk-accent2)', 'Accent 2'], ['var(--pk-surface)', 'Surface'], ['var(--pk-text)', 'Text'], ['var(--pk-bg)', 'Page']];
const GRADIENTS = [
  'linear-gradient(135deg,#FF4FA3 0%,#FFD23F 100%)',
  'linear-gradient(135deg,#3A5BFF 0%,#1FD1B5 100%)',
  'linear-gradient(135deg,#7B2FF7 0%,#FF5D3A 100%)',
  'linear-gradient(135deg,#B6F23D 0%,#1FD1B5 100%)',
  'radial-gradient(circle at 20% 20%,#FFD23F 0,transparent 40%),radial-gradient(circle at 80% 70%,#FF4FA3 0,transparent 45%),#8B5CF6',
  'linear-gradient(180deg,#140F2D 0%,#3A2A7A 100%)',
];

const hexOf = (v) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : '#000000');

function colorField(key, value, label, { gradients = false, scope = 'style' } = {}) {
  const sw = (v, title = v) =>
    `<button class="sw${value === v ? ' on' : ''}" data-${scope}="${key}" data-val="${esc(v)}" title="${esc(title)}" style="background:${esc(v)}"></button>`;
  return `<div class="f"><label>${label}</label>
    <div class="swatches">
      ${THEME_SW.map(([v, t]) => sw(v, t)).join('')}<span class="sw-sep"></span>
      ${SWATCHES.map((v) => sw(v)).join('')}
      ${gradients ? `<span class="sw-sep"></span>${GRADIENTS.map((g) => sw(g, 'Gradient')).join('')}` : ''}
      <label class="sw sw-pick" title="Pick any colour"><input type="color" data-${scope}="${key}" value="${hexOf(value)}"><span>+</span></label>
      <button class="sw sw-clear" data-${scope}="${key}" data-val="" title="Clear">×</button>
    </div></div>`;
}

function rangeField(key, value, label, min, max, step = 1, scope = 'style', unit = 'px', autoLabel = 'auto') {
  const v = value ?? '';
  return `<div class="f"><label>${label}<output data-unit="${unit}">${v === '' ? autoLabel : v + unit}</output></label>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${v === '' ? min : v}" data-${scope}="${key}" data-num></div>`;
}

function segField(key, value, label, options, scope = 'style') {
  return `<div class="f"><label>${label}</label><div class="seg">${options
    .map(([v, t]) => `<button class="${String(value) === String(v) ? 'on' : ''}" data-${scope}="${key}" data-val="${esc(JSON.stringify(v))}" data-json>${t}</button>`)
    .join('')}</div></div>`;
}

function linkField(key, value, label, api) {
  const pages = api.project.pages || [];
  const isPage = String(value).startsWith('page:');
  return `<div class="f"><label>${label}</label>
    ${pages.length ? `<select data-prop="${key}" data-linksel><option value="__url" ${isPage ? '' : 'selected'}>A web address / #anchor…</option>${pages.map((p) => `<option value="page:${p.id}" ${value === 'page:' + p.id ? 'selected' : ''}>📄 Page: ${esc(p.name)}</option>`).join('')}</select>` : ''}
    ${isPage ? '' : `<input type="text" value="${esc(value)}" data-prop="${key}" placeholder="https://… or #section" style="margin-top:6px">`}</div>`;
}

function propField(f, b, api) {
  if (f.when && !f.when(b.props)) return '';
  const v = getPath(b.props, f.key);
  switch (f.type) {
    case 'seg': return segField(f.key, v, f.label, f.options, 'prop');
    case 'range': return rangeField(f.key, v, f.label, f.min, f.max, 1, 'prop');
    case 'color': return colorField(f.key, v, f.label, { scope: 'prop' });
    case 'toggle': return `<div class="f f-row"><label>${f.label}</label><button class="toggle${v ? ' on' : ''}" data-prop="${f.key}" data-val="${!v}" data-json><i></i></button></div>`;
    case 'text': return `<div class="f"><label>${f.label}</label><input type="text" value="${esc(v)}" data-prop="${f.key}"></div>`;
    case 'link': return linkField(f.key, v, f.label, api);
    case 'csv': return `<div class="f"><label>${f.label}</label><input type="text" value="${esc(v.map(inlineToText).join(', '))}" data-prop="${f.key}" data-csv></div>`;
    case 'taglist': return `<div class="f"><label>${f.label}<output data-unit="">${v.length}</output></label><div class="taglist" data-list="${f.key}">
      ${v.map((t, i) => `<div class="tl-row"><span class="tl-dot"></span><input type="text" value="${esc(inlineToText(t))}" data-tag-i="${i}" aria-label="Tag ${i + 1}">
        <button data-tag-op="up" data-i="${i}" title="Move up" ${i === 0 ? 'disabled' : ''}>↑</button><button data-tag-op="del" data-i="${i}" title="Delete tag">✕</button></div>`).join('')}
      <div class="tl-add"><input type="text" placeholder="Add a tag… (Enter)" data-tag-new aria-label="New tag"><button data-tag-op="add" title="Add tag">+ Add</button></div>
    </div></div>`;
    case 'links': return `<div class="f"><label>${f.label}</label><textarea rows="3" data-prop="${f.key}" data-links placeholder="Blog | https://…">${esc((v || []).map((l) => `${inlineToText(l.t)} | ${l.h}`).join('\n'))}</textarea></div>`;
    case 'count': return `<div class="f f-row"><label>${f.label}</label><div class="stepper"><button data-count="${f.key}" data-d="-1">−</button><span>${v.length}</span><button data-count="${f.key}" data-d="1">+</button></div></div>`;
    case 'featured': return segField(f.key, v, f.label, [[-1, 'None'], ...b.props.plans.map((p, i) => [i, inlineToText(p.name).slice(0, 9) || i + 1])], 'prop');
    case 'emoji': return `<div class="f"><label>${f.label}</label><div class="emojis">${['💡', '⚠️', '✅', '🔥', '📌', '🚀', '❤️', '✨', '🎯', '📣'].map((e) => `<button class="${v === e ? 'on' : ''}" data-prop="${f.key}" data-val="${e}">${e}</button>`).join('')}<input type="text" value="${esc(v)}" data-prop="${f.key}" maxlength="4"></div></div>`;
    case 'tablesize': return `<div class="f f-row"><label>${f.label}</label><div class="stepper">
      <button data-table="row-">−</button><span>${v.length} rows</span><button data-table="row+">+</button>
      <button data-table="col-">−</button><span>${v[0]?.length || 0} cols</span><button data-table="col+">+</button></div></div>`;
    case 'images': return `<div class="f"><label>${f.label}</label>
      <div class="thumbs">${v.map((src, i) => `<div class="thumb"><img src="${esc(src)}" alt=""><button data-rmimg="${i}" title="Remove">✕</button></div>`).join('')}
        <label class="thumb add" title="Add pictures"><input type="file" accept="image/*" multiple data-uploadmany="${f.key}" hidden>+</label></div></div>`;
    case 'image': return `<div class="f"><label>${f.label}</label>
      <div class="img-pick">${v ? `<img src="${esc(v)}" alt="">` : '<div class="img-none">No picture yet</div>'}
        <label class="btn-chunk small"><input type="file" accept="image/*" data-upload="${f.key}" hidden>⬆ Upload</label>
        ${v ? `<button class="btn-chunk small ghost" data-prop="${f.key}" data-val="">Remove</button>` : ''}
      </div>
      <input type="text" placeholder="…or paste an image URL" value="${v && !v.startsWith('data:') ? esc(v) : ''}" data-prop="${f.key}"></div>`;
  }
  return '';
}

export function renderInspector(panel, api) {
  const b = api.sel;
  panel.innerHTML = b ? blockPanel(b, api) : pagePanel(api);
}

function blockPanel(b, api) {
  const def = BLOCKS[b.type];
  const s = b.style || {};
  const site = api.project.mode === 'site';
  const anchorable = site && ['section', 'card', 'columns', 'heading', 'hero', 'features', 'pricing', 'faq', 'contact', 'gallery', 'testimonial'].includes(b.type);
  const content = def.fields.map((f) => propField(f, b, api)).join('');
  return `
  <div class="insp-head" style="--c:${api.groupColor(def.group)}">
    <span class="insp-ico">${def.icon}</span>
    <div><small>Tweaking</small><h3>${def.label}</h3></div>
    <button class="insp-x" data-act="deselect" title="Back to page settings (Esc)">✕</button>
  </div>
  ${def.shared && site ? `<p class="insp-tip">🔗 This ${def.label.toLowerCase()} is shared — edits update it on every page.</p>` : ''}
  ${content || anchorable ? `<section class="insp-sec"><h4>Content</h4>${content}
    ${anchorable ? `<div class="f"><label>Anchor name (link to it with #name)</label><input type="text" value="${esc(b.props.anchor || '')}" data-prop="anchor" placeholder="about"></div>` : ''}
  </section>` : ''}
  <section class="insp-sec"><h4>Quick looks</h4><div class="looks">${Object.entries(LOOKS)
    .map(([k, l]) => `<button class="look look-${k}" data-look="${k}">${l.label}</button>`)
    .join('')}</div></section>
  <details class="insp-sec" open><summary><h4>Size & position</h4></summary>
    ${rangeField('maxw', s.maxw ?? 100, 'Width', 10, 100, 1, 'style', '%')}
    ${rangeField('minh', s.minh, 'Height', 0, 900, 4, 'style', 'px', 'fit content')}
    ${segField('balign', s.balign || '', 'Sits on the', [['left', '⇤ Left'], ['', '↔ Centre'], ['right', 'Right ⇥']])}
    ${s.minh ? segField('va', s.va || 'start', 'Content inside', [['start', '⤒ Top'], ['center', '↕ Middle'], ['end', '⤓ Bottom']]) : ''}
    <p class="insp-hint">Tip: drag the pink handles on the block to resize it.</p>
  </details>
  <details class="insp-sec" open><summary><h4>Text</h4></summary>
    <div class="f"><label>Font</label><select data-style="font"><option value="">Theme default</option>${FONTS.map((f) => `<option ${s.font === f.name ? 'selected' : ''} style="font-family:${esc(f.stack)}">${f.name}</option>`).join('')}</select></div>
    ${rangeField('size', s.size, 'Size', 10, 120)}
    ${segField('weight', s.weight || '', 'Weight', [['', 'Auto'], [400, 'Reg'], [600, 'Semi'], [800, 'Bold'], [900, 'Black']])}
    ${segField('align', s.align || '', 'Align text', [['', '⟵'], ['center', '⟷'], ['right', '⟶'], ['justify', '☰']])}
    ${colorField('color', s.color, 'Text colour')}
    <div class="f f-row"><label>Italic</label><button class="toggle${s.italic ? ' on' : ''}" data-style="italic" data-val="${!s.italic}" data-json><i></i></button>
      <label>CAPS</label><button class="toggle${s.upper ? ' on' : ''}" data-style="upper" data-val="${!s.upper}" data-json><i></i></button></div>
    ${rangeField('lh', s.lh, 'Line height', 0.9, 2.4, 0.05, 'style', '')}
    ${rangeField('ls', s.ls, 'Letter spacing', -0.05, 0.4, 0.01, 'style', 'em')}
  </details>
  <details class="insp-sec" open><summary><h4>Box</h4></summary>
    ${colorField('bg', s.bg, 'Background', { gradients: true })}
    ${rangeField('padding', s.padding, 'Padding', 0, 120)}
    ${rangeField('radius', s.radius, 'Corner roundness', 0, 60)}
    ${rangeField('border', s.border, 'Border', 0, 12, 0.5)}
    ${s.border ? colorField('borderColor', s.borderColor, 'Border colour') : ''}
    ${segField('shadow', s.shadow || 'none', 'Shadow', [['none', 'None'], ['soft', 'Soft'], ['lift', 'Lift'], ['hard', 'Hard'], ['glow', 'Glow']])}
  </details>
  <details class="insp-sec"><summary><h4>Extras</h4></summary>
    ${rangeField('mb', s.mb, 'Space after', 0, 160)}
    ${rangeField('opacity', s.opacity ?? 100, 'Opacity', 10, 100, 1, 'style', '%')}
    ${rangeField('rotate', s.rotate ?? 0, 'Tilt', -15, 15, 0.5, 'style', '°')}
  </details>
  <div class="insp-foot">
    <button class="btn-chunk small" data-act="dup">⧉ Duplicate</button>
    <button class="btn-chunk small ghost" data-act="copy">📋 Copy</button>
    <button class="btn-chunk small ghost" data-act="reset-style">↺ Reset style</button>
    <button class="btn-chunk small danger" data-act="del">🗑 Delete</button>
  </div>`;
}

function pagePanel(api) {
  const p = api.project;
  const t = p.theme;
  const site = p.mode === 'site';
  return `
  <div class="insp-head" style="--c:var(--violet)">
    <span class="insp-ico">${site ? '🌐' : '📄'}</span>
    <div><small>Nothing selected</small><h3>${site ? 'Website' : 'Document'} settings</h3></div>
  </div>
  <p class="insp-tip">Click any block on the canvas to style it. Drag bricks from the left to add more.</p>
  ${site ? `<section class="insp-sec"><h4>Pages</h4><div class="pages-list">${p.pages
    .map((pg, i) => `<div class="pg-row${pg.id === api.pageId ? ' on' : ''}">
      <button class="pg-open" data-page-open="${pg.id}" title="Open">${i === 0 ? '🏠' : '📄'}</button>
      <input value="${esc(pg.name)}" data-page-name="${pg.id}" aria-label="Page name">
      <button data-page-act="up" data-pid="${pg.id}" title="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button data-page-act="dup" data-pid="${pg.id}" title="Duplicate">⧉</button>
      <button data-page-act="del" data-pid="${pg.id}" title="Delete" ${p.pages.length < 2 ? 'disabled' : ''}>✕</button></div>`)
    .join('')}</div>
    <button class="btn-chunk small" data-page-act="add" style="margin-top:10px">+ Add page</button>
    <p class="insp-hint">The first page is your home page. Nav bars link every page automatically.</p></section>` : ''}
  <section class="insp-sec"><h4>Theme</h4><div class="themes">${Object.entries(THEMES)
    .map(([k, th]) => `<button class="theme-chip${t.preset === k ? ' on' : ''}" data-theme-preset="${k}" style="--a:${th.bg};--b:${th.accent};--c:${th.accent2};--d:${th.text}">
      <span class="tc-sw"><i></i><i></i><i></i></span><span style="font-family:${esc(fontStack(th.hfont))}">${th.label}</span></button>`)
    .join('')}</div></section>
  <section class="insp-sec"><h4>Colours</h4>
    ${['bg', 'text', 'accent', 'accent2', 'surface'].map((k) => `<div class="f f-row"><label>${{ bg: 'Page', text: 'Text', accent: 'Accent', accent2: 'Accent 2', surface: 'Surface' }[k]}</label><label class="big-pick" style="background:${t[k]}"><input type="color" value="${hexOf(t[k])}" data-theme="${k}"></label></div>`).join('')}
  </section>
  <section class="insp-sec"><h4>Fonts</h4>
    ${['hfont', 'bfont'].map((k) => `<div class="f"><label>${k === 'hfont' ? 'Headings' : 'Body'}</label><select data-theme="${k}">${FONTS.map((f) => `<option ${t[k] === f.name ? 'selected' : ''}>${f.name}</option>`).join('')}</select></div>`).join('')}
    ${rangeField('base', t.base || 16, 'Base size', 12, 22, 1, 'theme')}
  </section>
  ${!site ? `<section class="insp-sec"><h4>Paper</h4>
    ${segField('pageSize', p.pageSize, 'Size', Object.entries(PAGE_SIZES).map(([k, v]) => [k, v.label]), 'meta')}
    ${segField('margin', p.margin || 'normal', 'Margins', Object.entries(MARGINS).map(([k, v]) => [k, v.label]), 'meta')}
    <div class="f f-row"><label>Page numbers in PDF</label><button class="toggle${p.pageNumbers ? ' on' : ''}" data-meta="pageNumbers" data-val="${!p.pageNumbers}" data-json><i></i></button></div>
    <p class="insp-hint">${api.stats()}</p>
  </section>` : ''}
  <section class="insp-sec"><h4>Outline${site ? ' — this page' : ''}</h4><div class="outline">${outline(api.blocks, api)}</div></section>`;
}

function outline(list, api, depth = 0) {
  if (!list.length) return depth ? '' : '<p class="insp-tip" style="padding:0">Empty. Go drop something!</p>';
  return list
    .map((b) => {
      const def = BLOCKS[b.type];
      if (!def) return '';
      const txt = inlineToText(String(b.props.text || b.props.title || b.props.brand || b.props.label || b.props.quote || '')).slice(0, 28);
      return `<button class="ol-row" data-select="${b.id}" style="--d:${depth};--c:${api.groupColor(def.group)}"><span class="ol-ico">${def.icon}</span>${def.label}<small>${esc(txt)}</small></button>${(b.slots || []).map((s) => outline(s, api, depth + 1)).join('')}`;
    })
    .join('');
}

// Wire events once; handlers read the current selection from api at call time.
export function bindInspector(panel, api) {
  // Enter in a tag row: in the "add" box adds the tag; in an existing tag jumps to the add box.
  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const list = e.target.closest('[data-list]');
    if (!list) return;
    e.preventDefault();
    if (e.target.hasAttribute('data-tag-new')) api.listOp(list.dataset.list, 'add', -1, e.target.value);
    else list.querySelector('[data-tag-new]')?.focus();
  });

  const readVal = (el) => {
    if (el.dataset.val !== undefined) return el.hasAttribute('data-json') ? JSON.parse(el.dataset.val) : el.dataset.val;
    if (el.hasAttribute('data-num')) return +el.value;
    if (el.hasAttribute('data-csv')) return el.value.split(',').map((x) => esc(x.trim())).filter(Boolean);
    if (el.hasAttribute('data-links'))
      return el.value.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((l) => l[0]).map(([t, h]) => ({ t: esc(t), h: h || '#' }));
    return el.value;
  };

  const handle = (el, live) => {
    let v = readVal(el);
    if (el.hasAttribute('data-linksel')) {
      if (v === '__url') v = '#';
      api.setProp(el.dataset.prop, v, false, true);
      return;
    }
    if (el.dataset.style !== undefined) {
      const key = el.dataset.style;
      const patch = { [key]: v };
      if (key === 'font') patch.fontStack = v ? fontStack(v) : '';
      api.setStyle(patch, live);
      if (key === 'minh' && !live) api.refreshInspector();
    } else if (el.dataset.prop !== undefined) api.setProp(el.dataset.prop, v, live);
    else if (el.dataset.theme !== undefined) api.setTheme({ [el.dataset.theme]: v }, live);
    else if (el.dataset.meta !== undefined) api.setMeta({ [el.dataset.meta]: v });
    const out = el.closest('.f')?.querySelector('output');
    if (out && el.type === 'range') {
      const auto = (el.dataset.style === 'minh' || el.dataset.style === 'size') && +el.value === +el.min;
      out.textContent = auto ? (el.dataset.style === 'minh' ? 'fit content' : 'auto') : el.value + out.dataset.unit;
    }
  };

  panel.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.pageName) return api.renamePage(el.dataset.pageName, el.value);
    if (el.dataset.tagI !== undefined) return api.listOp(el.closest('[data-list]').dataset.list, 'set', +el.dataset.tagI, el.value);
    if (el.hasAttribute('data-tag-new')) return;
    if (el.matches('[data-style],[data-prop],[data-theme]') && !el.matches('button, select, [type=file]')) handle(el, true);
  });
  panel.addEventListener('change', (e) => {
    const el = e.target;
    if (el.matches('[data-upload]')) {
      const f = el.files[0];
      if (f) api.uploadImage(f).then((url) => api.setProp(el.dataset.upload, url, false, true));
      return;
    }
    if (el.matches('[data-uploadmany]')) return api.addImages(el.dataset.uploadmany, [...el.files]);
    if (el.dataset.pageName || el.closest('[data-list]')) return;
    if (el.matches('select,[type=color],[type=range],[type=text],textarea')) handle(el, false);
  });
  panel.addEventListener('click', (e) => {
    const el = e.target.closest('button');
    if (!el || el.disabled) return;
    if (el.dataset.look) return api.applyLook(el.dataset.look);
    if (el.dataset.act) return api.action(el.dataset.act);
    if (el.dataset.themePreset) return api.setThemePreset(el.dataset.themePreset);
    if (el.dataset.select) return api.select(el.dataset.select, true);
    if (el.dataset.table) return api.tableSize(el.dataset.table);
    if (el.dataset.count) return api.countChange(el.dataset.count, +el.dataset.d);
    if (el.dataset.tagOp) {
      const list = el.closest('[data-list]');
      const nu = list.querySelector('[data-tag-new]');
      return api.listOp(list.dataset.list, el.dataset.tagOp, +el.dataset.i, nu?.value);
    }
    if (el.dataset.rmimg) return api.removeImage(+el.dataset.rmimg);
    if (el.dataset.pageOpen) return api.openPage(el.dataset.pageOpen);
    if (el.dataset.pageAct) return api.pageAction(el.dataset.pageAct, el.dataset.pid);
    if (el.matches('[data-style],[data-prop],[data-theme],[data-meta]')) handle(el, false), api.refreshInspector();
  });
}
