// Block catalogue: defaults, inspector fields and React renderers.
// `modes` limits a block to documents ('doc') or websites ('site'); no `modes` = both.
// Each `Render` gets { b, ctx, slot } where slot(i) renders the block's i-th child list.
import { uid, walk } from '../lib/store.js';
import { inlineToText } from '../lib/inline.js';
import { Editable, EditableList, linkProps } from './primitives.jsx';

const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const GROUPS = [
  { id: 'text', label: 'Words', color: 'var(--pink)' },
  { id: 'media', label: 'Media & Bits', color: 'var(--blue)' },
  { id: 'layout', label: 'Layout', color: 'var(--yellow)' },
  { id: 'doc', label: 'Document extras', color: 'var(--orange)', modes: ['doc'] },
  { id: 'site', label: 'Website sections', color: 'var(--lime)', modes: ['site'] },
];
export const groupColor = (g) => GROUPS.find((x) => x.id === g)?.color || 'var(--pink)';

export function collectHeadings(list) {
  const out = [];
  walk(list, (b) => b.type === 'heading' && out.push({ id: b.id, level: +b.props.level, text: inlineToText(b.props.text) }));
  return out;
}

const initials = (s) => inlineToText(s).split(/\s+/).map((w) => w[0] || '').join('').slice(0, 2).toUpperCase();

export function embedUrl(url = '') {
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return '';
}

