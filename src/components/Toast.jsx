// Tiny toast system: call toast() from anywhere, <Toaster /> shows it.
import { useEffect, useState } from 'react';

const listeners = new Set();
export function toast(msg, kind = '') {
  listeners.forEach((fn) => fn({ msg, kind, at: Date.now() }));
}

export function Toaster() {
  const [t, setT] = useState(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    let timer;
    const fn = (next) => {
      setT(next);
      setOn(true);
      clearTimeout(timer);
      timer = setTimeout(() => setOn(false), 2600);
    };
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
      clearTimeout(timer);
    };
  }, []);
  return (
    <div className={`toast${on ? ' on' : ''}${t?.kind ? ` ${t.kind}` : ''}`} role="status">
      {t?.msg}
    </div>
  );
}
