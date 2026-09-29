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
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CONTENT_CSS } from './lib/theme.js';
import App from './App.jsx';

// Block styles are shared with exports, so they live in JS and get injected once.
const st = document.createElement('style');
st.textContent = CONTENT_CSS;
document.head.appendChild(st);

createRoot(document.getElementById('app')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