export const BLOCKS = {
  // ---------------- words (both) ----------------
  heading: {
    label: 'Heading', group: 'text', icon: I('<path d="M6 4v16M18 4v16M6 12h12"/>'),
    props: () => ({ text: 'A big bold idea', level: '1' }),
    fields: [{ key: 'level', label: 'Size', type: 'seg', options: [['1', 'H1'], ['2', 'H2'], ['3', 'H3']] }],
    Render: ({ b, ctx }) => <Editable as={`h${b.props.level}`} className="pk-h" id={`h-${b.id}`} ctx={ctx} path="text" html={b.props.text} />,
  },
  text: {
    label: 'Paragraph', group: 'text', icon: I('<path d="M4 6h16M4 12h16M4 18h10"/>'),
    props: () => ({ text: 'Start typing here. Press Enter for a new line — select words to make them <b>bold</b>, <i>italic</i> or a link.' }),
    fields: [],
    Render: ({ b, ctx }) => <Editable as="p" className="pk-p" ctx={ctx} path="text" html={b.props.text} />,
  },
  list: {
    label: 'List', group: 'text', icon: I('<circle cx="5" cy="6" r="1.2"/><circle cx="5" cy="12" r="1.2"/><circle cx="5" cy="18" r="1.2"/><path d="M10 6h10M10 12h10M10 18h10"/>'),
    props: () => ({ items: ['First thing', 'Second thing', 'Third thing'], ordered: false }),
    fields: [{ key: 'ordered', label: 'Style', type: 'seg', options: [[false, '• Bullets'], [true, '1. Numbers']] }],
    Render: ({ b, ctx }) => <EditableList ordered={b.props.ordered} ctx={ctx} path="items" items={b.props.items} />,
  },
  checklist: {
    label: 'Checklist', group: 'text', icon: I('<rect x="3" y="4" width="6" height="6" rx="1.5"/><path d="M4.5 7l1 1 2-2M13 7h8M3 15h6v6H3zM13 18h8"/>'),
    props: () => ({ items: [{ t: 'Draft the outline', done: true }, { t: 'Add pictures', done: false }, { t: 'Export & share', done: false }] }),
    fields: [{ key: 'items', label: 'Items', type: 'count', make: () => ({ t: 'New item', done: false }) }],
    Render: ({ b, ctx }) => (
      <ul className="pk-check">
        {b.props.items.map((it, i) => (
          <li key={i} className={it.done ? 'done' : ''}>
            <span className="pk-box" {...(ctx.editing ? { 'data-check': i, title: 'Tick' } : {})} />
            <Editable as="span" className="pk-check-t" ctx={ctx} path={`items.${i}.t`} html={it.t} />
          </li>
        ))}
      </ul>
    ),
  },
  quote: {
    label: 'Quote', group: 'text', icon: I('<path d="M7 7h4v4c0 3-2 5-4 6M14 7h4v4c0 3-2 5-4 6"/>'),
    props: () => ({ text: 'Design is thinking made visual.', cite: 'Saul Bass' }),
    fields: [{ key: 'cite', label: 'Who said it', type: 'text' }],
    Render: ({ b, ctx }) => (
      <blockquote>
        <Editable ctx={ctx} path="text" html={b.props.text} />
        {(b.props.cite || ctx.editing) && <Editable as="cite" ctx={ctx} path="cite" html={b.props.cite} />}
      </blockquote>
    ),
  },
  callout: {
    label: 'Callout', group: 'text', icon: I('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>'),
    props: () => ({ icon: '💡', text: 'Heads up! Callouts are perfect for tips, warnings and little asides.' }),
    fields: [{ key: 'icon', label: 'Icon', type: 'emoji' }],
    Render: ({ b, ctx }) => (
      <div className="pk-callout-in">
        <span className="pk-callout-ico">{b.props.icon}</span>
        <Editable className="pk-p" ctx={ctx} path="text" html={b.props.text} />
      </div>
    ),
  },
  code: {
    label: 'Code', group: 'text', icon: I('<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>'),
    props: () => ({ code: 'const plonk = (block) => page.drop(block);' }),
    fields: [],
    Render: ({ b, ctx }) => <Editable as="pre" ctx={ctx} path="code" html={b.props.code} plain />,
  },
  badges: {
    label: 'Tags', group: 'text', icon: I('<rect x="2" y="8" width="9" height="8" rx="4"/><rect x="13" y="8" width="9" height="8" rx="4"/>'),
    props: () => ({ items: ['Design', 'Writing', 'Strategy'], layout: 'wrap', shape: 'pill', cols: 3 }),
    fields: [
      { key: 'items', label: 'Tags', type: 'taglist' },
      { key: 'layout', label: 'Layout', type: 'seg', options: [['wrap', 'Wrap'], ['compact', 'Tight'], ['stack', 'Stack'], ['grid', 'Grid'], ['inline', 'Text']] },
      { key: 'shape', label: 'Shape', type: 'seg', options: [['pill', 'Pill'], ['square', 'Square'], ['outline', 'Outline'], ['solid', 'Solid']] },
      { key: 'cols', label: 'Grid columns', type: 'seg', options: [[2, '2'], [3, '3'], [4, '4'], [5, '5']], when: (p) => p.layout === 'grid' },
    ],
    Render: ({ b, ctx }) => {
      const p = b.props;
      const lay = p.layout || 'wrap';
      if (lay === 'inline') {
        return (
          <p className="pk-p pk-tags-inline">
            {p.items.map((t, i) => (
              <span key={i}>
                {i > 0 && <i> · </i>}
                <Editable as="span" ctx={ctx} path={`items.${i}`} html={t} />
              </span>
            ))}
          </p>
        );
      }
      return (
        <div className={`pk-badges ${lay} ${p.shape || 'pill'}`} style={{ '--n': p.cols || 3 }}>
          {p.items.map((t, i) => <Editable key={i} as="span" className="pk-badge" ctx={ctx} path={`items.${i}`} html={t} />)}
        </div>
      );
    },
  },
  stat: {
    label: 'Big Number', group: 'text', icon: I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    props: () => ({ n: '98%', label: 'of people love blocks' }),
    fields: [],
    Render: ({ b, ctx }) => (
      <div className="pk-stat">
        <Editable className="pk-stat-n" ctx={ctx} path="n" html={b.props.n} />
        <Editable className="pk-stat-l" ctx={ctx} path="label" html={b.props.label} />
      </div>
    ),
  },

  // ---------------- media ----------------
  image: {
    label: 'Image', group: 'media', icon: I('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
    props: () => ({ src: '', alt: '', caption: '', ratio: 'auto' }),
    fields: [
      { key: 'src', label: 'Picture', type: 'image' },
      { key: 'alt', label: 'Alt text (for screen readers)', type: 'text' },
      { key: 'ratio', label: 'Crop', type: 'seg', options: [['auto', 'Free'], ['1/1', '1:1'], ['4/3', '4:3'], ['16/9', '16:9'], ['3/1', 'Banner']] },
    ],
    Render: ({ b, ctx }) => {
      const p = b.props;
      const crop = p.ratio !== 'auto' ? { aspectRatio: p.ratio, objectFit: 'cover' } : undefined;
      return (
        <figure className="pk-figure">
          {p.src ? <img src={p.src} alt={p.alt} style={crop} /> : <div className="pk-img-empty">{ctx.editing ? '🖼 Add a picture in the panel →' : ''}</div>}
          {(p.caption || ctx.editing) && <Editable as="figcaption" ctx={ctx} path="caption" html={p.caption} />}
        </figure>
      );
    },
  },
  gallery: {
    label: 'Gallery', group: 'media', modes: ['site'], icon: I('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>'),
    props: () => ({ images: [], cols: 3, ratio: '1/1' }),
    fields: [
      { key: 'images', label: 'Pictures', type: 'images' },
      { key: 'cols', label: 'Columns', type: 'seg', options: [[2, '2'], [3, '3'], [4, '4']] },
      { key: 'ratio', label: 'Crop', type: 'seg', options: [['1/1', '1:1'], ['4/3', '4:3'], ['3/4', '3:4'], ['16/9', '16:9']] },
    ],
    Render: ({ b, ctx }) => {
      const p = b.props;
      const imgs = p.images.length ? p.images : ctx.editing ? Array(p.cols).fill('') : [];
      return (
        <div className="pk-gallery" style={{ '--n': p.cols, '--ar': p.ratio }}>
          {imgs.map((s, i) => (s ? <img key={i} src={s} alt="" /> : <div key={i} className="pk-img-empty">🖼</div>))}
        </div>
      );
    },
  },
  video: {
    label: 'Video', group: 'media', modes: ['site'], icon: I('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/>'),
    props: () => ({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
    fields: [{ key: 'url', label: 'YouTube or Vimeo link', type: 'text' }],
    Render: ({ b, ctx }) => {
      const src = embedUrl(b.props.url);
      if (ctx.static || !src) {
        return (
          <a className="pk-video-static" href={b.props.url}>
            <div><b>▶</b><br /><small>{b.props.url || 'Paste a video link'}</small></div>
          </a>
        );
      }
      return <div className="pk-video-frame"><iframe src={src} allowFullScreen loading="lazy" title="Video" /></div>;
    },
  },
  button: {
    label: 'Button', group: 'media', modes: ['site'], icon: I('<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M9 12h6"/>'),
    props: () => ({ label: 'Click me', href: '#', variant: 'solid', full: false, bg: '', fg: '' }),
    fields: [
      { key: 'href', label: 'Goes to', type: 'link' },
      { key: 'variant', label: 'Look', type: 'seg', options: [['solid', 'Solid'], ['outline', 'Outline']] },
      { key: 'full', label: 'Full width', type: 'toggle' },
      { key: 'bg', label: 'Button colour', type: 'color' },
      { key: 'fg', label: 'Label colour', type: 'color' },
    ],
    Render: ({ b, ctx }) => {
      const p = b.props;
      const style = {};
      if (p.bg) style['--bb'] = p.bg;
      if (p.fg) style['--bf'] = p.fg;
      return (
        <div className="pk-btn-wrap">
          <Editable as="a" className={`pk-btn ${p.variant}${p.full ? ' block' : ''}`} {...linkProps(p.href, ctx)} style={style} ctx={ctx} path="label" html={p.label} />
        </div>
      );
    },
  },
  table: {
    label: 'Table', group: 'media', icon: I('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M10 4v16"/>'),
    props: () => ({ rows: [['Item', 'Qty', 'Notes'], ['Blocks', '12', 'Chunky'], ['Colours', '∞', 'Loud']], header: true, striped: true }),
    fields: [
      { key: 'rows', label: 'Grid size', type: 'tablesize' },
      { key: 'header', label: 'Header row', type: 'toggle' },
      { key: 'striped', label: 'Stripes', type: 'toggle' },
    ],
    Render: ({ b, ctx }) => {
      const { rows, header, striped } = b.props;
      const row = (r, ri, Cell) => (
        <tr key={ri}>{r.map((c, ci) => <Editable key={ci} as={Cell} ctx={ctx} path={`rows.${ri}.${ci}`} html={c} />)}</tr>
      );
      return (
        <table className={striped ? 'striped' : ''}>
          {header && <thead>{row(rows[0], 0, 'th')}</thead>}
          <tbody>{rows.map((r, ri) => (header && ri === 0 ? null : row(r, ri, 'td')))}</tbody>
        </table>
      );
    },
  },

  // ---------------- layout (both) ----------------
  section: {
    label: 'Section', group: 'layout', icon: I('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h6"/>'),
    props: () => ({}),
    slots: 1,
    style: () => ({ bg: 'var(--pk-surface)', radius: 18 }),
    fields: [],
    Render: ({ slot }) => <div className="pk-section-in">{slot(0)}</div>,
  },
  columns: {
    label: 'Columns', group: 'layout', icon: I('<rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/>'),
    props: () => ({ n: 2, gap: 24, valign: 'start', colAlign: [] }),
    slots: 2,
    fields: [
      { key: 'n', label: 'Columns', type: 'seg', options: [[2, '2'], [3, '3'], [4, '4']] },
      { key: 'gap', label: 'Gap', type: 'range', min: 0, max: 80 },
      { key: 'valign', label: 'Line up content (all columns)', type: 'seg', options: [['start', 'Top'], ['center', 'Middle'], ['end', 'Bottom']] },
    ],
    Render: ({ b, slot }) => {
      const p = b.props;
      const va = p.valign === 'stretch' ? 'start' : p.valign;
      return (
        <div className="pk-cols" style={{ '--n': p.n, '--gap': `${p.gap}px`, '--va': va }}>
          {b.slots.map((_, i) => (
            <div key={i} className="pk-col" style={p.colAlign?.[i] ? { justifyContent: p.colAlign[i] } : undefined}>{slot(i)}</div>
          ))}
        </div>
      );
    },
  },
  card: {
    label: 'Card', group: 'layout', icon: I('<rect x="3" y="4" width="15" height="13" rx="3"/><path d="M7 20h11a3 3 0 0 0 3-3V8"/>'),
    props: () => ({}),
    slots: 1,
    fields: [],
    Render: ({ slot }) => slot(0),
  },
  divider: {
    label: 'Divider', group: 'layout', icon: I('<path d="M3 12h18M7 7h10M7 17h10"/>'),
    props: () => ({ variant: 'solid' }),
    fields: [{ key: 'variant', label: 'Line', type: 'seg', options: [['solid', '—'], ['dashed', '- -'], ['dotted', '···'], ['thick', '▬'], ['wavy', '〰']] }],
    Render: ({ b }) => <hr className={`pk-hr ${b.props.variant}`} />,
  },
  spacer: {
    label: 'Spacer', group: 'layout', icon: I('<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>'),
    props: () => ({ h: 48 }),
    fields: [{ key: 'h', label: 'Height', type: 'range', min: 8, max: 300 }],
    Render: ({ b }) => <div className="pk-space" style={{ height: b.props.h }} />,
  },

  // ---------------- document extras ----------------
  pagebreak: {
    label: 'Page Break', group: 'doc', modes: ['doc'], icon: I('<path d="M6 3h12v5H6zM6 16h12v5H6zM2 12h3M8 12h3M13 12h3M19 12h3"/>'),
    props: () => ({}),
    fields: [],
    Render: () => null,
  },
  toc: {
    label: 'Contents', group: 'doc', modes: ['doc'], icon: I('<path d="M4 5h2M9 5h11M6 11h2M11 11h9M6 17h2M11 17h9"/>'),
    props: () => ({ title: 'Contents', depth: 2 }),
    fields: [{ key: 'depth', label: 'Include', type: 'seg', options: [[1, 'H1 only'], [2, 'H1–H2'], [3, 'All']] }],
    Render: ({ b, ctx }) => {
      const hs = (ctx.headings || []).filter((h) => h.level <= b.props.depth && h.id !== b.id);
      return (
        <nav className="pk-toc">
          <Editable className="pk-toc-t" ctx={ctx} path="title" html={b.props.title} />
          <ol>
            {hs.length ? (
              hs.map((h) => <li key={h.id} className={`l${h.level}`}><a href={`#h-${h.id}`}>{h.text}</a></li>)
            ) : (
              <li className="pk-toc-empty">{ctx.editing ? 'Add some headings — they’ll show up here automatically.' : ''}</li>
            )}
          </ol>
        </nav>
      );
    },
  },
  signature: {
    label: 'Signature', group: 'doc', modes: ['doc'], icon: I('<path d="M3 17c3-6 5-9 6-7s-2 6 0 6 3-5 5-5 1 4 3 4 3-2 4-3M3 21h18"/>'),
    props: () => ({ name: 'Your Name', role: 'Title, Company', date: true }),
    fields: [{ key: 'date', label: 'Date line', type: 'toggle' }],
    Render: ({ b, ctx }) => (
      <div className="pk-sig">
        <div className="pk-sig-col">
          <div className="pk-sig-line" />
          <Editable className="pk-sig-name" ctx={ctx} path="name" html={b.props.name} />
          <Editable className="pk-sig-role" ctx={ctx} path="role" html={b.props.role} />
        </div>
        {b.props.date && (
          <div className="pk-sig-col"><div className="pk-sig-line" /><div className="pk-sig-role">Date</div></div>
        )}
      </div>
    ),
  },
  footnote: {
    label: 'Footnote', group: 'doc', modes: ['doc'], icon: I('<path d="M4 20h10M4 16h16M16 4v6M13 7h6"/>'),
    props: () => ({ mark: '*', text: 'Small print, sources and side notes go here.' }),
    fields: [],
    Render: ({ b, ctx }) => (
      <div className="pk-note">
        <Editable as="sup" ctx={ctx} path="mark" html={b.props.mark} />
        <Editable ctx={ctx} path="text" html={b.props.text} />
      </div>
    ),
  },

  // ---------------- website sections ----------------
  navbar: {
    label: 'Nav Bar', group: 'site', modes: ['site'], shared: true, icon: I('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M6 6.5h3"/>'),
    props: () => ({ brand: 'Brandname', auto: true, links: [], sticky: false }),
    fields: [
      { key: 'auto', label: 'Link every page automatically', type: 'toggle' },
      { key: 'links', label: 'Extra links — one per line: Label | link', type: 'links' },
      { key: 'sticky', label: 'Stick to top when scrolling', type: 'toggle' },
    ],
    Render: ({ b, ctx }) => {
      const p = b.props;
      return (
        <nav className={`pk-nav${p.sticky ? ' sticky' : ''}`}>
          <Editable className="pk-nav-brand" ctx={ctx} path="brand" html={p.brand} />
          <div className="pk-nav-links">
            {p.auto && ctx.pages?.map((pg) => (
              <a key={pg.id} {...linkProps('page:' + pg.id, ctx)} className={pg.id === ctx.pageId ? 'on' : undefined}>{pg.name}</a>
            ))}
            {(p.links || []).map((l, i) => <Editable key={i} as="a" {...linkProps(l.h, ctx)} ctx={ctx} path={`links.${i}.t`} html={l.t} />)}
          </div>
        </nav>
      );
    },
  },
  hero: {
    label: 'Hero', group: 'site', modes: ['site'], icon: I('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 10h8M9 14h6"/>'),
    props: () => ({ title: 'Make something loud.', sub: 'A one-line promise that tells visitors exactly why they should stick around.', cta: 'Get started', href: '#' }),
    style: () => ({ bg: 'linear-gradient(135deg,#FF4FA3 0%,#FFD23F 100%)', radius: 24, color: '#140F2D' }),
    fields: [{ key: 'href', label: 'Button goes to', type: 'link' }],
    Render: ({ b, ctx }) => {
      const p = b.props;
      return (
        <header className="pk-hero">
          <Editable as="h1" className="pk-h" id={`h-${b.id}`} ctx={ctx} path="title" html={p.title} />
          <Editable as="p" className="pk-p" ctx={ctx} path="sub" html={p.sub} />
          {(p.cta || ctx.editing) && (
            <Editable as="a" className="pk-btn" {...linkProps(p.href, ctx)} style={{ '--bb': '#140F2D', '--bf': '#fff' }} ctx={ctx} path="cta" html={p.cta} />
          )}
        </header>
      );
    },
  },
  features: {
    label: 'Features', group: 'site', modes: ['site'], icon: I('<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="16" rx="1.5"/><rect x="17" y="4" width="4" height="16" rx="1.5"/>'),
    props: () => ({ cols: 3, items: [{ icon: '⚡', t: 'Fast', d: 'From idea to page before your coffee cools.' }, { icon: '🎨', t: 'Loud', d: 'Colours, stickers, glass — style anything.' }, { icon: '📦', t: 'Yours', d: 'Export clean HTML and host it anywhere.' }] }),
    fields: [
      { key: 'items', label: 'Features', type: 'count', make: () => ({ icon: '✨', t: 'New feature', d: 'Say why it matters.' }) },
      { key: 'cols', label: 'Per row', type: 'seg', options: [[2, '2'], [3, '3'], [4, '4']] },
    ],
    Render: ({ b, ctx }) => (
      <div className="pk-feats" style={{ '--n': b.props.cols }}>
        {b.props.items.map((it, i) => (
          <div key={i} className="pk-feat">
            <Editable className="pk-feat-ico" ctx={ctx} path={`items.${i}.icon`} html={it.icon} />
            <Editable as="h3" className="pk-h" ctx={ctx} path={`items.${i}.t`} html={it.t} />
            <Editable as="p" className="pk-p" ctx={ctx} path={`items.${i}.d`} html={it.d} />
          </div>
        ))}
      </div>
    ),
  },
  pricing: {
    label: 'Pricing', group: 'site', modes: ['site'], icon: I('<path d="M12 3v18M16 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H7"/>'),
    props: () => ({
      featured: 1,
      href: '#',
      plans: [
        { name: 'Starter', price: '$0', per: '/month', features: ['1 project', 'All the blocks', 'HTML export'], cta: 'Start free' },
        { name: 'Pro', price: '$12', per: '/month', features: ['Unlimited projects', 'Every export format', 'Priority support'], cta: 'Go Pro' },
        { name: 'Team', price: '$39', per: '/month', features: ['Everything in Pro', '10 seats', 'Shared themes'], cta: 'Contact us' },
      ],
    }),
    fields: [
      { key: 'plans', label: 'Plans', type: 'count', make: () => ({ name: 'New plan', price: '$9', per: '/month', features: ['A great perk'], cta: 'Choose' }) },
      { key: 'featured', label: 'Highlighted plan', type: 'featured' },
      { key: 'href', label: 'Buttons go to', type: 'link' },
    ],
    Render: ({ b, ctx }) => {
      const p = b.props;
      return (
        <div className="pk-plans" style={{ '--n': p.plans.length }}>
          {p.plans.map((pl, i) => {
            const hot = +p.featured === i;
            return (
              <div key={i} className={`pk-plan${hot ? ' hot' : ''}`}>
                {hot && <span className="pk-plan-flag">Most popular</span>}
                <Editable className="pk-plan-name" ctx={ctx} path={`plans.${i}.name`} html={pl.name} />
                <div className="pk-plan-price">
                  <Editable as="b" ctx={ctx} path={`plans.${i}.price`} html={pl.price} />
                  <Editable as="span" ctx={ctx} path={`plans.${i}.per`} html={pl.per} />
                </div>
                <EditableList ctx={ctx} path={`plans.${i}.features`} items={pl.features} />
                <Editable as="a" className={`pk-btn block${hot ? '' : ' outline'}`} {...linkProps(p.href, ctx)} ctx={ctx} path={`plans.${i}.cta`} html={pl.cta} />
              </div>
            );
          })}
        </div>
      );
    },
  },
  testimonial: {
    label: 'Testimonial', group: 'site', modes: ['site'], icon: I('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'),
    props: () => ({ quote: 'Plonk turned our boring launch page into something people actually screenshot.', name: 'Riley Chen', role: 'Founder, Snackbox', avatar: '' }),
    fields: [{ key: 'avatar', label: 'Photo', type: 'image' }],
    Render: ({ b, ctx }) => {
      const p = b.props;
      return (
        <figure className="pk-testi">
          <Editable as="blockquote" ctx={ctx} path="quote" html={p.quote} />
          <figcaption>
            <div className="pk-av">{p.avatar ? <img src={p.avatar} alt="" /> : <span>{initials(p.name)}</span>}</div>
            <div>
              <Editable as="b" ctx={ctx} path="name" html={p.name} />
              <Editable as="small" ctx={ctx} path="role" html={p.role} />
            </div>
          </figcaption>
        </figure>
      );
    },
  },
  faq: {
    label: 'FAQ', group: 'site', modes: ['site'], icon: I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5M12 17h.01"/>'),
    props: () => ({ items: [{ q: 'Is it free?', a: 'Yep. Build as much as you like.' }, { q: 'Can I use my own domain?', a: 'Export the site and drop it on any host — Netlify, GitHub Pages, anywhere.' }, { q: 'Where is my work saved?', a: 'Right in your browser. Export a Plonk file to back it up.' }] }),
    fields: [{ key: 'items', label: 'Questions', type: 'count', make: () => ({ q: 'A new question?', a: 'A helpful answer.' }) }],
    Render: ({ b, ctx }) => (
      <div className="pk-faq">
        {b.props.items.map((it, i) =>
          ctx.editing ? (
            <div key={i} className="pk-faq-i open">
              <Editable className="pk-faq-q" ctx={ctx} path={`items.${i}.q`} html={it.q} />
              <Editable className="pk-faq-a" ctx={ctx} path={`items.${i}.a`} html={it.a} />
            </div>
          ) : (
            <details key={i} className="pk-faq-i" open={ctx.static || undefined}>
              <summary className="pk-faq-q" dangerouslySetInnerHTML={{ __html: it.q }} />
              <div className="pk-faq-a" dangerouslySetInnerHTML={{ __html: it.a }} />
            </details>
          ),
        )}
      </div>
    ),
  },
  contact: {
    label: 'Contact Form', group: 'site', modes: ['site'], icon: I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
    props: () => ({ title: 'Say hello 👋', sub: 'Drop us a line and we’ll get back to you.', email: 'hello@example.com', cta: 'Send message' }),
    fields: [{ key: 'email', label: 'Messages go to (email)', type: 'text' }],
    Render: ({ b, ctx }) => {
      const p = b.props;
      const dis = ctx.editing || ctx.static;
      return (
        <form className="pk-contact" action={`mailto:${p.email}`} method="post" encType="text/plain">
          <Editable as="h3" className="pk-h" ctx={ctx} path="title" html={p.title} />
          <Editable as="p" className="pk-p" ctx={ctx} path="sub" html={p.sub} />
          <div className="pk-contact-row">
            <input name="name" placeholder="Your name" disabled={dis} />
            <input name="email" type="email" placeholder="you@email.com" disabled={dis} />
          </div>
          <textarea name="message" rows={4} placeholder="Your message" disabled={dis} />
          {/* Previews sit inside clickable cards, so no nested <button> there. */}
          {dis ? <Editable as="span" className="pk-btn" ctx={ctx} path="cta" html={p.cta} /> : <button className="pk-btn" type="submit" dangerouslySetInnerHTML={{ __html: p.cta }} />}
        </form>
      );
    },
  },
  footer: {
    label: 'Footer', group: 'site', modes: ['site'], shared: true, icon: I('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15h18M8 17.5h8"/>'),
    props: () => ({ text: '© 2026 You. Built with blocks on Plonk.' }),
    fields: [],
    Render: ({ b, ctx }) => (
      <footer className="pk-footer"><Editable ctx={ctx} path="text" html={b.props.text} /></footer>
    ),
  },
};

export const blockAllowed = (type, mode) => {
  const d = BLOCKS[type];
  return !!d && (!d.modes || d.modes.includes(mode));
};

export function makeBlock(type, props = {}, style = {}, slots) {
  const def = BLOCKS[type];
  const b = { id: uid(), type, props: { ...def.props(), ...props }, style: { ...(def.style?.() || {}), ...style } };
  if (def.slots) b.slots = slots || Array.from({ length: def.slots }, () => []);
  return b;
}

// Quick looks: one-click style presets for any block.
export const LOOKS = {
  plain: { label: 'Plain', style: { bg: '', border: 0, shadow: 'none', padding: 0, radius: 0, color: '' } },
  sticker: { label: 'Sticker', style: { bg: '#FFD23F', color: '#140F2D', border: 3, borderColor: '#140F2D', radius: 16, shadow: 'hard', padding: 20 } },
  glass: { label: 'Glass', style: { bg: 'rgba(255,255,255,.5)', border: 1.5, borderColor: 'rgba(255,255,255,.9)', radius: 20, shadow: 'soft', padding: 22 } },
  outline: { label: 'Outline', style: { bg: '', border: 2.5, borderColor: 'currentColor', radius: 14, shadow: 'none', padding: 18 } },
  ink: { label: 'Ink', style: { bg: '#140F2D', color: '#FFF6E5', border: 0, radius: 16, shadow: 'none', padding: 22 } },
  accent: { label: 'Accent', style: { bg: 'var(--pk-accent)', color: 'var(--pk-on-accent)', border: 0, radius: 16, shadow: 'soft', padding: 22 } },
  glow: { label: 'Glow', style: { bg: 'var(--pk-surface)', border: 2, borderColor: 'var(--pk-accent)', radius: 18, shadow: 'glow', padding: 20 } },
};

const SHADOWS = {
  soft: '0 14px 34px -14px rgba(20,15,45,.35)',
  hard: '6px 6px 0 #140F2D',
  glow: '0 0 0 4px color-mix(in srgb,var(--pk-accent) 25%,transparent),0 10px 40px -6px var(--pk-accent)',
  lift: '0 2px 0 rgba(0,0,0,.06),0 24px 48px -20px rgba(20,15,45,.45)',
};

export function styleToCss(s = {}) {
  const css = [];
  if (s.font) css.push(`--ff:${s.fontStack};font-family:${s.fontStack}`);
  if (s.size) css.push(`--fs:${s.size}px`);
  if (s.weight) css.push(`--fw:${s.weight};font-weight:${s.weight}`);
  if (s.align) css.push(`text-align:${s.align}`);
  if (s.color) css.push(`color:${s.color}`);
  if (s.italic) css.push('font-style:italic');
  if (s.upper) css.push('text-transform:uppercase');
  if (s.lh) css.push(`line-height:${s.lh}`);
  if (s.ls) css.push(`letter-spacing:${s.ls}em`);
  if (s.bg) css.push(`background:${s.bg}`);
  if (s.padding != null && s.padding !== '') css.push(`padding:${s.padding}px`);
  if (s.radius) css.push(`border-radius:${s.radius}px`);
  if (s.border) css.push(`border:${s.border}px solid ${s.borderColor || 'currentColor'}`);
  if (s.shadow && SHADOWS[s.shadow]) css.push(`box-shadow:${SHADOWS[s.shadow]}`);
  if (s.opacity != null && s.opacity < 100) css.push(`opacity:${s.opacity / 100}`);
  if (s.maxw && s.maxw < 100) {
    const pos = s.balign || (s.align === 'left' || s.align === 'right' ? s.align : 'center');
    css.push(`max-width:${s.maxw}%;margin-left:${pos === 'left' ? 0 : 'auto'};margin-right:${pos === 'right' ? 0 : 'auto'}`);
  }
  if (s.minh) css.push(`min-height:${s.minh}px;display:flex;flex-direction:column;justify-content:${s.va || 'start'}`);
  if (s.mb != null && s.mb !== '') css.push(`margin-bottom:${s.mb}px`);
  if (s.rotate) css.push(`transform:rotate(${s.rotate}deg)`);
  return css.join(';');
}
