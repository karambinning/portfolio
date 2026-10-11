/* Dismantle / rebuild a page element by element, for the dissertation transitions.
   out: a beam sweeps up the screen; as it passes, each detail's text glitches away, the element flashes as a
        wireframe, tears sideways and collapses to a line. Children go before the box that holds them.
   in:  a beam sweeps down; each box draws in as a wireframe first, then its contents form inside it and the text
        types itself back. Containers before their contents.
   Pure theatre: it only animates what is already on the page and puts everything back afterwards. */
(function(){
  if (window.KBDismantle) return;
  const G = 'ABCDEFGHKMNPRSTVWXYZ0123456789#/<>§%&';
  const g = n => { let s = ''; for (let i = 0; i < n; i++) s += G[(Math.random() * G.length) | 0]; return s; };
  const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'BR', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE', 'OPTION']);
  const state = new WeakMap();   // root -> { anims, texts, job }

  function collect(root){
    const vw = innerWidth, vh = innerHeight, els = [], idx = new Map();
    const walk = (el, parentIdx, depth) => {
      for (const c of el.children){
        if (SKIP.has(c.tagName) || c.dataset.kbBeam !== undefined) continue;
        const cs = getComputedStyle(c);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = c.getBoundingClientRect();
        const on = r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw && cs.display !== 'contents';
        let me = parentIdx;
        if (on && els.length < 1400){ me = els.length; els.push({ el: c, r, parent: parentIdx, depth, inline: cs.display.startsWith('inline') && c.tagName !== 'IMG' && c.tagName !== 'CANVAS' && c.tagName !== 'svg' }); idx.set(c, me); }
        if (c.tagName.toLowerCase() !== 'svg' && c.tagName !== 'CANVAS') walk(c, me, depth + 1);
      }
    };
    walk(root, -1, 0);
    // every visible text node, tied to the nearest element we are animating
    const texts = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n =>
      n.nodeValue.trim() && !n.parentElement.closest('script,style,noscript,svg') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    let n; while ((n = w.nextNode())){
      let p = n.parentElement; while (p && p !== root && !idx.has(p)) p = p.parentElement;
      if (p && idx.has(p)) texts.push({ n, o: n.nodeValue, owner: idx.get(p) });
    }
    return { els, texts, vh };
  }

  function schedule(els, vh, mode, W){
    // the beam reaches each element at a time set by its position; the tree then orders children and parents
    const t = els.map(e => {
      const y = Math.min(1, Math.max(0, (e.r.top + Math.min(e.r.height, vh) / 2) / vh));
      return (mode === 'out' ? 1 - y : y) * W * .75 + Math.random() * W * .05;
    });
    const step = Math.min(45, W / 30);
    if (mode === 'out'){ for (let i = els.length - 1; i >= 0; i--){ const p = els[i].parent; if (p >= 0) t[p] = Math.max(t[p], t[i] + step); } }
    else { for (let i = 0; i < els.length; i++){ const p = els[i].parent; if (p >= 0) t[i] = Math.max(t[i], t[p] + step); } }
    const max = Math.max(1, ...t);
    return t.map(x => x / max * W);
  }

  function beam(color, mode, ms){
    const b = document.createElement('div'); b.dataset.kbBeam = '';
    b.style.cssText = `position:fixed;left:0;right:0;height:2px;z-index:2147483646;pointer-events:none;background:#fff;box-shadow:0 0 18px 5px ${color},0 0 60px 10px ${color};top:${mode === 'in' ? 0 : 100}%;opacity:.95`;
    document.body.appendChild(b);
    b.animate([{ top: mode === 'in' ? '0%' : '100%' }, { top: mode === 'in' ? '100%' : '0%' }], { duration: ms * .9, easing: 'linear', fill: 'forwards' })
      .finished.then(() => b.animate([{ opacity: .95 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished).then(() => b.remove());
  }

  function run(root, mode, ms, color){
    root = root || document.body; color = color || 'rgba(0,212,255,.9)';
    restore(root);
    const st = { anims: [], texts: [], job: Math.random() }; state.set(root, st);
    const { els, texts, vh } = collect(root);
    const D = Math.max(180, Math.min(340, ms * .22)), W = Math.max(200, ms - D);
    const T = schedule(els, vh, mode, W);
    const wire = `1px solid ${color}`, clear = '1px solid transparent';
    els.forEach((e, i) => {
      const dx = (Math.random() * 2 - 1) * 9, tf = !e.inline;
      const kf = mode === 'out' ? [
        { opacity: 1, outline: clear, clipPath: 'inset(0 0 0 0)', transform: tf ? 'none' : undefined },
        { opacity: 1, outline: wire, clipPath: 'inset(0 0 0 0)', transform: tf ? `translateX(${dx}px) skewX(${dx}deg)` : undefined, offset: .3 },
        { opacity: 1, outline: wire, clipPath: `inset(${(20 + Math.random() * 25) | 0}% 0 ${(20 + Math.random() * 25) | 0}% 0)`, transform: tf ? `translateX(${-dx}px)` : undefined, offset: .55 },
        { opacity: .9, outline: wire, clipPath: 'inset(49% 0 49% 0)', transform: tf ? 'scaleY(.05)' : undefined, offset: .82 },
        { opacity: 0, outline: clear, clipPath: 'inset(50% 0 50% 0)', transform: tf ? 'scaleY(0)' : undefined }
      ] : [
        { opacity: 0, outline: wire, clipPath: 'inset(0 100% 0 0)', transform: tf ? `translateX(${dx}px)` : undefined },
        { opacity: 1, outline: wire, clipPath: 'inset(0 0 0 0)', transform: tf ? 'none' : undefined, offset: .45 },
        { opacity: 1, outline: wire, clipPath: 'inset(0 0 0 0)', transform: tf ? `translateX(${-dx / 2}px)` : undefined, offset: .7 },
        { opacity: 1, outline: clear, clipPath: 'inset(0 0 0 0)', transform: tf ? 'none' : undefined }
      ];
      kf.forEach(k => { if (k.transform === undefined) delete k.transform; });
      try { st.anims.push(e.el.animate(kf, { duration: D, delay: T[i], easing: 'steps(6,end)', fill: mode === 'out' ? 'forwards' : 'both' })); } catch (_){}
    });
    // the text: decays as its element is torn down, types back in once its element has formed
    texts.forEach(x => { x.t = T[x.owner] || 0; x.L = x.o.length; if (mode === 'in') x.n.nodeValue = ''; });
    st.texts = texts;
    beam(color, mode, ms);
    const t0 = performance.now(), job = st.job;
    const end = mode === 'out' ? W + D : W + D * .45 + 420;
    return new Promise(res => {
      (function f(now){
        if (state.get(root) !== st || st.job !== job) return res();
        const el = now - t0;
        texts.forEach(x => {
          if (mode === 'out'){
            const q = Math.min(1, Math.max(0, (el - x.t) / (D * .6))), k = Math.floor(x.L * (1 - q));
            x.n.nodeValue = k <= 0 ? '' : x.o.slice(0, k) + (q > 0 ? g(Math.min(4, x.L - k)) : x.o.slice(k));
          } else {
            const s = x.t + D * .45, dur = Math.min(420, 60 + x.L * 6), q = Math.min(1, Math.max(0, (el - s) / dur)), k = Math.floor(x.L * q);
            x.n.nodeValue = q <= 0 ? '' : k >= x.L ? x.o : x.o.slice(0, k) + g(Math.min(5, x.L - k));
          }
        });
        if (el < end) requestAnimationFrame(f);
        else {
          if (mode === 'in'){ st.anims.forEach(a => a.cancel()); st.anims = []; texts.forEach(x => x.n.nodeValue = x.o); }
          res();
        }
      })(t0);
    });
  }

  // put everything back exactly as it was
  function restore(root){
    root = root || document.body;
    const st = state.get(root); if (!st) return;
    state.delete(root); st.job = null;
    st.anims.forEach(a => { try { a.cancel(); } catch (_){} });
    st.texts.forEach(x => { if (x.n.nodeValue !== x.o) x.n.nodeValue = x.o; });
  }

  window.KBDismantle = { run, restore };
})();
