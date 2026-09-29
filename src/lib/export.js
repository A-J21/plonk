// Exporters: HTML (single page or multi-page site), website .zip, PDF, PNG, DOCX, Markdown, text, Plonk JSON, print.
import { BLOCKS, collectHeadings } from '../blocks/catalog.jsx';

// The static renderer (react-dom/server) is loaded on first export.
let renderHTML;
export async function exportReady() {
  renderHTML ||= (await import('../blocks/static.jsx')).renderHTML;
}
import { CONTENT_CSS, themeVars, googleFontsLink, PAGE_SIZES, docPad, onColor } from './theme.js';
import { walk, slugify, allBlocks, uid } from './store.js';
import { esc, inlineToMarkdown, inlineToText, inlineToRuns } from './inline.js';

const ALL = {
  pdf: { id: 'pdf', label: 'PDF', desc: 'Paged, ready to send', ext: 'pdf', color: 'var(--pink)' },
  docx: { id: 'docx', label: 'Word', desc: 'Editable .docx', ext: 'docx', color: 'var(--blue)' },
  html: { id: 'html', label: 'Web page', desc: 'Standalone .html — host anywhere', ext: 'html', color: 'var(--lime)' },
  zip: { id: 'zip', label: 'Website folder', desc: 'One .html per page, zipped — upload to any host', ext: 'zip', color: 'var(--lime)' },
  sitehtml: { id: 'html', label: 'Single-file site', desc: 'Every page in one .html, with working nav', ext: 'html', color: 'var(--teal)' },
  png: { id: 'png', label: 'Image', desc: 'Crisp PNG snapshot', ext: 'png', color: 'var(--yellow)' },
  sitepng: { id: 'png', label: 'Image', desc: 'PNG of the page you’re on', ext: 'png', color: 'var(--yellow)' },
  md: { id: 'md', label: 'Markdown', desc: 'For READMEs & notes apps', ext: 'md', color: 'var(--orange)' },
  txt: { id: 'txt', label: 'Plain text', desc: 'Just the words', ext: 'txt', color: 'var(--teal)' },
  json: { id: 'json', label: 'Plonk file', desc: 'Re-open & keep editing later', ext: 'plonk.json', color: 'var(--violet)' },
  print: { id: 'print', label: 'Print', desc: 'Send to printer / vector PDF', ext: '', color: 'var(--cream)' },
  sitepdf: { id: 'pdf', label: 'PDF', desc: 'Every page, one after another', ext: 'pdf', color: 'var(--pink)' },
};
export const formatsFor = (mode) =>
  mode === 'site'
    ? [ALL.zip, ALL.sitehtml, ALL.sitepng, ALL.sitepdf, ALL.md, ALL.docx, ALL.txt, ALL.json]
    : [ALL.pdf, ALL.docx, ALL.html, ALL.png, ALL.md, ALL.txt, ALL.json, ALL.print];

const slug = (s) => slugify(s || 'untitled');

function usedFonts(p) {
  const names = [p.theme.hfont, p.theme.bfont, 'Space Mono'];
  walk(allBlocks(p), (b) => b.style?.font && names.push(b.style.font));
  return names;
}

// Unique, readable file/route names for each page. The first page is home.
export function pageSlugs(p) {
  const used = new Set();
  const map = {};
  p.pages.forEach((pg, i) => {
    let s = i === 0 ? 'index' : slugify(pg.name);
    if (s === 'index' && i) s = 'page';
    let n = s;
    for (let k = 2; used.has(n); k++) n = `${s}-${k}`;
    used.add(n);
    map[pg.id] = n;
  });
  return map;
}

// Render context. For sites, `href` decides how page links are written.
export function renderCtx(p, { pageId = null, href = () => '#', editing = false, isStatic = true } = {}) {
  const c = { editing, static: isStatic, mode: p.mode };
  if (p.mode === 'site') Object.assign(c, { pages: p.pages, pageId, pageHref: href });
  return c;
}

// For paged/linear exports a website becomes one long flow, a page break between pages.
function flatten(p) {
  if (p.mode !== 'site') return p;
  const blocks = [];
  p.pages.forEach((pg, i) => {
    if (i) blocks.push({ id: uid(), type: 'pagebreak', props: {}, style: {} });
    blocks.push(...pg.blocks);
  });
  return { ...p, blocks };
}

