// Right-hand "Tweak" panel: block content fields, style controls and page settings.
import { useRef } from 'react';
import { BLOCKS, LOOKS, groupColor } from '../../blocks/catalog.jsx';
import { Icon, cssToObj } from '../../blocks/primitives.jsx';
import { FONTS, THEMES, fontStack, PAGE_SIZES, MARGINS, themeVars } from '../../lib/theme.js';
import { inlineToText } from '../../lib/inline.js';
import { getPath } from '../../lib/store.js';
import { shrinkImage } from '../../lib/images.js';
import { useStats } from './TopBar.jsx';

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

// ---------------- generic fields ----------------
function Color({ label, value, onPick, gradients }) {
  const sw = (v, title = v) => <button key={v} className={`sw${value === v ? ' on' : ''}`} title={title} style={{ background: v }} onClick={() => onPick(v)} />;
  return (
    <div className="f">
      <label>{label}</label>
      <div className="swatches">
        {THEME_SW.map(([v, t]) => sw(v, t))}
        <span className="sw-sep" />
        {SWATCHES.map((v) => sw(v))}
        {gradients && <><span className="sw-sep" />{GRADIENTS.map((g) => sw(g, 'Gradient'))}</>}
        <label className="sw sw-pick" title="Pick any colour">
          <input type="color" value={hexOf(value)} onChange={(e) => onPick(e.target.value, true)} onBlur={(e) => onPick(e.target.value)} />
          <span>+</span>
        </label>
        <button className="sw sw-clear" title="Clear" onClick={() => onPick('')}>×</button>
      </div>
    </div>
  );
}

function Range({ label, value, min, max, step = 1, unit = 'px', auto = 'auto', onChange }) {
  const has = value !== '' && value != null;
  const shown = has && !(auto && +value === min) ? `${value}${unit}` : auto || `${min}${unit}`;
  return (
    <div className="f">
      <label>{label}<output>{shown}</output></label>
      <input
        type="range" min={min} max={max} step={step} value={has ? value : min}
        onChange={(e) => onChange(+e.target.value, true)}
        onPointerUp={(e) => onChange(+e.currentTarget.value, false)}
        onKeyUp={(e) => onChange(+e.currentTarget.value, false)}
      />
    </div>
  );
}

function Seg({ label, value, options, onChange }) {
  return (
    <div className="f">
      <label>{label}</label>
      <div className="seg">
        {options.map(([v, t]) => (
          <button key={String(v)} className={String(value) === String(v) ? 'on' : ''} onClick={() => onChange(v)}>{t}</button>
        ))}
      </div>
    </div>
  );
}

const Toggle = ({ on, onClick }) => <button className={`toggle${on ? ' on' : ''}`} onClick={onClick}><i /></button>;

function Text({ label, value, onChange, ...rest }) {
  return (
    <div className="f">
      <label>{label}</label>
      <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value, true)} onBlur={(e) => onChange(e.target.value, false)} {...rest} />
    </div>
  );
}

// ---------------- block-specific fields ----------------
function TagList({ f, items, ed }) {
  const addRef = useRef(null);
  const add = () => {
    ed.listOp(f.key, 'add', -1, addRef.current.value);
    if (addRef.current.value.trim()) addRef.current.value = '';
    addRef.current.focus();
  };
  return (
    <div className="f">
      <label>{f.label}<output>{items.length}</output></label>
      <div className="taglist">
        {items.map((t, i) => (
          <div key={i} className="tl-row">
            <span className="tl-dot" />
            <input type="text" value={inlineToText(t)} aria-label={`Tag ${i + 1}`} onChange={(e) => ed.listOp(f.key, 'set', i, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRef.current.focus())} />
            <button title="Move up" disabled={i === 0} onClick={() => ed.listOp(f.key, 'up', i)}>↑</button>
            <button title="Delete tag" onClick={() => ed.listOp(f.key, 'del', i)}>✕</button>
          </div>
        ))}
        <div className="tl-add">
          <input ref={addRef} type="text" placeholder="Add a tag… (Enter)" aria-label="New tag" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
          <button onClick={add}>+ Add</button>
        </div>
      </div>
    </div>
  );
}

