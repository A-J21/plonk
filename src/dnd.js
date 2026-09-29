// Pointer-based drag & drop. Works with mouse, pen and touch.
// Sources: [data-new-type] (palette bricks) and [data-drag-id] (handles on existing blocks).
// Targets: .pk-slot[data-slot] lists inside the canvas.

export function initDnd({ stage, overlay, ghostFor, onDrop, onClickNew, onStart, signal }) {
  let s = null; // active drag session

  const indicator = document.createElement('div');
  indicator.className = 'drop-bar';
  overlay.appendChild(indicator);

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const src = e.target.closest('[data-new-type],[data-drag-id]');
    if (!src || src.disabled) return;
    e.preventDefault();
    s = {
      src,
      type: src.dataset.newType,
      id: src.dataset.dragId,
      x0: e.clientX,
      y0: e.clientY,
      started: false,
      target: null,
    };
  }, { signal });

  document.addEventListener('pointermove', (e) => {
    if (!s) return;
    if (!s.started) {
      if (Math.hypot(e.clientX - s.x0, e.clientY - s.y0) < 5) return;
      start();
    }
    s.ghost.style.transform = `translate(${e.clientX}px,${e.clientY}px) rotate(${s.tilt}deg)`;
    s.tilt += (Math.max(-12, Math.min(12, (e.movementX || 0) * 1.2)) - s.tilt) * 0.3;
    s.target = findTarget(e.clientX, e.clientY);
    paintTarget();
    autoscroll(e.clientY);
  }, { signal });

  const finish = (e, cancelled) => {
    if (!s) return;
    const sess = s;
    s = null;
    cancelAnimationFrame(scrollRaf);
    scrollRaf = 0;
    if (!sess.started) {
      if (!cancelled && sess.type) onClickNew(sess.type);
      return;
    }
    document.body.classList.remove('is-dragging');
    sess.dragEl?.classList.remove('is-drag-source');
    indicator.style.display = 'none';
    clearHighlight();
    const t = sess.target;
    if (cancelled || !t) {
      sess.ghost.classList.add('ghost-fail');
      setTimeout(() => sess.ghost.remove(), 250);
      return;
    }
    sess.ghost.remove();
    onDrop({ type: sess.type, id: sess.id, slot: t.slot, index: t.index, x: e.clientX, y: e.clientY });
  };
  document.addEventListener('pointerup', (e) => finish(e, false), { signal });
  document.addEventListener('pointercancel', (e) => finish(e, true), { signal });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && s?.started && finish(e, true), { signal });

  function start() {
    s.started = true;
    s.tilt = 0;
    s.dragEl = s.id ? stage.querySelector(`.pk-b[data-id="${s.id}"]`) : null;
    s.dragEl?.classList.add('is-drag-source');
    const g = document.createElement('div');
    g.className = 'drag-ghost';
    g.innerHTML = ghostFor(s.type, s.id);
    document.body.appendChild(g);
    s.ghost = g;
    document.body.classList.add('is-dragging');
    window.getSelection()?.removeAllRanges();
    onStart?.();
  }

  function findTarget(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el || !stage.contains(el)) return null;
    let slot = el.closest('.pk-slot[data-slot]');
    // Empty space inside a (tall) column still belongs to that column.
    const col = el.closest('.pk-col');
    if (col && (!slot || !col.contains(slot))) slot = col.querySelector(':scope > .pk-slot[data-slot]') || slot;
    // Can't drop a container into itself.
    while (slot && s.dragEl && s.dragEl.contains(slot)) slot = s.dragEl.parentElement.closest('.pk-slot[data-slot]');
    if (!slot) slot = stage.querySelector('.pk-slot[data-slot="root"]');
    if (!slot) return null;
    const kids = [...slot.children].filter((c) => c.classList.contains('pk-b') && c !== s.dragEl);
    let index = kids.length;
    for (let i = 0; i < kids.length; i++) {
      const r = kids[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        index = i;
        break;
      }
    }
    return { slot: slot.dataset.slot, el: slot, kids, index };
  }

  let lit = null;
  function clearHighlight() {
    lit?.classList.remove('drop-target');
    lit = null;
  }

  function paintTarget() {
    clearHighlight();
    const t = s.target;
    if (!t) return void (indicator.style.display = 'none');
    lit = t.el;
    lit.classList.add('drop-target');
    const base = overlay.getBoundingClientRect();
    const sr = t.el.getBoundingClientRect();
    let y;
    if (!t.kids.length) y = sr.top + sr.height / 2;
    else if (t.index < t.kids.length) {
      const r = t.kids[t.index].getBoundingClientRect();
      const prev = t.kids[t.index - 1]?.getBoundingClientRect();
      y = prev ? (prev.bottom + r.top) / 2 : r.top - 4;
    } else y = t.kids.at(-1).getBoundingClientRect().bottom + 4;
    Object.assign(indicator.style, {
      display: 'block',
      left: `${sr.left - base.left}px`,
      width: `${sr.width}px`,
      top: `${y - base.top}px`,
    });
  }

  let scrollRaf = 0;
  let scrollV = 0;
  function autoscroll(y) {
    const r = stage.getBoundingClientRect();
    const edge = 70;
    scrollV = y < r.top + edge ? -(r.top + edge - y) / 4 : y > r.bottom - edge ? (y - (r.bottom - edge)) / 4 : 0;
    if (scrollV && !scrollRaf) {
      const step = () => {
        if (!s || !scrollV) return void (scrollRaf = 0);
        stage.scrollTop += scrollV;
        scrollRaf = requestAnimationFrame(step);
      };
      scrollRaf = requestAnimationFrame(step);
    }
  }
}
