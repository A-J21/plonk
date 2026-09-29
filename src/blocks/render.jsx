// Renders block trees. The same components draw the live canvas and (via
// static.jsx) every export, so what you see is exactly what you get.
import { createContext, memo, useContext, useMemo } from 'react';
import { BLOCKS, styleToCss, collectHeadings } from './catalog.jsx';
import { cssToObj } from './primitives.jsx';

// Which block is selected (editor only).
export const SelectionContext = createContext(null);

const EXTRA = { card: ' pk-card', section: ' pk-section', pagebreak: ' pk-pagebreak' };

export const BlockView = memo(function BlockView({ b, ctx }) {
  const selId = useContext(SelectionContext);
  const def = BLOCKS[b.type];
  const style = useMemo(() => cssToObj(styleToCss(b.style)), [b.style]);
  if (!def) return null;
  const slot = (i) => <Slot list={b.slots[i]} slotKey={`${b.id}:${i}`} ctx={ctx} />;
  const cls = `pk-b pk-${b.type}${EXTRA[b.type] || ''}${ctx.editing && selId === b.id ? ' is-selected' : ''}`;
  return (
    <div className={cls} data-id={ctx.editing ? b.id : undefined} id={b.props.anchor || undefined} style={style}>
      <def.Render b={b} ctx={ctx} slot={slot} />
    </div>
  );
});

export function Slot({ list, slotKey, ctx }) {
  const empty = !list.length;
  return (
    <div className={`pk-slot${ctx.editing && empty ? ' is-empty' : ''}`} data-slot={ctx.editing ? slotKey : undefined}>
      {list.map((b) => <BlockView key={b.id} b={b} ctx={ctx} />)}
    </div>
  );
}

// Root list. Works out the headings (for a Contents block) once for the page.
export function BlockList({ blocks, ctx }) {
  const headKey = JSON.stringify(collectHeadings(blocks));
  const full = useMemo(() => (ctx.headings ? ctx : { ...ctx, headings: JSON.parse(headKey) }), [ctx, headKey]);
  return <Slot list={blocks} slotKey="root" ctx={full} />;
}