function LinkField({ f, value, ed }) {
  const pages = ed.s.project.pages || [];
  const isPage = String(value).startsWith('page:');
  return (
    <div className="f">
      <label>{f.label}</label>
      {pages.length > 0 && (
        <select value={isPage ? value : '__url'} onChange={(e) => ed.setProp(f.key, e.target.value === '__url' ? '#' : e.target.value)}>
          <option value="__url">A web address / #anchor…</option>
          {pages.map((p) => <option key={p.id} value={`page:${p.id}`}>📄 Page: {p.name}</option>)}
        </select>
      )}
      {!isPage && (
        <input type="text" value={value} placeholder="https://… or #section" style={{ marginTop: 6 }}
          onChange={(e) => ed.setProp(f.key, e.target.value, true)} onBlur={(e) => ed.setProp(f.key, e.target.value)} />
      )}
    </div>
  );
}

function ImageField({ f, value, ed }) {
  return (
    <div className="f">
      <label>{f.label}</label>
      <div className="img-pick">
        {value ? <img src={value} alt="" /> : <div className="img-none">No picture yet</div>}
        <label className="btn-chunk small">
          <input type="file" accept="image/*" hidden onChange={async (e) => e.target.files[0] && ed.setProp(f.key, await shrinkImage(e.target.files[0]))} />⬆ Upload
        </label>
        {value && <button className="btn-chunk small ghost" onClick={() => ed.setProp(f.key, '')}>Remove</button>}
      </div>
      <input type="text" placeholder="…or paste an image URL" value={value && !value.startsWith('data:') ? value : ''}
        onChange={(e) => ed.setProp(f.key, e.target.value, true)} onBlur={(e) => ed.setProp(f.key, e.target.value)} />
    </div>
  );
}

function Field({ f, b, ed }) {
  if (f.when && !f.when(b.props)) return null;
  const v = getPath(b.props, f.key);
  const set = (val, live) => ed.setProp(f.key, val, live);
  switch (f.type) {
    case 'seg': return <Seg label={f.label} value={v} options={f.options} onChange={set} />;
    case 'range': return <Range label={f.label} value={v} min={f.min} max={f.max} auto="" onChange={set} />;
    case 'color': return <Color label={f.label} value={v} onPick={set} />;
    case 'toggle': return <div className="f f-row"><label>{f.label}</label><Toggle on={v} onClick={() => set(!v)} /></div>;
    case 'text': return <Text label={f.label} value={v} onChange={set} />;
    case 'link': return <LinkField f={f} value={v} ed={ed} />;
    case 'image': return <ImageField f={f} value={v} ed={ed} />;
    case 'taglist': return <TagList f={f} items={v} ed={ed} />;
    case 'links':
      return (
        <div className="f">
          <label>{f.label}</label>
          <textarea rows={3} placeholder="Blog | https://…" defaultValue={(v || []).map((l) => `${inlineToText(l.t)} | ${l.h}`).join('\n')}
            onBlur={(e) => set(e.target.value.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((l) => l[0]).map(([t, h]) => ({ t, h: h || '#' })))} />
        </div>
      );
    case 'count':
      return (
        <div className="f f-row">
          <label>{f.label}</label>
          <div className="stepper"><button onClick={() => ed.countChange(f.key, -1)}>−</button><span>{v.length}</span><button onClick={() => ed.countChange(f.key, 1)}>+</button></div>
        </div>
      );
    case 'featured':
      return <Seg label={f.label} value={v} options={[[-1, 'None'], ...b.props.plans.map((p, i) => [i, inlineToText(p.name).slice(0, 9) || i + 1])]} onChange={set} />;
    case 'emoji':
      return (
        <div className="f">
          <label>{f.label}</label>
          <div className="emojis">
            {['💡', '⚠️', '✅', '🔥', '📌', '🚀', '❤️', '✨', '🎯', '📣'].map((e) => <button key={e} className={v === e ? 'on' : ''} onClick={() => set(e)}>{e}</button>)}
            <input type="text" value={v} maxLength={4} onChange={(e) => set(e.target.value, true)} />
          </div>
        </div>
      );
    case 'tablesize':
      return (
        <div className="f f-row">
          <label>{f.label}</label>
          <div className="stepper">
            <button onClick={() => ed.tableSize('row-')}>−</button><span>{v.length} rows</span><button onClick={() => ed.tableSize('row+')}>+</button>
            <button onClick={() => ed.tableSize('col-')}>−</button><span>{v[0]?.length || 0} cols</span><button onClick={() => ed.tableSize('col+')}>+</button>
          </div>
        </div>
      );
    case 'images':
      return (
        <div className="f">
          <label>{f.label}</label>
          <div className="thumbs">
            {v.map((src, i) => <div key={i} className="thumb"><img src={src} alt="" /><button title="Remove" onClick={() => ed.removeImage(i)}>✕</button></div>)}
            <label className="thumb add" title="Add pictures">
              <input type="file" accept="image/*" multiple hidden onChange={async (e) => ed.addImages(f.key, await Promise.all([...e.target.files].filter((x) => x.type.startsWith('image/')).map(shrinkImage)))} />+
            </label>
          </div>
        </div>
      );
  }
  return null;
}

