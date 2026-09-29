// Tiny synthesized sound effects + visual confetti. No audio files needed.
let ctx;
let muted = localStorage.getItem('plonk:muted') === '1';

export const isMuted = () => muted;
export function setMuted(v) {
  muted = v;
  try { localStorage.setItem('plonk:muted', v ? '1' : '0'); } catch {}
}

function tone({ from, to, dur = 0.14, type = 'sine', vol = 0.22 }) {
  if (muted) return;
  try {
    ctx ||= new AudioContext();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.08);
  } catch {}
}

const jitter = (n) => n * (0.9 + Math.random() * 0.2);
export const sfx = {
  plonk: () => { tone({ from: jitter(540), to: 120, dur: 0.13 }); tone({ from: 1800, to: 900, dur: 0.03, type: 'triangle', vol: 0.05 }); },
  pick: () => tone({ from: jitter(380), to: 620, dur: 0.07, type: 'triangle', vol: 0.08 }),
  pop: () => tone({ from: 900, to: 220, dur: 0.1, type: 'square', vol: 0.05 }),
  tick: () => tone({ from: 1200, to: 1100, dur: 0.02, type: 'triangle', vol: 0.04 }),
  tada: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone({ from: f, to: f * 1.01, dur: 0.12, type: 'triangle', vol: 0.09 }), i * 70)); },
};

const COLORS = ['#FF4FA3', '#FFD23F', '#3A5BFF', '#B6F23D', '#FF7A1A', '#8B5CF6', '#1FD1B5'];
export function burst(x, y, n = 14) {
  const layer = document.createElement('div');
  layer.className = 'fx-burst';
  layer.style.cssText = `left:${x}px;top:${y}px`;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
    const d = 40 + Math.random() * 60;
    s.style.cssText = `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 20}px;--r:${Math.random() * 540 - 270}deg;background:${COLORS[i % COLORS.length]};${i % 3 === 0 ? 'border-radius:50%' : ''}`;
    layer.appendChild(s);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 800);
}
