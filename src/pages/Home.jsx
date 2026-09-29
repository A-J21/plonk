// Landing page with a clickable block-drop playground.
import { useEffect, useRef, useState } from 'react';
import { loadAll } from '../lib/store.js';
import { sfx, burst } from '../lib/sfx.js';
import Stash from '../components/Stash.jsx';

const COLORS = ['#FF4FA3', '#FFD23F', '#3A5BFF', '#B6F23D', '#FF7A1A', '#8B5CF6', '#1FD1B5'];
const GLYPHS = ['H1', '¶', '☰', '❝', '▣', '◐', '★', '→', '✦', '#', '⚡', '♥'];
const MARQUEE = ['RÉSUMÉS', 'LANDING PAGES', 'ZINES', 'REPORTS', 'PORTFOLIOS', 'LETTERS', 'EVENT PAGES', 'POSTERS'];
const FORMATS = ['PDF', 'DOCX', 'HTML', 'PNG', 'MARKDOWN', 'TXT', 'PRINT', '.PLONK'];
const STEPS = [
  { c: 'var(--yellow)', r: '-2deg', n: '01', h: 'Pick a canvas', p: 'A paper document you can print and send, or a full website with desktop, tablet and phone previews.', art: 'art-pick', bits: 2 },
  { c: 'var(--pink)', r: '1.5deg', n: '02', h: 'Plonk the bricks', p: 'Headings, images, tables, columns, heroes and more. Drag them in, nest them, shuffle them — changes show up instantly.', art: 'art-drop', bits: 3 },
  { c: 'var(--lime)', r: '-1deg', n: '03', h: 'Take it anywhere', p: 'Download as PDF, Word, HTML, PNG, Markdown or text. Save a Plonk file to keep tinkering later.', art: 'art-out', bits: 4 },
];

// Reveal elements with a "seen" class as they scroll into view.
function useReveal(root) {
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((en) => en.isIntersecting && en.target.classList.add('seen')), { threshold: 0.2 });
    root.current.querySelectorAll('.step, .sticker, .h-sec-title').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [root]);
}

// Click-to-drop physics: blocks stack in narrow columns and bounce on landing.
function usePlayground(ref) {
  useEffect(() => {
    const play = ref.current;
    const COL = 4;
    let heights = [];
    const tiles = [];
    const timers = [];

    function clearAll() {
      sfx.pop();
      tiles.splice(0).forEach((t, i) =>
        t
          .animate([{ transform: t.style.transform }, { transform: `translate(${(Math.random() - 0.5) * 300}px, 500px) rotate(${Math.random() * 360}deg)`, opacity: 0 }], { duration: 700, delay: i * 12, easing: 'cubic-bezier(.5,-0.4,1,1)', fill: 'forwards' })
          .finished.then(() => t.remove()),
      );
      heights = [];
    }

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
        if (!el.isConnected) return;
        el.style.transform = `rotate(${rot}deg)`;
        const r = el.getBoundingClientRect();
        if (!big || Math.random() < 0.5) burst(r.left + r.width / 2, r.bottom - 6, 8);
        sfx.plonk();
      }, () => {});
    }

    const onDown = (e) => {
      const r = play.getBoundingClientRect();
      const w = [70, 90, 120, 150][Math.floor(Math.random() * 4)];
      drop(e.clientX - r.left, { w, h: [48, 60, 72][Math.floor(Math.random() * 3)], color: COLORS[Math.floor(Math.random() * COLORS.length)], glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)] });
      play.classList.add('touched');
    };
    play.addEventListener('pointerdown', onDown);

    // Spell the name on arrival.
    timers.push(
      setTimeout(() => {
        const W = play.clientWidth;
        const size = Math.min(96, (W - 80) / 5.6);
        'PLONK'.split('').forEach((ch, i) => drop(W / 2 + (i - 2) * (size + 12), { w: size, h: size, color: COLORS[i], glyph: ch, big: true, delay: 250 + i * 160 }));
      }, 80),
    );
    return () => {
      play.removeEventListener('pointerdown', onDown);
      timers.forEach(clearTimeout);
      tiles.forEach((t) => t.remove());
    };
  }, [ref]);
}

export default function Home() {
  const [projects, setProjects] = useState(loadAll);
  const root = useRef(null);
  const play = useRef(null);
  usePlayground(play);
  useReveal(root);

  const jump = (e) => {
    const href = e.target.closest('a')?.getAttribute('href');
    if (!href?.startsWith('#') || href.startsWith('#/')) return;
    e.preventDefault();
    root.current.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={root} onClick={jump}>
      <div className="grain" />
      <nav className="h-nav">
        <a href="#/" className="wordmark">plonk<span>.</span></a>
        <div className="h-nav-links">
          <a href="#how">How it works</a>
          <a href="#formats">Formats</a>
          {projects.length > 0 && <a href="#stash">Your stash</a>}
          <a href="#/new" className="btn-chunk">Make something →</a>
        </div>
      </nav>

      <section className="h-hero">
        <div className="h-copy">
          <span className="sticker s-pink" style={{ '--r': '-6deg' }}>new ✦ free ✦ no sign-up</span>
          <h1>Drop blocks.<br />Build <em>anything.</em></h1>
          <p>
            Plonk is a drag-and-drop playground for <b>documents</b> and <b>websites</b>. Grab a brick, drop it on the page, style it till it sings — and watch every change land live.
          </p>
          <div className="h-ctas">
            <a href="#/new" className="btn-chunk big">Start building <span className="arrow">→</span></a>
            <a href="#how" className="btn-chunk big ghost">See how</a>
          </div>
        </div>
        <div className="playground" ref={play} aria-label="Click to drop blocks">
          <span className="play-hint">psst — click in here ↓</span>
          <div className="play-floor" />
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].flatMap((k) => MARQUEE.flatMap((w) => [<span key={`${k}${w}`}>{w}</span>, <i key={`${k}${w}i`}>✦</i>]))}
        </div>
      </div>

      <section className="h-how" id="how">
        <h2 className="h-sec-title">Three steps.<br /><span>Zero headaches.</span></h2>
        <div className="steps">
          {STEPS.map((s) => (
            <article key={s.n} className="step" style={{ '--c': s.c, '--r': s.r }}>
              <b>{s.n}</b>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
              <div className={`step-art ${s.art}`}>{Array.from({ length: s.bits }, (_, i) => <i key={i} />)}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="h-formats" id="formats">
        <h2 className="h-sec-title light">Every format.<br /><span>One click.</span></h2>
        <div className="fmt-stickers">
          {FORMATS.map((f, i) => (
            <span key={f} className="sticker" style={{ '--r': `${(i % 2 ? 1 : -1) * (3 + (i % 3) * 2)}deg`, background: COLORS[i % COLORS.length] }}>{f}</span>
          ))}
        </div>
        <p className="fmt-note">Everything happens in your browser. Your stuff never leaves your computer.</p>
      </section>

      {projects.length > 0 && (
        <section className="h-stash" id="stash">
          <h2 className="h-sec-title">Your stash</h2>
          <Stash projects={projects} onChange={() => setProjects(loadAll())} />
        </section>
      )}

      <footer className="h-foot">
        <a href="#/new" className="btn-chunk big">Go on, plonk something →</a>
        <div className="giant-mark">plonk<span>.</span></div>
      </footer>
    </div>
  );
}
