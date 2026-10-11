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

  // does this element draw anything itself? plain layout wrappers do not, so they are never animated or waited on
  function draws(c, cs){
    if (/^(IMG|CANVAS|svg|VIDEO|INPUT|BUTTON|TEXTAREA|SELECT|HR|IFRAME)$/.test(c.tagName)) return true;
    if (cs.backgroundImage !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) return true;
    if (parseFloat(cs.borderTopWidth) || parseFloat(cs.borderLeftWidth) || parseFloat(cs.borderBottomWidth) || parseFloat(cs.borderRightWidth)) return true;
    if (cs.boxShadow !== 'none' || cs.outlineStyle !== 'none') return true;
    for (const n of c.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    for (const ps of ['::before', '::after']){ const q = getComputedStyle(c, ps); if (q.content && q.content !== 'none' && q.content !== 'normal' && q.display !== 'none') return true; }   // corner marks and other drawn details
    return false;
  }
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
        if (on && els.length < 1400){ me = els.length; els.push({ el: c, r, parent: parentIdx, depth, vis: draws(c, cs), tf0: cs.transform, op0: cs.opacity, clip0: cs.clipPath, inline: cs.display.startsWith('inline') && c.tagName !== 'IMG' && c.tagName !== 'CANVAS' && c.tagName !== 'svg' }); idx.set(c, me); }
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
    // each element's moment is when the beam crosses it: going out the beam rises from the bottom and meets an
    // element's lower edge first; coming in it falls from the top and meets its upper edge. The tree then makes a box
    // wait for everything inside it (out), or its contents wait for the box (in). Times stay locked to the beam.
    const y = v => Math.min(1, Math.max(0, v / vh));
    const t = els.map(e => (mode === 'out' ? 1 - y(e.r.bottom) : y(e.r.top)) * W);
    const gap = 55;
    if (mode === 'out'){ for (let i = els.length - 1; i >= 0; i--){ const p = els[i].parent; if (p >= 0 && els[p].vis) t[p] = Math.max(t[p], t[i] + gap); } }
    else { for (let i = 0; i < els.length; i++){ const p = els[i].parent; if (p >= 0 && els[p].vis) t[i] = Math.max(t[i], t[p] + gap); else if (p >= 0) t[i] = Math.max(t[i], t[p]); } }
    return t.map(x => Math.min(W, x));
  }

  function beam(color, mode, ms, from){
    const b = document.createElement('div'); b.dataset.kbBeam = '';
    b.style.cssText = `position:fixed;left:0;right:0;height:2px;z-index:2147483646;pointer-events:none;background:#fff;box-shadow:0 0 18px 5px ${color},0 0 60px 10px ${color};top:${mode === 'in' ? 0 : 100}%;opacity:.95`;
    document.body.appendChild(b);
    const f = (from || 0) * 100;
    b.animate([{ top: mode === 'in' ? f + '%' : (100 - f) + '%' }, { top: mode === 'in' ? '100%' : '0%' }], { duration: ms, easing: 'linear', fill: 'forwards' })
      .finished.then(() => b.animate([{ opacity: .95 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished).then(() => b.remove());
  }

  function run(root, mode, ms, color){
    root = root || document.body; color = color || 'rgba(0,212,255,.9)';
    restore(root);
    const st = { anims: [], texts: [], job: Math.random() }; state.set(root, st);
    const { els, texts, vh } = collect(root);
    const D = Math.max(260, Math.min(520, ms * .2)), W = Math.max(300, ms - D);
    const T0s = schedule(els, vh, mode, W), Tv = T0s.filter((x, i) => els[i].vis), m0 = Tv.length ? Math.min(...Tv) : 0, T = T0s.map(x => x - m0), Wr = W - m0;   // start at the content, not at the empty edge
    const wire = `1px solid ${color}`, clear = '1px solid transparent';
    els.forEach((e, i) => {
      const dx = (Math.random() * 2 - 1) * 9, tf = !e.inline;
      const T0 = { outlineOffset: '-1px' };
      // build on the element's own placement and look, never replace it: a centred globe stays centred, a faint word stays faint
      const own = e.tf0 && e.tf0 !== 'none' ? e.tf0 : '';
      const X = v => tf ? (v === 'none' ? (own || 'none') : (own ? own + ' ' : '') + v) : undefined;
      const O = k => +(e.op0 || 1) * k;
      const C = v => e.clip0 && e.clip0 !== 'none' ? e.clip0 : v;
      const kf = mode === 'out' ? [
        { ...T0, opacity: O(1), outline: clear, clipPath: C('inset(0 0 0 0)'), transform: X('none') },
        { ...T0, opacity: O(1), outline: wire, clipPath: C('inset(0 0 0 0)'), transform: X(`translateX(${dx}px)`), offset: .18 },
        { ...T0, opacity: O(1), outline: wire, clipPath: C(`inset(${(5 + Math.random() * 20) | 0}% 0 ${(40 + Math.random() * 20) | 0}% 0)`), transform: X(`translateX(${-dx}px) skewX(${dx}deg)`), offset: .38 },
        { ...T0, opacity: O(1), outline: wire, clipPath: C(`inset(${(45 + Math.random() * 20) | 0}% 0 ${(5 + Math.random() * 15) | 0}% 0)`), transform: X(`translateX(${dx * 1.5}px)`), offset: .56 },
        { ...T0, opacity: O(.9), outline: wire, clipPath: C('inset(48% 0 48% 0)'), transform: X('scaleY(.1)'), offset: .78 },
        { ...T0, opacity: 0, outline: clear, clipPath: C('inset(50% 0 50% 0)'), transform: X('scaleY(0)') }
      ] : [
        { ...T0, opacity: 0, outline: wire, clipPath: C('inset(0 100% 0 0)'), transform: X('none') },
        { ...T0, opacity: O(1), outline: wire, clipPath: C('inset(0 100% 0 0)'), transform: X('none'), offset: .01 },
        { ...T0, opacity: O(1), outline: wire, clipPath: C('inset(0 0 0 0)'), transform: X('none'), offset: .35 },
        { ...T0, opacity: O(1), outline: wire, clipPath: C(`inset(0 0 ${(30 + Math.random() * 30) | 0}% 0)`), transform: X(`translateX(${dx}px)`), offset: .5 },
        { ...T0, opacity: O(1), outline: wire, clipPath: C('inset(0 0 0 0)'), transform: X(`translateX(${-dx / 2}px)`), offset: .66 },
        { ...T0, opacity: O(1), outline: clear, clipPath: C('inset(0 0 0 0)'), transform: X('none') }
      ];
      kf.forEach(k => { if (k.transform === undefined) delete k.transform; });
      if (!e.vis) return;   // a plain wrapper: its contents do the work
      try { st.anims.push(e.el.animate(kf, { duration: D, delay: T[i], easing: 'steps(6,end)', fill: mode === 'out' ? 'forwards' : 'both' })); } catch (_){}
    });
    // the text: decays as its element is torn down, types back in once its element has formed
    texts.forEach(x => { x.t = T[x.owner] || 0; x.L = x.o.length; if (mode === 'in') x.n.nodeValue = ''; });
    st.texts = texts;
    beam(color, mode, Wr, m0 / W);
    const t0 = performance.now(), job = st.job;
    const last = Math.max(0, ...T.filter((x, i) => els[i].vis)), end = mode === 'out' ? last + D : last + D * .35 + 540;
    return new Promise(res => {
      (function f(now){
        if (state.get(root) !== st || st.job !== job) return res();
        const el = now - t0;
        texts.forEach(x => {
          if (mode === 'out'){
            const q = Math.min(1, Math.max(0, (el - x.t) / (D * .55))), k = Math.floor(x.L * (1 - q));
            x.n.nodeValue = k <= 0 ? '' : x.o.slice(0, k) + (q > 0 ? g(Math.min(4, x.L - k)) : x.o.slice(k));
          } else {
            const s = x.t + D * .35, dur = Math.min(520, 80 + x.L * 7), q = Math.min(1, Math.max(0, (el - s) / dur)), k = Math.floor(x.L * q);
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
