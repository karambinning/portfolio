/* Dissertation window — the theatre globe. A MOCK ASSET.
   Wireframe orthographic globe in the lab's WAR · STEREO RED look: far-side ghost, red graticule,
   country outlines, three atmosphere rings, a mirror-scan sweep. On top, synthetic activity only:
   hotspot pulses, lifted dyad arcs and a feed of readouts, all drawn from a seeded random generator.
   Nothing here comes from the lab's model or data, and nothing here is a research result. */
window.WarGlobe = (opts) => {
  const { canvas, stage, feed, onCount, reduce } = opts;
  const ctx = canvas.getContext('2d');
  const W = window.WORLD110;
  const countries = topojson.feature(W, W.objects.countries).features;
  const borders = topojson.mesh(W, W.objects.countries, (a, b) => a !== b);
  const coast = topojson.mesh(W, W.objects.countries, (a, b) => a === b);
  const grat = d3.geoGraticule().step([15, 15])();
  const grat30 = d3.geoGraticule().step([30, 30])();
  const front = d3.geoOrthographic().clipAngle(90).precision(0.5);
  const far = d3.geoOrthographic().clipAngle(null).precision(0.8);
  const pFront = d3.geoPath(front, ctx), pFar = d3.geoPath(far, ctx);

  // anchor points: centroids of the larger countries (unnamed; used only as places to draw marks)
  const anchors = countries.map(f => ({ c: d3.geoCentroid(f), a: d3.geoArea(f) }))
    .filter(d => d.a > 0.004 && Number.isFinite(d.c[0])).map(d => d.c);

  // seeded RNG so the mock is stable between loads, but it reshuffles as it runs
  let seed = 1914 ^ 1939;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const tierRoll = () => { const r = rnd(); return r < .42 ? 1 : r < .7 ? 2 : r < .87 ? 3 : r < .96 ? 4 : 5; }; // mostly quiet, like the world
  const id = () => 'SYN-' + String(Math.floor(rnd() * 9000) + 1000);

  const TIER = [null,
    { c: '#c41414', w: 1, d: [1, 3], word: 'LOW' },
    { c: '#e82020', w: 1.25, d: [4, 3], word: 'MODERATE' },
    { c: '#ff3030', w: 1.5, d: [], word: 'ELEVATED' },
    { c: '#ffa08a', w: 2, d: [], word: 'HIGH' },
    { c: '#ffffff', w: 2.5, d: [], word: 'VERY HIGH' }];

  const hot = []; const arcs = [];
  function newHot(){ return { p: pick(anchors), id: id(), tier: tierRoll(), ph: rnd(), born: performance.now() - (reduce ? 1200 : 0), life: 9000 + rnd() * 9000 }; }
  function newArc(now){
    const a = pick(anchors); let b = pick(anchors), n = 0;
    while (n++ < 20 && (d3.geoDistance(a, b) < 0.35 || d3.geoDistance(a, b) > 2.2)) b = pick(anchors);
    const dist = d3.geoDistance(a, b), interp = d3.geoInterpolate(a, b), h = 0.06 + 0.22 * dist / Math.PI;
    const pts = d3.range(0, 1.0001, 1 / 56).map(t => [interp(t), 1 + h * Math.sin(Math.PI * t)]);
    const arc = { a: id(), b: id(), tier: tierRoll(), pts, born: now - (reduce ? 1200 : 0), life: 5200 + rnd() * 5200, sp: 0.00025 + rnd() * 0.0003 };
    log(arc); return arc;
  }
  for (let i = 0; i < 9; i++) hot.push(newHot());
  const t0 = performance.now();
  for (let i = 0; i < 7; i++){ const a = newArc(t0); a.born -= rnd() * 4000; arcs.push(a); }

  // ---- readout feed (synthetic) ----
  function log(arc){
    if (!feed) return;
    const t = TIER[arc.tier], segs = '▮'.repeat(arc.tier) + '▯'.repeat(5 - arc.tier);
    const li = document.createElement('li');
    li.innerHTML = `<span class="f-d">${arc.a} ⇄ ${arc.b}</span><span class="f-s" style="color:${t.c}">${segs}</span><span class="f-w" style="color:${t.c}">${t.word}</span>`;
    feed.prepend(li); while (feed.children.length > 12) feed.lastChild.remove();
  }

  // ---- view state ----
  let rot = [-20, -18, 0], size = 0, R = 0, cx = 0, cy = 0, dpr = 1, running = !reduce, drag = null, lastUser = 0, raf = 0, lastT = performance.now();
  let showArcs = true, showHot = true;
  // experiment layer (driven by the page's RUN EXPERIMENT console): synthetic markers, a turn to one, one lit dyad
  let xMarks = [], xHits = [], xOnPick = null, xDyad = null, xFocus = null, xHold = false, mockA = 1;

  function resize(){
    const r = stage.getBoundingClientRect();
    size = Math.max(160, Math.floor(Math.min(r.width, r.height)));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = canvas.style.height = size + 'px';
    R = size / 2 - 26; cx = cy = size / 2;
    front.scale(R).translate([cx, cy]); far.scale(R).translate([cx, cy]);
    draw(performance.now());
  }

  // project with lift k; returns [x, y, hidden]
  let rotFn = d3.geoRotation(rot);
  function proj(p, k){
    const [l, f] = rotFn(p), L = l * Math.PI / 180, F = f * Math.PI / 180;
    const x = Math.cos(F) * Math.sin(L), y = -Math.sin(F), z = Math.cos(F) * Math.cos(L);
    return [cx + x * R * k, cy + y * R * k, z < 0 && Math.hypot(x, y) * k < 1];
  }
  const visible = p => d3.geoDistance(p, [-rot[0], -rot[1]]) < Math.PI / 2;

  function stroke(path, geo, c, w, a = 1, dash = []){
    ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.setLineDash(dash);
    ctx.beginPath(); path(geo); ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]);
  }

  function draw(now){
    if (!size) return;
    rotFn = d3.geoRotation(rot); front.rotate(rot); far.rotate(rot);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);

    // atmosphere: three rings, no shader
    [[R + 5, .55, 1.2], [R + 11, .25, 1], [R + 19, .1, 1]].forEach(([r, a, w]) => {
      ctx.globalAlpha = a; ctx.strokeStyle = '#ff1a1a'; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }); ctx.globalAlpha = 1;
    // range ticks on the outer ring
    ctx.strokeStyle = '#800000'; ctx.lineWidth = 1;
    for (let i = 0; i < 72; i++){
      const a = i / 72 * Math.PI * 2, r1 = R + 19, r2 = r1 + (i % 6 ? 3 : 7);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke();
    }
    // the disc
    const g = ctx.createRadialGradient(cx - R * .25, cy - R * .3, R * .1, cx, cy, R);
    g.addColorStop(0, '#0c0000'); g.addColorStop(.85, '#050000'); g.addColorStop(1, '#1a0000');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // far side, seen through the wireframe (stereo ghost offset to the left)
    ctx.save(); ctx.translate(-2, 0);
    stroke(pFar, grat30, '#3a0808', .6, .7);
    stroke(pFar, coast, '#5a0c0c', .7, .55);
    ctx.restore();
    // focal plane
    stroke(pFront, grat, '#3a0808', .7);
    stroke(pFront, { type: 'LineString', coordinates: d3.range(-180, 181, 3).map(l => [l, 0]) }, '#800000', .9);
    stroke(pFront, borders, '#5a0c0c', .6);
    stroke(pFront, coast, '#b00000', 1.05);
    ctx.strokeStyle = '#c41414'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    // mirror-scan beam: sweeps across the disc and back, like the Virtual Boy's mirror
    if (!reduce){
      const s = (Math.sin(now / 1400) + 1) / 2, x = cx - R + s * 2 * R;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      const bg = ctx.createLinearGradient(x - 40, 0, x + 40, 0);
      bg.addColorStop(0, 'rgba(255,26,26,0)'); bg.addColorStop(.5, 'rgba(255,26,26,.10)'); bg.addColorStop(1, 'rgba(255,26,26,0)');
      ctx.fillStyle = bg; ctx.fillRect(x - 40, cy - R, 80, 2 * R);
      ctx.fillStyle = 'rgba(255,80,80,.35)'; ctx.fillRect(x, cy - R, 1, 2 * R); ctx.restore();
    }

    // dyad arcs
    if (showArcs) arcs.forEach(arc => {
      const age = now - arc.born, t = TIER[arc.tier];
      const grow = Math.min(1, age / 900), fade = Math.min(1, (arc.life - age) / 700);
      const alpha = mockA * Math.max(0, Math.min(1, fade));
      const n = Math.max(2, Math.ceil(arc.pts.length * grow));
      const P = arc.pts.slice(0, n).map(([p, k]) => proj(p, k));
      // hidden runs on the far plane at 20%, visible runs on the surface
      for (const hidden of [true, false]){
        ctx.globalAlpha = alpha * (hidden ? .2 : 1);
        ctx.strokeStyle = t.c; ctx.lineWidth = t.w; ctx.setLineDash(hidden ? [2, 3] : t.d);
        if (arc.tier >= 4 && !hidden){ ctx.shadowColor = '#ff1a1a'; ctx.shadowBlur = arc.tier === 5 ? 8 : 4; }
        ctx.beginPath(); let pen = false;
        P.forEach(([x, y, h]) => { if (h === hidden){ pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false; });
        ctx.stroke(); ctx.shadowBlur = 0;
      }
      ctx.setLineDash([]);
      // endpoints + travelling packet
      [P[0], grow === 1 ? P[P.length - 1] : null].forEach(q => { if (q && !q[2]){ ctx.globalAlpha = alpha; ctx.fillStyle = t.c; ctx.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3); } });
      if (grow === 1 && !reduce){
        const f = ((now - arc.born) * arc.sp) % 1, i = Math.floor(f * (P.length - 1)), q = P[i];
        if (q && !q[2]){ ctx.globalAlpha = alpha; ctx.fillStyle = '#ffe6e6'; ctx.beginPath(); ctx.arc(q[0], q[1], 1.8, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    });

    // hotspots: brightness is the (mock) tier; pulses expand and fade
    if (showHot) hot.forEach(h => {
      if (!visible(h.p)) return;
      const [x, y] = proj(h.p, 1), t = TIER[h.tier];
      const age = now - h.born, a = mockA * Math.max(0, Math.min(1, age / 600, (h.life - age) / 600));
      ctx.globalAlpha = a;
      if (!reduce){
        for (let k = 0; k < 2; k++){
          const f = ((now / 1700) + h.ph + k / 2) % 1;
          ctx.globalAlpha = a * (1 - f) * .8; ctx.strokeStyle = t.c; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, 3 + f * (8 + h.tier * 4), 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.globalAlpha = a; ctx.fillStyle = t.c;
      if (h.tier >= 4){ ctx.shadowColor = '#ff1a1a'; ctx.shadowBlur = 8; }
      ctx.fillRect(x - 2.5, y - 2.5, 5, 5); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#800000'; ctx.lineWidth = 1; ctx.strokeRect(x - 6, y - 6, 12, 12);
      ctx.font = '700 9px ui-monospace,Menlo,monospace'; ctx.fillStyle = '#d06464'; ctx.fillText(h.id, x + 9, y - 6);
      ctx.globalAlpha = 1;
    });

    drawExp(now);

    // crosshair at the sub-observer point
    ctx.strokeStyle = 'rgba(255,48,48,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx - 3, cy); ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy - 3); ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy + 8); ctx.stroke();
  }

  // ---- experiment layer: drawn on top, all synthetic ----
  function liftPts(a, b){
    const dist = d3.geoDistance(a, b), interp = d3.geoInterpolate(a, b), h = 0.05 + 0.3 * dist / Math.PI;
    return d3.range(0, 1.0001, 1 / 48).map(t => [interp(t), 1 + h * Math.sin(Math.PI * t)]);
  }
  function drawExp(now){
    xHits = [];
    ctx.font = '700 9px ui-monospace,Menlo,monospace';
    xMarks.forEach(m => {
      if (!visible(m.p)) return;
      const [x, y] = proj(m.p, 1), on = m.sel, c = on ? '#ffffff' : '#ffcc00';
      xHits.push({ k: m.k, x, y });
      ctx.globalAlpha = 1; ctx.strokeStyle = c; ctx.lineWidth = on ? 1.6 : 1;
      if (on){ ctx.shadowColor = '#ff1a1a'; ctx.shadowBlur = 10; }
      // a diamond inside corner brackets
      ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.stroke();
      ctx.shadowBlur = 0;
      const s = on ? 13 : 10;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([i, j]) => { ctx.beginPath(); ctx.moveTo(x + i * s, y + j * (s - 4)); ctx.lineTo(x + i * s, y + j * s); ctx.lineTo(x + i * (s - 4), y + j * s); ctx.stroke(); });
      if (!reduce && on){ const f = (now / 1300) % 1; ctx.globalAlpha = 1 - f; ctx.beginPath(); ctx.arc(x, y, 8 + f * 22, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.fillStyle = c; ctx.fillText(m.label, x + s + 4, y + 3);
    });
    if (!xDyad) return;
    const d = xDyad, P = d.pts.map(([p, k]) => proj(p, k));
    const live = d.state === 'live', done = d.state === 'done';
    const c = done ? d.c : live ? '#ffe6e6' : '#ff8080';
    const grow = live && !reduce ? Math.min(1, (now - d.born) / 800) : 1, n = Math.max(2, Math.ceil(P.length * grow));
    for (const hidden of [true, false]){
      ctx.globalAlpha = hidden ? .25 : (d.state === 'idle' ? .8 : 1);
      ctx.strokeStyle = c; ctx.lineWidth = done ? 2.6 : live ? 2 : 1.3; ctx.setLineDash(hidden ? [2, 3] : d.state === 'idle' ? [4, 3] : []);
      if (!hidden && d.state !== 'idle'){ ctx.shadowColor = '#ff1a1a'; ctx.shadowBlur = done ? 12 : 8; }
      ctx.beginPath(); let pen = false;
      P.slice(0, n).forEach(([x, y, h]) => { if (h === hidden){ pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false; });
      ctx.stroke(); ctx.shadowBlur = 0;
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (live && !reduce) for (let i = 0; i < 3; i++){
      const f = ((now - d.born) / 1100 + i / 3) % 1, q = P[Math.floor(f * (P.length - 1))];
      if (q && !q[2]){ ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(q[0], q[1], 2.2, 0, Math.PI * 2); ctx.fill(); }
    }
    [[P[0], d.a, -1], [P[P.length - 1], d.b, 1]].forEach(([q, label, side]) => {
      if (!q || q[2]) return;
      ctx.fillStyle = c; ctx.fillRect(q[0] - 2.5, q[1] - 2.5, 5, 5);
      ctx.fillStyle = done ? c : '#ffd0d0'; ctx.textAlign = side < 0 ? 'right' : 'left';
      ctx.fillText(label, q[0] + side * 8, q[1] + (side < 0 ? -6 : 12)); ctx.textAlign = 'left';
    });
  }
  const redraw = () => { if (!raf) draw(performance.now()); };

  // ---- life cycle of the mock activity ----
  function tick(now){
    const dt = Math.min(64, now - lastT); lastT = now;
    if (xFocus){
      const k = Math.min(1, (now - xFocus.t0) / xFocus.ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      rot = [xFocus.from[0] + xFocus.d[0] * e, xFocus.from[1] + xFocus.d[1] * e, 0];
      if (k >= 1) xFocus = null;
    } else if (!drag && !xHold && now - lastUser > 1600) rot[0] += dt * 0.006;
    for (let i = 0; i < arcs.length; i++) if (now - arcs[i].born > arcs[i].life) arcs[i] = newArc(now);
    for (let i = 0; i < hot.length; i++) if (now - hot[i].born > hot[i].life) hot[i] = newHot();
    onCount && onCount(arcs.length, hot.filter(h => visible(h.p)).length, rot);
    draw(now);
    raf = running ? requestAnimationFrame(tick) : 0;
  }

  // drag to turn
  canvas.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, rot[0], rot[1]]; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    rot = [drag[2] + (e.clientX - drag[0]) * 0.35, Math.max(-80, Math.min(80, drag[3] - (e.clientY - drag[1]) * 0.35)), 0];
    lastUser = performance.now(); if (!running) draw(lastUser);
  });
  const end = e => {
    // a click without a drag picks an experiment marker, if one is under the pointer
    // (a fingertip on a phone gets a little more slack: it wobbles more and covers more)
    const fat = e && e.pointerType === 'touch' && matchMedia('(max-width:600px)').matches;
    if (drag && e && e.type === 'pointerup' && xOnPick && Math.hypot(e.clientX - drag[0], e.clientY - drag[1]) < (fat ? 10 : 5)){
      const r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const hit = fat ? xHits.map(h => [Math.hypot(h.x - px, h.y - py), h]).filter(a => a[0] < 26).sort((a, b) => a[0] - b[0]).map(a => a[1])[0]
        : xHits.find(h => Math.hypot(h.x - px, h.y - py) < 16);
      if (hit) xOnPick(hit.k);
    }
    drag = null; lastUser = performance.now();
  };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', e => {
    const k = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, 6], ArrowDown: [0, -6] }[e.key];
    if (!k) return; e.preventDefault();
    rot = [rot[0] + k[0], Math.max(-80, Math.min(80, rot[1] + k[1])), 0]; lastUser = performance.now(); if (!running) draw(lastUser);
  });

  new ResizeObserver(resize).observe(stage);
  document.addEventListener('visibilitychange', () => { if (document.hidden){ cancelAnimationFrame(raf); raf = 0; } else if (running && !raf){ lastT = performance.now(); raf = requestAnimationFrame(tick); } });
  resize();
  if (running) raf = requestAnimationFrame(tick);
  else onCount && onCount(arcs.length, hot.filter(h => visible(h.p)).length, rot);

  return {
    toggle(){ running = !running; if (running && !raf){ lastT = performance.now(); raf = requestAnimationFrame(tick); } return running; },
    arcs(on){ showArcs = on; draw(performance.now()); },
    hot(on){ showHot = on; draw(performance.now()); },
    get running(){ return running; },
    // the experiment console's hooks; everything it passes in is synthetic
    exp: {
      marks(list, onPick){ xMarks = list || []; xOnPick = onPick || null; redraw(); },
      focus(p, ms = 1400){
        xHold = true;
        const to = [-p[0], Math.max(-60, Math.min(60, -p[1]))];
        if (reduce || !raf){ xFocus = null; rot = [to[0], to[1], 0]; redraw(); return; }
        const d0 = ((to[0] - rot[0]) % 360 + 540) % 360 - 180;
        xFocus = { from: [rot[0], rot[1]], d: [d0, to[1] - rot[1]], t0: performance.now(), ms };
      },
      dyad(d){ xDyad = d ? { ...d, state: 'idle', born: performance.now(), pts: liftPts(d.pa, d.pb) } : null; redraw(); },
      state(s, c){ if (xDyad){ xDyad.state = s; xDyad.c = c || xDyad.c; xDyad.born = performance.now(); } redraw(); },
      dim(on){ mockA = on ? .3 : 1; redraw(); },
      release(){ xMarks = []; xOnPick = null; xDyad = null; xFocus = null; xHold = false; mockA = 1; lastUser = performance.now(); redraw(); },
    },
  };
};
