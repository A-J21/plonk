// Rich inline text helpers. Block text is stored as a tiny, safe subset of HTML.

const ALLOWED = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', S: 's', STRIKE: 's', A: 'a', BR: 'br', CODE: 'code', MARK: 'mark' };

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function cleanNode(node) {
  let out = '';
  node.childNodes.forEach((n) => {
    if (n.nodeType === 3) {
      out += esc(n.textContent);
      return;
    }
    if (n.nodeType !== 1) return;
    const tag = ALLOWED[n.tagName];
    const inner = cleanNode(n);
    // Browsers wrap lines in <div> when editing; treat those as line breaks.
    if (n.tagName === 'DIV' || n.tagName === 'P') {
      out += (out && !out.endsWith('<br>') ? '<br>' : '') + inner;
      return;
    }
    if (n.tagName === 'SPAN' && /bold|[6-9]00/.test(n.style.fontWeight)) return void (out += `<b>${inner}</b>`);
    if (!tag) return void (out += inner);
    if (tag === 'br') return void (out += '<br>');
    if (tag === 'a') {
      const href = n.getAttribute('href') || '';
      const safe = /^(https?:|mailto:|tel:|#|\/)/i.test(href) ? href : '#';
      return void (out += `<a href="${esc(safe)}">${inner}</a>`);
    }
    out += `<${tag}>${inner}</${tag}>`;
  });
  return out;
}

export function sanitizeInline(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  return cleanNode(doc.body.firstChild).replace(/(<br>)+$/, '');
}

function parse(html) {
  return new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html').body.firstChild;
}

export function inlineToText(html) {
  const root = parse(String(html || '').replace(/<br\s*\/?>/gi, '\n'));
  return root.textContent;
}

export function inlineToMarkdown(html) {
  const walk = (node) => {
    let s = '';
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) return void (s += n.textContent.replace(/([*_`[\]])/g, '\\$1'));
      if (n.nodeType !== 1) return;
      const t = walk(n);
      switch (n.tagName) {
        case 'B': case 'STRONG': s += t.trim() ? `**${t}**` : t; break;
        case 'I': case 'EM': s += t.trim() ? `*${t}*` : t; break;
        case 'S': s += `~~${t}~~`; break;
        case 'CODE': s += '`' + n.textContent + '`'; break;
        case 'A': s += `[${t}](${n.getAttribute('href') || ''})`; break;
        case 'BR': s += '  \n'; break;
        default: s += t;
      }
    });
    return s;
  };
  return walk(parse(html));
}

// Flatten inline HTML into styled runs: [{ text, b, i, u, s, code, href, br }]
export function inlineToRuns(html) {
  const runs = [];
  const walk = (node, fmt) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        if (n.textContent) runs.push({ ...fmt, text: n.textContent });
        return;
      }
      if (n.nodeType !== 1) return;
      const f = { ...fmt };
      switch (n.tagName) {
        case 'B': case 'STRONG': f.b = true; break;
        case 'I': case 'EM': f.i = true; break;
        case 'U': f.u = true; break;
        case 'S': f.s = true; break;
        case 'CODE': f.code = true; break;
        case 'MARK': f.mark = true; break;
        case 'A': f.href = n.getAttribute('href'); break;
        case 'BR': runs.push({ br: true, text: '' }); return;
      }
      walk(n, f);
    });
  };
  walk(parse(html), {});
  return runs;
}
