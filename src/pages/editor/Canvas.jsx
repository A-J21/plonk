// The stage: cutting mat, paper (or browser frame), selection chrome, format bar,
// page tabs and the "All pages" overview. Wires the pointer DnD engine to editor actions.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BLOCKS, groupColor, makeBlock } from '../../blocks/catalog.jsx';
import { BlockList, SelectionContext } from '../../blocks/render.jsx';
import { Icon, cssToObj } from '../../blocks/primitives.jsx';
import { PAGE_SIZES, VIEWPORTS, themeVars, docPad } from '../../lib/theme.js';
import { findBlock, slugify } from '../../lib/store.js';
import { sanitizeInline } from '../../lib/inline.js';
import { initDnd } from '../../lib/dnd.js';
import { shrinkImage } from '../../lib/images.js';
import { pageSlugs } from '../../lib/export.js';
import { sfx } from '../../lib/sfx.js';
import { toast } from '../../components/Toast.jsx';

// Keeps a ref pointing at the latest value (for long-lived listeners).
const useLatest = (v) => {
  const r = useRef(v);
  r.current = v;
  return r;
};

function PageTabs({ ed }) {
  const { s } = ed;
  const slugs = pageSlugs(s.project);
  const rename = (pg) => {
    const name = prompt('Rename page', pg.name);
    if (name?.trim()) ed.renamePage(pg.id, name.trim(), false);
  };
  return (
    <div className="browser-bar">
      <i /><i /><i />
      <div className="ptabs">
        {s.project.pages.map((pg, i) => (
          <button key={pg.id} className={`ptab${pg.id === s.pageId && !s.overview ? ' on' : ''}`} data-ptab={pg.id} title="Double-click to rename"
            onClick={() => ed.openPage(pg.id)} onDoubleClick={() => rename(pg)}>
            {i === 0 ? '🏠 ' : ''}{pg.name}
          </button>
        ))}
        <button className="ptab ptab-add" title="Add a page" onClick={() => ed.newPage()}>+</button>
      </div>
      <span id="url-pill">{`${slugify(s.project.name) || 'my-site'}.plonk.site/${slugs[s.pageId] === 'index' ? '' : slugs[s.pageId] + '.html'}`}</span>
      <button className={`ov-btn${s.overview ? ' on' : ''}`} title="See every page" onClick={() => ed.setOverview(!s.overview)}>▦ All pages</button>
    </div>
  );
}

function OverviewCard({ pg, i, ed }) {
  const box = useRef(null);
  const [k, setK] = useState(0.25);
  useLayoutEffect(() => setK(box.current.clientWidth / 1200), []);
  const p = ed.s.project;
  const ctx = useMemo(() => ({ editing: false, static: true, mode: 'site', pages: p.pages, pageId: pg.id, pageHref: () => '#' }), [p.pages, pg.id]);
  return (
    <button className="ov-card" style={{ '--i': i }} onClick={() => ed.openPage(pg.id)}>
      <div className="ov-prev" ref={box}>
        <div className="pk-doc ov-doc" style={{ ...cssToObj(themeVars(p.theme)), width: 1200, padding: '0 40px 40px', transform: `scale(${k})` }}>
          <BlockList blocks={pg.blocks} ctx={ctx} />
        </div>
      </div>
      <span className="ov-name">{i === 0 ? '🏠 ' : ''}{pg.name}<small>{pg.blocks.length} blocks</small></span>
    </button>
  );
}

function Overview({ ed }) {
  return (
    <div className="overview">
      <div className="ov-head"><h2>All pages</h2><p>Click a page to edit it. Your nav bar links to each of these.</p></div>
      <div className="ov-grid">
        {ed.s.project.pages.map((pg, i) => <OverviewCard key={pg.id} pg={pg} i={i} ed={ed} />)}
        <button className="ov-card ov-add" onClick={() => ed.newPage()}><span>+</span>Add a page</button>
      </div>
    </div>
  );
}