const Sec = ({ title, open = true, children }) => (
  <details className="insp-sec" open={open}>
    <summary><h4>{title}</h4></summary>
    {children}
  </details>
);

// ---------------- panels ----------------
function BlockPanel({ b, ed }) {
  const def = BLOCKS[b.type];
  const s = b.style || {};
  const site = ed.site;
  const st = (patch, live) => ed.setStyle(patch, live);
  const anchorable = site && ['section', 'card', 'columns', 'heading', 'hero', 'features', 'pricing', 'faq', 'contact', 'gallery', 'testimonial'].includes(b.type);
  return (
    <>
      <div className="insp-head" style={{ '--c': groupColor(def.group) }}>
        <Icon svg={def.icon} className="insp-ico" />
        <div><small>Tweaking</small><h3>{def.label}</h3></div>
        <button className="insp-x" title="Back to page settings (Esc)" onClick={() => ed.select(null)}>✕</button>
      </div>
      {def.shared && site && <p className="insp-tip">🔗 This {def.label.toLowerCase()} is shared — edits update it on every page.</p>}
      {(def.fields.length > 0 || anchorable) && (
        <section className="insp-sec">
          <h4>Content</h4>
          {def.fields.map((f) => <Field key={f.key} f={f} b={b} ed={ed} />)}
          {anchorable && <Text label="Anchor name (link to it with #name)" value={b.props.anchor} placeholder="about" onChange={(v, live) => ed.setProp('anchor', v, live)} />}
        </section>
      )}
      <section className="insp-sec">
        <h4>Quick looks</h4>
        <div className="looks">
          {Object.entries(LOOKS).map(([k, l]) => <button key={k} className={`look look-${k}`} onClick={() => ed.applyLook(k)}>{l.label}</button>)}
        </div>
      </section>
      <Sec title="Size & position">
        <Range label="Width" value={s.maxw ?? 100} min={10} max={100} unit="%" auto="" onChange={(v, live) => st({ maxw: v }, live)} />
        <Range label="Height" value={s.minh} min={0} max={900} step={4} auto="fit content" onChange={(v, live) => st({ minh: v }, live)} />
        <Seg label="Sits on the" value={s.balign || ''} options={[['left', '⇤ Left'], ['', '↔ Centre'], ['right', 'Right ⇥']]} onChange={(v) => st({ balign: v })} />
        {s.minh > 0 && <Seg label="Content inside" value={s.va || 'start'} options={[['start', '⤒ Top'], ['center', '↕ Middle'], ['end', '⤓ Bottom']]} onChange={(v) => st({ va: v })} />}
        <p className="insp-hint">Tip: drag the pink handles on the block to resize it.</p>
      </Sec>
      <Sec title="Text">
        <div className="f">
          <label>Font</label>
          <select value={s.font || ''} onChange={(e) => st({ font: e.target.value, fontStack: e.target.value ? fontStack(e.target.value) : '' })}>
            <option value="">Theme default</option>
            {FONTS.map((f) => <option key={f.name} style={{ fontFamily: f.stack }}>{f.name}</option>)}
          </select>
        </div>
        <Range label="Size" value={s.size} min={10} max={120} onChange={(v, live) => st({ size: v === 10 ? '' : v }, live)} />
        <Seg label="Weight" value={s.weight || ''} options={[['', 'Auto'], [400, 'Reg'], [600, 'Semi'], [800, 'Bold'], [900, 'Black']]} onChange={(v) => st({ weight: v })} />
        <Seg label="Align text" value={s.align || ''} options={[['', '⟵'], ['center', '⟷'], ['right', '⟶'], ['justify', '☰']]} onChange={(v) => st({ align: v })} />
        <Color label="Text colour" value={s.color} onPick={(v, live) => st({ color: v }, live)} />
        <div className="f f-row">
          <label>Italic</label><Toggle on={s.italic} onClick={() => st({ italic: !s.italic })} />
          <label>CAPS</label><Toggle on={s.upper} onClick={() => st({ upper: !s.upper })} />
        </div>
        <Range label="Line height" value={s.lh} min={0.9} max={2.4} step={0.05} unit="" onChange={(v, live) => st({ lh: v }, live)} />
        <Range label="Letter spacing" value={s.ls} min={-0.05} max={0.4} step={0.01} unit="em" onChange={(v, live) => st({ ls: v }, live)} />
      </Sec>
      <Sec title="Box">
        <Color label="Background" value={s.bg} gradients onPick={(v, live) => st({ bg: v }, live)} />
        <Range label="Padding" value={s.padding} min={0} max={120} onChange={(v, live) => st({ padding: v }, live)} />
        <Range label="Corner roundness" value={s.radius} min={0} max={60} onChange={(v, live) => st({ radius: v }, live)} />
        <Range label="Border" value={s.border} min={0} max={12} step={0.5} onChange={(v, live) => st({ border: v }, live)} />
        {s.border > 0 && <Color label="Border colour" value={s.borderColor} onPick={(v, live) => st({ borderColor: v }, live)} />}
        <Seg label="Shadow" value={s.shadow || 'none'} options={[['none', 'None'], ['soft', 'Soft'], ['lift', 'Lift'], ['hard', 'Hard'], ['glow', 'Glow']]} onChange={(v) => st({ shadow: v })} />
      </Sec>
      <Sec title="Extras" open={false}>
        <Range label="Space after" value={s.mb} min={0} max={160} onChange={(v, live) => st({ mb: v }, live)} />
        <Range label="Opacity" value={s.opacity ?? 100} min={10} max={100} unit="%" auto="" onChange={(v, live) => st({ opacity: v }, live)} />
        <Range label="Tilt" value={s.rotate ?? 0} min={-15} max={15} step={0.5} unit="°" auto="" onChange={(v, live) => st({ rotate: v }, live)} />
      </Sec>
      <div className="insp-foot">
        <button className="btn-chunk small" onClick={() => ed.duplicate(b.id)}>⧉ Duplicate</button>
        <button className="btn-chunk small ghost" onClick={() => ed.copyBlock(b.id)}>📋 Copy</button>
        <button className="btn-chunk small ghost" onClick={ed.resetStyle}>↺ Reset style</button>
        <button className="btn-chunk small danger" onClick={() => ed.removeBlock(b.id)}>🗑 Delete</button>
      </div>
    </>
  );
}

