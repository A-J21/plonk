// Content fonts, theme presets and the CSS that styles blocks.
// The same CSS is used in the editor canvas and in every export, so what you see is what you get.

export const FONTS = [
  { name: 'Bricolage Grotesque', stack: "'Bricolage Grotesque', system-ui, sans-serif", google: 'Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800' },
  { name: 'Unbounded', stack: "'Unbounded', system-ui, sans-serif", google: 'Unbounded:wght@400;600;800' },
  { name: 'Fraunces', stack: "'Fraunces', Georgia, serif", google: 'Fraunces:ital,wght@0,400;0,700;0,900;1,400' },
  { name: 'DM Serif Display', stack: "'DM Serif Display', Georgia, serif", google: 'DM+Serif+Display:ital@0;1' },
  { name: 'Space Mono', stack: "'Space Mono', ui-monospace, monospace", google: 'Space+Mono:ital,wght@0,400;0,700;1,400' },
  { name: 'Caveat', stack: "'Caveat', cursive", google: 'Caveat:wght@400;700' },
  { name: 'Georgia', stack: 'Georgia, serif' },
  { name: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
];

export const fontStack = (name) => FONTS.find((f) => f.name === name)?.stack || name;

export const THEMES = {
  pop: { label: 'Plonk Pop', bg: '#FFF6E5', text: '#140F2D', accent: '#FF4FA3', accent2: '#3A5BFF', surface: '#FFFFFF', hfont: 'Unbounded', bfont: 'Bricolage Grotesque' },
  paper: { label: 'Paper Classic', bg: '#FFFFFF', text: '#1D1D1F', accent: '#1F4FD1', accent2: '#B4231F', surface: '#F4F4F2', hfont: 'Fraunces', bfont: 'Fraunces' },
  midnight: { label: 'Midnight', bg: '#12102A', text: '#EDEAFF', accent: '#B6F23D', accent2: '#8B5CF6', surface: '#1E1B3F', hfont: 'Unbounded', bfont: 'Bricolage Grotesque' },
  mint: { label: 'Mint Zine', bg: '#DDFBEF', text: '#0E2A22', accent: '#FF7A1A', accent2: '#0E8F6E', surface: '#FFFFFF', hfont: 'DM Serif Display', bfont: 'Space Mono' },
  sunset: { label: 'Sunset', bg: '#FFE8DC', text: '#3A0F2E', accent: '#FF5D3A', accent2: '#7B2FF7', surface: '#FFF7F2', hfont: 'Fraunces', bfont: 'Bricolage Grotesque' },
  mono: { label: 'Ink & Bone', bg: '#F2EFE8', text: '#111111', accent: '#111111', accent2: '#777777', surface: '#FFFFFF', hfont: 'Space Mono', bfont: 'Space Mono' },
};

export const PAGE_SIZES = {
  a4: { label: 'A4', w: 794, h: 1123, pdf: 'a4', docx: { width: 11906, height: 16838 } },
  letter: { label: 'US Letter', w: 816, h: 1056, pdf: 'letter', docx: { width: 12240, height: 15840 } },
};
export const DOC_PAD = 72;
export const MARGINS = { narrow: { label: 'Narrow', px: 44 }, normal: { label: 'Normal', px: 72 }, wide: { label: 'Wide', px: 108 } };
export const docPad = (p) => MARGINS[p.margin]?.px ?? DOC_PAD;

export const VIEWPORTS = { desktop: 1200, tablet: 820, mobile: 390 };

// Pick readable text for a given background (used for accent buttons).
export function onColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#140F2D' : '#ffffff';
}

export function themeVars(t) {
  return [
    `--pk-bg:${t.bg}`,
    `--pk-text:${t.text}`,
    `--pk-accent:${t.accent}`,
    `--pk-on-accent:${onColor(t.accent)}`,
    `--pk-accent2:${t.accent2}`,
    `--pk-surface:${t.surface}`,
    `--pk-hfont:${fontStack(t.hfont)}`,
    `--pk-bfont:${fontStack(t.bfont)}`,
    `--pk-base:${t.base || 16}px`,
  ].join(';');
}

// Google Fonts <link> for the fonts a project actually uses (for HTML exports).
export function googleFontsLink(names) {
  const fams = [...new Set(names)]
    .map((n) => FONTS.find((f) => f.name === n)?.google)
    .filter(Boolean);
  if (!fams.length) return '';
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fams.map((f) => 'family=' + f).join('&')}&display=swap">`;
}

