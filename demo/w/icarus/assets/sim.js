/* ICARUS window: pane switching and the plan-view simulation.
   The guard, primitives, autopilot and axis monitor come from icarus-core.js (a port of the app's
   own Java). This file only wires them to a simple aircraft, a map and the visitor's taps. */
(() => {
  const C = window.IcarusCore, KB = window.KB;
  const $ = id => document.getElementById(id);
  const css = n => getComputedStyle(document.body).getPropertyValue(n).trim();

  /* ---------- panes ---------- */
  document.querySelectorAll('[data-pane]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-pane]').forEach(x => x.setAttribute('aria-pressed', x === btn));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + btn.dataset.pane));
    KB.twitch($('p-' + btn.dataset.pane)); KB.beep(520, 40);
  }));

  /* ---------- the flight core ---------- */
  const Clock = C.SimClock;
  const veh = new C.Vehicle();
  const limits = new C.Limits();
  const guard = new C.EnvelopeGuard(limits);
  const axis = new C.AxisMonitor();
  let ap, lastCmd = [0, 0, 0];
  const link = {
    connected: () => true,
    setVirtualStickEnabled: on => { veh.joystick = on; },
    // hand-back only applies once nothing is running again (keeps a quick re-run from being cut off)
    inJoystickMode: () => veh.joystick && ap.state !== 'RUNNING',
    sendVelocity: (vE, vN, vUp, yaw) => {
      veh.command(vE, vN, vUp, yaw, Clock.now());
      lastCmd = [vN, vE, vUp];
      const o = veh.obs || [0, 0, 0];
      const bad = axis.observe(vN, vE, vUp, o[0], o[1], o[2]);
      if (bad) Clock.post(() => ap.abort('axis monitor: ' + bad), 0);
    },
    position: () => [veh.e, veh.n, veh.u],
    heading: () => veh.hdg,
  };

  /* ---------- log ---------- */
  const logEl = $('log');
  const t0 = Clock.now();
  function log(lvl, msg){
    const line = document.createElement('div');
    line.className = lvl;
    line.textContent = 'T+' + ((Clock.now() - t0) / 1000).toFixed(1).padStart(5, ' ') + '  ' + msg;
    logEl.appendChild(line);
    while (logEl.children.length > 120) logEl.firstChild.remove();
    logEl.scrollTop = logEl.scrollHeight;
  }

  /* ---------- verdict line ---------- */
  const vEl = $('verdict'), clampBtn = $('clamp');
  let typer = 0;
  let pending = null;                 // a refused target the visitor may clamp
  function say(kind, tag, msg, typed){
    const r = vEl.querySelector('.r'), m = vEl.querySelector('.msg');
    msg = msg.replace('3 m x 2 m keep-out', '2.5 m × 1.5 m keep-out');   // the log rounds; say the real figure
    r.className = 'r ' + kind; r.textContent = tag;
    clearInterval(typer);                      // a newer message always wins over one still typing
    if (typed && !KB.reduce){ let i = 0; typer = setInterval(() => { m.textContent = msg.slice(0, i += 2); if (i >= msg.length) clearInterval(typer); }, 14); }
    else m.textContent = msg;
    KB.twitch(vEl); sayAt = performance.now();
  }

  function newAutopilot(){
    ap = new C.Autopilot(link, guard, log);
    let lastNote = '';
    ap.listener = (state, prim, note) => {
      if (!note || note === lastNote) return;   // the autopilot re-emits its last note; react to new ones only
      lastNote = note;
      if (/^ABORTED/.test(note)) say('no', 'ABORT', note.replace(/^ABORTED — /, ''));
      else if (/^WARNING/.test(note)) say('wn', 'WARN', note.replace(/^WARNING /, '').replace('  [ADVISORY — not enforced]', ' · advisory, not enforced'));
      else if (/^holding altitude/.test(note)) say('wn', 'HOLD', 'vertical limit reached, holding height rather than aborting');
      else if (note === 'sequence complete' || note === 'disarmed') { if (vEl.querySelector('.r').textContent === 'FLYING') say('ok', 'DONE', 'arrived · hovering · tap again'); }
    };
  }
  newAutopilot();

  /* run a list of primitives, taking off first if needed */
  function run(prims, label){
    clampBtn.hidden = true; pending = null;
    if (veh.auto === 'LANDING') veh.auto = '';
    if (ap.state === 'RUNNING'){          // retarget in flight: brake to a hover first, then the new work
      ap.current = C.Primitives.hold(0.6); ap.queue = prims.slice();
      log('I', 'retarget: ' + label); return;
    }
    const go = () => {
      if (ap.state !== 'DISARMED') ap.disarm();
      ap.arm(); prims.forEach(p => ap.enqueue(p)); ap.start();
    };
    if (!veh.flying){
      log('I', 'take-off (DJI auto mode)');
      veh.auto = 'TAKEOFF'; veh.onTakeoff = () => { log('I', 'airborne at 1.2 m'); go(); };
    } else go();
  }

  /* ---------- target from a tap ---------- */
  let tgtAlt = 10, target = null;     // {e,n,a,kind,orig}
  const altEl = $('alt');
  const showAlt = () => { altEl.innerHTML = `<small>ALT</small>${tgtAlt} m`; };
  $('altUp').onclick = () => { tgtAlt = Math.min(150, tgtAlt + (tgtAlt < 20 ? 5 : 10)); showAlt(); KB.beep(700, 25); };
  $('altDn').onclick = () => { tgtAlt = Math.max(0, tgtAlt - (tgtAlt <= 20 ? 5 : 10)); showAlt(); KB.beep(500, 25); };

  function propose(e, n, a){
    const v = guard.checkTarget(e, n, a);
    log(v.allowed ? (C.isAdvisory(v) ? 'W' : 'I') : 'V', 'guard: ' + C.vstr(v));
    KB.beep(v.allowed ? 880 : 220, 60);
    if (!v.allowed){
      target = { e, n, a, kind: 'no' };
      const c = guard.clampTarget(e, n, a);
      pending = c;
      say('no', 'REFUSE ' + v.rule, v.message, true);
      clampBtn.hidden = false;
      return;
    }
    target = { e, n, a, kind: C.isAdvisory(v) ? 'wn' : 'ok' };
    if (C.isAdvisory(v)) say('wn', 'WARN ' + v.rule, v.message.replace('  [ADVISORY — not enforced]', ' · advisory, not enforced'), true);
    else say('ok', 'ACCEPT', `${Math.round(Math.hypot(e, n))} m out, ${a} m up · within envelope`, true);
    setTimeout(() => { if (vEl.querySelector('.r').textContent.startsWith('ACCEPT')) say('ok', 'FLYING', 'go to target at up to 3 m/s · 10 Hz · each tick re-checked one step ahead'); }, KB.reduce ? 0 : 900);
    run([C.Primitives.gotoRelative(e, n, a)], `GOTO ${Math.round(e)}E ${Math.round(n)}N ${a}m`);
  }
  clampBtn.onclick = () => {
    if (!pending) return;
    const tz = x => Math.trunc(x * 10) / 10;      // toward zero, so float error cannot land it a hair outside
    const [e, n, a] = pending.map(tz), orig = target;
    log('I', `clamp: ${Math.round(orig.e)}E ${Math.round(orig.n)}N ${orig.a}m → ${Math.round(e)}E ${Math.round(n)}N ${Math.round(a)}m (bearing kept)`);
    propose(e, n, Math.round(a));
    if (target) target.orig = orig;
  };

  /* gestures */
  const P = C.Primitives;
  document.querySelectorAll('[data-move]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.move;
    const prims = k === 'yes' ? P.yes() : k === 'no' ? P.no() : [P.pirouette(C.Primitives.YAW_RATE)];
    if (veh.auto === 'LANDING') return;
    say('ok', k === 'spin' ? '360°' : k.toUpperCase(), k === 'yes' ? 'a quick nod: up, down, up, down' : k === 'no' ? 'a head-shake: look left, right, back' : 'a full turn on the spot at 45°/s');
    KB.beep(760, 40);
    if (ap.state === 'RUNNING'){ ap.queue.push(...prims); log('I', 'queued ' + k); return; }
    run(prims, k);
  }));
  $('land').onclick = () => {
    if (!veh.flying) return;
    if (ap.state !== 'DISARMED') ap.abort('pilot: LAND');
    veh.auto = 'LANDING'; veh.onLanded = () => { log('I', 'landed'); say('ok', 'LANDED', 'on the ground · tap to fly again'); };
    log('I', 'landing (DJI auto mode)'); say('ok', 'LAND', 'descending'); KB.beep(400, 60);
  };
  $('abort').onclick = () => {
    if (ap.state === 'DISARMED'){ say('ok', 'IDLE', 'nothing running · hovering'); return; }
    ap.abort('pilot pressed ABORT'); KB.beep(200, 120);
  };
  function reset(){
    Clock.clear(); veh.reset(); newAutopilot(); axis.verdict = 'UNVERIFIED'; axis.badStreak = 0;
    target = null; pending = null; clampBtn.hidden = true; trail.length = 0;
    say('ok', 'READY', 'Tap the map to set a target.');
    log('I', 'reset · ' + guard.summary());
  }
  $('reset').onclick = () => { reset(); KB.beep(600, 40); };

  /* zoom and speed */
  let R = 125, speed = 4;
  $('zoom').onclick = e => { R = R === 125 ? 12 : 125; e.currentTarget.firstChild.textContent = 'ZOOM ' + (R === 125 ? 120 : 12) + ' m'; KB.beep(640, 30); };
  $('speed').onclick = e => { speed = speed === 4 ? 1 : 4; e.currentTarget.firstChild.textContent = 'TIME ×' + speed; KB.beep(640, 30); };

  /* ---------- map ---------- */
  const cv = $('cv'), canvas = $('map'), g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, alt0 = 0;           // alt0: x where the altitude strip begins
  const GAUGE = 46;
  function size(){
    // layout size, not getBoundingClientRect: the power-on animation scales the tube while it runs
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    alt0 = W - GAUGE;
  }
  new ResizeObserver(size).observe(cv); size();
  const scale = () => (Math.min(alt0, H) / 2 - 14) / R;
  const cx = () => alt0 / 2, cy = () => H / 2;
  const toPx = (e, n) => [cx() + e * scale(), cy() - n * scale()];
  cv.addEventListener('click', ev => {
    const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * H / r.height;
    if (x > alt0) return;
    const s = scale(), e = (x - cx()) / s, n = (cy() - y) / s;
    const q = R > 20 ? 1 : 0.1;
    propose(Math.round(e / q) * q, Math.round(n / q) * q, tgtAlt);
  });

  const trail = [];
  function draw(){
    if (alt0 < 40 || H < 40) return;
    const A = css('--a'), B = css('--b'), line = css('--line'), dim = css('--dim'), txt = css('--text'), vio = css('--violet'), ink = css('--ink');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const s = scale(), [ox, oy] = [cx(), cy()];
    g.font = '700 9.5px ui-monospace, Menlo, monospace'; g.textBaseline = 'middle';
    // grid rings
    const step = R > 20 ? 25 : 2.5;
    g.strokeStyle = line; g.lineWidth = 1; g.fillStyle = dim;
    for (let r = step; r * s < Math.max(alt0, H); r += step){
      g.beginPath(); g.arc(ox, oy, r * s, 0, Math.PI * 2); g.stroke();
      if (oy - r * s > 8 && (R > 20 || r > 2.5)) g.fillText((r % 1 ? r.toFixed(1) : r) + ' m', ox + 3, oy - r * s + 6);
    }
    g.beginPath(); g.moveTo(0, oy); g.lineTo(alt0, oy); g.moveTo(ox, 0); g.lineTo(ox, H); g.stroke();
    g.fillStyle = vio; g.fillText('N', ox + 4, 8); g.fillText('E', alt0 - 10, oy - 7);
    // VLOS radius
    const rad = limits.effectiveRadiusM() * s;
    g.setLineDash([6, 4]); g.strokeStyle = A; g.lineWidth = 1.4;
    g.beginPath(); g.arc(ox, oy, Math.max(0, rad), 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    if (rad < Math.max(alt0, H)){ g.fillStyle = A; g.fillText('100 m RADIUS · not yet measured, so cautious', Math.max(4, ox - rad + 6), oy + rad * 0.72 > H - 8 ? H - 8 : oy + rad * 0.72); }
    // keep-out around the pilot
    const ko = limits.standoffHorizM * s;
    g.fillStyle = 'rgba(255,228,0,.10)'; g.strokeStyle = ink; g.lineWidth = 1;
    g.beginPath(); g.arc(ox, oy, Math.max(ko, 2), 0, Math.PI * 2); g.fill(); if (ko > 6) g.stroke();
    if (ko > 20){ g.fillStyle = ink; g.fillText('KEEP-OUT 2.5 m · below 1.5 m', ox - ko, oy + ko + 10); }
    // pilot
    g.fillStyle = txt; g.fillRect(ox - 3, oy - 3, 6, 6);
    g.fillStyle = dim; g.fillText('PILOT · HOME', ox + 7, oy + 10);
    // target
    if (target){
      const [tx, ty] = toPx(target.e, target.n), col = target.kind === 'no' ? '#ff3355' : target.kind === 'wn' ? ink : '#00ff88';
      if (target.orig){
        const [px, py] = toPx(target.orig.e, target.orig.n);
        g.strokeStyle = '#ff3355'; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(px, py); g.lineTo(tx, ty); g.stroke(); g.setLineDash([]);
        g.strokeStyle = '#ff3355'; g.beginPath(); g.arc(px, py, 5, 0, Math.PI * 2); g.stroke();
      }
      g.strokeStyle = col; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(tx - 8, ty); g.lineTo(tx - 3, ty); g.moveTo(tx + 3, ty); g.lineTo(tx + 8, ty);
      g.moveTo(tx, ty - 8); g.lineTo(tx, ty - 3); g.moveTo(tx, ty + 3); g.lineTo(tx, ty + 8); g.stroke();
      g.beginPath(); g.arc(tx, ty, 10, 0, Math.PI * 2); g.stroke();
      g.fillStyle = col; g.fillText(target.a + ' m', tx + 13, ty - 8);
    }
    // trail
    g.strokeStyle = B; g.globalAlpha = .55; g.lineWidth = 1.2; g.beginPath();
    trail.forEach(([e, n], i) => { const [x, y] = toPx(e, n); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.globalAlpha = 1;
    // aircraft
    const [axp, ayp] = toPx(veh.e, veh.n), h = veh.hdg * Math.PI / 180;
    g.save(); g.translate(axp, ayp); g.rotate(h);
    g.shadowColor = A; g.shadowBlur = veh.flying ? 12 : 0;
    g.fillStyle = veh.flying ? A : dim; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill();
    g.restore();
    // altitude strip
    const top = 14, bot = H - 14, AMAX = 150, ay = a => bot - (a / AMAX) * (bot - top);
    g.strokeStyle = line; g.beginPath(); g.moveTo(alt0, 0); g.lineTo(alt0, H); g.stroke();
    const gx = alt0 + 22;
    g.strokeStyle = dim; g.beginPath(); g.moveTo(gx, top); g.lineTo(gx, bot); g.stroke();
    g.fillStyle = 'rgba(255,51,85,.13)'; g.fillRect(alt0 + 1, top, GAUGE - 1, ay(120) - top);
    g.strokeStyle = '#ff3355'; g.beginPath(); g.moveTo(alt0 + 4, ay(120)); g.lineTo(W - 2, ay(120)); g.stroke();
    g.fillStyle = '#ff3355'; g.fillText('120', alt0 + 4, ay(120) - 7);
    g.fillStyle = dim; g.fillText('ALT', alt0 + 4, H - 6);
    if (target){ g.fillStyle = target.kind === 'no' ? '#ff3355' : '#00ff88'; g.fillRect(gx + 4, ay(Math.min(target.a, AMAX)) - 1, 12, 2); }
    g.fillStyle = A; g.beginPath(); const yy = ay(veh.u); g.moveTo(gx - 2, yy); g.lineTo(gx - 10, yy - 5); g.lineTo(gx - 10, yy + 5); g.closePath(); g.fill();
  }

  /* ---------- telemetry ---------- */
  const tele = $('tele');
  let sayAt = 0;
  function telemetry(){
    const tag = vEl.querySelector('.r').textContent;
    if ((tag.startsWith('WARN') || tag === 'HOLD') && ap.state === 'RUNNING' && performance.now() - sayAt > 3000) say('ok', 'FLYING', 'flying ' + (ap.currentName() || '').toLowerCase() + ' · each tick re-checked one step ahead');
    const sp = Math.hypot(...(veh.obs || [0, 0, 0]).slice(0, 2));
    tele.innerHTML =
      `<span>STATE <b class="${ap.state === 'RUNNING' ? 'on' : ''}">${ap.state}</b></span>` +
      `<span>MOVE <b>${ap.currentName() || '—'}</b></span>` +
      `<span>POS <b>${veh.e.toFixed(0)}E ${veh.n.toFixed(0)}N ${veh.u.toFixed(1)}m</b></span>` +
      `<span>HDG <b>${veh.hdg.toFixed(0).padStart(3, '0')}°</b></span>` +
      `<span>GND <b>${sp.toFixed(1)} m/s</b></span>` +
      `<span>AXES <b>${axis.verdict}</b></span>`;
  }

  /* ---------- loop ---------- */
  let last = performance.now(), simT = Clock.now(), lastTele = 0;
  function frame(now){
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const until = simT + dt * 1000 * speed;
    while (simT < until){
      const st = Math.min(20, until - simT); simT += st;
      Clock.advanceTo(simT); veh.step(st / 1000, simT);
    }
    if (veh.flying){
      const lt = trail[trail.length - 1];
      if (!lt || Math.hypot(lt[0] - veh.e, lt[1] - veh.n) > R / 300) trail.push([veh.e, veh.n]);
      if (trail.length > 600) trail.shift();
    }
    try { draw(); } catch (err) { console.error(err); }
    if (now - lastTele > 120){ telemetry(); lastTele = now; }
    requestAnimationFrame(frame);
  }
  log('I', 'guard: ' + guard.summary());
  requestAnimationFrame(frame);

  /* ---------- demo ---------- */
  let demoT = [];
  $('demo').addEventListener('click', e => {
    const b = e.currentTarget;
    if (demoT.length){ demoT.forEach(clearTimeout); demoT = []; b.firstChild.textContent = '▸ DEMO'; return; }
    reset(); speed = 4; $('speed').firstChild.textContent = 'TIME ×4';
    R = 125; $('zoom').firstChild.textContent = 'ZOOM 120 m';
    b.firstChild.textContent = '■ STOP DEMO';
    const steps = [
      [300, () => { tgtAlt = 15; showAlt(); propose(40, 55, 15); }],
      [9500, () => { tgtAlt = 20; showAlt(); propose(-110, 70, 20); }],
      [2600, () => clampBtn.click()],
      [12000, () => { tgtAlt = 130; showAlt(); propose(-20, -30, 130); }],
      [2600, () => document.querySelector('[data-move="yes"]').click()],
      [2500, () => document.querySelector('[data-move="spin"]').click()],
      [3200, () => { tgtAlt = 10; showAlt(); propose(6, -8, 10); }],
      [9000, () => $('land').click()],
      [6000, () => { demoT = []; b.firstChild.textContent = '▸ DEMO'; }],
    ];
    let at = 0;
    steps.forEach(([d, fn]) => { at += d; demoT.push(setTimeout(fn, at)); });
  });
})();
