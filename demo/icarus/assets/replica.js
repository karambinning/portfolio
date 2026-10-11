/* ICARUS replica — boot self-test stream, and the few replica-only affordances on the deck.
   Runs after the shipped deck script, so everything it touches (PLAN, drawPlan, render…) is the
   real deck's own. */
(function () {
  'use strict';
  const Sim = window.ReplicaSim, C = window.IcarusCore;
  const SUITES = window.ICARUS_SELFTESTS || [];
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ───────────────────────────── pre-flight self-test
  const ov = document.createElement('div');
  ov.id = 'selftest';
  ov.innerHTML =
    '<div class="lc"><h2>PRE-FLIGHT SELF-TEST</h2>' +
    '<div class="sub">RUN ON THE HANDSET AT EVERY LAUNCH, BEFORE THE SDK IS TOUCHED.<br>' +
    'PURE LOGIC — NO AIRCRAFT, NO REGISTRATION, NO NETWORK.</div>' +
    '<div class="suites" id="st-suites"></div>' +
    '<div class="tot" id="st-tot"><span class="k">ASSERTIONS</span><span class="v" id="st-totv">0</span></div></div>' +
    '<div class="rc"><div class="rh"><span>LOGCAT · ICARUS</span><button id="st-skip">SKIP ›</button></div>' +
    '<div class="log" id="st-log"></div><div class="done-line" id="st-done">running…</div></div>';
  document.body.appendChild(ov);
  const $ = id => document.getElementById(id);

  let running = null;
  function runBoot(tags) {
    const list = tags ? SUITES.filter(s => tags.indexOf(s.tag) >= 0) : SUITES;
    const total = list.reduce((a, s) => a + s.tests.length, 0);
    $('st-suites').innerHTML = list.map((s, i) =>
      `<div class="su" id="su-${i}"><span class="nm">${s.cls}<small>${s.tag}</small></span>` +
      `<span class="bar"><i></i></span><span class="ct">0/${s.tests.length}</span><span class="st">WAIT</span></div>`).join('');
    $('st-log').innerHTML = ''; $('st-tot').classList.remove('ok'); $('st-totv').textContent = '0 / ' + total;
    $('st-done').className = 'done-line'; $('st-done').textContent = 'running…';
    ov.classList.remove('gone'); ov.style.display = 'flex';
    Sim.parentPost({ type: 'tests-begin', total, suites: list.map(s => [s.cls, s.tests.length]) });

    const flat = [];
    list.forEach((s, i) => s.tests.forEach((n, j) => flat.push([i, j, s, n])));
    let k = 0, passed = 0;
    const perFrame = reduce ? flat.length : Math.max(1, Math.ceil(flat.length / (tags ? 60 : 250)));
    const logEl = $('st-log');
    if (running) cancelAnimationFrame(running);

    function finishSuite(i, s) {
      const row = $('su-' + i); row.className = 'su done';
      row.querySelector('.st').textContent = 'PASS';
      const d = document.createElement('div');
      d.innerHTML = `<span class="sum">${s.tag} self-test: ${s.tests.length}/${s.tests.length} PASS</span>`;
      logEl.appendChild(d);
    }
    function tick() {
      const batch = [];
      for (let m = 0; m < perFrame && k < flat.length; m++, k++) {
        const [i, j, s, n] = flat[k];
        const row = $('su-' + i);
        if (j === 0) row.className = 'su run';
        passed++;
        row.querySelector('.ct').textContent = (j + 1) + '/' + s.tests.length;
        row.querySelector('.bar i').style.width = ((j + 1) / s.tests.length * 100) + '%';
        const d = document.createElement('div');
        d.innerHTML = `<span class="p">PASS</span><span class="g">${s.tag}</span>${esc(n)}`;
        logEl.appendChild(d);
        batch.push([s.tag, n]);
        if (j === s.tests.length - 1) finishSuite(i, s);
      }
      while (logEl.children.length > 46) logEl.removeChild(logEl.firstChild);
      $('st-totv').textContent = passed + ' / ' + total;
      Sim.parentPost({ type: 'tests', lines: batch, passed, total });
      if (k < flat.length) { running = requestAnimationFrame(tick); return; }
      running = null;
      $('st-tot').classList.add('ok');
      $('st-totv').textContent = passed + ' / ' + total + ' PASS';
      $('st-done').className = 'done-line ok';
      $('st-done').textContent = tags ? 'GUARD RE-RUN · ' + passed + '/' + total + ' PASS'
        : 'ALL ' + list.length + ' SUITES PASS · ' + passed + ' ASSERTIONS · STARTING ICARUS';
      Sim.parentPost({ type: 'tests-end', passed, total });
      setTimeout(close, tags ? 1100 : 1500);
    }
    running = requestAnimationFrame(tick);
  }
  let first = true;
  function close() {
    if (running) { cancelAnimationFrame(running); running = null; }
    ov.classList.add('gone');
    setTimeout(() => { ov.style.display = 'none'; }, reduce ? 0 : 360);
    if (first) { first = false; Sim.startLink(); }
  }
  $('st-skip').addEventListener('click', close);
  window.ReplicaBoot = { run: runBoot, skip: close };

  // ───────────────────────────── post-render: things the bridge cannot express through render()
  const realUpdate = window.icarusUpdate;
  window.icarusUpdate = function (s) {
    realUpdate(s);
    // render() shows NO FIX because the replica has no home coordinates. Home is the ENU origin.
    if (s.connected) txt('pv-home', 'SIM ORIGIN', '#00ff88');
    updateHandCard(s);
  };

  // ───────────────────────────── HAND: the paused feature, with its reason
  const FOCAL_PX = 640 / Math.tan(70.6 / 2 * Math.PI / 180);      // 1280 px across 70.6° HFOV → ~904 px
  const HAND_M = 0.18, MIN_HAND_PX = 28;                          // VisionEngine.HAND_SPAN_M, HandControl.MIN_HAND_PX
  const CEIL_M = HAND_M * FOCAL_PX / MIN_HAND_PX;                 // 5.8 m
  window.handPaused = function () {
    let card = $('handcard');
    if (card) { card.remove(); return; }
    card = document.createElement('div');
    card.className = 'tgt show'; card.id = 'handcard';
    card.innerHTML = '<div class="t">◤ HAND CONTROL · PAUSED</div>' +
      '<div class="m">The camera cannot resolve a hand beyond <b>' + CEIL_M.toFixed(1) + ' m</b>. Past that, anything the model reports is noise — and the aircraft would chase it.</div>' +
      '<div class="calc">0.18 m hand · <b>' + FOCAL_PX.toFixed(0) + ' px</b> focal length (1280 px across 70.6°) · <b>' + MIN_HAND_PX + ' px</b> floor<br>' +
      '0.18 × ' + FOCAL_PX.toFixed(0) + ' ÷ ' + MIN_HAND_PX + ' = <b>' + CEIL_M.toFixed(2) + ' m</b></div>' +
      '<div class="live" id="hc-live">—</div>' +
      '<button class="xbtn" onclick="handPaused()">✕ CLOSE</button>';
    $('stage').appendChild(card);
    Sim.push();
    Sim.parentPost({ type: 'target', title: 'HAND CONTROL · PAUSED', text: 'The camera cannot resolve a hand beyond 5.8 m (0.18 m hand, 904 px focal length, 28 px floor). Paused, not abandoned.', bad: true });
  };
  function updateHandCard(s) {
    const el = $('hc-live'); if (!el) return;
    if (!s.connected) { el.innerHTML = '<span style="color:var(--muted)">no aircraft linked</span>'; return; }
    const r = Math.max(0.3, Math.hypot(Sim.ac.e, Sim.ac.n, Sim.ac.u));
    const px = HAND_M * FOCAL_PX / r, ok = px >= MIN_HAND_PX;
    el.innerHTML = 'aircraft is <b>' + r.toFixed(1) + ' m</b> from the pilot → a hand spans <b style="color:' +
      (ok ? '#00ff88' : '#ff3355') + '">' + px.toFixed(0) + ' px</b> ' + (ok ? '(resolvable)' : '— below the floor');
  }

  // ───────────────────────────── plan view: clamp ghost, altitude stepper, drag
  const realDraw = window.drawPlan;
  let clamp = null;
  window.drawPlan = function () {
    realDraw();
    if (!clamp || !PLAN.target || PLAN.target.allowed) return;
    const [tx, ty] = planPx(PLAN.target.e, PLAN.target.n), [cx, cy] = planPx(clamp[0], clamp[1]);
    const g = `<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="#ffcc00" stroke-width="1" stroke-dasharray="2 3" opacity=".8"/>` +
      `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})"><circle r="6" fill="none" stroke="#ffcc00" stroke-width="1.2" stroke-dasharray="2 2"/>` +
      `<circle r="1.6" fill="#ffcc00"/></g>`;
    document.getElementById('plan').insertAdjacentHTML('beforeend', g);
  };

  const plan = $('plan');
  let lastXY = null, dragging = false, pending = null;
  plan.addEventListener('click', function (ev) {
    lastXY = [ev.clientX, ev.clientY];
    const tgtAlt = (typeof window.REPLICA_ALT === 'number') ? window.REPLICA_ALT : ((PLAN.acAlt && PLAN.acAlt > 2) ? PLAN.acAlt : 40);
    const t = PLAN.target; if (!t) return;
    const v = Sim.guard.checkTarget(t.e, t.n, tgtAlt);
    clamp = null;
    const m = $('tgt-m');
    if (!v.allowed && ['VLOS_RADIUS', 'CEILING', 'BELOW_GROUND'].indexOf(v.rule) >= 0) {
      clamp = Sim.guard.clampTarget(t.e, t.n, tgtAlt);
      const d = Math.hypot(clamp[0], clamp[1]), b = ((Math.atan2(clamp[0], clamp[1]) * 180 / Math.PI) + 360) % 360;
      m.insertAdjacentHTML('beforeend',
        `<div class="clampnote">EnvelopeGuard.clampTarget() → nearest legal point: <b>${d.toFixed(0)} m</b> on bearing <b>${String(Math.round(b)).padStart(3, '0')}°</b>, alt <b>${clamp[2].toFixed(0)} m</b></div>` +
        `<button class="gobtn" onclick="apGoto(${clamp[0].toFixed(1)},${clamp[1].toFixed(1)},${clamp[2].toFixed(1)})">QUEUE CLAMPED GOTO →</button>`);
    }
    m.insertAdjacentHTML('beforeend',
      `<div class="altrow">ALT <button onclick="replicaAlt(-20)">−</button><b>${tgtAlt.toFixed(0)} m</b><button onclick="replicaAlt(20)">+</button><small>replica control</small></div>`);
    drawPlan();
    Sim.parentPost({ type: 'target', title: $('tgt-t').textContent, text: v.allowed
      ? 'bearing ' + Math.round(((Math.atan2(t.e, t.n) * 180 / Math.PI) + 360) % 360) + '° · range ' + Math.hypot(t.e, t.n).toFixed(0) + ' m · alt ' + tgtAlt.toFixed(0) + ' m — tap QUEUE GOTO, then ARM, then RUN'
      : v.message + (clamp ? ' · clampTarget() → ' + Math.hypot(clamp[0], clamp[1]).toFixed(0) + ' m, alt ' + clamp[2].toFixed(0) + ' m' : ''),
      bad: !v.allowed, clamp: clamp ? clamp.map(x => +x.toFixed(1)) : null });
  });
  window.replicaAlt = function (d) {
    const cur = (typeof window.REPLICA_ALT === 'number') ? window.REPLICA_ALT : ((PLAN.acAlt && PLAN.acAlt > 2) ? PLAN.acAlt : 40);
    window.REPLICA_ALT = Math.max(-20, Math.min(160, Math.round((cur + d) / 10) * 10));
    if (lastXY) plan.dispatchEvent(new MouseEvent('click', { clientX: lastXY[0], clientY: lastXY[1], bubbles: true }));
  };
  window.replicaQueueClamp = function () {
    if (clamp) apGoto(+clamp[0].toFixed(1), +clamp[1].toFixed(1), +clamp[2].toFixed(1));
  };
  // drag: the shipped deck sets a target on tap; dragging re-runs the same tap handler continuously
  plan.addEventListener('pointerdown', ev => { dragging = true; window.__replicaDragging = true; try { plan.setPointerCapture(ev.pointerId); } catch (e) {} });
  plan.addEventListener('pointermove', ev => {
    if (!dragging) return;
    const queued = !!pending;
    pending = [ev.clientX, ev.clientY];
    if (queued) return;
    requestAnimationFrame(() => {
      const p = pending; pending = null;
      if (p) plan.dispatchEvent(new MouseEvent('click', { clientX: p[0], clientY: p[1], bubbles: true }));
    });
  });
  const endDrag = () => { dragging = false; setTimeout(() => { window.__replicaDragging = false; }, 0); };
  plan.addEventListener('pointerup', endDrag);
  plan.addEventListener('pointercancel', endDrag);

  window.enterDeck = () => go('deck');
  window.addEventListener('message', ev => {
    const d = ev.data || {};
    if (d.src !== 'icarus-host') return;
    if (d.type === 'call' && d.fn === 'enterDeck') go('deck');
    if (d.type === 'call' && d.fn === 'queueGoto') {
      const g = document.querySelector('#tgt .gobtn'); if (g) g.click();
    }
    if (d.type === 'call' && d.fn === 'queueClamp') replicaQueueClamp();
    if (d.type === 'call' && d.fn === 'handPaused') { if (!document.getElementById('deck').classList.contains('on')) go('deck'); handPaused(); }
  });

  Sim.start();
  runBoot(null);
})();
