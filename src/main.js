import '@fontsource/unbounded/400.css';
import '@fontsource/unbounded/600.css';
import '@fontsource/unbounded/800.css';
import '@fontsource/unbounded/900.css';
import '@fontsource/bricolage-grotesque/400.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/800.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/700.css';
import '@fontsource/fraunces/900.css';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import './styles/app.css';
import { CONTENT_CSS } from './theme.js';
import { mountHome } from './pages/home.js';
import { mountCreate } from './pages/create.js';
import { mountEditor } from './pages/editor.js';

// Block styles are shared with exports, so they live in JS and get injected once.
const st = document.createElement('style');
st.textContent = CONTENT_CSS;
document.head.appendChild(st);

const app = document.getElementById('app');
let cleanup = () => {};

export function navigate(hash) {
  location.hash = hash;
}

function route() {
  cleanup();
  window.scrollTo(0, 0);
  const h = location.hash || '#/';
  const m = h.match(/^#\/edit\/(\w+)/);
  app.className = '';
  if (m) {
    app.className = 'route-editor';
    cleanup = mountEditor(app, m[1]);
  } else if (h.startsWith('#/new')) {
    app.className = 'route-create';
    cleanup = mountCreate(app);
    document.title = 'New project — Plonk';
  } else {
    app.className = 'route-home';
    cleanup = mountHome(app);
    document.title = 'Plonk — drop blocks, build anything';
  }
}

window.addEventListener('hashchange', route);
route();

let toastT;
export function toast(msg, kind = '') {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `toast on ${kind}`;
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 2600);
}
