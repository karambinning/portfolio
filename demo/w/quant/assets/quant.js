/* Quantitative — War Room + Krabs.
   Every number drawn here comes from assets/data.json (a trimmed copy of demo/markets/assets/data.json,
   itself extracted from the v91_final PAPER run and the Krabs estate record). Nothing is invented:
   the equity curve is the cumulative P&L of the 289 recorded trades; the fill grid is the recorded
   2-of-304 count (which cells light is illustrative); Krabs shows only its three reported Brier
   checkpoints and summary CLV figures, because the per-match ledger was not archived. */
(() => {
  const $ = id => document.getElementById(id);
  const css = getComputedStyle(document.body);
  const v = n => css.getPropertyValue(n).trim();
  const C = { a: v('--a') || '#ff3355', b: v('--b') || '#ffb000', dim: v('--dim'), line: v('--line'), text: v('--text'), body: v('--body'),
    win: '#00ff88', violet: v('--violet'), screen: v('--screen') };
  const FONT = (w, s) => `${w} ${s}px ui-monospace,'SF Mono','JetBrains Mono',Menlo,monospace`;
  const reduce = window.KB ? KB.reduce : false;

  function setup(cv){
    const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
    if (cv.width !== W * dpr || cv.height !== H * dpr){ cv.width = W * dpr; cv.height = H * dpr; }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    return { ctx, W, H };
  }
  // run fn(t in 0..1) over ms; returns a cancel function
  function animate(ms, fn, done){
    if (reduce){ fn(1); done && done(); return () => {}; }
    let raf, t0 = performance.now(), dead = false;
    const step = now => { if (dead) return; const t = Math.min(1, (now - t0) / ms); fn(t); if (t < 1) raf = requestAnimationFrame(step); else done && done(); };
    raf = requestAnimationFrame(step);
    return () => { dead = true; cancelAnimationFrame(raf); };
  }

  let D = null;
  const S = { eqN: 0, eqDone: false, fillI: 0, kr: 0 };
  const stop = { eq: null, fill: null, kr: null };

  /* ---------------- WAR ROOM: equity curve ---------------- */
  let series = [], peakIdx = 0, ddPeak = 0, ddTrough = 0;
  function buildSeries(){
    const w = D.warroom; let bal = w.start_balance, pk = bal, pkI = 0, best = 0;
    series = [{ m: 0, b: bal, p: 0 }];
    w.trades.forEach(t => { bal += t[2]; series.push({ m: t[0], b: bal, p: t[2] }); });
    series.forEach((s, i) => {
      if (s.b > pk){ pk = s.b; pkI = i; }
      const dd = (pk - s.b) / pk; if (dd > best){ best = dd; ddPeak = pkI; ddTrough = i; }
      if (s.b >= series[peakIdx].b) peakIdx = i;
    });
    S.ddPct = best * 100; // recomputed from the trades; matches the recorded 5.66%
  }
  function drawEq(){
    const cv = $('eq'), { ctx, W, H } = setup(cv), w = D.warroom;
    const padL = 34, padR = 10, padT = 10, padB = 18, pw = W - padL - padR, ph = H - padT - padB;
    const lo = 40, hi = 125, end = Math.ceil(w.duration_min);
    const X = m => padL + (m / end) * pw, Y = b => padT + ph - ((b - lo) / (hi - lo)) * ph;
    ctx.font = FONT(600, 9.5); ctx.lineWidth = 1;
    // grid
    ctx.strokeStyle = C.line; ctx.fillStyle = C.dim; ctx.textAlign = 'right';
    [50, 75, 100].forEach(b => { ctx.beginPath(); ctx.moveTo(padL, Y(b) + .5); ctx.lineTo(W - padR, Y(b) + .5); ctx.stroke(); ctx.fillText('$' + b, padL - 4, Y(b) + 3); });
    ctx.textAlign = 'center';
    for (let h = 0; h * 60 <= end; h += 2) ctx.fillText(h + 'h', X(h * 60), H - 4);
    const n = S.eqN; if (n < 1){ return; }
    const pts = series.slice(0, n + 1);
    // area
    ctx.beginPath(); ctx.moveTo(X(0), Y(w.start_balance));
    pts.forEach(s => ctx.lineTo(X(s.m), Y(s.b)));
    ctx.lineTo(X(pts[pts.length - 1].m), Y(w.start_balance)); ctx.closePath();
    const g = ctx.createLinearGradient(0, padT, 0, Y(w.start_balance));
    g.addColorStop(0, hexA(C.a, .28)); g.addColorStop(1, hexA(C.a, .02)); ctx.fillStyle = g; ctx.fill();
    // win / loss ticks along the floor
    pts.forEach((s, i) => { if (!i) return; ctx.fillStyle = s.p > 0 ? hexA(C.win, .7) : s.p < 0 ? hexA(C.a, .85) : C.dim; ctx.fillRect(Math.round(X(s.m)), padT + ph - (s.p > 0 ? 5 : 9), 1, 4); });
    // line
    ctx.beginPath(); pts.forEach((s, i) => i ? ctx.lineTo(X(s.m), Y(s.b)) : ctx.moveTo(X(s.m), Y(s.b)));
    ctx.strokeStyle = C.a; ctx.lineWidth = 1.6; ctx.shadowColor = C.a; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
    const last = pts[pts.length - 1];
    ctx.beginPath(); ctx.arc(X(last.m), Y(last.b), 3, 0, 7); ctx.fillStyle = C.text; ctx.fill();
    ctx.font = FONT(700, 10); ctx.fillStyle = C.text; ctx.textAlign = 'right';
    ctx.fillText('$' + last.b.toFixed(2) + ' · ' + n + ' trades', W - padR - 2, W < 480 ? Y(w.start_balance) - 4 : padT + 10);
    if (!S.eqDone) return;
    // drawdown bracket (largest peak-to-trough fall in the recorded trades)
    const p = series[ddPeak], t = series[ddTrough];
    ctx.strokeStyle = C.b; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(X(p.m), Y(p.b)); ctx.lineTo(X(p.m), Y(t.b)); ctx.lineTo(X(t.m), Y(t.b)); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = FONT(700, 9); ctx.fillStyle = C.b; ctx.textAlign = 'right';
    ctx.fillText('MAX DD −' + S.ddPct.toFixed(2) + '%', X(p.m) - 4, Y(t.b) + 12);
    // the invalidation overlay
    const bx = padL + 8, by = padT + 4, label = 'P&L INVALID', sub = 'every fill assumed at $0.52';
    ctx.font = FONT(800, 12); const w1 = ctx.measureText(label).width; ctx.font = FONT(600, 9); const w2 = ctx.measureText(sub).width;
    const bw = Math.max(w1, w2) + 16, bh = 32;
    ctx.save(); ctx.globalAlpha = .55; ctx.strokeStyle = C.a; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(padL, Y(hi), pw, Y(w.start_balance) - Y(hi)); ctx.clip();
    for (let x = padL - ph; x < W; x += 9){ ctx.beginPath(); ctx.moveTo(x, Y(w.start_balance)); ctx.lineTo(x + ph, padT); ctx.globalAlpha = .12; ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = C.screen; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = C.a; ctx.lineWidth = 1.5; ctx.strokeRect(bx + .5, by + .5, bw, bh);
    ctx.textAlign = 'left'; ctx.fillStyle = C.a; ctx.font = FONT(800, 12); ctx.fillText(label, bx + 8, by + 14);
    ctx.fillStyle = C.body; ctx.font = FONT(600, 9); ctx.fillText(sub, bx + 8, by + 26);
  }
  function playEq(){
    stop.eq && stop.eq(); S.eqDone = false; const N = series.length - 1;
    stop.eq = animate(4200, t => { S.eqN = Math.max(1, Math.round(N * t)); drawEq(); }, () => { S.eqDone = true; drawEq(); KB.twitch($('wr-verdict')); playFill(); });
  }

  /* ---------------- WAR ROOM: fill check grid ---------------- */
  // 304 order attempts at a $0.52 limit. The midpoint engine assumed every one filled; the order-book
  // check found 2. The count is the record; which two cells light up is illustrative.
  const HIT = new Set([57, 211]);
  function drawFill(){
    const cv = $('fill'), { ctx, W, H } = setup(cv), fc = D.warroom.fill_check;
    const stacked = W < 480, N = fc.attempts, cols = 76, rows = Math.ceil(N / cols), gap = 14;
    const gw = stacked ? W - 12 : (W - gap - 12) / 2, top = 15, blockH = stacked ? H / 2 : H;
    const cell = Math.min(gw / cols, (blockH - top - 3) / rows);
    const i = S.fillI;
    [['MIDPOINT ENGINE · ASSUMED', 0], ['ORDER BOOK · CHECKED', 1]].forEach(([lab, k]) => {
      const ox = stacked ? 6 : 6 + k * (gw + gap), oy = stacked ? k * blockH : 0;
      const filled = k ? [...HIT].filter(h => h < i).length : Math.min(i, N);
      ctx.font = FONT(700, 9); ctx.textAlign = 'left'; ctx.fillStyle = C.dim; ctx.fillText(lab, ox, oy + 10);
      ctx.textAlign = 'right'; ctx.fillStyle = k ? C.a : C.b; ctx.font = FONT(800, 10);
      ctx.fillText(filled + '/' + N + ' FILLED', ox + cols * cell, oy + 10);
      for (let j = 0; j < N; j++){
        const x = ox + (j % cols) * cell, y = oy + top + Math.floor(j / cols) * cell, s = Math.max(1, cell - 1.4);
        if (j >= i){ ctx.fillStyle = hexA(C.line, 1); ctx.fillRect(x, y, s, s); continue; }
        if (!k){ ctx.fillStyle = C.b; ctx.fillRect(x, y, s, s); }
        else if (HIT.has(j)){ ctx.fillStyle = C.win; ctx.shadowColor = C.win; ctx.shadowBlur = 6; ctx.fillRect(x - .5, y - .5, s + 1, s + 1); ctx.shadowBlur = 0; }
        else { ctx.strokeStyle = hexA(C.a, .55); ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, s - 1, s - 1); }
      }
    });
  }
  function playFill(){
    stop.fill && stop.fill(); const N = D.warroom.fill_check.attempts; let lastBeep = 0;
    stop.fill = animate(2400, t => {
      S.fillI = Math.round(N * t); drawFill();
      const hits = [...HIT].filter(h => h < S.fillI).length; if (hits > lastBeep){ lastBeep = hits; KB.beep(990, 50); }
    });
  }

  /* ---------------- KRABS: Brier checkpoints ---------------- */
  function drawBrier(){
    const cv = $('brier'), { ctx, W, H } = setup(cv), k = D.krabs, pts = k.brier_path;
    const padL = 34, padR = 22, padT = 14, padB = 16, pw = W - padL - padR, ph = H - padT - padB;
    const Y = b => padT + ph - (b / 0.3) * ph, X = i => padL + 18 + (i / (pts.length - 1)) * (pw - 36);
    ctx.font = FONT(600, 9.5); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.dim; ctx.textAlign = 'right';
    [0, 0.1, 0.2].forEach(b => { ctx.beginPath(); ctx.moveTo(padL, Y(b) + .5); ctx.lineTo(W - padR, Y(b) + .5); ctx.stroke(); ctx.fillText(b.toFixed(1), padL - 4, Y(b) + 3); });
    // coin-flip line
    ctx.strokeStyle = C.b; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(padL, Y(.25)); ctx.lineTo(W - padR, Y(.25)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.b; ctx.textAlign = 'right'; ctx.font = FONT(700, 9); ctx.fillText('0.25 = COIN FLIP', W - padR, Y(.25) - 4);
    const labels = ['START', 'MIDWAY', `${k.brier_matches} MATCHES`];
    const shown = S.kr * pts.length;
    // dotted connectors: only three checkpoints were recorded, so nothing is interpolated as data
    ctx.strokeStyle = hexA(C.a, .7); ctx.setLineDash([1.5, 3]); ctx.lineWidth = 1.4; ctx.beginPath();
    pts.forEach((b, i) => { if (i > shown - 0.5) return; i ? ctx.lineTo(X(i), Y(b)) : ctx.moveTo(X(i), Y(b)); }); ctx.stroke(); ctx.setLineDash([]);
    pts.forEach((b, i) => {
      ctx.textAlign = 'center'; ctx.fillStyle = C.dim; ctx.font = FONT(700, 9); ctx.fillText(labels[i], X(i), H - 4);
      if (i > shown - 0.5) return;
      ctx.beginPath(); ctx.arc(X(i), Y(b), 4, 0, 7); ctx.fillStyle = C.a; ctx.shadowColor = C.a; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = C.text; ctx.font = FONT(800, 11); ctx.fillText(b.toFixed(i === pts.length - 1 ? 3 : 2), X(i), Y(b) + (i ? -9 : 16));
    });
    ctx.textAlign = 'left'; ctx.fillStyle = C.dim; ctx.font = FONT(600, 9);
    ctx.fillText(W < 420 ? 'BRIER · 3 reported checkpoints' : 'BRIER · 3 reported checkpoints · per-match ledger not archived', padL, 10);
  }
  /* ---------------- KRABS: closing-line value ---------------- */
  function drawClv(){
    const cv = $('clv'), { ctx, W, H } = setup(cv), pts = D.krabs.clv_pts;
    const L = 12, R = W - 12, max = 4, X = p => L + (p / max) * (R - L), y = 34;
    ctx.font = FONT(700, 9); ctx.fillStyle = C.dim; ctx.textAlign = 'left'; ctx.fillText('MARKET MOVE AFTER A FLAG', L, 11);
    ctx.textAlign = 'right'; ctx.fillStyle = C.a; ctx.fillText('→ KRABS', R, 11);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, y + .5); ctx.lineTo(R, y + .5); ctx.stroke();
    ctx.fillStyle = C.dim; ctx.textAlign = 'center'; ctx.font = FONT(600, 8.5);
    for (let p = 0; p <= max; p++){ ctx.fillRect(Math.round(X(p)), y - 3, 1, 7); ctx.fillText(p + (p === max ? ' pts' : ''), X(p) - (p === max ? 8 : 0), H - 4); }
    const cur = pts * S.kr;
    ctx.fillStyle = hexA(C.a, .35); ctx.fillRect(X(0), y - 4, X(cur) - X(0), 8);
    ctx.fillStyle = C.a; ctx.beginPath(); ctx.moveTo(X(cur) + 6, y); ctx.lineTo(X(cur) - 2, y - 6); ctx.lineTo(X(cur) - 2, y + 6); ctx.fill();
    ctx.fillStyle = C.text; ctx.font = FONT(800, 10.5); ctx.textAlign = 'left';
    ctx.fillText('+' + cur.toFixed(2), Math.min(X(cur) + 9, R - 34), y - 7);
  }
  function setDir(t){
    const k = D.krabs;
    $('dirA').querySelector('.fill').style.setProperty('--p', (k.clv_dir_disagree_pct * t) + '%');
    $('dirB').querySelector('.fill').style.setProperty('--p', (k.corners_dir_pct * t) + '%');
  }
  function playKr(){
    stop.kr && stop.kr(); setDir(0);
    if (!reduce) setTimeout(() => setDir(1), 60);
    stop.kr = animate(2600, t => { S.kr = t; drawBrier(); drawClv(); }, () => setDir(1));
  }

  function hexA(hex, a){
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex;
    const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const redraw = () => { if (!D) return; drawEq(); drawFill(); drawBrier(); drawClv(); };

  fetch('assets/data.json').then(r => r.json()).then(d => {
    D = d; buildSeries();
    const w = D.warroom, k = D.krabs;
    // keep the visible text tied to the data file
    $('dirAv').textContent = k.clv_dir_disagree_pct + '%'; $('dirBv').textContent = k.corners_dir_pct + '%';
    $('dirA').innerHTML = KB.bar(0); $('dirB').innerHTML = KB.bar(0);
    const sum = { trades: w.trades.length, wins: w.trades.filter(t => t[2] > 0).length, losses: w.trades.filter(t => t[2] < 0).length };
    if (sum.trades !== w.trades_closed || sum.wins !== w.wins || sum.losses !== w.losses || Math.abs(S.ddPct - w.max_dd_pct) > .01)
      console.warn('quant: data check mismatch', sum, S.ddPct);
    new ResizeObserver(redraw).observe(document.querySelector('.q'));
    $('b-wr').addEventListener('click', () => { KB.beep(520, 40); playEq(); });
    $('b-fill').addEventListener('click', () => { KB.beep(520, 40); S.eqN = series.length - 1; S.eqDone = true; drawEq(); playFill(); });
    $('b-kr').addEventListener('click', () => { KB.beep(520, 40); playKr(); });
    playEq(); playKr();
  }).catch(() => {
    document.querySelector('.q').insertAdjacentHTML('afterbegin', '<p class="t-p" style="grid-column:1/-1">Data file could not be loaded.</p>');
  });
})();
