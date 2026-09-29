// Small building blocks shared by every block renderer.
import { useLayoutEffect, useRef } from 'react';

// SVG icons are stored as markup strings so they can be reused in HTML exports.
export const Icon = ({ svg, className = 'brick-ico' }) => <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />;

// Text the user can type into on the canvas. While editing, the element is
// "uncontrolled": React never rewrites it during typing (which would jump the
// caret); it only syncs when the value changes from outside (undo, inspector…).
export function Editable({ as: Tag = 'div', ctx, path, html = '', plain = false, ...rest }) {
  if (!ctx.editing) {
    return plain ? <Tag {...rest}>{html}</Tag> : <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <LiveEditable Tag={Tag} path={path} html={html} plain={plain} {...rest} />;
}

function LiveEditable({ Tag, path, html, plain, ...rest }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const focused = document.activeElement === el;
    if (plain) {
      if (el.innerText.replace(/\n$/, '') !== html && !focused) el.innerText = html;
    } else if (el.innerHTML !== html && !(focused && el.dataset.touched)) {
      el.innerHTML = html;
    }
  }, [html, plain]);
  return (
    <Tag
      ref={ref}
      {...rest}
      data-edit={path}
      {...(plain ? { 'data-plain': '' } : {})}
      contentEditable={plain ? 'plaintext-only' : 'true'}
      suppressContentEditableWarning
      spellCheck
      onInput={(e) => (e.currentTarget.dataset.touched = '1')}
      onBlur={(e) => delete e.currentTarget.dataset.touched}
    />
  );
}

// A <ul>/<ol> whose <li>s are edited as one rich-text area.
export function EditableList({ ordered, ctx, path, items }) {
  const Tag = ordered ? 'ol' : 'ul';
  const html = items.map((i) => `<li>${i}</li>`).join('');
  if (!ctx.editing) return <Tag dangerouslySetInnerHTML={{ __html: html }} />;
  return <LiveList Tag={Tag} path={path} html={html} />;
}

function LiveList({ Tag, path, html }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== html && document.activeElement !== el) el.innerHTML = html;
  }, [html]);
  return <Tag ref={ref} data-edit-list={path} contentEditable="true" suppressContentEditableWarning spellCheck />;
}

// Links can point at a URL, an #anchor, or another page of the site ("page:<id>").
export function linkProps(href = '#', ctx) {
  if (String(href).startsWith('page:')) {
    const pid = href.slice(5);
    const pg = ctx.pages?.find((p) => p.id === pid);
    return { href: pg && ctx.pageHref ? ctx.pageHref(pg) : '#', 'data-page': pid };
  }
  return { href: href || '#' };
}

// "a:b;--c:d" → { a: 'b', '--c': 'd' } for React's style prop.
export function cssToObj(css = '') {
  const o = {};
  css.split(';').forEach((decl) => {
    const i = decl.indexOf(':');
    if (i < 1) return;
    const k = decl.slice(0, i).trim();
    const v = decl.slice(i + 1).trim();
    o[k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  });
  return o;
}
