/* Dismantle / rebuild a page element by element, for the dissertation transitions.
   out: in reverse reading order, each detail's text scrambles, the element flashes as a wireframe, tears into slices
        and collapses to a line. Children go before the box that holds them.
   in:  in reading order, each box draws in as a wireframe first, then its contents form inside it and the text
        decodes in place. Containers before their contents. Text never changes length, so nothing reflows.
   Pure theatre: it only animates what is already on the page and puts everything back afterwards. */
(function(){
  if (window.KBDismantle) return;
  const G = 'ABCDEFGHKMNPRSTVWXYZ0123456789#/<>§%&';
  const g = n => { let s = ''; for (let i = 0; i < n; i++) s += G[(Math.random() * G.length) | 0]; return s; };
  // same length, same spaces: text that is scrambled rather than removed keeps every box its real size (no reflow)
  const scr = t => t.replace(/\S/g, () => G[(Math.random() * G.length) | 0]);
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
        if (cs.display === 'none') continue;   // (visibility is not checked: a page is briefly hidden while it is measured)
        const r = c.getBoundingClientRect();
        const on = r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw && cs.display !== 'contents';
        let me = parentIdx;
        if (on && els.length < 1400){ me = els.length; els.push({ el: c, r, parent: parentIdx, depth, vis: draws(c, cs), op0: cs.opacity, clip0: cs.clipPath, inline: cs.display.startsWith('inline') && c.tagName !== 'IMG' && c.tagName !== 'CANVAS' && c.tagName !== 'svg' }); idx.set(c, me); }
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
    // no scan line: the page is taken apart in reverse reading order (the last detail first, every box after the
    // things inside it) and put back in reading order (each box first, then its contents, one detail at a time)
    const vis = els.map((e, i) => i).filter(i => els[i].vis), n = Math.max(1, vis.length - 1), t = els.map(() => 0);
    vis.forEach((i, r) => { t[i] = (mode === 'out' ? (vis.length - 1 - r) : r) / n * W; });
    return t;
  }




  function run(root, mode, ms, color){
    root = root || document.body; color = color || 'rgba(0,212,255,.9)';
    restore(root);
    const st = { anims: [], texts: [], job: Math.random() }; state.set(root, st);
    const { els, texts, vh } = collect(root);
    const D = Math.max(260, Math.min(520, ms * .2)), W = Math.max(300, ms - D);
    const T = schedule(els, vh, mode, W);
    const wire = `1px solid ${color}`, clear = '1px solid transparent';
    els.forEach((e, i) => {
      const dx = (Math.random() * 2 - 1) * 9, tf = !e.inline;
      const T0 = { outlineOffset: '-1px' };
      // build on the element's own placement and look, never replace it: the motion uses the separate translate and
      // scale properties, which add to whatever transform the element already has (a centred globe stays centred)
      const O = k => +(e.op0 || 1) * k;
      const C = v => e.clip0 && e.clip0 !== 'none' ? e.clip0 : v;
      const M = (x, sy) => tf ? { translate: `${x}px 0`, scale: `1 ${sy}` } : {};
      const kf = mode === 'out' ? [
        { ...T0, opacity: O(1), outline: clear, clipPath: C('inset(0 0 0 0)'), ...M(0, 1) },
        { ...T0, opacity: O(1), outline: wire, clipPath: C('inset(0 0 0 0)'), ...M(dx, 1), offset: .18 },
        { ...T0, opacity: O(1), outline: wire, clipPath: C(`inset(${(5 + Math.random() * 20) | 0}% 0 ${(40 + Math.random() * 20) | 0}% 0)`), ...M(-dx, 1), offset: .38 },
        { ...T0, opacity: O(1), outline: wire, clipPath: C(`inset(${(45 + Math.random() * 20) | 0}% 0 ${(5 + Math.random() * 15) | 0}% 0)`), ...M(dx * 1.5, 1), offset: .56 },
        { ...T0, opacity: O(.9), outline: wire, clipPath: C('inset(48% 0 48% 0)'), ...M(0, .1), offset: .78 },
        { ...T0, opacity: 0, outline: clear, clipPath: C('inset(50% 0 50% 0)'), ...M(0, 0) }
      ] : [
        { ...T0, opacity: 0, outline: wire, clipPath: C('inset(0 100% 0 0)'), ...M(0, 1) },
        { ...T0, opacity: O(1), outline: wire, clipPath: C('inset(0 100% 0 0)'), ...M(0, 1), offset: .01 },
        { ...T0, opacity: O(1), outline: wire, clipPath: C('inset(0 0 0 0)'), ...M(0, 1), offset: .35 },
        { ...T0, opacity: O(1), outline: wire, clipPath: C(`inset(0 0 ${(30 + Math.random() * 30) | 0}% 0)`), ...M(dx, 1), offset: .5 },
        { ...T0, opacity: O(1), outline: wire, clipPath: C('inset(0 0 0 0)'), ...M(-dx / 2, 1), offset: .66 },
        { ...T0, opacity: O(1), outline: clear, clipPath: C('inset(0 0 0 0)'), ...M(0, 1) }
      ];
      if (!e.vis) return;   // a plain wrapper: its contents do the work
      try { st.anims.push(e.el.animate(kf, { duration: D, delay: T[i], easing: 'steps(6,end)', fill: mode === 'out' ? 'forwards' : 'both' })); } catch (_){}
    });
    // the text: decays as its element is torn down, types back in once its element has formed
    texts.forEach(x => { x.t = T[x.owner] || 0; x.L = x.o.length; x.sc = scr(x.o); if (mode === 'in') x.n.nodeValue = x.sc; });
    st.texts = texts;
    const t0 = performance.now(), job = st.job;
    const last = Math.max(0, ...T.filter((x, i) => els[i].vis)), end = mode === 'out' ? last + D : last + D * .35 + 540;
    return new Promise(res => {
      (function f(now){
        if (state.get(root) !== st || st.job !== job) return res();
        const el = now - t0;
        texts.forEach(x => {
          if (mode === 'out'){
            const q = Math.min(1, Math.max(0, (el - x.t) / (D * .55))), k = Math.floor(x.L * (1 - q));
            x.n.nodeValue = q <= 0 ? x.o : x.o.slice(0, k) + scr(x.o.slice(k, k + 4)) + x.sc.slice(k + 4);   // scrambles from the end, never shortens
          } else {
            const s = x.t + D * .35, dur = Math.min(520, 80 + x.L * 7), q = Math.min(1, Math.max(0, (el - s) / dur)), k = Math.floor(x.L * q);
            x.n.nodeValue = k >= x.L ? x.o : x.o.slice(0, k) + scr(x.o.slice(k, k + 5)) + x.sc.slice(k + 5);   // decodes in place, never grows
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