function htmlShell(p, body, pageCss, title, script = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="generator" content="Plonk">
${googleFontsLink(usedFonts(p))}
<style>
${CONTENT_CSS}
${pageCss}
html{scroll-behavior:smooth}
</style>
</head>
<body>
<main class="pk-doc" style="${esc(themeVars(p.theme))}">
${body}
</main>${script}
</body>
</html>`;
}

const SITE_CSS = `body{margin:0}.pk-doc{min-height:100vh;padding:0 clamp(16px,5vw,64px) 32px}.pk-doc .pk-page>.pk-slot,.pk-doc>.pk-slot{max-width:1200px;margin:0 auto}.pk-page[hidden]{display:none}`;

// ---------- HTML ----------
export function exportHTML(p, { forPrint = false } = {}) {
  if (p.mode === 'site' && !forPrint) return exportSiteSingle(p);
  const fp = flatten(p);
  const size = PAGE_SIZES[p.pageSize || 'a4'];
  const pad = p.mode === 'site' ? 40 : docPad(p);
  const body = renderHTML(fp.blocks, renderCtx(fp, { isStatic: forPrint }));
  const pageCss = `body{margin:0;background:${forPrint ? p.theme.bg : '#d9d6cf'}}
       .pk-doc{width:${size.w}px;max-width:100%;min-height:${size.h}px;margin:${forPrint ? 0 : '40px auto'};padding:${pad}px;${forPrint ? '' : 'box-shadow:0 20px 60px -20px rgba(0,0,0,.35)'}}
       @page{size:${size.pdf === 'a4' ? 'A4' : 'letter'};margin:0}
       @media print{body{background:${p.theme.bg};-webkit-print-color-adjust:exact;print-color-adjust:exact}.pk-doc{margin:0;box-shadow:none;width:auto;min-height:0}.pk-b{break-inside:avoid}}`;
  return htmlShell(p, body, pageCss, p.name);
}

// All pages in one file; a tiny router shows one page at a time (#/about) and still honours #anchors.
function exportSiteSingle(p) {
  const slugs = pageSlugs(p);
  const href = (pg) => `#/${slugs[pg.id]}`;
  const body = p.pages
    .map((pg, i) => `<div class="pk-page" data-page="${slugs[pg.id]}" data-title="${esc(pg.name)}"${i ? ' hidden' : ''}>${renderHTML(pg.blocks, renderCtx(p, { pageId: pg.id, href, isStatic: false }))}</div>`)
    .join('\n');
  const script = `
<script>
(function(){
  var pages=[].slice.call(document.querySelectorAll('.pk-page'));
  var site=${JSON.stringify(p.name).replace(/</g, '\\u003c')};
  function show(){
    var h=decodeURIComponent(location.hash.slice(1)),page=null,target=null;
    if(h.charAt(0)==='/'){var s=h.slice(1)||'index';page=pages.filter(function(x){return x.getAttribute('data-page')===s})[0];}
    else if(h){var cur=pages.filter(function(x){return !x.hidden})[0];target=(cur&&cur.querySelector('[id="'+h.replace(/"/g,'')+'"]'))||document.getElementById(h);page=target&&target.closest('.pk-page');}
    if(!page)page=pages.filter(function(x){return !x.hidden})[0]||pages[0];
    pages.forEach(function(x){x.hidden=x!==page});
    document.title=(page===pages[0]?'':page.getAttribute('data-title')+' — ')+site;
    if(target)target.scrollIntoView({behavior:'smooth'});else window.scrollTo(0,0);
  }
  window.addEventListener('hashchange',show);show();
})();
</script>`;
  return htmlShell(p, body, SITE_CSS + `body{background:${p.theme.bg}}`, p.name, script);
}

// One real .html file per page, zipped up.
async function exportSiteZip(p) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const slugs = pageSlugs(p);
  const href = (pg) => `${slugs[pg.id]}.html`;
  p.pages.forEach((pg, i) => {
    const body = `<div class="pk-page">${renderHTML(pg.blocks, renderCtx(p, { pageId: pg.id, href, isStatic: false }))}</div>`;
    zip.file(`${slugs[pg.id]}.html`, htmlShell(p, body, SITE_CSS + `body{background:${p.theme.bg}}`, i ? `${pg.name} — ${p.name}` : p.name));
  });
  zip.file('README.txt', `${p.name}\n\nMade with Plonk. Upload every file in this folder to any static host\n(Netlify Drop, GitHub Pages, Vercel, your own server). index.html is the home page.\n`);
  return zip.generateAsync({ type: 'blob' });
}

