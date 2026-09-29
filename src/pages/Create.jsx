// "What are we making?" — choose doc or website, then a starter template.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TEMPLATES } from '../lib/templates.js';
import { THEMES, themeVars, PAGE_SIZES } from '../lib/theme.js';
import { loadAll } from '../lib/store.js';
import { createProject, importProject } from '../lib/projects.js';
import { sfx, burst } from '../lib/sfx.js';
import { navigate } from '../lib/nav.js';
import { BlockList } from '../blocks/render.jsx';
import { cssToObj } from '../blocks/primitives.jsx';
import { toast } from '../components/Toast.jsx';
import Stash from '../components/Stash.jsx';

// A real, scaled-down render of a template.
function TemplatePreview({ tpl, mode }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0.25);
  const w = mode === 'doc' ? PAGE_SIZES.letter.w : 1200;
  useLayoutEffect(() => setScale(box.current.clientWidth / w), [w]);
  const { blocks, ctx } = useMemo(() => {
    if (mode === 'doc') return { blocks: tpl.blocks(), ctx: { editing: false, static: true, mode } };
    const pages = tpl.pages().map((pg) => ({ ...pg, id: pg.id || pg.name }));
    return { blocks: pages[0].blocks, ctx: { editing: false, static: true, mode, pages, pageId: pages[0].id, pageHref: () => '#' } };
  }, [tpl, mode]);
  const style = { ...cssToObj(themeVars({ ...THEMES[tpl.theme], base: 16 })), width: w, padding: mode === 'doc' ? 72 : '0 40px 40px', transform: `scale(${scale})` };
  return (
    <div className={`tpl-prev ${mode}`} ref={box}>
      <div className="pk-doc tpl-doc" style={style}>
        <BlockList blocks={blocks} ctx={ctx} />
      </div>
    </div>
  );
}

export default function Create() {
  const [mode, setMode] = useState(null);
  const [launching, setLaunching] = useState(null);
  const [projects, setProjects] = useState(loadAll);
  const tplRef = useRef(null);

  const choose = (m, e) => {
    setMode(m);
    sfx.plonk();
    const r = e.currentTarget.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + 30, 16);
    setTimeout(() => tplRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };

  const start = (tpl) => {
    const p = createProject(mode, tpl);
    sfx.tada();
    setLaunching(tpl.id);
    setTimeout(() => navigate(`#/edit/${p.id}`), 380);
  };

  const onImport = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const p = await importProject(f);
      navigate(`#/edit/${p.id}`);
    } catch (err) {
      toast(`Couldn’t open that file (${err.message}).`, 'err');
    }
  };

  return (
    <>
      <div className="grain" />
      <nav className="h-nav">
        <a href="#/" className="wordmark">plonk<span>.</span></a>
        <div className="h-nav-links">
          <label className="btn-chunk ghost small">
            <input type="file" accept=".json,application/json" hidden onChange={onImport} />⬆ Open a Plonk file
          </label>
        </div>
      </nav>
      <section className="c-wrap">
        <h1 className="c-title">What are we <em>making</em> today?</h1>
        <div className={`c-choices${mode ? ' has-choice' : ''}`}>
          <button className={`choice choice-doc${mode === 'doc' ? ' chosen' : ''}`} onClick={(e) => choose('doc', e)}>
            <div className="choice-art doc-art"><i /><i /><i /><span /></div>
            <h2>Document</h2>
            <p>Résumés, letters, reports, zines. Paged paper you can print or export as PDF &amp; Word.</p>
            <span className="choice-go">Pick paper →</span>
          </button>
          <span className="c-or">or</span>
          <button className={`choice choice-site${mode === 'site' ? ' chosen' : ''}`} onClick={(e) => choose('site', e)}>
            <div className="choice-art site-art">
              <div className="sa-bar"><i /><i /><i /></div>
              <div className="sa-hero" />
              <div className="sa-row"><i /><i /><i /></div>
            </div>
            <h2>Website</h2>
            <p>Landing pages, portfolios, event pages. Responsive previews and a clean HTML export.</p>
            <span className="choice-go">Pick web →</span>
          </button>
        </div>

        {mode && (
          <div className="c-templates" ref={tplRef}>
            <h2 className="h-sec-title small">Start from…</h2>
            <div className="tpl-grid">
              {TEMPLATES[mode].map((t, i) => (
                <button key={`${mode}-${t.id}`} className={`tpl${launching === t.id ? ' launch' : ''}`} data-tpl={t.id} data-mode={mode} style={{ '--i': i }} onClick={() => start(t)}>
                  <TemplatePreview tpl={t} mode={mode} />
                  <span className="tpl-name">
                    {t.emoji} {t.name}
                    {mode === 'site' && <small>{t.pages().length} pages</small>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div className="c-stash">
            <h2 className="h-sec-title small">…or jump back in</h2>
            <Stash projects={projects} onChange={() => setProjects(loadAll())} />
          </div>
        )}
      </section>
    </>
  );
}
