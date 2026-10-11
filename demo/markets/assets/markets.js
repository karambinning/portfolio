/* War Room + Krabs replica. Offline, paper data only. */
(function () {
  'use strict';
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var C = { bg: '#020408', grid: 'rgba(20,32,58,0.55)', text: '#7a8ea8', dim: '#4a5f7c', cyan: '#00c8dd', green: '#00bb55', red: '#e03a52', amber: '#d08a10', white: '#dde6f0' };
  var MONO = '10px "IBM Plex Mono", ui-monospace, Menlo, monospace';
  var D = null;

  function money(v, sign) { var s = (sign && v > 0 ? '+' : '') + (v < 0 ? '-' : '') + '$' + Math.abs(v).toFixed(2); return s; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hm(min) { var h = Math.floor(min / 60), m = Math.floor(min % 60); return 'T+' + h + 'h' + (m < 10 ? '0' : '') + m; }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function setupCanvas(c) {
    var dpr = window.devicePixelRatio || 1, r = c.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    var ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, W: r.width, H: r.height };
  }

  /* ───────────── tabs ───────────── */
  var activeTab = 'wr';
  function showTab(which) {
    activeTab = which;
    ['wr', 'kr'].forEach(function (k) {
      var on = k === which, t = $('tab-' + k), p = $('p-' + k);
      t.classList.toggle('on', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      p.classList.toggle('on', on); p.hidden = !on;
    });
    if (which === 'wr') { drawWR(); updateClock(); }
    else { drawK(); drawLedger(); updateClock(); if (!K.started && !RM) { K.started = true; kPlay(true); } }
  }
  $('tab-wr').onclick = function () { showTab('wr'); };
  $('tab-kr').onclick = function () { showTab('kr'); };
  document.querySelector('.tabs').addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var n = activeTab === 'wr' ? 'kr' : 'wr'; showTab(n); $('tab-' + n).focus(); }
  });
  Array.prototype.forEach.call(document.querySelectorAll('.seg'), function (seg) {
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('.sg'); if (!b) return;
      var side = seg.parentNode;
      Array.prototype.forEach.call(seg.children, function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
      Array.prototype.forEach.call(side.querySelectorAll('.sv'), function (v) { v.classList.toggle('on', v.id === 'v-' + b.dataset.v); });
      if (b.dataset.v === 'ledger') drawLedger();
    });
  });
  function updateClock() {
    $('clock').textContent = activeTab === 'wr' ? hm(WR.t) : ('MIN ' + K.m + "'");
  }

  /* ───────────── WAR ROOM ───────────── */
  var WR = { t: 0, playing: false, speedIx: 1, speeds: [10, 30, 90], shown: -1, adjShown: -1, raf: 0, last: 0 };
  var EXIT_NAME = { TP: 'take profit', PR: 'pre-resolution', EC: 'early cut', FE: 'held to expiry' };

  function wrInit() {
    var w = D.warroom;
    WR.trades = w.trades.map(function (r) { return { min: r[0], asset: r[1], dir: r[2], exit: r[3], size: r[4], pnl: r[5], ex: r[6], hold: r[7] }; });
    WR.eq = [{ min: 0, bal: w.start_balance }];
    var b = w.start_balance; WR.trades.forEach(function (t) { b += t.pnl; WR.eq.push({ min: t.min, bal: b }); t.bal = b; });
    WR.end = Math.ceil(Math.max(w.duration_min, WR.trades[WR.trades.length - 1].min) * 10) / 10;
    var vals = WR.eq.map(function (p) { return p.bal; });
    WR.lo = Math.min.apply(null, vals) - 1.5; WR.hi = Math.max.apply(null, vals) + 1.5;
    $('wr-scrub').max = WR.end;
    $('wr-speed').textContent = WR.speeds[WR.speedIx] + 'm/s';
    $('m-run').textContent = w.run + ' · ' + w.start_utc.slice(0, 10);
    renderBots(); renderJury(); renderParams(); fillUpdate();
    wrSet(RM ? WR.end : 0);
  }

  function countAt(t) { var lo = 0, hi = WR.trades.length; while (lo < hi) { var mid = (lo + hi) >> 1; if (WR.trades[mid].min <= t) lo = mid + 1; else hi = mid; } return lo; }

  function wrSet(t) {
    WR.t = Math.max(0, Math.min(WR.end, t));
    $('wr-scrub').value = WR.t; $('wr-time').textContent = hm(WR.t);
    var n = countAt(WR.t), tr = WR.trades.slice(0, n);
    var bal = n ? tr[n - 1].bal : D.warroom.start_balance, pnl = bal - D.warroom.start_balance;
    var w = 0, l = 0, sw = 0, sl = 0, peak = D.warroom.start_balance, dd = 0, b = D.warroom.start_balance;
    tr.forEach(function (x) { if (x.pnl > 0) { w++; sw += x.pnl; } else if (x.pnl < 0) { l++; sl += x.pnl; } b = x.bal; if (b > peak) peak = b; dd = Math.max(dd, (peak - b) / peak); });
    $('m-bal').textContent = '$' + bal.toFixed(2);
    var mp = $('m-pnl'); mp.textContent = money(pnl, true); mp.style.color = pnl >= 0 ? C.green : C.red;
    $('m-wr').textContent = n ? (w / n * 100).toFixed(1) + '%' : '--';
    $('m-trades').textContent = n;
    $('m-avgw').textContent = w ? '$' + (sw / w).toFixed(2) : '--';
    $('m-avgl').textContent = l ? '-$' + Math.abs(sl / l).toFixed(2) : '--';
    $('m-sl').textContent = '0';
    var pb = $('perf-badge'); pb.textContent = money(pnl, true) + (n ? ' (' + (pnl / D.warroom.start_balance * 100 >= 0 ? '+' : '') + (pnl / D.warroom.start_balance * 100).toFixed(1) + '%)' : '');
    pb.className = 'badge big ' + (pnl >= 0 ? 'b-green' : 'b-red');
    $('perf-wr').textContent = 'Win Rate: ' + (n ? (w / n * 100).toFixed(1) + '%' : '--') + ' (' + w + 'W/' + l + 'L)';
    $('perf-trades').textContent = 'Trades: ' + n + '/' + WR.trades.length;
    $('perf-cycles').textContent = 'Cycles: ' + Math.round(D.warroom.strategy_cycles * WR.t / WR.end).toLocaleString('en-GB');
    $('perf-dd').textContent = 'Max DD: ' + (dd * 100).toFixed(1) + '%';
    renderTape(n); renderAdj(); drawWR(); updateClock();
  }

  function renderTape(n) {
    if (n === WR.shown) return;
    var grew = n > WR.shown && WR.shown >= 0 && n - WR.shown < 6;
    var prev = WR.shown; WR.shown = n;
    $('hist-ct').textContent = n;
    var list = $('hist-list');
    if (!n) { list.innerHTML = '<div class="empty">Press play to replay the run.</div>'; return; }
    var html = '', from = Math.max(0, n - 60);
    for (var i = n - 1; i >= from; i--) {
      var t = WR.trades[i], cls = t.pnl > 0 ? 'pos' : t.pnl < 0 ? 'neg' : 'flat';
      var hs = t.hold >= 60 ? Math.floor(t.hold / 60) + 'm' + (t.hold % 60) + 's' : t.hold + 's';
      html += '<div class="tr' + (grew && i >= prev && !RM ? ' new' : '') + '"><div class="tr-a"><span class="tr-n">' + esc(t.asset) + ' 5m ' + (t.dir === 'YES' ? 'UP' : 'DOWN') + '</span>' +
        '<span class="tr-p ' + cls + '">' + money(t.pnl, true) + '</span></div>' +
        '<div class="tr-b"><span>BUY ' + esc(t.dir) + ' $' + t.size.toFixed(2) + ' @0.520 → ' + (t.exit == null ? '--' : t.exit.toFixed(3)) + '</span>' +
        '<span><span class="tag ' + t.ex + '" title="' + EXIT_NAME[t.ex] + '">' + t.ex + '</span> ' + hs + '</span></div></div>';
    }
    list.innerHTML = html;
  }

  function renderAdj() {
    var a = D.warroom.adjustments, n = 0; while (n < a.length && a[n][0] <= WR.t) n++;
    if (n === WR.adjShown) return; WR.adjShown = n;
    var total = Math.round(D.warroom.self_adjustments * WR.t / WR.end);
    $('adj-ct').textContent = total;
    if (!n) { $('adj-list').innerHTML = '<div class="empty">No adjustments yet.</div>'; return; }
    var h = ''; for (var i = n - 1; i >= Math.max(0, n - 8); i--) h += '<div class="al"><i>' + hm(a[i][0]) + '</i>' + esc(a[i][1]) + '</div>';
    $('adj-list').innerHTML = h;
  }

  function drawWR() {
    if (activeTab !== 'wr' || !WR.eq) return;
    var cv = $('pnl-canvas'), s = setupCanvas(cv), ctx = s.ctx, W = s.W, H = s.H;
    ctx.clearRect(0, 0, W, H);
    var padL = 38, padR = 8, padT = 8, padB = 16, pw = W - padL - padR, ph = H - padT - padB;
    var X = function (m) { return padL + m / WR.end * pw; }, Y = function (v) { return padT + (WR.hi - v) / (WR.hi - WR.lo) * ph; };
    ctx.font = MONO; ctx.lineWidth = 0.5; ctx.strokeStyle = C.grid; ctx.fillStyle = C.dim; ctx.textAlign = 'right';
    var step = (WR.hi - WR.lo) > 40 ? 10 : 5;
    for (var v = Math.ceil(WR.lo / step) * step; v <= WR.hi; v += step) { var y = Y(v); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.fillText('$' + v, padL - 4, y + 3); }
    ctx.textAlign = 'center';
    for (var hh = 0; hh * 60 <= WR.end; hh += 2) { ctx.fillText(hh + 'h', X(hh * 60), H - 3); }
    // start line
    var sb = D.warroom.start_balance, zy = Y(sb);
    ctx.strokeStyle = 'rgba(122,142,168,0.35)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(padL, zy); ctx.lineTo(W - padR, zy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.dim; ctx.textAlign = 'right'; ctx.fillText('START $' + sb, W - padR - 2, zy - 4);
    var n = countAt(WR.t), pts = WR.eq.slice(0, n + 1);
    var lastBal = pts[pts.length - 1].bal, up = lastBal >= sb, col = up ? C.green : C.red;
    // line (step-hold to current time)
    ctx.beginPath();
    pts.forEach(function (p, i) { var x = X(p.min), y = Y(p.bal); if (!i) ctx.moveTo(x, y); else { ctx.lineTo(x, Y(pts[i - 1].bal)); ctx.lineTo(x, y); } });
    var lx = X(WR.t), ly = Y(lastBal); ctx.lineTo(lx, ly);
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.lineTo(lx, padT + ph); ctx.lineTo(X(0), padT + ph); ctx.closePath();
    var g = ctx.createLinearGradient(0, padT, 0, padT + ph);
    g.addColorStop(0, up ? 'rgba(0,187,85,0.20)' : 'rgba(224,58,82,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fill();
    // trade ticks along the bottom
    for (var i = 0; i < n; i++) { var t = WR.trades[i]; ctx.fillStyle = t.pnl > 0 ? 'rgba(0,187,85,0.7)' : t.pnl < 0 ? 'rgba(224,58,82,0.75)' : C.dim; ctx.fillRect(X(t.min) - 0.5, padT + ph - (t.pnl > 0 ? 6 : 10), 1, 4); }
    // recent trade dots
    for (i = Math.max(0, n - 3); i < n; i++) { t = WR.trades[i]; ctx.beginPath(); ctx.arc(X(t.min), Y(t.bal), 2.5, 0, 6.283); ctx.fillStyle = t.pnl >= 0 ? C.green : C.red; ctx.fill(); }
    // head
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 6.283); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = C.white; ctx.textAlign = lx > W - 70 ? 'right' : 'left'; ctx.fillText('$' + lastBal.toFixed(2), lx + (lx > W - 70 ? -8 : 8), ly - 6);
  }

  function wrTick(ts) {
    if (!WR.playing) return;
    var dt = WR.last ? Math.min(0.1, (ts - WR.last) / 1000) : 0; WR.last = ts;
    var nt = WR.t + dt * WR.speeds[WR.speedIx];
    if (nt >= WR.end) { wrSet(WR.end); wrStop(); return; }
    wrSet(nt); WR.raf = requestAnimationFrame(wrTick);
  }
  function wrPlay() {
    if (RM) { wrSet(WR.t >= WR.end ? 0 : WR.end); return; }
    if (WR.t >= WR.end) wrSet(0);
    WR.playing = true; WR.last = 0; $('wr-play').innerHTML = '&#10074;&#10074; PAUSE'; $('wr-play').setAttribute('aria-label', 'Pause replay');
    WR.raf = requestAnimationFrame(wrTick);
  }
  function wrStop() { WR.playing = false; cancelAnimationFrame(WR.raf); $('wr-play').innerHTML = WR.t >= WR.end ? '&#8635; REPLAY' : '&#9654; PLAY'; $('wr-play').setAttribute('aria-label', 'Play replay'); }
  $('wr-play').onclick = function () { WR.playing ? wrStop() : wrPlay(); };
  $('wr-speed').onclick = function () { WR.speedIx = (WR.speedIx + 1) % WR.speeds.length; this.textContent = WR.speeds[WR.speedIx] + 'm/s'; };
  $('wr-scrub').addEventListener('input', function () { wrStop(); wrSet(+this.value); });

  /* ── fill check: port of PolymarketAPI.simulate_orderbook_fill() ── */
  function bookAt(T) {
    var r = rng(Math.floor(T / 5) * 7919 + 13), mid = 0.50 + 0.0013 * T;
    var asks = [{ p: 0.98, s: Math.round(1400 + r() * 900) }, { p: 0.99, s: Math.round(2800 + r() * 1600) }];
    var bids = [{ p: 0.02, s: Math.round(900 + r() * 600) }, { p: 0.01, s: Math.round(2400 + r() * 1500) }];
    var nMid = T < 123 ? Math.round((1 - T / 200) * 5 + r() * 1.5) : (T < 200 ? (r() < 0.4 ? 1 : 0) : 0);
    var p = Math.round((mid + 0.02 + r() * 0.035) * 100) / 100;
    for (var i = 0; i < nMid && p < 0.9; i++) { asks.push({ p: p, s: Math.round(4 + r() * 22 + i * 9) }); p = Math.round((p + 0.01 + r() * 0.03) * 100) / 100; }
    if (T >= 100) { var q = 0.90; while (q < 0.975) { if (r() < 0.6) asks.push({ p: Math.round(q * 100) / 100, s: Math.round(30 + r() * 160) }); q += 0.02 + r() * 0.02; } }
    var nb = T < 200 ? Math.round((1 - T / 200) * 4 + r()) : 0, bp = Math.round((mid - 0.03 - r() * 0.03) * 100) / 100;
    for (i = 0; i < nb && bp > 0.05; i++) { bids.push({ p: bp, s: Math.round(5 + r() * 25) }); bp = Math.round((bp - 0.01 - r() * 0.03) * 100) / 100; }
    var merge = function (arr) { var m = {}; arr.forEach(function (l) { var k = l.p.toFixed(2); m[k] = (m[k] || 0) + l.s; }); return Object.keys(m).map(function (k) { return { p: +k, s: m[k] }; }); };
    asks = merge(asks).sort(function (a, b) { return a.p - b.p; }); bids = merge(bids).sort(function (a, b) { return b.p - a.p; });
    return { asks: asks, bids: bids, mid: mid };
  }
  function simulateFill(book, desiredPrice, desiredUsd) {
    var levels = book.asks.slice().sort(function (a, b) { return a.p - b.p; });
    var filledShares = 0, filledCost = 0, consumed = 0, remaining = desiredUsd, take = [];
    for (var i = 0; i < levels.length; i++) {
      var p = levels[i].p, s = levels[i].s;
      if (p > desiredPrice) break;                      // too expensive
      var cost = p * s;
      if (cost <= remaining) { filledShares += s; filledCost += cost; remaining -= cost; take.push(s); }
      else { var aff = remaining / p; filledShares += aff; filledCost += remaining; remaining = 0; take.push(aff); }
      consumed++;
      if (remaining <= 0.001) break;
    }
    if (filledShares <= 0) return { fillable: false, levels: 0, take: [] };
    return { fillable: true, shares: filledShares, usd: filledCost, avg: filledCost / filledShares, pct: filledCost / desiredUsd, levels: consumed, take: take };
  }
  function fillUpdate() {
    var T = +$('f-t').value, P = +$('f-p').value, A = +$('f-a').value;
    $('f-t-o').textContent = T + 's'; $('f-p-o').textContent = '$' + P.toFixed(2); $('f-a-o').textContent = '$' + A;
    var bk = bookAt(T), res = simulateFill(bk, P, A);
    var maxLog = Math.log(1 + Math.max.apply(null, bk.asks.concat(bk.bids).map(function (l) { return l.s; })));
    var h = '', limDone = false, asksDesc = bk.asks.slice().reverse();
    asksDesc.forEach(function (l) {
      var idx = bk.asks.indexOf(l), took = res.take[idx] || 0;
      if (!limDone && l.p <= P) { h += '<div class="lv lim"><div class="lim-line">LIMIT $' + P.toFixed(2) + ' — asks at or below fill</div></div>'; limDone = true; }
      var w = Math.log(1 + l.s) / maxLog * 100, tw = took ? Math.max(4, took / l.s * 100) : 0;
      h += '<div class="lv ask' + (took ? ' hit' : '') + '"><span class="px">' + l.p.toFixed(2) + '</span><span class="bar" style="width:' + w.toFixed(1) + '%">' + (tw ? '<i style="width:' + tw.toFixed(1) + '%"></i>' : '') + '</span><span class="sz">' + l.s.toLocaleString('en-GB') + '</span></div>';
    });
    if (!limDone) h += '<div class="lv lim"><div class="lim-line">LIMIT $' + P.toFixed(2) + ' — below best ask</div></div>';
    h += '<div class="lv sprd"><div class="sprd-line">MID ' + bk.mid.toFixed(3) + ' · SPREAD ' + (bk.asks[0].p - bk.bids[0].p).toFixed(2) + '</div></div>';
    bk.bids.forEach(function (l) { var w = Math.log(1 + l.s) / maxLog * 100; h += '<div class="lv bid"><span class="px">' + l.p.toFixed(2) + '</span><span class="bar" style="width:' + w.toFixed(1) + '%"></span><span class="sz">' + l.s.toLocaleString('en-GB') + '</span></div>'; });
    $('f-ladder').innerHTML = h;
    $('f-old').textContent = 'FILLED 100%'; $('f-old').style.color = C.amber;
    $('f-old-s').textContent = '$' + A.toFixed(2) + ' @ ' + P.toFixed(3) + ' · book never read';
    var fn = $('f-new');
    if (!res.fillable) { fn.textContent = 'SKIP(NO_BOOK_FILL)'; fn.style.color = C.red; $('f-new-s').textContent = 'best ask ' + bk.asks[0].p.toFixed(2) + ' > limit · trade rejected'; }
    else {
      var full = res.pct >= 0.999; fn.textContent = (full ? 'FILLED ' : 'PARTIAL ') + Math.round(res.pct * 100) + '%'; fn.style.color = full ? C.green : C.amber;
      $('f-new-s').textContent = '$' + res.usd.toFixed(2) + ' @ avg ' + res.avg.toFixed(3) + ' · ' + res.levels + ' level' + (res.levels > 1 ? 's' : '');
    }
  }
  ['f-t', 'f-p', 'f-a'].forEach(function (id) { $(id).addEventListener('input', fillUpdate); });

  /* ── bots ── */
  var BOTS = [
    { n: 'V91 · VERDICT', b: 'b-cyan', tag: 'PORT 8001', li: ['90s wait phase, then a 5-asset jury vote', '4–5 agree: unanimous, 12% size · 3 agree: majority, 8%', 'under 3: hung jury, the window is skipped', 'direction comes from the consensus, not the asset', 'pre-resolution cut instead of riding to −100%', 'after V24n: dynamic entry from best ask, $0.30–0.60'] },
    { n: 'LOCAL · CONSERVATIVE', b: 'b-amber', tag: 'PORT 8000', li: ['hold-to-resolution, Paper50 style', 'entry floor raised $0.40 → $0.50', 'pre-resolution cut: −10% with under 60s left', '2 straight losses → skip one 300s window', 'honest paper engine only, no strategy changes'] },
    { n: 'VPS · HF SPEED', b: 'b-green', tag: 'REMOTE', li: ['quickfire entries, window cap 5', 'TP 6% after 10s · secure TP 5% after 30s · late TP 3% after 240s', 'stop-loss removed: 54 SL trades, 0% WR, −$32.13', 'contrarian floor $0.35 (below it: 0% WR, all instances)', 'forced exits removed: hold +$48.27 vs forced −$23.22'] }
  ];
  function renderBots() {
    $('bots').innerHTML = BOTS.map(function (b) {
      return '<div class="bot"><div class="bot-h"><span class="bot-n">' + b.n + '</span><span class="badge ' + b.b + '">' + b.tag + ' · PAPER</span></div><ul>' + b.li.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }
  var JURY = [['BTC', 'UP'], ['ETH', 'UP'], ['SOL', 'UP'], ['DOGE', 'DOWN'], ['XRP', 'FLAT']], CYC = { UP: 'DOWN', DOWN: 'FLAT', FLAT: 'UP' };
  function renderJury() {
    $('jury').innerHTML = JURY.map(function (j, i) { return '<button class="juror ' + j[1] + '" data-i="' + i + '" aria-label="' + j[0] + ' votes ' + j[1] + '"><b>' + j[0] + '</b><span>' + (j[1] === 'UP' ? '▲ UP' : j[1] === 'DOWN' ? '▼ DOWN' : '· FLAT') + '</span></button>'; }).join('');
    var up = JURY.filter(function (j) { return j[1] === 'UP'; }).length, dn = JURY.filter(function (j) { return j[1] === 'DOWN'; }).length;
    var k = Math.max(up, dn), dir = up >= dn ? 'UP' : 'DOWN', b = $('jury-b'), out;
    if (k >= 4) { b.textContent = 'UNANIMOUS'; b.className = 'badge b-green'; out = k + '/5 say ' + dir + ' → buy ' + (dir === 'UP' ? 'YES' : 'NO') + ' on the target asset · size 12% of $50 = $6.00'; }
    else if (k === 3) { b.textContent = 'MAJORITY'; b.className = 'badge b-cyan'; out = '3/5 say ' + dir + ' → buy ' + (dir === 'UP' ? 'YES' : 'NO') + ' with reduced size · 8% of $50 = $4.00'; }
    else { b.textContent = 'HUNG JURY'; b.className = 'badge b-red'; out = 'no 3-asset agreement → skip this window entirely'; }
    $('jury-out').textContent = out + '. Tap an asset to change its vote.';
  }
  $('jury').addEventListener('click', function (e) { var j = e.target.closest('.juror'); if (!j) return; var i = +j.dataset.i; JURY[i][1] = CYC[JURY[i][1]]; renderJury(); var nb = $('jury').children[i]; if (nb) nb.focus(); });
  function renderParams() {
    var p = D.warroom.params_final, r = function (v) { return Math.round(v * 1000) / 1000; };
    var rows = [['conf threshold', r(p.confidence_threshold)], ['min confluence', p.min_confluence], ['kelly fraction', r(p.kelly_fraction)], ['max size', Math.round(p.max_size_pct * 100) + '%'], ['min size', Math.round(p.min_size_pct * 100) + '%'], ['max open', p.max_open_positions], ['max loss streak', p.max_consecutive_losses], ['LR window timer', r(p.lr_window_timer)], ['LR oracle', r(p.lr_oracle)], ['LR lead-lag', r(p.lr_lead_lag)], ['LR mean reversion', r(p.lr_mean_reversion)], ['LR momentum', r(p.lr_momentum)], ['LR streak', r(p.lr_streak)], ['LR market price', r(p.lr_market_price)], ['self-adjustments', D.warroom.self_adjustments], ['strategy cycles', D.warroom.strategy_cycles.toLocaleString('en-GB')]];
    $('params').innerHTML = rows.map(function (x) { return '<div class="kv"><span>' + x[0] + '</span><span>' + x[1] + '</span></div>'; }).join('');
  }

  /* ───────────── KRABS ───────────── */
  // Model + trader rules ported from krabs_trader.py. Match is a scripted demo.
  var K = { m: 0, playing: false, timer: 0, started: false, sel: null };
  var HOME = 'Home', AWAY = 'Away';
  var SCRIPT = {
    goals: [[23, 'h'], [61, 'a'], [78, 'h']],
    totalShots: { h: [[0, 0], [12, 3], [23, 5], [45, 9], [60, 12], [78, 16], [90, 18]], a: [[0, 0], [30, 3], [45, 4], [61, 7], [90, 10]] },
    shotsOnTarget: { h: [[0, 0], [12, 1], [23, 2], [45, 4], [60, 5], [78, 7], [90, 8]], a: [[0, 0], [40, 1], [61, 3], [90, 4]] },
    wonCorners: { h: [[0, 0], [18, 2], [45, 4], [70, 6], [90, 7]], a: [[0, 0], [35, 1], [45, 2], [90, 4]] }
  };
  function interp(kf, m) { for (var i = 1; i < kf.length; i++) if (m <= kf[i][0]) { var a = kf[i - 1], b = kf[i]; return Math.floor(a[1] + (b[1] - a[1]) * (m - a[0]) / (b[0] - a[0])); } return kf[kf.length - 1][1]; }
  function matchState(m, statsMin) {
    var sm = statsMin == null ? m : statsMin, h = 0, a = 0;
    SCRIPT.goals.forEach(function (g) { if (g[0] <= m) { if (g[1] === 'h') h++; else a++; } });
    var sg = function (stat, team) {
      var side = team === HOME ? 'h' : 'a';
      if (stat === 'possessionPct') return sm < 1 ? 0 : (side === 'h' ? 1 : -1) * Math.round(3 * Math.sin(sm / 9)) + (side === 'h' ? 58 : 42);
      if (stat === 'redCards') return 0;
      return interp(SCRIPT[stat][side], sm);
    };
    return { h: h, a: a, sg: sg, corners: sg('wonCorners', HOME) + sg('wonCorners', AWAY) };
  }
  function pois(k, lam) { var f = 1; for (var i = 2; i <= k; i++) f *= i; return Math.exp(-lam) * Math.pow(lam, k) / f; }
  function liveLambda(h, a, minute, sg, cfg) {
    var LH = cfg.lambda_h, LA = cfg.lambda_a;
    var f = Math.max(0, (90 - Math.max(0, minute)) / 90), bh = LH * f, ba = LA * f, info = { mult_h: 1, mult_a: 1, xg_h: 0, xg_a: 0 };
    if (minute < 8) return [bh, ba, info];
    var xg = function (t) { return 0.09 * sg('totalShots', t) + 0.16 * sg('shotsOnTarget', t) + 0.035 * sg('wonCorners', t); };
    var xh = xg(HOME), xa = xg(AWAY), eh = LH * (minute / 90), ea = LA * (minute / 90), sm = 0.35;
    var mh = Math.min(1.9, Math.max(0.5, (xh + sm) / (eh + sm))), ma = Math.min(1.9, Math.max(0.5, (xa + sm) / (ea + sm)));
    var pos = sg('possessionPct', HOME);
    if (pos) { var tilt = (pos - 50) / 50 * 0.15; mh *= (1 + tilt); ma *= (1 - tilt); }
    var sh = sg('totalShots', HOME), sa = sg('totalShots', AWAY);
    if (minute >= 25) { if (pos >= 58 && sh >= 6 && (h - a) <= 0) mh = Math.max(mh, 1.05); if (pos && (100 - pos) >= 58 && sa >= 6 && (a - h) <= 0) ma = Math.max(ma, 1.05); }
    return [bh * mh, ba * ma, { mult_h: mh, mult_a: ma, xg_h: xh, xg_a: xa }];
  }
  function model(ms, minute, cfg, priorOnly) {
    var h = ms.h, a = ms.a, L = priorOnly ? (function () { var f = Math.max(0, (90 - minute) / 90); return [cfg.lambda_h * f, cfg.lambda_a * f, {}]; })() : liveLambda(h, a, minute, ms.sg, cfg);
    var lh = L[0], la = L[1], ph = [], pa = [], i, j;
    for (i = 0; i < 9; i++) { ph.push(pois(i, lh)); pa.push(pois(i, la)); }
    var P = { H: 0, D: 0, A: 0 }, tot = {}, sp = {};
    for (i = 0; i < 9; i++) for (j = 0; j < 9; j++) {
      var p = ph[i] * pa[j], fh = h + i, fa = a + j;
      if (fh > fa) P.H += p; else if (fh === fa) P.D += p; else P.A += p;
      tot[fh + fa] = (tot[fh + fa] || 0) + p; sp[fh - fa] = (sp[fh - fa] || 0) + p;
    }
    var phs = h >= 1 ? 1 : 1 - pois(0, lh), pas = a >= 1 ? 1 : 1 - pois(0, la);
    var over = function (x) { var s = 0; for (var t in tot) if (+t >= x + 1) s += tot[t]; return s; };
    var mge = function (d) { var s = 0; for (var k in sp) if (+k >= d) s += sp[k]; return s; };
    var F = {};
    F['Match Winner|' + HOME] = P.H * 100; F['Match Winner|Draw'] = P.D * 100; F['Match Winner|' + AWAY] = P.A * 100;
    F['BTTS|Yes'] = phs * pas * 100; F['BTTS|No'] = (1 - phs * pas) * 100;
    F[HOME + ' -1.5|' + HOME] = mge(2) * 100; F[HOME + ' -1.5|' + AWAY] = (1 - mge(2)) * 100;
    F[HOME + ' -2.5|' + HOME] = mge(3) * 100; F[HOME + ' -2.5|' + AWAY] = (1 - mge(3)) * 100;
    [0, 1, 2, 3, 4, 5].forEach(function (x) { F['O/U ' + x + '.5|Over'] = over(x) * 100; F['O/U ' + x + '.5|Under'] = (1 - over(x)) * 100; });
    var cur = ms.corners, expTot = (!priorOnly && minute >= 10) ? 0.6 * cfg.prior_corners + 0.4 * (cur / minute * 90) : cfg.prior_corners;
    var rem = Math.max(0.3, expTot - cur);
    [6.5, 8.5, 9.5, 10.5, 11.5, 12.5].forEach(function (line) { var po = 0; for (var k = 0; k < 40; k++) if (cur + k > line) po += pois(k, rem); F['Corners ' + line + '|Over'] = po * 100; F['Corners ' + line + '|Under'] = (1 - po) * 100; });
    for (var key in F) F[key] = Math.round(F[key] * 10) / 10;
    return { fair: F, lh: lh, la: la, info: L[2] };
  }
  function corrGroup(mkey, side) {
    if (mkey === 'Match Winner') return side === HOME ? 'FAV' : side === AWAY ? 'DOG' : 'DRAW';
    if (mkey.indexOf(HOME + ' -') === 0) return 'FAV';
    if (mkey.indexOf('O/U') === 0) return side === 'Over' ? 'GOALS_OVER' : 'GOALS_UNDER';
    if (mkey === 'BTTS') return side === 'Yes' ? 'GOALS_OVER' : 'GOALS_UNDER';
    if (mkey.indexOf('Corners') === 0) return side === 'Over' ? 'CORN_OVER' : 'CORN_UNDER';
    return 'OTHER';
  }
  function resolveBet(mkey, side, h, a, corners) {
    var tot = h + a, mar = h - a;
    if (mkey === 'Match Winner') return side === (h > a ? HOME : h === a ? 'Draw' : AWAY);
    if (mkey.indexOf('O/U ') === 0) return (side === 'Over') === (tot > parseFloat(mkey.split(' ')[1]));
    if (mkey === 'BTTS') return (side === 'Yes') === (h >= 1 && a >= 1);
    if (mkey === HOME + ' -1.5') return (side === HOME) === (mar >= 2);
    if (mkey === HOME + ' -2.5') return (side === HOME) === (mar >= 3);
    if (mkey.indexOf('Corners ') === 0) return (side === 'Over') === (corners > parseFloat(mkey.split(' ')[1]));
    return false;
  }

  function kSimulate() {
    var cfg = Object.assign({}, D.krabs.config, { lambda_h: D.krabs.priors.lambda_h, lambda_a: D.krabs.priors.lambda_a });
    var frames = [], positions = [], realized = 0, nextId = 1, buys = [], sells = [], acts = [];
    for (var m = 0; m <= 90; m++) {
      var ms = matchState(m), mod = model(ms, m, cfg, false);
      // simulated market: prior-only repricing (goals land instantly) blended with the live model on stale stats (6-minute lag)
      var lagMs = matchState(m, Math.max(0, m - 6)), lag = model(lagMs, m, cfg, false).fair, pri = model(ms, m, cfg, true).fair;
      var rows = [], lut = {};
      Object.keys(mod.fair).forEach(function (key) {
        var parts = key.split('|'), mkey = parts[0], side = parts[1];
        var r = rng(hash(key + '@' + m)), noise = (r() - 0.5) * 2.4;
        var mid = Math.min(99, Math.max(1, 0.55 * pri[key] + 0.45 * lag[key] + noise));
        var spr = (mkey.indexOf('Corners') === 0 || mkey.indexOf(' -') > 0) ? 3 : 2;
        var ask = Math.min(99.5, Math.round((mid + spr / 2) * 10) / 10), bid = Math.max(0.5, Math.round((mid - spr / 2) * 10) / 10);
        var row = { key: key, mkey: mkey, side: side, fair: mod.fair[key], ask: ask, bid: bid, mid: Math.round(mid * 10) / 10, edge: Math.round((mod.fair[key] - ask) * 10) / 10 };
        rows.push(row); lut[key] = row;
      });
      rows.sort(function (a, b) { return b.edge - a.edge; });
      var actions = [], finished = m >= 90, read;
      if (finished) {
        positions.forEach(function (p) { var win = resolveBet(p.mkey, p.side, ms.h, ms.a, ms.corners); var pnl = win ? p.stake * (100 - p.entry) / p.entry : -p.stake; realized += pnl; actions.push({ t: 'SETTLE', key: p.key, txt: 'SETTLE ' + p.mkey + '/' + p.side + ' -> ' + (win ? 'win' : 'lose') + ' (pnl ' + pnl.toFixed(2) + ')', pnl: pnl }); });
        positions = []; read = 'Full time ' + ms.h + '-' + ms.a + '. Book closed — tally\'s in.';
      } else if (m >= 1) {
        var rout = Math.abs(ms.h - ms.a) >= 2, still = [];
        positions.forEach(function (p) {
          var r = lut[p.key]; if (!r) { still.push(p); return; }
          var sell = r.bid, fnow = r.fair, mid = r.mid, unreal = p.stake * (sell - p.entry) / p.entry, edgeNow = fnow - mid;
          var tp = rout ? (mid >= fnow + 3) : (mid >= fnow - cfg.tp_gap), why = null;
          if (m >= 80 && sell >= 82) why = 'late bank'; else if (tp) why = rout ? 'take profit (let it run, rout)' : 'take profit (market caught fair)'; else if (edgeNow <= -cfg.cut_gap) why = 'cut loss (read broke)';
          if (!why) { p.q = sell; p.unreal = unreal; still.push(p); return; }
          realized += unreal; sells.push({ m: m, key: p.key, px: sell });
          actions.push({ t: 'SELL', key: p.key, txt: 'SELL ' + p.mkey + '/' + p.side + ' @ ' + sell.toFixed(1) + '% (bid) — ' + why + ' (pnl ' + unreal.toFixed(2) + ')', pnl: unreal });
        });
        positions = still;
        var held = {}, staked = 0, gs = {}, gc = {};
        positions.forEach(function (p) { held[p.key] = 1; staked += p.stake; var g = corrGroup(p.mkey, p.side); gs[g] = (gs[g] || 0) + p.stake; gc[g] = (gc[g] || 0) + 1; });
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          if (positions.length >= cfg.max_open || staked + cfg.min_stake > cfg.bankroll) break;
          var thr = r.mkey.indexOf('Corners') === 0 ? cfg.corner_thresh : cfg.edge_thresh;
          if (!(thr <= r.edge && r.edge <= cfg.max_edge_open) || held[r.key] || !(cfg.min_entry <= r.ask && r.ask <= 92)) continue;
          var g = corrGroup(r.mkey, r.side);
          if ((gc[g] || 0) >= cfg.group_pos_cap || (gs[g] || 0) >= cfg.group_stake_cap) continue;
          var pp = r.fair / 100, pf = r.ask / 100, s = 0;
          if (pf > 0 && pf < 1 && pp > pf) { s = Math.round(cfg.bankroll * ((pp - pf) / (1 - pf)) * cfg.kelly_frac * 100) / 100; s = s < cfg.min_stake ? 0 : Math.min(cfg.max_stake, s); }
          if (s <= 0 || staked + s > cfg.bankroll || (gs[g] || 0) + s > cfg.group_stake_cap) continue;
          positions.push({ id: nextId++, key: r.key, mkey: r.mkey, side: r.side, stake: s, entry: r.ask, fair: r.fair, min: m, q: r.bid, unreal: s * (r.bid - r.ask) / r.ask });
          held[r.key] = 1; staked += s; gs[g] = (gs[g] || 0) + s; gc[g] = (gc[g] || 0) + 1;
          buys.push({ m: m, key: r.key, px: r.ask, mid: r.mid });
          actions.push({ t: 'BUY', key: r.key, txt: 'BUY ' + r.mkey + '/' + r.side + ' @ ' + r.ask.toFixed(1) + '% ask (fair ' + r.fair.toFixed(1) + '%, $' + s.toFixed(2) + ', edge +' + r.edge.toFixed(1) + ')' });
        }
        var top = rows[0];
        read = actions.length ? actions.map(function (a) { return a.txt.split(' (')[0]; }).slice(0, 2).join(' · ')
          : 'Holding ' + positions.length + '. λ ' + mod.lh.toFixed(2) + '/' + mod.la.toFixed(2) + ' live. Best buy ' + top.mkey + '/' + top.side + ' edge ' + (top.edge >= 0 ? '+' : '') + top.edge.toFixed(1) + ' vs ask ' + top.ask.toFixed(1) + '%.';
      } else { read = 'Book\'s open. Real-fill rules — buy the ask, sell the bid, $1 min. Won\'t overpay.'; }
      actions.forEach(function (a) { acts.push({ m: m, a: a }); });
      var unreal = positions.reduce(function (s, p) { return s + (p.unreal || 0); }, 0);
      frames.push({ m: m, ms: { h: ms.h, a: ms.a, corners: ms.corners }, lh: mod.lh, la: mod.la, info: mod.info, rows: rows, lut: lut, actions: actions, positions: positions.map(function (p) { return Object.assign({}, p); }), realized: realized, unreal: unreal, read: read });
    }
    K.frames = frames; K.buys = buys; K.sells = sells; K.acts = acts;
    // demo-only evaluation
    var fin = frames[90].ms, tracked = ['Match Winner|' + HOME, 'Match Winner|Draw', 'Match Winner|' + AWAY, 'O/U 2.5|Over', 'BTTS|Yes'];
    var bm = 0, bk = 0, n = 0;
    tracked.forEach(function (key) {
      var p = key.split('|'), o = resolveBet(p[0], p[1], fin.h, fin.a, fin.corners) ? 1 : 0;
      for (var m = 0; m < 90; m++) { var r = frames[m].lut[key]; bm += Math.pow(r.fair / 100 - o, 2); bk += Math.pow(r.mid / 100 - o, 2); n++; }
    });
    var clv = buys.filter(function (b) { return b.m + 10 < 90; }).map(function (b) { return frames[b.m + 10].lut[b.key].mid - b.mid; });
    K.eval = { brierModel: bm / n, brierMkt: bk / n, clvAvg: clv.length ? clv.reduce(function (s, x) { return s + x; }, 0) / clv.length : 0, clvN: clv.length, clvPos: clv.filter(function (x) { return x > 0; }).length };
    // market chips: the four headline markets + the most-bought one
    var cnt = {}; buys.forEach(function (b) { cnt[b.key] = (cnt[b.key] || 0) + 1; });
    var chips = [['Match Winner|' + HOME, 'HOME WIN'], ['O/U 2.5|Over', 'O 2.5'], ['BTTS|Yes', 'BTTS'], ['Match Winner|Draw', 'DRAW']];
    var ranked = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; });
    var most = ranked[0], goalMost = ranked.filter(function (k) { return k.indexOf('Corners') !== 0; })[0];
    var label = function (k) { return k.replace('|', ' ').replace('Corners ', 'CRN ').replace('Match Winner ', '').replace('O/U ', 'O/U ').toUpperCase(); };
    [goalMost, most].forEach(function (k) { if (k && !chips.some(function (c) { return c[0] === k; })) chips.push([k, label(k)]); });
    K.chips = chips;
    K.sel = goalMost || 'O/U 2.5|Over';
  }

  function kRenderChips() {
    $('mk-sel').innerHTML = K.chips.map(function (c) { var on = c[0] === K.sel; return '<button class="mk' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-k="' + esc(c[0]) + '">' + esc(c[1]) + '</button>'; }).join('');
  }
  $('mk-sel').addEventListener('click', function (e) { var b = e.target.closest('.mk'); if (!b) return; K.sel = b.dataset.k; kRenderChips(); drawK(); });

  function kSet(m) {
    K.m = Math.max(0, Math.min(90, Math.round(m)));
    var f = K.frames[K.m];
    $('k-scrub').value = K.m; $('k-time').textContent = K.m + "'"; $('k-min').textContent = K.m + "'";
    $('k-ph').textContent = K.m === 0 ? 'KICK-OFF' : K.m >= 90 ? 'FULL TIME' : K.m <= 45 ? '1ST HALF' : '2ND HALF';
    $('k-h').textContent = f.ms.h; $('k-a').textContent = f.ms.a; $('k-cor').textContent = f.ms.corners;
    $('k-lam').textContent = f.lh.toFixed(2) + '/' + f.la.toFixed(2);
    $('k-xg').textContent = K.m < 8 ? '--' : f.info.xg_h.toFixed(2) + '/' + f.info.xg_a.toFixed(2);
    $('k-read').textContent = f.read;
    // edge table
    var boughtNow = {}; f.actions.forEach(function (a) { if (a.t === 'BUY') boughtNow[a.key] = 1; });
    var heldNow = {}; f.positions.forEach(function (p) { heldNow[p.key] = 1; });
    var h = '<div class="er hd"><span>MARKET</span><span>FAIR</span><span>ASK</span><span>EDGE</span><span>ACT</span></div>';
    f.rows.forEach(function (r) {
      var act = boughtNow[r.key] ? '<span class="act pos">BUY</span>' : heldNow[r.key] ? '<span class="act cy">HELD</span>' : '<span></span>';
      h += '<div class="er' + (boughtNow[r.key] ? ' buy' : '') + '"><span title="' + esc(r.mkey + ' / ' + r.side) + '">' + esc(r.mkey + ' · ' + r.side) + '</span><span class="f">' + r.fair.toFixed(1) + '</span><span>' + r.ask.toFixed(1) + '</span><span class="' + (r.edge >= 6 ? 'pos' : r.edge < 0 ? 'neg' : '') + '">' + (r.edge > 0 ? '+' : '') + r.edge.toFixed(1) + '</span>' + act + '</div>';
    });
    $('k-edge').innerHTML = h; $('k-ec').textContent = f.rows.filter(function (r) { return r.edge >= 6; }).length + ' ≥6';
    // book
    var pnl = f.realized + f.unreal, kp = $('k-pnl'); kp.textContent = money(pnl, true); kp.className = 'badge ' + (pnl >= 0 ? 'b-green' : 'b-red');
    $('k-pos').innerHTML = f.positions.length ? f.positions.map(function (p) {
      return '<div class="tr"><div class="tr-a"><span class="tr-n">' + esc(p.mkey + ' / ' + p.side) + '</span><span class="tr-p ' + (p.unreal >= 0 ? 'pos' : 'neg') + '">' + money(p.unreal, true) + '</span></div><div class="tr-b"><span>$' + p.stake.toFixed(2) + ' in @' + p.entry.toFixed(1) + ' · ' + p.min + "'</span><span>bid " + (p.q || 0).toFixed(1) + '</span></div></div>';
    }).join('') : '<div class="empty">' + (K.m >= 90 ? 'Book settled at full time.' : 'No positions.') + '</div>';
    var acts = K.acts.filter(function (x) { return x.m <= K.m; });
    $('k-ac').textContent = acts.length;
    $('k-acts').innerHTML = acts.length ? acts.slice().reverse().map(function (x) { var c = x.a.t === 'BUY' ? 'cy' : (x.a.pnl >= 0 ? 'pos' : 'neg'); return '<div class="al"><i>' + x.m + "'</i><span class=\"" + c + '">' + esc(x.a.txt) + '</span></div>'; }).join('') : '<div class="empty">Holding the book.</div>';
    // demo eval
    var e = K.eval;
    $('k-demo').innerHTML = K.m < 90
      ? '<div class="empty">Scored at full time. Drag to 90\'.</div><div class="kv"><span>BUY signals so far</span><span>' + K.buys.filter(function (b) { return b.m <= K.m; }).length + '</span></div>'
      : '<div class="kv"><span>Brier · model (5 mkts × 90 min)</span><span>' + e.brierModel.toFixed(3) + '</span></div><div class="kv"><span>Brier · simulated market</span><span>' + e.brierMkt.toFixed(3) + '</span></div><div class="kv"><span>CLV · mid move 10\' after BUY</span><span>' + (e.clvAvg >= 0 ? '+' : '') + e.clvAvg.toFixed(2) + ' pts</span></div><div class="kv"><span>moved toward model</span><span>' + e.clvPos + '/' + e.clvN + '</span></div><div class="kv"><span>paper P&amp;L, $10 pot</span><span>' + money(f.realized, true) + '</span></div><div class="lg-note" style="padding:4px 0">One scripted match with simulated quotes. It shows the method, not the edge.</div>';
    drawK(); updateClock();
  }

  function drawK() {
    if (activeTab !== 'kr' || !K.frames) return;
    var s = setupCanvas($('k-canvas')), ctx = s.ctx, W = s.W, H = s.H;
    ctx.clearRect(0, 0, W, H);
    var padL = 30, padR = 8, padT = 8, padB = 16, pw = W - padL - padR, ph = H - padT - padB;
    var X = function (m) { return padL + m / 90 * pw; }, Y = function (v) { return padT + (100 - v) / 100 * ph; };
    ctx.font = MONO; ctx.lineWidth = 0.5; ctx.strokeStyle = C.grid; ctx.fillStyle = C.dim; ctx.textAlign = 'right';
    [0, 25, 50, 75, 100].forEach(function (v) { var y = Y(v); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.fillText(v + '%', padL - 4, y + 3); });
    ctx.textAlign = 'center'; [0, 15, 30, 45, 60, 75, 90].forEach(function (m) { ctx.fillText(m + "'", X(m), H - 3); });
    ctx.fillStyle = 'rgba(0,200,220,0.03)'; ctx.fillRect(X(45), padT, X(90) - X(45), ph);
    // goals
    SCRIPT.goals.forEach(function (g) { if (g[0] > K.m) return; var x = X(g[0]); ctx.strokeStyle = 'rgba(221,230,240,0.55)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + ph); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = C.white; ctx.textAlign = 'left'; ctx.fillText('GOAL ' + (g[1] === 'h' ? 'H' : 'A'), x + 3, padT + 10); });
    var key = K.sel, line = function (fn, col, w) { ctx.beginPath(); for (var m = 0; m <= K.m; m++) { var v = fn(K.frames[m].lut[key]); if (!m) ctx.moveTo(X(m), Y(v)); else ctx.lineTo(X(m), Y(v)); } ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); };
    // ask/bid band
    ctx.beginPath(); for (var m = 0; m <= K.m; m++) { var r = K.frames[m].lut[key]; if (!m) ctx.moveTo(X(m), Y(r.ask)); else ctx.lineTo(X(m), Y(r.ask)); }
    for (m = K.m; m >= 0; m--) ctx.lineTo(X(m), Y(K.frames[m].lut[key].bid)); ctx.closePath(); ctx.fillStyle = 'rgba(208,138,16,0.14)'; ctx.fill();
    line(function (r) { return r.mid; }, C.amber, 1.4);
    line(function (r) { return r.fair; }, C.cyan, 1.8);
    K.buys.forEach(function (b) { if (b.key !== key || b.m > K.m) return; ctx.beginPath(); ctx.arc(X(b.m), Y(b.px), 4, 0, 6.283); ctx.fillStyle = C.green; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); });
    K.sells.forEach(function (b) { if (b.key !== key || b.m > K.m) return; ctx.beginPath(); ctx.arc(X(b.m), Y(b.px), 4, 0, 6.283); ctx.strokeStyle = C.green; ctx.lineWidth = 1.5; ctx.stroke(); });
    var cur = K.frames[K.m].lut[key], x = X(K.m);
    ctx.font = MONO; ctx.textAlign = x > W - 90 ? 'right' : 'left'; var dx = x > W - 90 ? -7 : 7;
    var fy = Y(cur.fair) - 5, my = Y(cur.mid) + (cur.mid > cur.fair ? -5 : 12);
    if (Math.abs(fy - my) < 11) { if (cur.fair >= cur.mid) my = fy + 12; else fy = my + 12; }
    fy = Math.max(padT + 10, Math.min(padT + ph - 2, fy)); my = Math.max(padT + 10, Math.min(padT + ph - 2, my));
    if (Math.abs(fy - my) < 11) my = fy + 12;
    ctx.fillStyle = C.cyan; ctx.fillText('fair ' + cur.fair.toFixed(1), x + dx, fy);
    ctx.fillStyle = C.amber; ctx.fillText('mkt ' + cur.mid.toFixed(1), x + dx, my);
  }

  function kTick() {
    if (K.m >= 90) { kStop(); return; }
    kSet(K.m + 1); K.timer = setTimeout(kTick, 380);
  }
  function kPlay(auto) {
    if (RM) { if (!auto) kSet(K.m >= 90 ? 0 : 90); return; }
    if (K.m >= 90) kSet(0);
    K.playing = true; $('k-play').innerHTML = '&#10074;&#10074; PAUSE'; $('k-play').setAttribute('aria-label', 'Pause match'); K.timer = setTimeout(kTick, 380);
  }
  function kStop() { K.playing = false; clearTimeout(K.timer); $('k-play').innerHTML = K.m >= 90 ? '&#8635; REPLAY' : '&#9654; PLAY'; $('k-play').setAttribute('aria-label', 'Play match'); }
  $('k-play').onclick = function () { K.playing ? kStop() : kPlay(false); };
  $('k-scrub').addEventListener('input', function () { kStop(); kSet(+this.value); });

  function drawLedger() {
    if (activeTab !== 'kr' || !D) return;
    var cv = $('lg-canvas'); if (!cv.getBoundingClientRect().width) return;
    var s = setupCanvas(cv), ctx = s.ctx, W = s.W, H = s.H, pts = D.krabs.brier_path;
    ctx.clearRect(0, 0, W, H);
    var lo = 0.08, hi = 0.30, padL = 26, padR = 30, X = function (i) { return padL + i / (pts.length - 1) * (W - padL - padR); }, Y = function (v) { return 6 + (hi - v) / (hi - lo) * (H - 18); };
    ctx.font = MONO; ctx.strokeStyle = C.grid; ctx.lineWidth = 0.5; ctx.fillStyle = C.dim; ctx.textAlign = 'right';
    [0.1, 0.2].forEach(function (v) { ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(W - padR, Y(v)); ctx.stroke(); ctx.fillText(v.toFixed(1), padL - 3, Y(v) + 3); });
    ctx.strokeStyle = 'rgba(122,142,168,0.4)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(padL, Y(0.25)); ctx.lineTo(W - padR, Y(0.25)); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'right'; ctx.fillText('0.25 = coin flip', W - 2, Y(0.25) - 3);
    ctx.beginPath(); pts.forEach(function (v, i) { if (!i) ctx.moveTo(X(i), Y(v)); else ctx.lineTo(X(i), Y(v)); }); ctx.strokeStyle = C.green; ctx.lineWidth = 1.6; ctx.stroke();
    var labels = ['START', 'MID', '7 MATCHES'];
    pts.forEach(function (v, i) { ctx.beginPath(); ctx.arc(X(i), Y(v), 3, 0, 6.283); ctx.fillStyle = C.green; ctx.fill(); ctx.fillStyle = C.white; ctx.textAlign = i === pts.length - 1 ? 'right' : i ? 'center' : 'left'; ctx.fillText(v.toFixed(i === 2 ? 3 : 2), X(i) + (i === pts.length - 1 ? 26 : 0), Y(v) - 6); ctx.fillStyle = C.dim; ctx.fillText(labels[i], X(i) + (i === pts.length - 1 ? 26 : 0), H - 1); });
  }

  function kInit() {
    var k = D.krabs;
    $('lg-brier').textContent = k.brier_path[0] + ' → ' + k.brier_path[k.brier_path.length - 1];
    $('lg-cap').textContent = 'Reported checkpoints over ' + k.brier_matches + ' World Cup matches to ' + k.brier_as_of + ' (paper book +$' + k.paper_pnl_7.toFixed(2) + '). The per-match ledger was not archived, so only these three points are drawn.';
    $('lg-clv').textContent = '+' + k.clv_pts.toFixed(2); $('lg-sig').textContent = '~' + k.clv_signals.toLocaleString('en-GB');
    $('lg-dis').textContent = k.clv_dir_disagree_pct + '%'; $('lg-agr').textContent = k.clv_dir_agree_pct + '%';
    $('lg-note').innerHTML = '<b>CLV</b> = how far the market moved toward Krabs\'s price after a flag, not raw P&amp;L. <b>Corners</b>, first called the proven edge on P&amp;L, were retracted: ' + k.corners_dir_pct + '% directional, a coin flip. Priors here: &lambda; ' + k.priors.lambda_h + '/' + k.priors.lambda_a + ' from the last configured fixture.';
    kSimulate(); kRenderChips(); kSet(RM ? 90 : 0);
  }

  /* ───────────── boot ───────────── */
  var ro = window.ResizeObserver ? new ResizeObserver(function () { drawWR(); drawK(); drawLedger(); }) : null;
  fetch('assets/data.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (data) {
    D = data; wrInit(); kInit();
    if (ro) { ro.observe($('pnl-canvas').parentNode); ro.observe($('k-canvas').parentNode); } else window.addEventListener('resize', function () { drawWR(); drawK(); });
    if (!RM) {
      var started = false, go = function () { if (!started) { started = true; wrPlay(); } };
      if (window.IntersectionObserver) { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { go(); io.disconnect(); } }); io.observe($('pnl-canvas')); }
      else go();
    }
  }).catch(function (e) {
    document.querySelector('.stage').innerHTML = '<div class="empty" style="padding:20px">Could not load paper data (' + esc(e.message) + '). Serve this folder over http.</div>';
  });
})();
