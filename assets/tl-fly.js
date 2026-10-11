/* The timeline as a fly-through. Content comes from the hidden ordered list #tlSrc (also what screen readers use).
   Autoplay: each moment approaches out of the distance, holds while it is read, and is flown through to the next;
   it ends on a summary of all four. Clicking during the flight skips ahead; hovering a held moment holds it.
   From the summary any moment opens in full (paragraph and every point). */
(function(){
  const sc = document.getElementById('timeline'), src = document.getElementById('tlSrc');
  if (!sc || !src) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COL = ['#00d4ff', '#ff4d6d', '#ffcc00', '#00ff88'];
  const APPROACH = 650, HOLD = 2300, PASS = 450;   // about 3.4 s a moment, about 14 s in all
  const G = 'ABCDEFGHKMNPRSTVWXYZ0123456789#/<>';
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const M = [...src.querySelectorAll(':scope > li')].map((li, i) => {
    const pts = [...li.querySelectorAll('.pts > li')];
    const key = (pts.filter(p => p.dataset.at).concat(pts)).filter((p, k, a) => a.indexOf(p) === k).slice(0, 2);   // dated points first
    return { i, c: COL[i % COL.length], date: li.querySelector('.date').textContent.trim(), title: li.querySelector('h3').textContent.trim(),
      copy: li.querySelector('.copy').textContent.trim(), pts: pts.map(p => ({ t: p.textContent.trim(), minor: p.classList.contains('minor') })),
      key: key.map(p => p.textContent.trim()), slug: (li.dataset.from || '').slice(0, 7) };
  });

  // stage
  const old = document.getElementById('tlBoard'); if (old) old.remove();
  const tf = document.createElement('div'); tf.className = 'tf'; tf.setAttribute('aria-hidden', 'true');
  tf.innerHTML = '<div class="tf-glow"></div><div class="tf-grid ceil"></div><div class="tf-grid floor"></div><div class="tf-streaks">' +
    Array.from({ length: 18 }, (_, k) => `<i style="--r:${k * 20}deg;animation-delay:${(k * 37 % 450)}ms"></i>`).join('') + '</div>' +
    M.map(m => `<div class="tf-m" style="--c:${m.c}"><div class="tf-bar"><i></i><i></i><i></i><span>~/timeline/${esc(m.slug || m.date)}</span><em>${m.i + 1} / ${M.length}</em></div>
      <div class="tf-in"><div><div class="tf-date">${esc(m.date)}</div><div class="tf-ttl">${esc(m.title)}</div></div>
      <ul class="tf-pts">${m.key.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div></div>`).join('') +
    `<div class="tf-sum">${M.map(m => `<button type="button" class="tf-card" style="--c:${m.c}" data-i="${m.i}"><b>${esc(m.date)}</b><strong>${esc(m.title)}</strong><span>${esc(m.key[0] || '')}</span><em>OPEN ›</em></button>`).join('')}
      <div class="tf-hint">march to now · open any moment for the full story</div></div>
    <div class="tf-full"></div><div class="tf-skip">click to skip ahead · hover to hold</div>`;
  src.after(tf);
  const panels = [...tf.querySelectorAll('.tf-m')], full = tf.querySelector('.tf-full');

  // decode a panel's text in as it arrives
  const nodesOf = el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), a = []; let n; while ((n = w.nextNode())) if (n.nodeValue.trim()) a.push([n, n.nodeValue]); return a; };
  const NODES = panels.map(nodesOf);
  function decode(k, ms){
    if (reduce) return; const list = NODES[k], t0 = performance.now();
    (function f(now){ const p = Math.min(1, (now - t0) / ms);
      list.forEach(([n, o], j) => { const q = Math.min(1, Math.max(0, p * 1.3 - j / list.length * .3)), c = Math.floor(o.length * q);
        n.nodeValue = q >= 1 ? o : o.slice(0, c) + o.slice(c, c + 4).replace(/\S/g, () => G[(Math.random() * G.length) | 0]); });
      if (p < 1 && S.on) requestAnimationFrame(f); else list.forEach(([n, o]) => n.nodeValue = o); })(t0);
  }

  // the flight: one clock, one state per moment
  const S = { on: false, k: 0, phase: '', t0: 0, held: false, raf: 0, left: 0 };
  const ease = x => 1 - Math.pow(1 - x, 3), easeIn = x => x * x * x;
  function place(k, z, o, blur){ const p = panels[k]; p.style.transform = `translate(-50%,-50%) translateZ(${z}px)`; p.style.opacity = o; p.style.filter = blur ? `blur(${blur}px)` : ''; }
  function reset(){ panels.forEach((p, k) => place(k, -2400, 0)); tf.classList.remove('done', 'warp'); full.classList.remove('on'); tf.setAttribute('aria-hidden', 'true'); }
  function tick(now){
    if (!S.on) return;
    if (S.held){ S.t0 += now - S.last; S.last = now; S.raf = requestAnimationFrame(tick); return; }
    S.last = now; const el = now - S.t0;
    if (S.phase === 'approach'){ const x = Math.min(1, el / APPROACH); place(S.k, -2400 + 2400 * ease(x), Math.min(1, x * 1.6), (1 - x) * 6);
      if (x >= 1){ S.phase = 'hold'; S.t0 = now; tf.classList.remove('warp'); } }
    else if (S.phase === 'hold'){ if (el >= HOLD){ S.phase = 'pass'; S.t0 = now; tf.classList.add('warp'); } }
    else if (S.phase === 'pass'){ const x = Math.min(1, el / PASS); place(S.k, 800 * easeIn(x), 1 - x, x * 8);
      if (x >= 1){ place(S.k, -2400, 0); if (S.k < M.length - 1){ S.k++; S.phase = 'approach'; S.t0 = now; decode(S.k, APPROACH + 300); } else return finish(); } }
    S.raf = requestAnimationFrame(tick);
  }
  function finish(){ S.on = false; S.held = false; tf.classList.remove('warp'); tf.classList.add('done'); tf.removeAttribute('aria-hidden'); }
  function start(){
    cancelAnimationFrame(S.raf); reset();
    if (reduce){ finish(); return; }
    S.on = true; S.held = false; S.k = 0; S.phase = 'approach'; S.t0 = S.last = performance.now(); tf.classList.add('warp'); decode(0, APPROACH + 300);
    S.raf = requestAnimationFrame(tick);
  }
  function stop(){ S.on = false; cancelAnimationFrame(S.raf); }

  // interaction
  tf.addEventListener('click', e => {
    if (e.target.closest('.tf-card, .tf-full')) return;
    if (S.on && !S.held){ if (S.phase === 'hold') S.t0 = performance.now() - HOLD; else if (S.phase === 'approach') S.t0 = performance.now() - APPROACH; }   // skip ahead
  });
  tf.addEventListener('mousemove', e => { if (!S.on || S.phase !== 'hold'){ S.held = false; return; } const r = panels[S.k].getBoundingClientRect(); S.held = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom; });
  tf.addEventListener('mouseleave', () => { S.held = false; });
  function open(i){
    const m = M[i];
    full.style.setProperty('--c', m.c);
    full.innerHTML = `<div class="tf-bar"><i></i><i></i><i></i><span>~/timeline/${esc(m.slug || m.date)}</span><span class="tf-nav">
      ${i > 0 ? '<button type="button" data-go="-1">‹ PREV</button>' : ''}${i < M.length - 1 ? '<button type="button" data-go="1">NEXT ›</button>' : ''}<button type="button" data-go="x">✕ ALL FOUR</button></span></div>
      <div class="tf-in"><div><div class="tf-date">${esc(m.date)}</div><div class="tf-ttl">${esc(m.title)}</div><p class="tf-copy">${esc(m.copy)}</p></div>
      <ul class="tf-pts">${m.pts.map(p => `<li${p.minor ? ' class="minor"' : ''}>${esc(p.t)}</li>`).join('')}</ul></div>`;
    full.classList.remove('on'); void full.offsetWidth; full.classList.add('on'); full.dataset.i = i;
  }
  tf.querySelector('.tf-sum').addEventListener('click', e => { const b = e.target.closest('.tf-card'); if (b) open(+b.dataset.i); });
  full.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; const g = b.dataset.go;
    if (g === 'x') full.classList.remove('on'); else open(+full.dataset.i + +g); });
  // the full view and summary are real controls, so the stage is only hidden from screen readers while it is flying
  const rp = document.getElementById('tlReplay'); if (rp) rp.addEventListener('click', start);

  window.tlStart = start; window.tlStop = stop;
  if (sc.classList.contains('active')) start();
})();