export const CONTENT_CSS = `
.pk-doc{background:var(--pk-bg);color:var(--pk-text);font-family:var(--pk-bfont);font-size:var(--pk-base);line-height:1.6;container-type:inline-size;-webkit-font-smoothing:antialiased}
.pk-doc *{box-sizing:border-box}
.pk-doc a{color:var(--pk-accent)}
.pk-slot{display:flow-root}
.pk-b{--fs:initial;--ff:initial;--fw:initial;position:relative;margin:0 0 16px}
.pk-slot>.pk-b:last-child{margin-bottom:0}
.pk-h{font-family:var(--ff,var(--pk-hfont));font-weight:var(--fw,800);line-height:1.12;margin:0;letter-spacing:-.01em;text-wrap:balance}
h1.pk-h{font-size:var(--fs,2.75em)}
h2.pk-h{font-size:var(--fs,1.9em)}
h3.pk-h{font-size:var(--fs,1.35em)}
.pk-p{margin:0;font-size:var(--fs,1em);font-weight:var(--fw,inherit)}
.pk-list ul,.pk-list ol{margin:0;padding-left:1.4em;font-size:var(--fs,1em);font-weight:var(--fw,inherit)}
.pk-list li{margin:.2em 0}
.pk-list li::marker{color:var(--pk-accent);font-weight:800}
.pk-quote blockquote{margin:0;padding:.3em 0 .3em 1.1em;border-left:6px solid var(--pk-accent);font-size:var(--fs,1.3em);font-style:italic;font-family:var(--ff,var(--pk-hfont));font-weight:var(--fw,400);line-height:1.35}
.pk-quote cite{display:block;margin-top:.6em;font-size:.62em;font-style:normal;letter-spacing:.08em;text-transform:uppercase;opacity:.7}
.pk-callout-in{display:flex;gap:14px;align-items:flex-start;padding:16px 20px;border-radius:14px;background:color-mix(in srgb,var(--pk-accent) 15%,transparent);border:2px solid color-mix(in srgb,var(--pk-accent) 45%,transparent)}
.pk-callout-ico{font-size:1.5em;line-height:1.1}
.pk-code pre{margin:0;background:#16132B;color:#EDEAFF;padding:18px 20px;border-radius:12px;font-family:'Space Mono',ui-monospace,monospace;font-size:var(--fs,.86em);white-space:pre-wrap;word-break:break-word;line-height:1.55}
.pk-hr{border:0;margin:6px 0;height:0;border-top:3px solid color-mix(in srgb,currentColor 25%,transparent)}
.pk-hr.dashed{border-top-style:dashed}.pk-hr.dotted{border-top:6px dotted color-mix(in srgb,currentColor 35%,transparent)}
.pk-hr.thick{border-top:10px solid var(--pk-accent);border-radius:9px}
.pk-hr.wavy{border:0;height:14px;background:var(--pk-accent);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='14'%3E%3Cpath d='M0 7 Q7 0 14 7 T28 7' fill='none' stroke='black' stroke-width='3.5'/%3E%3C/svg%3E") repeat-x center/28px 14px;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='14'%3E%3Cpath d='M0 7 Q7 0 14 7 T28 7' fill='none' stroke='black' stroke-width='3.5'/%3E%3C/svg%3E") repeat-x center/28px 14px}
.pk-figure{margin:0}
.pk-figure img{display:block;width:100%;border-radius:inherit}
.pk-figure figcaption{font-size:.85em;opacity:.7;margin-top:.5em;text-align:center}
.pk-img-empty{display:grid;place-items:center;aspect-ratio:16/9;border:3px dashed color-mix(in srgb,currentColor 30%,transparent);border-radius:14px;font-weight:700;opacity:.6}
.pk-doc .pk-btn{display:inline-block;padding:.8em 1.6em;border-radius:999px;background:var(--bb,var(--pk-accent));color:var(--bf,var(--pk-on-accent));font-weight:800;text-decoration:none!important;font-size:var(--fs,1em);border:2.5px solid transparent;line-height:1.2}
.pk-doc .pk-btn.outline{background:transparent;color:var(--bb,var(--pk-accent));border-color:currentColor}
.pk-btn.block{display:block;text-align:center}
.pk-table table{width:100%;border-collapse:collapse;font-size:var(--fs,.95em)}
.pk-table th,.pk-table td{border:2px solid color-mix(in srgb,currentColor 18%,transparent);padding:.55em .8em;text-align:left;vertical-align:top}
.pk-table th{background:color-mix(in srgb,var(--pk-accent) 16%,transparent);font-weight:800}
.pk-table.striped tbody tr:nth-child(even){background:color-mix(in srgb,currentColor 5%,transparent)}
.pk-cols{display:grid;grid-template-columns:repeat(var(--n,2),minmax(0,1fr));gap:var(--gap,24px);align-items:stretch}
.pk-col{display:flex;flex-direction:column;justify-content:var(--va,start);min-width:0}
.pk-columns>.pk-cols{flex:1 0 auto}
@container (max-width:640px){.pk-cols{grid-template-columns:1fr}}
.pk-section{padding:36px;border-radius:0}
.pk-card{padding:24px;border-radius:18px;background:var(--pk-surface);box-shadow:0 10px 30px -12px rgba(20,15,45,.25)}
.pk-pagebreak{height:0;margin:0!important;break-after:page;page-break-after:always}
.pk-nav{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:12px 0}
.pk-nav-brand{font-family:var(--pk-hfont);font-weight:800;font-size:1.3em}
.pk-nav-links{display:flex;gap:22px;flex-wrap:wrap;font-weight:600}
.pk-nav-links a{color:inherit;text-decoration:none}
.pk-hero{text-align:center;padding:72px 24px}
.pk-hero .pk-h{font-size:var(--fs,3.6em);margin:0 auto .3em;max-width:14ch}
.pk-hero .pk-p{font-size:1.2em;opacity:.8;max-width:40ch;margin:0 auto 1.4em}
@container (max-width:640px){.pk-hero .pk-h{font-size:var(--fs,2.3em)}.pk-hero{padding:48px 8px}}
.pk-footer{padding:28px 0;border-top:2px solid color-mix(in srgb,currentColor 15%,transparent);text-align:center;font-size:.9em;opacity:.8}
.pk-video-frame{position:relative;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#000}
.pk-video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.pk-video-static{display:grid;place-items:center;aspect-ratio:16/9;border-radius:14px;background:#16132B;color:#fff;text-align:center;padding:16px}
.pk-video-static b{font-size:3em;line-height:1}
.pk-video-static small{opacity:.7;word-break:break-all}
.pk-badges{display:flex;flex-wrap:wrap;gap:8px}
.pk-badges.compact{gap:4px}.pk-badges.compact .pk-badge{padding:.12em .55em;font-size:var(--fs,.72em);border-width:1.5px}
.pk-badges.stack{flex-direction:column;align-items:flex-start;gap:6px}
.pk-badges.grid{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr))}.pk-badges.grid .pk-badge{text-align:center}
.pk-badges.square .pk-badge{border-radius:6px}
.pk-badges.outline .pk-badge{background:transparent;border-color:currentColor}
.pk-badges.solid .pk-badge{background:var(--pk-accent);color:var(--pk-on-accent);border-color:var(--pk-accent)}
.pk-b[style*="text-align:center"] .pk-badges.stack{align-items:center}.pk-b[style*="text-align:right"] .pk-badges.stack{align-items:flex-end}
.pk-tags-inline i{font-style:normal;opacity:.45}
.pk-btn-wrap{display:block}
.pk-check{list-style:none;margin:0;padding:0}
.pk-check li{display:flex;gap:.6em;align-items:flex-start;margin:.3em 0}
.pk-box{flex:none;width:1.1em;height:1.1em;margin-top:.22em;border:2px solid currentColor;border-radius:5px;display:grid;place-items:center;font-size:.9em;line-height:1}
.pk-check li.done .pk-box{background:var(--pk-accent);border-color:var(--pk-accent)}
.pk-check li.done .pk-box::after{content:'✓';color:var(--pk-on-accent);font-weight:900;font-size:.8em}
.pk-check li.done .pk-check-t{text-decoration:line-through;opacity:.55}
.pk-toc{border-left:4px solid var(--pk-accent);padding:4px 0 4px 18px}
.pk-toc-t{font-family:var(--pk-hfont);font-weight:800;font-size:1.2em;margin-bottom:.4em}
.pk-toc ol{list-style:none;margin:0;padding:0}
.pk-toc li{margin:.25em 0}.pk-toc li.l2{padding-left:1.2em}.pk-toc li.l3{padding-left:2.4em;font-size:.92em}
.pk-toc a{color:inherit;text-decoration:none;border-bottom:1.5px dotted color-mix(in srgb,currentColor 40%,transparent)}
.pk-toc-empty{opacity:.5;font-style:italic}
.pk-sig{display:flex;gap:48px;flex-wrap:wrap;margin-top:28px}
.pk-sig-col{flex:1;min-width:180px}
.pk-sig-line{border-bottom:2px solid currentColor;height:44px;margin-bottom:8px}
.pk-sig-name{font-weight:700}.pk-sig-role{font-size:.85em;opacity:.7}
.pk-note{display:flex;gap:6px;font-size:var(--fs,.8em);opacity:.8;padding-top:8px;border-top:1.5px solid color-mix(in srgb,currentColor 25%,transparent);max-width:100%}
.pk-note sup{font-weight:800;color:var(--pk-accent)}
.pk-nav.sticky{position:sticky;top:0;z-index:5;background:var(--pk-bg)}
.pk-nav-links a.on{color:var(--pk-accent);text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:6px}
@container (max-width:640px){.pk-nav{flex-direction:column;align-items:flex-start;gap:8px}.pk-nav-links{gap:14px;overflow-x:auto;max-width:100%;flex-wrap:nowrap;white-space:nowrap}}
.pk-feats{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:22px}
.pk-feat{padding:24px;border-radius:18px;background:var(--pk-surface);box-shadow:0 10px 30px -14px rgba(20,15,45,.3)}
.pk-feat-ico{font-size:2em;line-height:1;margin-bottom:.4em}
.pk-feat .pk-h{font-size:var(--fs,1.25em);margin-bottom:.3em}
.pk-plans{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:20px;align-items:stretch}
.pk-plan{position:relative;display:flex;flex-direction:column;gap:12px;padding:28px 24px;border-radius:20px;background:var(--pk-surface);border:2px solid color-mix(in srgb,currentColor 15%,transparent)}
.pk-plan.hot{border:3px solid var(--pk-accent);box-shadow:0 20px 40px -18px var(--pk-accent);transform:translateY(-6px)}
.pk-plan-flag{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--pk-accent);color:var(--pk-on-accent);font-size:.72em;font-weight:800;padding:3px 12px;border-radius:999px;white-space:nowrap}
.pk-plan-name{font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.85em;opacity:.8}
.pk-plan-price b{font-family:var(--pk-hfont);font-size:2.6em;line-height:1}.pk-plan-price span{opacity:.6;margin-left:4px}
.pk-plan ul{margin:0 0 auto;padding-left:1.2em}.pk-plan li{margin:.3em 0}.pk-plan li::marker{color:var(--pk-accent);content:'✓  '}
.pk-testi{margin:0;padding:32px;border-radius:22px;background:var(--pk-surface)}
.pk-testi blockquote{margin:0 0 20px;font-family:var(--pk-hfont);font-size:var(--fs,1.45em);line-height:1.3}
.pk-testi blockquote::before{content:'“';display:block;font-size:2.4em;line-height:.6;color:var(--pk-accent)}
.pk-testi figcaption{display:flex;align-items:center;gap:14px}
.pk-testi small{display:block;opacity:.65}
.pk-av{width:54px;height:54px;border-radius:50%;overflow:hidden;background:var(--pk-accent);color:var(--pk-on-accent);display:grid;place-items:center;font-weight:800;flex:none}
.pk-av img{width:100%;height:100%;object-fit:cover}
.pk-faq{display:flex;flex-direction:column;gap:10px}
.pk-faq-i{border:2px solid color-mix(in srgb,currentColor 15%,transparent);border-radius:14px;padding:14px 18px;background:var(--pk-surface)}
.pk-faq-q{font-weight:800;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:12px}
.pk-faq-q::-webkit-details-marker{display:none}
details.pk-faq-i .pk-faq-q::after{content:'+';color:var(--pk-accent);font-size:1.3em;line-height:1;transition:transform .2s}
details.pk-faq-i[open] .pk-faq-q::after{transform:rotate(45deg)}
.pk-faq-a{margin-top:8px;opacity:.85}
.pk-gallery{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:12px}
.pk-gallery img,.pk-gallery .pk-img-empty{width:100%;aspect-ratio:var(--ar,1/1);object-fit:cover;border-radius:12px;display:block}
.pk-contact{display:flex;flex-direction:column;gap:12px;padding:28px;border-radius:20px;background:var(--pk-surface)}
.pk-contact .pk-h{font-size:var(--fs,1.6em)}
.pk-contact-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pk-contact input,.pk-contact textarea{font:inherit;padding:12px 14px;border-radius:12px;border:2px solid color-mix(in srgb,currentColor 20%,transparent);background:var(--pk-bg);color:inherit;width:100%}
.pk-contact .pk-btn{align-self:flex-start;cursor:pointer}
@container (max-width:640px){.pk-feats,.pk-plans,.pk-contact-row{grid-template-columns:1fr}.pk-gallery{grid-template-columns:repeat(2,1fr)}.pk-plan.hot{transform:none}}

.pk-b[style*="text-align:center"]>.pk-badges{justify-content:center}
.pk-b[style*="text-align:right"]>.pk-badges{justify-content:flex-end}
.pk-badge{display:inline-block;padding:.3em .85em;border-radius:999px;background:color-mix(in srgb,var(--pk-accent) 18%,transparent);border:2px solid color-mix(in srgb,var(--pk-accent) 50%,transparent);font-weight:700;font-size:var(--fs,.85em)}
.pk-stat{text-align:center}
.pk-stat-n{font-family:var(--pk-hfont);font-weight:800;font-size:var(--fs,3em);line-height:1;color:var(--pk-accent)}
.pk-stat-l{margin-top:.3em;font-weight:600;opacity:.75}
`;
