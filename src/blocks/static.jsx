// Static HTML for exports. Kept separate so react-dom/server only loads when exporting.
import { renderToStaticMarkup } from 'react-dom/server';
import { BlockList } from './render.jsx';

export function renderHTML(blocks, ctx) {
  return renderToStaticMarkup(<BlockList blocks={blocks} ctx={{ editing: false, ...ctx }} />);
}