// ---------- Offscreen render (for PNG/PDF) ----------
async function mountOffscreen(p, width, blocks = p.blocks) {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;pointer-events:none`;
  host.innerHTML = `<div class="pk-doc" style="${esc(themeVars(p.theme))};width:${width}px">${renderHTML(blocks, renderCtx(p))}</div>`;
  document.body.appendChild(host);
  await document.fonts.ready;
  await imagesReady(host);
  return host;
}
const imagesReady = (el) => Promise.all([...el.querySelectorAll('img')].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));

const toImgOpts = (bg, fontEmbedCSS) => ({ pixelRatio: 2, backgroundColor: bg, cacheBust: false, preferredFontFormat: 'woff2', fontEmbedCSS, imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' });

// Embedding web fonts means fetching every font file; do it once per font set and reuse.
const fontCache = new Map();
async function fontCSSFor(p, node) {
  const key = [...new Set(usedFonts(p))].sort().join('|');
  if (!fontCache.has(key)) {
    const { getFontEmbedCSS } = await import('html-to-image');
    fontCache.set(key, getFontEmbedCSS(node, { preferredFontFormat: 'woff2' }));
  }
  return fontCache.get(key);
}

async function exportPNG(p, pageId) {
  const { toBlob } = await import('html-to-image');
  const doc = p.mode === 'doc';
  const width = doc ? PAGE_SIZES[p.pageSize || 'a4'].w : 1200;
  const blocks = doc ? p.blocks : (p.pages.find((x) => x.id === pageId) || p.pages[0]).blocks;
  const host = await mountOffscreen(p, width, blocks);
  const node = host.firstChild;
  node.style.padding = doc ? `${docPad(p)}px` : '0 48px 40px';
  try {
    return await toBlob(node, toImgOpts(p.theme.bg, await fontCSSFor(p, node)));
  } finally {
    host.remove();
  }
}

async function exportPDF(p, onProgress) {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  const size = PAGE_SIZES[p.pageSize || 'a4'];
  const site = p.mode === 'site';
  const W = site ? 1200 : size.w;
  const H = Math.round(W * (size.h / size.w));
  const pad = site ? 48 : docPad(p);
  const C = H - pad * 2; // content height per page
  const fp = flatten(p);

  const host = await mountOffscreen(fp, W);
  const flow = host.firstChild;
  flow.style.padding = `0 ${pad}px`;
  const slot = flow.firstChild;
  const top0 = slot.getBoundingClientRect().top;
  const blocks = [...slot.children].map((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top - top0, bottom: r.bottom - top0, brk: el.classList.contains('pk-pagebreak') };
  });
  const total = slot.getBoundingClientRect().height;
  onProgress?.('Packing fonts…');
  const fontCSS = await fontCSSFor(p, flow);

  // Choose cut points on block boundaries so lines aren't sliced in half.
  const cuts = [];
  let y = 0;
  while (y < total - 1) {
    const limit = y + C;
    let cut = null;
    for (const b of blocks) {
      if (b.top < y - 0.5) continue;
      if (b.brk && b.top > y + 1 && b.top <= limit) { cut = b.top; break; }
      if (b.bottom <= limit + 0.5) cut = Math.max(cut ?? 0, b.bottom);
      else break;
    }
    if (cut == null || cut <= y + 1) cut = Math.min(limit, total);
    cuts.push([y, cut]);
    // Skip the gap (margins) before the next block.
    const next = blocks.find((b) => b.top >= cut - 0.5);
    y = next ? Math.max(cut, next.top) : total;
  }
  host.remove();
  if (!cuts.length) cuts.push([0, 0]);

  const pdf = new jsPDF({ unit: 'px', format: [W, H], orientation: 'portrait', hotfixes: ['px_scaling'], compress: true });
  const flowHTML = renderHTML(fp.blocks, renderCtx(fp));
  for (let i = 0; i < cuts.length; i++) {
    onProgress?.(`Page ${i + 1} of ${cuts.length}…`);
    const [a, b] = cuts[i];
    const page = document.createElement('div');
    page.style.cssText = `position:fixed;left:-100000px;top:0;width:${W}px;height:${H}px;overflow:hidden`;
    page.innerHTML = `<div class="pk-doc" style="${esc(themeVars(p.theme))};width:${W}px;height:${H}px;padding:${pad}px;overflow:hidden;position:relative">
      <div style="height:${b - a}px;overflow:hidden"><div style="transform:translateY(${-a}px)">${flowHTML}</div></div>
      ${p.pageNumbers && !site ? `<div style="position:absolute;left:0;right:0;bottom:${Math.max(8, Math.round(pad / 2) - 8)}px;text-align:center;font-size:12px;opacity:.6">${i + 1} / ${cuts.length}</div>` : ''}</div>`;
    document.body.appendChild(page);
    await imagesReady(page);
    const jpg = await toJpeg(page.firstChild, { ...toImgOpts(p.theme.bg, fontCSS), quality: 0.9 });
    page.remove();
    if (i) pdf.addPage([W, H], 'portrait');
    pdf.addImage(jpg, 'JPEG', 0, 0, W, H, undefined, 'FAST');
  }
  return pdf.output('blob');
}

// ---------- Markdown / text ----------
const NL = '\n';
function toMarkdown(list, txt = false, ctx = {}) {
  const inl = txt ? inlineToText : inlineToMarkdown;
  const out = [];
  for (const b of list) {
    const p = b.props;
    switch (b.type) {
      case 'heading': out.push(txt ? inl(p.text).toUpperCase() : '#'.repeat(+p.level) + ' ' + inl(p.text)); break;
      case 'text': out.push(inl(p.text)); break;
      case 'list': out.push(p.items.map((it, i) => `${p.ordered ? i + 1 + '.' : txt ? '•' : '-'} ${inl(it)}`).join('\n')); break;
      case 'quote': out.push((txt ? '“' + inl(p.text) + '”' : '> ' + inl(p.text).replace(/\n/g, '\n> ')) + (p.cite ? `${txt ? '\n' : '\n>\n> '}— ${inlineToText(p.cite)}` : '')); break;
      case 'callout': out.push(`${txt ? '' : '> '}${p.icon} ${inl(p.text)}`); break;
      case 'code': out.push(txt ? p.code : '```\n' + p.code + '\n```'); break;
      case 'badges': out.push(p.layout === 'stack' ? p.items.map((t) => `${txt ? '•' : '-'} ${inlineToText(t)}`).join(NL) : p.items.map((t) => (txt ? `[${inlineToText(t)}]` : '`' + inlineToText(t) + '`')).join(p.layout === 'inline' ? ' · ' : ' ')); break;
      case 'stat': out.push(txt ? `${inlineToText(p.n)} — ${inlineToText(p.label)}` : `**${inlineToText(p.n)}** ${inlineToText(p.label)}`); break;
      case 'image': if (p.src) out.push(txt ? `[Image${p.caption ? ': ' + inlineToText(p.caption) : ''}]` : `![${p.alt || inlineToText(p.caption)}](${p.src.startsWith('data:') ? 'image-embedded-in-original' : p.src})${p.caption ? '\n*' + inlineToText(p.caption) + '*' : ''}`); break;
      case 'video': out.push(txt ? `Video: ${p.url}` : `[▶ Watch video](${p.url})`); break;
      case 'button': out.push(txt ? inlineToText(p.label) : `[**${inlineToText(p.label)}**](${String(p.href).startsWith('page:') ? '#' : p.href})`); break;
      case 'table': {
        const rows = p.rows.map((r) => r.map((c) => inlineToText(c).replace(/\|/g, '\\|').replace(/\n/g, ' ')));
        if (txt) out.push(rows.map((r) => r.join('\t')).join('\n'));
        else {
          const head = p.header ? rows.shift() : rows[0].map(() => ' ');
          out.push([`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n'));
        }
        break;
      }
      case 'divider': out.push(txt ? '――――――――――' : '---'); break;
      case 'spacer': break;
      case 'pagebreak': out.push(txt ? '\f' : '<div style="page-break-after:always"></div>'); break;
      case 'navbar': {
        const links = [...(p.auto && ctx.pages ? ctx.pages.map((pg) => ({ t: pg.name, h: '#' + slug(pg.name) })) : []), ...(p.links || [])];
        out.push(`${txt ? inlineToText(p.brand) : '**' + inlineToText(p.brand) + '**'}${links.length ? ' · ' : ''}${links.map((l) => (txt ? inlineToText(l.t) : `[${inlineToText(l.t)}](${l.h})`)).join(' · ')}`);
        break;
      }
      case 'checklist': out.push(p.items.map((it) => `${txt ? (it.done ? '[x]' : '[ ]') : it.done ? '- [x]' : '- [ ]'} ${inl(it.t)}`).join(NL)); break;
      case 'toc': {
        const hs = (ctx.headings || []).filter((h) => h.level <= p.depth);
        out.push([txt ? inlineToText(p.title).toUpperCase() : `**${inlineToText(p.title)}**`, ...hs.map((h) => `${'  '.repeat(h.level - 1)}${txt ? '•' : '-'} ${h.text}`)].join(NL));
        break;
      }
      case 'signature': out.push([' ', '______________________________', inlineToText(p.name), inlineToText(p.role), p.date ? NL + 'Date: ________________' : ''].filter(Boolean).join(NL)); break;
      case 'footnote': out.push(`${txt ? '' : '<sub>'}${inlineToText(p.mark)} ${inl(p.text)}${txt ? '' : '</sub>'}`); break;
      case 'features': out.push(p.items.map((it) => (txt ? `${inlineToText(it.icon)} ${inlineToText(it.t)}${NL}${inlineToText(it.d)}` : `### ${inlineToText(it.icon)} ${inl(it.t)}${NL}${inl(it.d)}`)).join(NL + NL)); break;
      case 'pricing': out.push(p.plans.map((pl) => `${txt ? '' : '### '}${inlineToText(pl.name)} — ${inlineToText(pl.price)}${inlineToText(pl.per)}${NL}${pl.features.map((f) => `${txt ? '•' : '-'} ${inl(f)}`).join(NL)}`).join(NL + NL)); break;
      case 'testimonial': out.push(`${txt ? '“' + inl(p.quote) + '”' : '> ' + inl(p.quote)}${NL}${txt ? '' : '>' + NL + '> '}— ${inlineToText(p.name)}, ${inlineToText(p.role)}`); break;
      case 'faq': out.push(p.items.map((it) => (txt ? `Q: ${inlineToText(it.q)}${NL}A: ${inlineToText(it.a)}` : `**${inl(it.q)}**${NL}${inl(it.a)}`)).join(NL + NL)); break;
      case 'gallery': out.push(p.images.map((src, i) => (txt ? `[Image ${i + 1}]` : `![Image ${i + 1}](${src.startsWith('data:') ? 'image-embedded-in-original' : src})`)).join(txt ? ' ' : NL)); break;
      case 'contact': out.push(`${txt ? inlineToText(p.title) : '## ' + inl(p.title)}${NL + NL}${inl(p.sub)}${NL + NL}${txt ? 'Email: ' + p.email : `[${p.email}](mailto:${p.email})`}`); break;
      case 'hero': out.push([txt ? inl(p.title).toUpperCase() : '# ' + inl(p.title), inl(p.sub), p.cta && (txt ? inlineToText(p.cta) : `[**${inlineToText(p.cta)}**](${String(p.href).startsWith('page:') ? '#' : p.href})`)].filter(Boolean).join(NL + NL)); break;
      case 'footer': out.push(`${txt ? '' : '---\n\n'}${txt ? inlineToText(p.text) : '<sub>' + inl(p.text) + '</sub>'}`); break;
      default: (b.slots || []).forEach((s) => { const md = toMarkdown(s, txt, ctx); if (md) out.push(md); });
    }
  }
  return out.filter((x) => x !== '').join('\n\n');
}

