// Landing page with a clickable block-drop playground.
import { loadAll, deleteProject } from '../store.js';
import { esc } from '../inline.js';
import { sfx, burst } from '../sfx.js';
import { stashHTML } from './create.js';

const COLORS = ['#FF4FA3', '#FFD23F', '#3A5BFF', '#B6F23D', '#FF7A1A', '#8B5CF6', '#1FD1B5'];
const GLYPHS = ['H1', '¶', '☰', '❝', '▣', '◐', '★', '→', '✦', '#', '⚡', '♥'];

export function mountHome(root) {
  const ac = new AbortController();
  const on = (el, ev, fn) => el.addEventListener(ev, fn, { signal: ac.signal });
  const projects = loadAll();

  root.innerHTML = `
  <div class="grain"></div>
  <nav class="h-nav">
    <a href="#/" class="wordmark">plonk<span>.</span></a>
    <div class="h-nav-links">
      <a href="#how">How it works</a>
      <a href="#formats">Formats</a>
      ${projects.length ? '<a href="#stash">Your stash</a>' : ''}
      <a href="#/new" class="btn-chunk">Make something →</a>
    </div>
  </nav>

  <section class="h-hero">
    <div class="h-copy">
      <span class="sticker s-pink" style="--r:-6deg">new ✦ free ✦ no sign-up</span>
      <h1>Drop blocks.<br>Build <em>anything.</em></h1>
      <p>Plonk is a drag-and-drop playground for <b>documents</b> and <b>websites</b>. Grab a brick, drop it on the page, style it till it sings — and watch every change land live.</p>
      <div class="h-ctas">
        <a href="#/new" class="btn-chunk big">Start building <span class="arrow">→</span></a>
        <a href="#how" class="btn-chunk big ghost">See how</a>
      </div>
    </div>
    <div class="playground" id="play" aria-label="Click to drop blocks">
      <span class="play-hint">psst — click in here ↓</span>
      <div class="play-floor"></div>
    </div>
  </section>

  <div class="marquee" aria-hidden="true"><div class="marquee-track">${Array(2).fill('<span>RÉSUMÉS</span><i>✦</i><span>LANDING PAGES</span><i>✦</i><span>ZINES</span><i>✦</i><span>REPORTS</span><i>✦</i><span>PORTFOLIOS</span><i>✦</i><span>LETTERS</span><i>✦</i><span>EVENT PAGES</span><i>✦</i><span>POSTERS</span><i>✦</i>').join('')}</div></div>

  <section class="h-how" id="how">
    <h2 class="h-sec-title">Three steps.<br><span>Zero headaches.</span></h2>
    <div class="steps">
      <article class="step" style="--c:var(--yellow);--r:-2deg"><b>01</b><h3>Pick a canvas</h3><p>A paper document you can print and send, or a full website with desktop, tablet and phone previews.</p><div class="step-art art-pick"><i></i><i></i></div></article>
      <article class="step" style="--c:var(--pink);--r:1.5deg"><b>02</b><h3>Plonk the bricks</h3><p>Headings, images, tables, columns, heroes and more. Drag them in, nest them, shuffle them — changes show up instantly.</p><div class="step-art art-drop"><i></i><i></i><i></i></div></article>
      <article class="step" style="--c:var(--lime);--r:-1deg"><b>03</b><h3>Take it anywhere</h3><p>Download as PDF, Word, HTML, PNG, Markdown or text. Save a Plonk file to keep tinkering later.</p><div class="step-art art-out"><i></i><i></i><i></i><i></i></div></article>
    </div>
  </section>

  <section class="h-formats" id="formats">
    <h2 class="h-sec-title light">Every format.<br><span>One click.</span></h2>
    <div class="fmt-stickers">${['PDF', 'DOCX', 'HTML', 'PNG', 'MARKDOWN', 'TXT', 'PRINT', '.PLONK'].map((f, i) => `<span class="sticker" style="--r:${(i % 2 ? 1 : -1) * (3 + (i % 3) * 2)}deg;background:${COLORS[i % COLORS.length]}">${f}</span>`).join('')}</div>
    <p class="fmt-note">Everything happens in your browser. Your stuff never leaves your computer.</p>
  </section>

  ${projects.length ? `<section class="h-stash" id="stash"><h2 class="h-sec-title">Your stash</h2>${stashHTML(projects)}</section>` : ''}

  <footer class="h-foot">
    <a href="#/new" class="btn-chunk big">Go on, plonk something →</a>
    <div class="giant-mark">plonk<span>.</span></div>
  </footer>`;

  // -------- playground physics (column stacking) --------
  const play = root.querySelector('#play');
  const COL = 4;
  let heights = [];
  const tiles = [];
  const resetHeights = () => (heights = []);
  resetHeights();

  function drop(x, { w, h, color, glyph, big, delay = 0 }) {
    const W = play.clientWidth;
    const H = play.clientHeight;
    x = Math.max(0, Math.min(W - w, x - w / 2));
    const c0 = Math.floor(x / COL);
    const c1 = Math.ceil((x + w) / COL);
    let floor = 0;
    for (let c = c0; c < c1; c++) floor = Math.max(floor, heights[c] || 0);
    if (floor + h > H - 40) return clearAll();
    for (let c = c0; c < c1; c++) heights[c] = floor + h;
    const el = document.createElement('div');
    el.className = `ptile${big ? ' big' : ''}`;
    el.style.cssText = `left:${x}px;bottom:${floor + 14}px;width:${w}px;height:${h}px;background:${color}`;
    el.textContent = glyph;
    play.appendChild(el);
    tiles.push(el);
    const rot = (Math.random() - 0.5) * 8;
    const dist = H - floor + 60;
    el.animate(
      [
        { transform: `translateY(${-dist}px) rotate(${rot * 3}deg)`, easing: 'cubic-bezier(.5,0,1,.6)' },
        { transform: `translateY(0) rotate(${rot}deg) scale(1.12,.82)`, offset: 0.72, easing: 'ease-out' },
        { transform: `translateY(${-h * 0.18}px) rotate(${rot}deg) scale(.96,1.06)`, offset: 0.86, easing: 'ease-in' },
        { transform: `translateY(0) rotate(${rot}deg)` },
      ],
      { duration: 720, delay, fill: 'backwards' },
    ).finished.then(() => {
      el.style.transform = `rotate(${rot}deg)`;
      const r = el.getBoundingClientRect();
      if (!big || Math.random() < 0.5) burst(r.left + r.width / 2, r.bottom - 6, 8);
      sfx.plonk();
    });
  }

  function clearAll() {
    sfx.pop();
    tiles.splice(0).forEach((t, i) =>
      t.animate([{ transform: t.style.transform }, { transform: `translate(${(Math.random() - 0.5) * 300}px, 500px) rotate(${Math.random() * 360}deg)`, opacity: 0 }], { duration: 700, delay: i * 12, easing: 'cubic-bezier(.5,-0.4,1,1)', fill: 'forwards' }).finished.then(() => t.remove()),
    );
    resetHeights();
  }

  on(play, 'pointerdown', (e) => {
    const r = play.getBoundingClientRect();
    const w = [70, 90, 120, 150][Math.floor(Math.random() * 4)];
    drop(e.clientX - r.left, { w, h: [48, 60, 72][Math.floor(Math.random() * 3)], color: COLORS[Math.floor(Math.random() * COLORS.length)], glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)] });
    play.classList.add('touched');
  });

  // Spell the name on arrival.
  const intro = () => {
    const W = play.clientWidth;
    const size = Math.min(96, (W - 80) / 5.6);
    'PLONK'.split('').forEach((ch, i) => {
      drop(W / 2 + (i - 2) * (size + 12), { w: size, h: size, color: COLORS[i], glyph: ch, big: true, delay: 250 + i * 160 });
    });
  };
  const introT = setTimeout(intro, 80);

  // Stash actions
  on(root, 'click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      e.preventDefault();
      if (confirm('Delete this project? This can’t be undone.')) {
        deleteProject(del.dataset.del);
        del.closest('.stash-card').remove();
        sfx.pop();
      }
    }
  });

  on(root, 'click', (e) => {
    const a = e.target.closest('a[href^="#"]:not([href^="#/"])');
    if (!a) return;
    e.preventDefault();
    root.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
  });

  // Reveal-on-scroll
  const io = new IntersectionObserver((es) => es.forEach((en) => en.isIntersecting && en.target.classList.add('seen')), { threshold: 0.2 });
  root.querySelectorAll('.step, .sticker, .h-sec-title, .stash-card').forEach((el) => io.observe(el));

  return () => {
    ac.abort();
    clearTimeout(introT);
    io.disconnect();
  };
}

export { esc };