function Outline({ list, ed, depth = 0 }) {
  if (!list.length) return depth ? null : <p className="insp-tip" style={{ padding: 0 }}>Empty. Go drop something!</p>;
  return list.map((b) => {
    const def = BLOCKS[b.type];
    if (!def) return null;
    const txt = inlineToText(String(b.props.text || b.props.title || b.props.brand || b.props.label || b.props.quote || '')).slice(0, 28);
    return (
      <div key={b.id} style={{ display: 'contents' }}>
        <button className="ol-row" style={{ '--d': depth, '--c': groupColor(def.group) }} onClick={() => ed.select(b.id, true)}>
          <Icon svg={def.icon} className="ol-ico" />{def.label}<small>{txt}</small>
        </button>
        {(b.slots || []).map((s, i) => <Outline key={i} list={s} ed={ed} depth={depth + 1} />)}
      </div>
    );
  });
}

function PagePanel({ ed }) {
  const p = ed.s.project;
  const t = p.theme;
  const site = ed.site;
  const stats = useStats(p);
  return (
    <>
      <div className="insp-head" style={{ '--c': 'var(--violet)' }}>
        <span className="insp-ico">{site ? '🌐' : '📄'}</span>
        <div><small>Nothing selected</small><h3>{site ? 'Website' : 'Document'} settings</h3></div>
      </div>
      <p className="insp-tip">Click any block on the canvas to style it. Drag bricks from the left to add more.</p>
      {site && (
        <section className="insp-sec">
          <h4>Pages</h4>
          <div className="pages-list">
            {p.pages.map((pg, i) => (
              <div key={pg.id} className={`pg-row${pg.id === ed.s.pageId ? ' on' : ''}`}>
                <button className="pg-open" title="Open" onClick={() => ed.openPage(pg.id)}>{i === 0 ? '🏠' : '📄'}</button>
                <input value={pg.name} aria-label="Page name" onChange={(e) => ed.renamePage(pg.id, e.target.value)} />
                <button title="Move up" disabled={i === 0} onClick={() => ed.pageAction('up', pg.id)}>↑</button>
                <button title="Duplicate" onClick={() => ed.pageAction('dup', pg.id)}>⧉</button>
                <button title="Delete" disabled={p.pages.length < 2} onClick={() => ed.pageAction('del', pg.id)}>✕</button>
              </div>
            ))}
          </div>
          <button className="btn-chunk small" style={{ marginTop: 10 }} onClick={() => ed.newPage()}>+ Add page</button>
          <p className="insp-hint">The first page is your home page. Nav bars link every page automatically.</p>
        </section>
      )}
      <section className="insp-sec">
        <h4>Theme</h4>
        <div className="themes">
          {Object.entries(THEMES).map(([k, th]) => (
            <button key={k} className={`theme-chip${t.preset === k ? ' on' : ''}`} data-theme-preset={k} style={{ '--a': th.bg, '--b': th.accent, '--c': th.accent2, '--d': th.text }} onClick={() => ed.setThemePreset(k)}>
              <span className="tc-sw"><i /><i /><i /></span>
              <span style={{ fontFamily: fontStack(th.hfont) }}>{th.label}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="insp-sec">
        <h4>Colours</h4>
        {[['bg', 'Page'], ['text', 'Text'], ['accent', 'Accent'], ['accent2', 'Accent 2'], ['surface', 'Surface']].map(([k, label]) => (
          <div key={k} className="f f-row">
            <label>{label}</label>
            <label className="big-pick" style={{ background: t[k] }}>
              <input type="color" value={hexOf(t[k])} onChange={(e) => ed.setTheme({ [k]: e.target.value }, true)} onBlur={(e) => ed.setTheme({ [k]: e.target.value })} />
            </label>
          </div>
        ))}
      </section>
      <section className="insp-sec">
        <h4>Fonts</h4>
        {[['hfont', 'Headings'], ['bfont', 'Body']].map(([k, label]) => (
          <div key={k} className="f">
            <label>{label}</label>
            <select value={t[k]} onChange={(e) => ed.setTheme({ [k]: e.target.value })}>{FONTS.map((f) => <option key={f.name}>{f.name}</option>)}</select>
          </div>
        ))}
        <Range label="Base size" value={t.base || 16} min={12} max={22} auto="" onChange={(v, live) => ed.setTheme({ base: v }, live)} />
      </section>
      {!site && (
        <section className="insp-sec">
          <h4>Paper</h4>
          <Seg label="Size" value={p.pageSize} options={Object.entries(PAGE_SIZES).map(([k, v]) => [k, v.label])} onChange={(v) => ed.setMeta({ pageSize: v })} />
          <Seg label="Margins" value={p.margin || 'normal'} options={Object.entries(MARGINS).map(([k, v]) => [k, v.label])} onChange={(v) => ed.setMeta({ margin: v })} />
          <div className="f f-row"><label>Page numbers in PDF</label><Toggle on={p.pageNumbers} onClick={() => ed.setMeta({ pageNumbers: !p.pageNumbers })} /></div>
          <p className="insp-hint">{stats}</p>
        </section>
      )}
      <section className="insp-sec">
        <h4>Outline{site ? ' — this page' : ''}</h4>
        <div className="outline"><Outline list={ed.blocks} ed={ed} /></div>
      </section>
    </>
  );
}

export default function Inspector({ ed }) {
  const ref = useRef(null);
  return (
    <aside className="ed-right" ref={ref} style={cssToObj(themeVars(ed.s.project.theme))}>
      {ed.selBlock ? <BlockPanel key={ed.selBlock.id} b={ed.selBlock} ed={ed} /> : <PagePanel ed={ed} />}
    </aside>
  );
}