// ---------- DOCX ----------
async function exportDOCX(p) {
  const d = await import('docx');
  const t = p.theme;
  const hex = (c, fallback) => {
    const v = resolveColor(c, t);
    return /^#[0-9a-f]{6}$/i.test(v || '') ? v.slice(1).toUpperCase() : fallback;
  };
  const size = PAGE_SIZES[p.pageSize || 'a4'];
  const marginTw = Math.round((p.mode === 'doc' ? docPad(p) : 72) * 15);
  const contentTw = size.docx.width - marginTw * 2;
  const headings = collectHeadings(p.blocks);
  let listInstance = 0;
  const safeLink = (h) => (!h || String(h).startsWith('page:') ? '#' : h);

  const runsFor = (html, base = {}) =>
    inlineToRuns(html).map((r) => {
      if (r.br) return new d.TextRun({ break: 1 });
      const opts = {
        text: r.text, bold: r.b || base.bold, italics: r.i || base.italics, underline: r.u || r.href ? {} : undefined,
        strike: r.s, font: r.code ? 'Courier New' : base.font, size: base.size, color: r.href ? hex(t.accent, '1F4FD1') : base.color,
        allCaps: base.caps, highlight: r.mark ? 'yellow' : undefined,
      };
      const run = new d.TextRun(opts);
      return r.href ? new d.ExternalHyperlink({ link: r.href, children: [run] }) : run;
    });

  const align = (a) => ({ center: d.AlignmentType.CENTER, right: d.AlignmentType.RIGHT, justify: d.AlignmentType.JUSTIFIED })[a] || d.AlignmentType.LEFT;

  async function imageRun(src, maxW) {
    try {
      const img = await loadImg(src);
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      const bin = atob(c.toDataURL('image/png').split(',')[1]);
      const data = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
      const w = Math.min(maxW, img.naturalWidth);
      return new d.ImageRun({ type: 'png', data, transformation: { width: w, height: Math.round((w * img.naturalHeight) / img.naturalWidth) } });
    } catch {
      return null;
    }
  }

  const boxed = (children, fill, widthTw) =>
    new d.Table({
      width: { size: widthTw, type: d.WidthType.DXA },
      columnWidths: [widthTw],
      borders: d.TableBorders.NONE,
      rows: [new d.TableRow({ children: [new d.TableCell({ children: children.length ? children : [new d.Paragraph('')], shading: fill ? { type: d.ShadingType.CLEAR, fill, color: 'auto' } : undefined, margins: { top: 200, bottom: 200, left: 240, right: 240 } })] })],
    });

  async function convert(list, widthTw) {
    const out = [];
    for (const b of list) {
      const s = b.style || {};
      const pr = b.props;
      const base = {
        font: s.font || t.bfont,
        color: hex(s.color, hex(t.text, '000000')),
        size: s.size ? Math.round(s.size * 1.5) : undefined,
        bold: s.weight >= 700 || undefined,
        italics: s.italic || undefined,
        caps: s.upper || undefined,
      };
      const para = (html, extra = {}, b2 = base) => new d.Paragraph({ alignment: align(s.align), spacing: { after: 160 }, ...extra, children: runsFor(html, b2) });
      const fill = s.bg ? hex(s.bg, null) : null;
      const pxW = Math.round((widthTw / 1440) * 96);
      let items = [];
      switch (b.type) {
        case 'heading': {
          const lvl = { 1: d.HeadingLevel.HEADING_1, 2: d.HeadingLevel.HEADING_2, 3: d.HeadingLevel.HEADING_3 }[pr.level];
          items.push(para(pr.text, { heading: lvl }, { ...base, font: s.font || t.hfont, bold: true, size: base.size || { 1: 52, 2: 36, 3: 28 }[pr.level] }));
          break;
        }
        case 'text': items.push(para(pr.text)); break;
        case 'list': {
          const inst = ++listInstance;
          pr.items.forEach((it) => items.push(para(it, pr.ordered ? { numbering: { reference: 'pk-num', level: 0, instance: inst }, spacing: { after: 60 } } : { bullet: { level: 0 }, spacing: { after: 60 } })));
          break;
        }
        case 'quote':
          items.push(para(pr.text, { indent: { left: 400 }, border: { left: { style: d.BorderStyle.SINGLE, size: 24, color: hex(t.accent, 'FF4FA3'), space: 12 } } }, { ...base, italics: true, size: base.size || 30 }));
          if (pr.cite) items.push(para('— ' + pr.cite, { indent: { left: 400 } }, { ...base, size: 18, caps: true }));
          break;
        case 'callout': items.push(boxed([para(`${esc(pr.icon)} ${pr.text}`, { spacing: { after: 0 } })], fill || hex(mix(t.accent, t.bg), 'FFF0F7'), widthTw)); break;
        case 'code':
          items.push(boxed(pr.code.split('\n').map((l) => new d.Paragraph({ spacing: { after: 0 }, children: [new d.TextRun({ text: l || ' ', font: 'Courier New', size: 19, color: 'EDEAFF' })] })), '16132B', widthTw));
          break;
        case 'badges': items.push(para(pr.items.map((x) => `<b>${x}</b>`).join('   ·   '))); break;
        case 'stat':
          items.push(para(pr.n, { alignment: d.AlignmentType.CENTER, spacing: { after: 0 } }, { ...base, font: t.hfont, bold: true, size: 64, color: hex(t.accent, 'FF4FA3') }));
          items.push(para(pr.label, { alignment: d.AlignmentType.CENTER }));
          break;
        case 'image': {
          if (pr.src) {
            const run = await imageRun(pr.src, pxW);
            items.push(new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: run ? [run] : [new d.TextRun({ text: '[image]', italics: true })] }));
          }
          if (pr.caption) items.push(para(pr.caption, { alignment: d.AlignmentType.CENTER }, { ...base, italics: true, size: 18 }));
          break;
        }
        case 'video': items.push(para(`<a href="${esc(pr.url)}">▶ Watch video</a>`)); break;
        case 'button': {
          const bg = hex(pr.bg, hex(t.accent, 'FF4FA3'));
          items.push(new d.Paragraph({ alignment: align(s.align), spacing: { after: 160 }, children: [new d.ExternalHyperlink({ link: safeLink(pr.href), children: [new d.TextRun({ text: `  ${inlineToText(pr.label)}  `, bold: true, font: base.font, color: hex(pr.fg, onColor('#' + bg).slice(1)), shading: { type: d.ShadingType.CLEAR, fill: bg, color: 'auto' } })] })] }));
          break;
        }
        case 'table': {
          const cols = pr.rows[0]?.length || 1;
          items.push(new d.Table({
            width: { size: widthTw, type: d.WidthType.DXA },
            columnWidths: Array(cols).fill(Math.floor(widthTw / cols)),
            rows: pr.rows.map((r, ri) => new d.TableRow({
              tableHeader: pr.header && ri === 0,
              children: r.map((c) => new d.TableCell({
                shading: pr.header && ri === 0 ? { type: d.ShadingType.CLEAR, fill: hex(mix(t.accent, t.bg), 'FFE3F1'), color: 'auto' } : undefined,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new d.Paragraph({ children: runsFor(c, { ...base, bold: pr.header && ri === 0 }) })],
              })),
            })),
          }));
          items.push(new d.Paragraph(''));
          break;
        }
        case 'divider': items.push(new d.Paragraph({ spacing: { after: 200 }, border: { bottom: { style: pr.variant === 'dashed' ? d.BorderStyle.DASHED : pr.variant === 'dotted' ? d.BorderStyle.DOTTED : d.BorderStyle.SINGLE, size: pr.variant === 'thick' ? 36 : 12, color: pr.variant === 'thick' || pr.variant === 'wavy' ? hex(t.accent, 'FF4FA3') : 'BBBBBB', space: 1 } }, children: [] })); break;
        case 'spacer': items.push(new d.Paragraph({ spacing: { after: Math.round(pr.h * 15) }, children: [] })); break;
        case 'pagebreak': items.push(new d.Paragraph({ children: [new d.PageBreak()] })); break;
        case 'navbar': {
          const links = [...(pr.auto && p.pages ? p.pages.map((pg) => ({ t: pg.name, h: '#' })) : []), ...(pr.links || [])];
          items.push(new d.Paragraph({ spacing: { after: 200 }, border: { bottom: { style: d.BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 6 } }, children: [...runsFor(pr.brand, { ...base, bold: true, font: t.hfont, size: 30 }), new d.TextRun({ text: '     ' }), ...links.flatMap((l, i) => [i ? new d.TextRun({ text: '   ·   ' }) : null, new d.TextRun({ text: inlineToText(l.t), color: base.color, font: base.font })].filter(Boolean))] }));
          break;
        }
        case 'checklist':
          pr.items.forEach((it) => items.push(para(`${it.done ? '☑' : '☐'}  ${it.t}`, { spacing: { after: 60 } })));
          break;
        case 'toc':
          items.push(para(pr.title, {}, { ...base, bold: true, font: t.hfont, size: 30 }));
          headings.filter((h) => h.level <= pr.depth).forEach((h) => items.push(new d.Paragraph({ indent: { left: (h.level - 1) * 400 }, spacing: { after: 60 }, children: [new d.TextRun({ text: h.text, font: base.font, color: base.color })] })));
          items.push(new d.Paragraph(''));
          break;
        case 'signature': {
          const col = (lines) => new d.TableCell({ borders: { top: { style: d.BorderStyle.SINGLE, size: 12, color: base.color }, bottom: { style: d.BorderStyle.NONE }, left: { style: d.BorderStyle.NONE }, right: { style: d.BorderStyle.NONE } }, margins: { top: 80 }, children: lines });
          const gap = new d.TableCell({ borders: d.TableBorders.NONE, children: [new d.Paragraph('')] });
          const cells = [col([para(`<b>${pr.name}</b>`, { spacing: { after: 0 } }), para(pr.role, {}, { ...base, size: 18 })])];
          if (pr.date) cells.push(gap, col([para('Date', {}, { ...base, size: 18 })]));
          const cw = pr.date ? [Math.floor(widthTw * 0.45), Math.floor(widthTw * 0.1), Math.floor(widthTw * 0.45)] : [Math.floor(widthTw * 0.5)];
          items.push(new d.Paragraph({ spacing: { after: 600 }, children: [] }));
          items.push(new d.Table({ width: { size: cw.reduce((a, x) => a + x, 0), type: d.WidthType.DXA }, columnWidths: cw, borders: d.TableBorders.NONE, rows: [new d.TableRow({ children: cells })] }));
          items.push(new d.Paragraph(''));
          break;
        }
        case 'footnote': items.push(para(`${pr.mark} ${pr.text}`, { border: { top: { style: d.BorderStyle.SINGLE, size: 4, color: 'BBBBBB', space: 6 } } }, { ...base, size: 17 })); break;
        case 'features':
          pr.items.forEach((it) => {
            items.push(para(`${esc(it.icon)} ${it.t}`, { spacing: { after: 40 } }, { ...base, bold: true, font: t.hfont, size: 26 }));
            items.push(para(it.d));
          });
          break;
        case 'pricing':
          pr.plans.forEach((pl, i) => {
            const kids = [
              para(`<b>${pl.name}</b>${+pr.featured === i ? '  ★ Most popular' : ''}`, { spacing: { after: 40 } }),
              para(`<b>${pl.price}</b> ${pl.per}`, { spacing: { after: 80 } }, { ...base, size: 40, font: t.hfont }),
              ...pl.features.map((f) => para(`✓ ${f}`, { spacing: { after: 40 } })),
            ];
            items.push(boxed(kids, +pr.featured === i ? hex(mix(t.accent, t.bg), 'FFE3F1') : hex(t.surface, 'F4F4F2'), widthTw), new d.Paragraph(''));
          });
          break;
        case 'testimonial':
          items.push(boxed([para(`“${pr.quote}”`, {}, { ...base, italics: true, size: 28 }), para(`— <b>${pr.name}</b>, ${pr.role}`, { spacing: { after: 0 } })], hex(t.surface, 'F4F4F2'), widthTw), new d.Paragraph(''));
          break;
        case 'faq':
          pr.items.forEach((it) => {
            items.push(para(it.q, { spacing: { after: 40 } }, { ...base, bold: true }));
            items.push(para(it.a));
          });
          break;
        case 'gallery':
          for (const src of pr.images) {
            const run = await imageRun(src, Math.round(pxW / Math.min(pr.cols, 2)));
            if (run) items.push(new d.Paragraph({ alignment: d.AlignmentType.CENTER, spacing: { after: 120 }, children: [run] }));
          }
          break;
        case 'contact':
          items.push(para(pr.title, {}, { ...base, bold: true, font: t.hfont, size: 32 }), para(pr.sub), para(`Email: <a href="mailto:${esc(pr.email)}">${esc(pr.email)}</a>`));
          break;
        case 'hero': {
          const inner = [
            para(pr.title, { alignment: d.AlignmentType.CENTER, heading: d.HeadingLevel.TITLE }, { ...base, font: t.hfont, bold: true, size: 64 }),
            para(pr.sub, { alignment: d.AlignmentType.CENTER }, { ...base, size: 26 }),
          ];
          if (pr.cta) inner.push(new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [new d.ExternalHyperlink({ link: safeLink(pr.href), children: [new d.TextRun({ text: `  ${inlineToText(pr.cta)}  `, bold: true, color: 'FFFFFF', shading: { type: d.ShadingType.CLEAR, fill: '140F2D', color: 'auto' } })] })] }));
          items.push(boxed(inner, fill || firstHex(s.bg), widthTw));
          items.push(new d.Paragraph(''));
          break;
        }
        case 'footer': items.push(para(pr.text, { alignment: d.AlignmentType.CENTER, border: { top: { style: d.BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 8 } } }, { ...base, size: 18 })); break;
        case 'columns': {
          const n = b.slots.length;
          const cw = Math.floor(widthTw / n);
          const cells = [];
          for (const slot of b.slots) {
            const kids = await convert(slot, cw - 200);
            cells.push(new d.TableCell({ width: { size: cw, type: d.WidthType.DXA }, margins: { left: 100, right: 100 }, children: kids.length ? kids : [new d.Paragraph('')] }));
          }
          const table = new d.Table({ width: { size: widthTw, type: d.WidthType.DXA }, columnWidths: Array(n).fill(cw), borders: d.TableBorders.NONE, rows: [new d.TableRow({ children: cells })] });
          items.push(fill ? boxed([table], fill, widthTw) : table);
          items.push(new d.Paragraph(''));
          break;
        }
        case 'section':
        case 'card': {
          const kids = await convert(b.slots[0], widthTw - 500);
          items.push(fill || b.type === 'card' ? boxed(kids, fill || hex(t.surface, 'F4F4F2'), widthTw) : null, ...(fill || b.type === 'card' ? [] : kids));
          items.push(new d.Paragraph(''));
          break;
        }
      }
      out.push(...items.filter(Boolean));
    }
    return out;
  }

  const children = await convert(p.blocks, contentTw);
  children.length || children.push(new d.Paragraph(''));
  const document_ = new d.Document({
    creator: 'Plonk',
    title: p.name,
    background: { color: hex(t.bg, 'FFFFFF') },
    styles: { default: { document: { run: { font: t.bfont, size: Math.round((t.base || 16) * 1.5), color: hex(t.text, '000000') } } } },
    numbering: { config: [{ reference: 'pk-num', levels: [{ level: 0, format: d.LevelFormat.DECIMAL, text: '%1.', alignment: d.AlignmentType.START, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
    sections: [{ properties: { page: { size: size.docx, margin: { top: marginTw, bottom: marginTw, left: marginTw, right: marginTw } } }, children }],
  });
  return d.Packer.toBlob(document_);
}

// Resolve theme variables to concrete colours (for DOCX).
function resolveColor(c, t) {
  if (!c) return c;
  const m = /^var\(--pk-(\w+)\)$/.exec(c);
  if (m) return { accent: t.accent, accent2: t.accent2, surface: t.surface, text: t.text, bg: t.bg, 'on-accent': onColor(t.accent) }[m[1]] || null;
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map((x) => x + x).join('');
  return c;
}
const firstHex = (s) => (/#([0-9a-f]{6})/i.exec(s || '')?.[1] || 'FFD23F').toUpperCase();
function mix(a, b) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (n, sh) => (n >> sh) & 255;
  const m = [16, 8, 0].map((sh) => Math.round(ch(pa, sh) * 0.18 + ch(pb, sh) * 0.82));
  return '#' + m.map((x) => x.toString(16).padStart(2, '0')).join('');
}
function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

// ---------- Entry point ----------
function save(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export async function printProject(p) {
  await exportReady();
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  f.srcdoc = exportHTML(p, { forPrint: true });
  f.onload = () => {
    setTimeout(() => {
      f.contentWindow.focus();
      f.contentWindow.print();
      setTimeout(() => f.remove(), 1000);
    }, 400);
  };
}

// Build the file without saving it: returns { blob, name }.
export async function buildExport(p, format, onProgress, pageId) {
  await exportReady();
  const name = slug(p.name);
  const text = (str, type) => new Blob([str], { type });
  const fp = flatten(p);
  const ctx = { headings: collectHeadings(fp.blocks), pages: p.pages };
  switch (format) {
    case 'html': return { blob: text(exportHTML(p), 'text/html'), name: `${name}.html` };
    case 'zip': return { blob: await exportSiteZip(p), name: `${name}-site.zip` };
    case 'md': return { blob: text(toMarkdown(fp.blocks, false, ctx) + NL, 'text/markdown'), name: `${name}.md` };
    case 'txt': return { blob: text(toMarkdown(fp.blocks, true, ctx) + NL, 'text/plain'), name: `${name}.txt` };
    case 'json': return { blob: text(JSON.stringify({ plonk: 2, ...p }, null, 2), 'application/json'), name: `${name}.plonk.json` };
    case 'png': return { blob: await exportPNG(p, pageId), name: `${name}.png` };
    case 'pdf': return { blob: await exportPDF(p, onProgress), name: `${name}.pdf` };
    case 'docx': return { blob: await exportDOCX(fp), name: `${name}.docx` };
  }
  throw new Error(`Unknown format ${format}`);
}

export async function runExport(p, format, onProgress, pageId) {
  if (format === 'print') return printProject(p);
  const { blob, name } = await buildExport(p, format, onProgress, pageId);
  save(blob, name);
}

// Exposed for tests / previews.
export const _internal = { toMarkdown, flatten, exportSiteZip };

export async function openSitePreview(p) {
  const tab = window.open('', '_blank');
  await exportReady();
  const url = URL.createObjectURL(new Blob([exportHTML(p)], { type: 'text/html' }));
  if (tab) tab.location.href = url;
  else window.open(url, '_blank');
}

export const blockCount = (p) => {
  let n = 0;
  walk(p.blocks, () => n++);
  return n;
};
export { BLOCKS };