export default function Canvas({ ed }) {
  const { s, site, blocks } = ed;
  const stage = useRef(null);
  const sizer = useRef(null);
  const wrap = useRef(null);
  const paper = useRef(null);
  const overlay = useRef(null);
  const bar = useRef(null);
  const tag = useRef(null);
  const handles = useRef({});
  const badge = useRef(null);
  const fmt = useRef(null);
  const edRef = useLatest(ed);
  const [scale, setScale] = useState(1);
  const [fileOver, setFileOver] = useState(false);

  // ---------------- layout: page size, zoom-to-fit ----------------
  const size = PAGE_SIZES[s.project.pageSize || 'a4'];
  const w = site ? VIEWPORTS[s.viewport] : size.w;
  const paperStyle = useMemo(
    () => ({
      ...cssToObj(themeVars(s.project.theme)),
      width: w,
      ...(site ? { padding: s.viewport === 'mobile' ? '0 16px 32px' : '0 40px 40px' } : { minHeight: size.h, padding: docPad(s.project) }),
    }),
    [s.project.theme, s.project.margin, w, site, s.viewport, size.h],
  );
  const fit = useCallback(() => {
    const avail = (stage.current?.clientWidth || 1000) - 96;
    setScale(s.zoom === 'fit' ? Math.min(1, avail / w) : +s.zoom / 100);
  }, [s.zoom, w]);
  useLayoutEffect(fit, [fit]);
  useEffect(() => {
    const ro = new ResizeObserver(fit);
    ro.observe(stage.current);
    return () => ro.disconnect();
  }, [fit]);

  // ---------------- selection chrome (positioned imperatively after each render) ----------------
  const place = useCallback(() => {
    const e = edRef.current;
    const sizeEl = sizer.current;
    if (sizeEl && wrap.current) sizeEl.style.height = `${wrap.current.offsetHeight * scale}px`;
    const el = e.s.sel && paper.current?.querySelector(`.pk-b[data-id="${e.s.sel}"]`);
    const show = !!el && !e.s.preview && !e.s.overview;
    [bar.current, tag.current, ...Object.values(handles.current)].forEach((n) => n && (n.style.display = show ? '' : 'none'));
    if (!show) return;
    const base = overlay.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const st = stage.current;
    const top = Math.max(r.top - base.top - 38, st.scrollTop + 4);
    Object.assign(bar.current.style, { display: 'flex', top: `${top}px` });
    bar.current.style.left = `${Math.max(4, Math.min(r.right - base.left, base.width - 8) - bar.current.offsetWidth)}px`;
    Object.assign(tag.current.style, { display: 'flex', top: `${top}px`, left: `${r.left - base.left}px` });
    const L = r.left - base.left;
    const T = r.top - base.top;
    const H = handles.current;
    Object.assign(H.x.style, { display: 'block', left: `${L + r.width + 4}px`, top: `${T + r.height / 2 - 16}px` });
    Object.assign(H.y.style, { display: 'block', left: `${L + r.width / 2 - 16}px`, top: `${T + r.height + 4}px` });
    Object.assign(H.xy.style, { display: 'block', left: `${L + r.width + 1}px`, top: `${T + r.height + 1}px` });
  }, [scale, edRef]);
  useLayoutEffect(place);
  useEffect(() => {
    const ro = new ResizeObserver(place);
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [place]);

  const selInfo = s.sel && !s.preview ? ed.slotInfo(s.sel) : {};
  const selDef = ed.selBlock && BLOCKS[ed.selBlock.type];
  const inCols = selInfo.parent?.block.type === 'columns';

  // ---------------- drag & drop ----------------
  useEffect(() => {
    const ac = new AbortController();
    initDnd({
      stage: stage.current,
      overlay: overlay.current,
      signal: ac.signal,
      ghostFor: (type, bid) => {
        const e = edRef.current;
        const t = type || findBlock(e.blocks, bid)?.block.type;
        const def = BLOCKS[t];
        return `<div class="brick" style="--c:${groupColor(def.group)}"><span class="brick-ico">${def.icon}</span>${def.label}</div>`;
      },
      onStart: () => {
        sfx.pick();
        fmt.current?.classList.remove('on');
      },
      onClickNew: (type) => edRef.current.clickAdd(type),
      onDrop: ({ type, id, slot, index, x, y }) => {
        const e = edRef.current;
        if (e.s.overview) return;
        if (type) e.insertBlock(makeBlock(type), slot, index, { x, y });
        else e.moveTo(id, slot, index);
      },
    });
    return () => ac.abort();
  }, [edRef]);

  // ---------------- floating format bar ----------------
  useEffect(() => {
    const onSel = () => {
      const el = fmt.current;
      const sel = document.getSelection();
      const node = sel?.anchorNode;
      const host = node && (node.nodeType === 1 ? node : node.parentElement)?.closest('[data-edit]:not([data-plain]),[data-edit-list]');
      if (!host || sel.isCollapsed || !paper.current?.contains(host)) return void el.classList.remove('on');
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const base = stage.current.getBoundingClientRect();
      el.classList.add('on');
      el.style.left = `${r.left + r.width / 2 - base.left + stage.current.scrollLeft - el.offsetWidth / 2}px`;
      el.style.top = `${r.top - base.top + stage.current.scrollTop - 48}px`;
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);
  const format = (c) => {
    if (c === 'link') {
      const url = prompt('Link to where? (https://… or #anchor)', 'https://');
      if (url) document.execCommand('createLink', false, url);
    } else document.execCommand(c);
    sfx.tick();
  };

  // ---------------- canvas events ----------------
  const blockIdOf = (el) => el.closest?.('.pk-b[data-id]')?.dataset.id;

  const onInput = (e) => {
    const el = e.target.closest('[data-edit],[data-edit-list]');
    const bid = blockIdOf(e.target);
    if (!el || !bid) return;
    if (el.dataset.editList) {
      const items = [...el.querySelectorAll('li')].map((li) => sanitizeInline(li.innerHTML));
      ed.typeText(bid, el.dataset.editList, items.length ? items : ['']);
    } else {
      ed.typeText(bid, el.dataset.edit, el.hasAttribute('data-plain') ? el.innerText.replace(/\n$/, '') : sanitizeInline(el.innerHTML));
    }
  };

  const onKeyDown = (e) => {
    const el = e.target.closest?.('[data-edit]');
    const bid = blockIdOf(e.target);
    if (!bid) return;
    const type = findBlock(blocks, bid)?.block.type;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      return ed.newParagraphAfter(bid);
    }
    if (!el) return; // lists handle their own Enter
    if (type === 'checklist') {
      const i = +el.dataset.edit.split('.')[1];
      if (e.key === 'Enter') {
        e.preventDefault();
        ed.checklistEnter(bid, i);
      } else if (e.key === 'Backspace' && !el.textContent && ed.checklistBackspace(bid, i)) e.preventDefault();
      return;
    }
    if (e.key === 'Enter' && !el.hasAttribute('data-plain')) {
      e.preventDefault();
      if (type === 'heading') return ed.newParagraphAfter(bid);
      // Paragraphs (and other text) keep going in the same block.
      if (['text', 'quote', 'callout', 'footnote', 'testimonial', 'faq', 'features', 'hero', 'contact', 'footer', 'toc'].includes(type) || e.shiftKey) document.execCommand('insertLineBreak');
      else el.blur();
      return;
    }
    if (e.key === 'Backspace' && type === 'text' && !el.textContent && !el.querySelector('img') && ed.removeEmptyText(bid)) e.preventDefault();
  };

  const onPaste = (e) => {
    if (!e.target.closest?.('[data-edit],[data-edit-list]')) return;
    const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
    e.preventDefault();
    if (file) return void shrinkImage(file).then(ed.addImage);
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  };

  // Links: page links and #anchors work inside the editor, like a real site.
  const onClick = (e) => {
    const box = e.target.closest('[data-check]');
    if (box && !s.preview) return ed.toggleCheck(blockIdOf(box), +box.dataset.check);
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    const follow = !(a.isContentEditable && !s.preview) || e.ctrlKey || e.metaKey;
    if (!follow) return;
    if (a.dataset.page) return ed.openPage(a.dataset.page);
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#') && href.length > 1) return ed.scrollToAnchor(decodeURIComponent(href.slice(1)));
    if (/^(https?:|mailto:|tel:)/.test(href) && s.preview) window.open(href, '_blank', 'noopener');
  };

  const hover = useRef(null);
  const onOver = (e) => {
    const b = e.target.closest('.pk-b[data-id]');
    if (b === hover.current) return;
    hover.current?.classList.remove('is-hover');
    hover.current = b;
    b?.classList.add('is-hover');
  };

  const onStageDown = (e) => {
    if (s.preview || s.overview || e.target.closest('.blk-bar,.fmt-bar,.rs,.browser-bar')) return;
    const bid = blockIdOf(e.target);
    if (bid) ed.select(bid);
    else if (!e.target.closest('.paper')) ed.select(null);
  };

  // ---------------- resize handles ----------------
  const startResize = (kind, e) => {
    const el = paper.current.querySelector(`.pk-b[data-id="${s.sel}"]`);
    const b = ed.selBlock;
    if (!el || !b) return;
    e.preventDefault();
    e.stopPropagation();
    const r0 = el.getBoundingClientRect();
    const parentW = el.parentElement.getBoundingClientRect().width;
    const st = b.style;
    const pos = st.balign || (st.align === 'left' || st.align === 'right' ? st.align : 'center');
    const k = pos === 'center' ? 2 : 1;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const h0 = r0.height / scale;
    let patch = {};
    document.body.classList.add('is-resizing');
    const move = (ev) => {
      patch = {};
      if (kind.includes('x')) patch.maxw = Math.max(10, Math.min(100, Math.round(((r0.width + k * (ev.clientX - x0)) / parentW) * 100)));
      if (kind.includes('y')) patch.minh = Math.max(24, Math.round((h0 + (ev.clientY - y0) / scale) / 4) * 4);
      ed.resizeSel(patch);
      const bd = badge.current;
      const rr = el.getBoundingClientRect();
      const base = overlay.current.getBoundingClientRect();
      Object.assign(bd.style, { display: 'block', left: `${rr.right - base.left + 12}px`, top: `${rr.bottom - base.top + 12}px` });
      bd.textContent = `${patch.maxw ?? st.maxw ?? 100}% × ${patch.minh ?? st.minh ?? 'auto'}${(patch.minh ?? st.minh) ? 'px' : ''}`;
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.body.classList.remove('is-resizing');
      badge.current.style.display = 'none';
      ed.resizeSel(patch, true);
      sfx.tick();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up, { once: true });
  };
  const resetSize = (kind) => {
    const patch = {};
    if (kind.includes('x')) patch.maxw = 100;
    if (kind.includes('y')) patch.minh = 0;
    ed.resizeSel(patch, true);
    toast('Size reset');
  };

  // ---------------- image files from the desktop ----------------
  const onDragOver = (e) => {
    if ([...e.dataTransfer.items].some((i) => i.kind === 'file')) {
      e.preventDefault();
      setFileOver(true);
    }
  };
  const onDrop = (e) => {
    setFileOver(false);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    files.forEach((f) => shrinkImage(f).then(ed.addImage));
  };

  const ctx = useMemo(
    () => ({ editing: !s.preview, static: false, mode: s.project.mode, ...(site ? { pages: s.project.pages, pageId: s.pageId, pageHref: (pg) => `#/p/${pg.id}` } : {}) }),
    [s.preview, s.project.mode, s.project.pages, s.pageId, site],
  );

  return (
    <main className={`ed-stage${fileOver ? ' file-over' : ''}`} ref={stage} onPointerDown={onStageDown} onScroll={place}
      onDragOver={onDragOver} onDragLeave={() => setFileOver(false)} onDrop={onDrop}>
      <div className="paper-sizer" ref={sizer} style={{ width: w * scale }}>
        <div className="paper-wrap" ref={wrap} style={{ width: w, transform: `scale(${scale})` }}>
          {site && <PageTabs ed={ed} />}
          <div className="pk-doc paper" ref={paper} style={paperStyle}
            onInput={onInput} onKeyDown={onKeyDown} onPaste={onPaste} onClick={onClick}
            onPointerOver={onOver} onPointerLeave={() => (hover.current?.classList.remove('is-hover'), (hover.current = null))}>
            <SelectionContext.Provider value={s.preview ? null : s.sel}>
              <BlockList blocks={blocks} ctx={ctx} />
            </SelectionContext.Provider>
          </div>
          {!site && <div className="page-guides" style={{ '--ph': `${size.h}px` }} />}
        </div>
      </div>
      {s.overview && <Overview ed={ed} />}

      <div className="overlay" ref={overlay}>
        <div className="blk-tag" ref={tag} style={{ '--c': selDef ? groupColor(selDef.group) : undefined }}>
          {selDef && <><Icon svg={selDef.icon} className="" /><span>{selDef.label}</span></>}
        </div>
        <div className="blk-bar" ref={bar}>
          <button className="bb-drag" data-drag-id={s.sel || undefined} title="Drag to move">⠿</button>
          {selInfo.parent && <button title="Select the container" onClick={() => ed.select(selInfo.pid)}>⬑</button>}
          {inCols && <button title="Move to the column on the left" disabled={selInfo.si === 0} onClick={() => ed.shiftColumn(s.sel, -1)}>←</button>}
          <button title="Move up (Alt+↑)" onClick={() => ed.nudge(s.sel, -1)}>↑</button>
          <button title="Move down (Alt+↓)" onClick={() => ed.nudge(s.sel, 1)}>↓</button>
          {inCols && <button title="Move to the column on the right" disabled={selInfo.si === selInfo.parent.block.slots.length - 1} onClick={() => ed.shiftColumn(s.sel, 1)}>→</button>}
          <button title="Duplicate (Ctrl+D)" onClick={() => ed.duplicate(s.sel)}>⧉</button>
          <button title="Delete (Del)" onClick={() => ed.removeBlock(s.sel)}>✕</button>
        </div>
        {['x', 'y', 'xy'].map((k) => (
          <div key={k} className={`rs rs-${k}`} ref={(n) => (handles.current[k] = n)} title={k === 'x' ? 'Drag to change width' : k === 'y' ? 'Drag to change height' : 'Drag to resize'}
            onPointerDown={(e) => startResize(k, e)} onDoubleClick={() => resetSize(k)} />
        ))}
        <div className="rs-badge" ref={badge} />
      </div>

      <div className="fmt-bar" ref={fmt} onPointerDown={(e) => e.preventDefault()}>
        {[['bold', <b key="b">B</b>, 'Bold (Ctrl+B)'], ['italic', <i key="i">I</i>, 'Italic (Ctrl+I)'], ['underline', <u key="u">U</u>, 'Underline (Ctrl+U)'], ['strikeThrough', <s key="s">S</s>, 'Strike'], ['link', '🔗', 'Link'], ['removeFormat', '⌫', 'Clear formatting']].map(([c, label, title]) => (
          <button key={c} title={title} onClick={() => format(c)}>{label}</button>
        ))}
      </div>
    </main>
  );
}
