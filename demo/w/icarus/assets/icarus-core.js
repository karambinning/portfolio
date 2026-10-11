/* ICARUS replica — JavaScript port of the pure flight core.
 *
 * Ported line-for-line from the Android source (code/icarus, HEAD eea95c9):
 *   EnvelopeGuard.java   checkTarget · checkMove · clampTarget · watchdog · checkRate · summary
 *   Primitives.java      gotoRelative · climbTo · yawBy · pirouette · nudge · hold · yes() · no()
 *   Autopilot.java       arm / disarm / abort / enqueue / start and the 10 Hz tick
 *   AxisMonitor.java     commanded-vs-observed sign check
 * and the vehicle model from code/icarus-sim/index.html (acStep): a 10 Hz command loop, a 500 ms
 * command-to-motion latency queue, and straight velocity integration.
 *
 * Nothing here talks to a real aircraft. Time is simulated (SimClock), so the replica can run
 * faster than real time without changing any of the control law's own arithmetic.
 */
(function (global) {
  'use strict';

  const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
  const f0 = x => Math.round(x).toFixed(0);

  // ───────────────────────────────────────────── simulated clock + Handler
  const SimClock = {
    t: 1000, timers: [], seq: 0,
    now() { return this.t; },
    post(fn, delay) { this.timers.push({ at: this.t + (delay || 0), fn, id: ++this.seq }); },
    clear() { this.timers = []; },
    /** advance to t, firing due timers in order */
    advanceTo(t) {
      for (;;) {
        let next = null;
        for (const x of this.timers) if (x.at <= t && (!next || x.at < next.at || (x.at === next.at && x.id < next.id))) next = x;
        if (!next) break;
        this.timers.splice(this.timers.indexOf(next), 1);
        if (next.at > this.t) this.t = next.at;
        try { next.fn(); } catch (e) { console.warn('timer', e); }
      }
      this.t = t;
    }
  };

  // ───────────────────────────────────────────── EnvelopeGuard.java
  function Limits() {
    this.ceilingM = 120.0;
    this.vlosRadiusM = NaN;          // NaN until a real flight measures it
    this.vlosFallbackM = 100.0;
    this.standoffHorizM = 2.5;
    this.standoffVertM = 1.5;
    this.standoffAdvisory = true;    // shipped default: WARNS rather than aborts (see source)
    this.minRateHz = 5;
    this.maxRateHz = 25;
    this.maxTiltDeg = 40.0;
    this.posUncertaintyM = NaN;
  }
  Limits.prototype.effectiveRadiusM = function () { return isNaN(this.vlosRadiusM) ? this.vlosFallbackM : this.vlosRadiusM; };
  Limits.prototype.radiusIsMeasured = function () { return !isNaN(this.vlosRadiusM); };

  const Verdict = {
    ok: () => ({ allowed: true, rule: 'OK', message: 'within envelope' }),
    deny: (rule, message) => ({ allowed: false, rule, message }),
    warn: (rule, message) => ({ allowed: true, rule, message }),
  };
  const isAdvisory = v => v.allowed && v.rule !== 'OK';
  const vstr = v => (v.allowed ? 'ALLOW' : 'REFUSE ' + v.rule) + ' — ' + v.message;

  function EnvelopeGuard(limits) {
    this.L = limits;
    this.lastCommandMs = 0;
    this.camRangeM = NaN;            // the replica has no camera, so the GPS cylinder applies
  }
  EnvelopeGuard.prototype.hasCameraRange = function () { return !isNaN(this.camRangeM); };
  EnvelopeGuard.prototype.separationM = function (gpsHoriz) {
    return isNaN(this.camRangeM) ? gpsHoriz : this.camRangeM * (1.0 - 0.20);
  };
  EnvelopeGuard.prototype.uncertaintyNote = function () {
    const u = this.L.posUncertaintyM;
    if (isNaN(u) || u <= 0) return ' (fix accuracy unknown)';
    if (u >= this.L.standoffHorizM) return ' +/-' + f0(u) + ' m — WIDER THAN THE KEEP-OUT ITSELF';
    return ' +/-' + f0(u) + ' m';
  };
  EnvelopeGuard.prototype.make = function (rule, msg) {
    return this.L.standoffAdvisory ? Verdict.warn(rule, msg + '  [ADVISORY — not enforced]') : Verdict.deny(rule, msg);
  };
  EnvelopeGuard.prototype.checkTarget = function (east, north, altAgl) {
    const L = this.L;
    if (isNaN(east) || isNaN(north) || isNaN(altAgl)) return Verdict.deny('BAD_INPUT', 'target contains NaN — refusing rather than guessing');
    const horiz = Math.hypot(east, north);
    // 1. standoff from the pilot — the only rule where a violation can injure someone
    if (this.hasCameraRange()) {
      const sep = this.separationM(horiz);
      if (sep < L.standoffHorizM) {
        const m = 'within ' + f1(L.standoffHorizM) + ' m of the pilot — camera says ' + f1(this.camRangeM) + ' m (' + f1(sep) + ' m allowing for size)';
        return L.standoffAdvisory ? Verdict.warn('STANDOFF', m) : Verdict.deny('STANDOFF', m);
      }
    } else if (horiz < L.standoffHorizM && altAgl < L.standoffVertM) {
      return this.make('STANDOFF', 'inside the ' + f0(L.standoffHorizM) + ' m x ' + f0(L.standoffVertM) +
        ' m keep-out around the pilot (at ' + f1(horiz) + ' m out' + this.uncertaintyNote() + ', ' + f1(altAgl) + ' m up)');
    }
    // 2. altitude ceiling
    if (altAgl > L.ceilingM) return Verdict.deny('CEILING', f1(altAgl) + ' m exceeds the ' + f0(L.ceilingM) + ' m ceiling by ' + f1(altAgl - L.ceilingM) + ' m');
    if (altAgl < 0) return Verdict.deny('BELOW_GROUND', 'target altitude ' + f1(altAgl) + ' m is below the launch plane');
    // 3. VLOS radius
    const r = L.effectiveRadiusM();
    if (horiz > r) return Verdict.deny('VLOS_RADIUS', f0(horiz - r) + ' m beyond the ' +
      (L.radiusIsMeasured() ? 'measured' : 'unmeasured/conservative') + ' ' + f0(r) + ' m VLOS radius');
    return Verdict.ok();
  };
  EnvelopeGuard.prototype.checkMove = function (fromE, fromN, fromAlt, toE, toN, toAlt) {
    const L = this.L;
    const v = this.checkTarget(toE, toN, toAlt);
    if (v.allowed || v.rule !== 'STANDOFF') return v;
    const hNow = Math.hypot(fromE, fromN), hTo = Math.hypot(toE, toN);
    const inNow = this.hasCameraRange() ? this.separationM(hNow) < L.standoffHorizM
                                        : (hNow < L.standoffHorizM && fromAlt < L.standoffVertM);
    if (!inNow) return v;
    const better = (hTo > hNow + 1e-6) || (toAlt > fromAlt + 1e-6);
    const worse = (hTo < hNow - 1e-6) && (toAlt < fromAlt - 1e-6);
    if (better && !worse) return Verdict.ok();
    return this.make('STANDOFF', 'inside the ' + f1(L.standoffHorizM) + ' m x ' + f1(L.standoffVertM) +
      ' m keep-out and not moving clear (' + f1(hNow) + ' m out' + this.uncertaintyNote() + ', ' + f1(fromAlt) + ' m up)');
  };
  /** Clamp an otherwise-legal target back onto the envelope boundary, preserving bearing. */
  EnvelopeGuard.prototype.clampTarget = function (east, north, altAgl) {
    const r = this.L.effectiveRadiusM();
    const horiz = Math.hypot(east, north);
    let e = east, n = north;
    if (horiz > r && horiz > 0) { const k = r / horiz; e = east * k; n = north * k; }
    const a = Math.max(0, Math.min(altAgl, this.L.ceilingM));
    return [e, n, a];
  };
  EnvelopeGuard.prototype.noteCommandSent = function (nowMs) { this.lastCommandMs = nowMs; };
  EnvelopeGuard.prototype.deadlineMs = function () { return Math.ceil(1000.0 / this.L.minRateHz); };
  EnvelopeGuard.prototype.watchdogExpired = function (nowMs) {
    if (this.lastCommandMs === 0) return false;
    return (nowMs - this.lastCommandMs) > this.deadlineMs();
  };
  EnvelopeGuard.prototype.summary = function () {
    const L = this.L;
    return 'ceiling ' + f0(L.ceilingM) + 'm · radius ' + f0(L.effectiveRadiusM()) + 'm' +
      (L.radiusIsMeasured() ? '' : ' (unmeasured)') + ' · standoff ' + f1(L.standoffHorizM) + 'm/' + f1(L.standoffVertM) + 'm' +
      (L.standoffAdvisory ? ' ADVISORY (not enforced)' : '') + ' · ' + L.minRateHz + '-' + L.maxRateHz + 'Hz';
  };

  // ───────────────────────────────────────────── Primitives.java
  const P = {
    CRUISE: 3.0, VERT: 1.0, YAW_RATE: 45.0, ARRIVE: 1.5, YAW_TOL: 4.0,
    HAND_CRUISE: 2.5, HAND_VERT: 1.5, HAND_RAMP_M: 1.0,
    G_V: 2.0, G_T: 0.22, G_YAW: 70.0, G_LOOK: 55.0,
  };
  const sgn = x => (x > 0) - (x < 0);
  const jmod = (a, b) => a - b * Math.trunc(a / b);   // Java % semantics

  P.hold = seconds => {
    let t = 0;
    return { name: () => 'HOLD ' + f0(seconds) + 's',
      step(e, n, alt, hdg, dt) { t += dt; if (t >= seconds) return null; return [0, 0, 0, 0]; } };
  };
  P.gotoRelative = (tE, tN, tAlt) => {
    let t = 0, best = NaN, stalled = 0, limit = -1;
    return { name: () => 'GOTO ' + f0(tE) + 'E ' + f0(tN) + 'N ' + f0(tAlt) + 'm',
      step(e, n, alt, hdg, dt) {
        const dE = tE - e, dN = tN - n, dA = tAlt - alt;
        const horiz = Math.hypot(dE, dN);
        if (limit < 0) limit = Math.max(horiz / P.CRUISE, Math.abs(dA) / P.VERT) * 3.0 + 15.0;
        if (horiz <= P.ARRIVE && Math.abs(dA) <= P.ARRIVE) return null;
        t += dt;
        if (t > limit) return null;
        const togo = Math.hypot(horiz, dA);
        if (isNaN(best) || togo < best - 0.5) { best = togo; stalled = 0; }
        else { stalled += dt; if (stalled > 8.0) return null; }
        // taper the last 8 m so it arrives rather than overshoots
        const speed = Math.min(P.CRUISE, Math.max(0.4, horiz / 8.0 * P.CRUISE));
        let vE = 0, vN = 0;
        if (horiz > 0.05) { vE = dE / horiz * speed; vN = dN / horiz * speed; }
        const vUp = Math.max(-P.VERT, Math.min(P.VERT, dA));
        return [vE, vN, vUp, 0];
      } };
  };
  P.climbTo = targetAlt => {
    let t = 0, stalled = 0, bestGap = NaN;
    const limit = Math.abs(targetAlt) / P.VERT * 3.0 + 8.0;
    return { name: () => 'CLIMB ' + f0(targetAlt) + 'm',
      step(e, n, alt, hdg, dt) {
        const dA = targetAlt - alt, gap = Math.abs(dA);
        if (gap <= 0.4) return null;
        t += dt;
        if (t > limit) return null;
        if (isNaN(bestGap) || gap < bestGap - 0.15) { bestGap = gap; stalled = 0; }
        else { stalled += dt; if (stalled > 6.0) return null; }
        let vUp = Math.max(-P.VERT, Math.min(P.VERT, dA));
        if (gap < 1.5) vUp *= 0.5;
        return [0, 0, vUp, 0];                      // <- no horizontal, ever
      } };
  };
  P.yawBy = (label, degrees, rate) => {
    const limit = Math.abs(degrees);
    const timeout = limit / Math.max(5.0, Math.abs(rate)) * 4.0 + 1.5;
    let last = NaN, turned = 0, t = 0;
    return { name: () => label,
      step(e, n, alt, hdg, dt) {
        t += dt;
        if (!isNaN(last)) { const d = jmod(hdg - last + 540, 360) - 180; turned += Math.abs(d); }
        last = hdg;
        if (turned >= limit || t >= timeout) return null;
        let r = Math.abs(rate); const remain = limit - turned;
        if (remain < r * dt) r = Math.max(5.0, remain / dt);
        return [0, 0, 0, r * sgn(degrees)];
      } };
  };
  P.pirouette = rate => {
    let turned = 0;
    return { name: () => 'PIROUETTE 360°',
      step(e, n, alt, hdg, dt) { turned += Math.abs(rate) * dt; if (turned >= 360) return null; return [0, 0, 0, rate]; } };
  };
  P.nudge = (label, vE, vN, vUp, seconds) => {
    let t = 0;
    return { name: () => label,
      step(e, n, alt, hdg, dt) { t += dt; if (t >= seconds) return null; return [vE, vN, vUp, 0]; } };
  };
  P.yes = () => [
    P.nudge('YES ↑', 0, 0, P.G_V, P.G_T), P.nudge('YES ↓', 0, 0, -P.G_V, P.G_T),
    P.nudge('YES ↑', 0, 0, P.G_V, P.G_T), P.nudge('YES ↓', 0, 0, -P.G_V, P.G_T), P.hold(0.25)];
  P.no = () => [
    P.yawBy('NO ↰', -P.G_LOOK, P.G_YAW), P.hold(0.2), P.yawBy('NO ↱', P.G_LOOK * 2, P.G_YAW),
    P.hold(0.2), P.yawBy('NO ↰', -P.G_LOOK, P.G_YAW), P.hold(0.3)];

  // ───────────────────────────────────────────── Autopilot.java
  const TICK_MS = 100;
  function Autopilot(link, guard, log) {
    this.link = link; this.guard = guard; this.log = log || (() => {});
    this.queue = []; this.state = 'DISARMED'; this.current = null; this.listener = null;
    this.lastTickMs = 0; this.note = ''; this.lastAdvisoryMs = 0; this.lastClampMs = 0; this.aborts = 0;
    this.tick = this.tick.bind(this);
  }
  const AP = Autopilot.prototype;
  AP.currentName = function () { return this.current ? this.current.name() : ''; };
  AP.emit = function () { if (this.listener) this.listener(this.state, this.currentName(), this.note); };
  AP.fail = function (why) { this.note = why; this.log('W', 'autopilot: ' + why); this.emit(); };
  AP.safeStick = function (on) { try { this.link.setVirtualStickEnabled(on); } catch (t) { this.log('E', 'virtual stick failed: ' + t); } };
  AP.arm = function () {
    if (!this.link.connected()) { this.fail('cannot arm — no aircraft'); return false; }
    if (this.state !== 'DISARMED') { this.fail('already ' + this.state); return false; }
    this.state = 'ARMED';
    this.note = this.queue.length === 0 ? 'armed — pick a gesture' : this.queue.length + ' queued · press RUN';
    this.log('I', 'autopilot ARMED'); this.emit(); return true;
  };
  AP.disarm = function () {
    this.queue = []; this.current = null; this.state = 'DISARMED'; this.note = 'disarmed';
    this.log('I', 'autopilot DISARMED'); this.handBack(0); this.emit();
  };
  AP.abort = function (why) {
    if (this.state === 'DISARMED') return;
    this.aborts++; this.state = 'ABORTING'; this.queue = []; this.current = null;
    try { this.link.sendVelocity(0, 0, 0, 0); } catch (e) {}
    this.safeStick(false);
    this.state = 'DISARMED'; this.note = 'ABORTED — ' + why;
    this.log('W', 'autopilot ABORT: ' + why); this.emit(); this.handBack(0);
  };
  AP.handBack = function (attempt) {
    SimClock.post(() => {
      if (!this.link.inJoystickMode()) return;
      if (attempt >= 6) { this.note = 'STICKS MAY STILL BE LOCKED — FLIP THE RC MODE SWITCH'; this.emit(); return; }
      this.safeStick(false); this.handBack(attempt + 1);
    }, 300);
  };
  AP.enqueue = function (p) {
    if (this.state === 'RUNNING' || this.state === 'ABORTING') { this.fail('cannot queue while ' + this.state); return false; }
    this.queue.push(p);
    this.note = this.queue.length + ' queued · ' + (this.state === 'ARMED' ? 'press RUN' : 'press ARM then RUN');
    this.emit(); return true;
  };
  AP.start = function () {
    if (this.state === 'DISARMED') { this.fail('press ARM before RUN'); return false; }
    if (this.state !== 'ARMED') { this.fail('cannot start — ' + this.state); return false; }
    if (this.queue.length === 0) { this.fail('nothing queued — pick a gesture first'); return false; }
    this.safeStick(true);
    this.state = 'RUNNING'; this.lastTickMs = SimClock.now();
    this.guard.noteCommandSent(this.lastTickMs);
    this.note = 'running'; this.log('I', 'autopilot RUNNING, ' + this.queue.length + ' primitive(s)');
    this.emit(); SimClock.post(this.tick, 0); return true;
  };
  AP.tick = function () {
    if (this.state !== 'RUNNING') return;
    const link = this.link, guard = this.guard;
    if (!link.connected()) { this.abort('aircraft link lost'); return; }
    const now = SimClock.now();
    const dt = Math.max(0.001, (now - this.lastTickMs) / 1000.0);
    // RULE 3: a missed deadline commands zero, never a stale repeat.
    if (guard.watchdogExpired(now)) {
      link.sendVelocity(0, 0, 0, 0); guard.noteCommandSent(now); this.lastTickMs = now;
      SimClock.post(this.tick, TICK_MS); return;
    }
    if (!this.current) this.current = this.queue.shift() || null;
    if (!this.current) {
      link.sendVelocity(0, 0, 0, 0); guard.noteCommandSent(now);
      this.note = 'sequence complete'; this.log('I', 'autopilot sequence complete');
      this.disarm(); return;
    }
    const p = link.position(), hdg = link.heading();
    let cmd;
    try { cmd = this.current.step(p[0], p[1], p[2], hdg, dt); }
    catch (t) { this.abort('primitive ' + this.current.name() + ' threw: ' + t); return; }
    if (cmd === null) {
      this.log('I', 'primitive complete: ' + this.current.name());
      this.current = null; link.sendVelocity(0, 0, 0, 0); guard.noteCommandSent(now); this.lastTickMs = now;
      SimClock.post(this.tick, TICK_MS); this.emit(); return;
    }
    // RULE 2: project one tick ahead and refuse if that would leave the envelope.
    const aheadE = p[0] + cmd[0] * dt, aheadN = p[1] + cmd[1] * dt, aheadA = p[2] + cmd[2] * dt;
    let v = guard.checkMove(p[0], p[1], p[2], aheadE, aheadN, aheadA);
    // A vertical limit is a FLOOR to stop at, not a fault to abandon the flight over.
    if (!v.allowed && (v.rule === 'BELOW_GROUND' || v.rule === 'CEILING')) {
      cmd[2] = 0;
      v = guard.checkMove(p[0], p[1], p[2], aheadE, aheadN, Math.max(p[2], 0.5));
      if (v.allowed && now - this.lastClampMs > 2000) {
        this.lastClampMs = now; this.note = 'holding altitude — ' + v.rule;
        this.log('I', 'envelope clamp: vertical held, ' + v.rule); this.emit();
      }
    }
    if (!v.allowed) { this.abort('envelope: ' + v.rule + ' — ' + v.message); return; }
    if (isAdvisory(v) && now - this.lastAdvisoryMs > 2000) {
      this.lastAdvisoryMs = now; this.note = 'WARNING ' + v.rule + ' — ' + v.message;
      this.log('W', 'envelope ADVISORY: ' + v.rule + ' — ' + v.message); this.emit();
    }
    link.sendVelocity(cmd[0], cmd[1], cmd[2], cmd[3]);
    guard.noteCommandSent(now); this.lastTickMs = now;
    SimClock.post(this.tick, TICK_MS);
  };

  // ───────────────────────────────────────────── AxisMonitor.java
  function AxisMonitor() { this.verdict = 'UNVERIFIED'; this.badAxis = ''; this.badStreak = 0; }
  AxisMonitor.CMD_MIN = 0.35; AxisMonitor.OBS_MIN = 0.25; AxisMonitor.STREAK = 6;
  AxisMonitor.prototype.faulted = function () { return this.verdict.indexOf('FAULT') === 0; };
  AxisMonitor.prototype.observe = function (cmdN, cmdE, cmdUp, obsN, obsE, obsUp) {
    if (this.faulted()) return null;
    const dis = (c, o, name) => (Math.abs(c) <= AxisMonitor.CMD_MIN || Math.abs(o) <= AxisMonitor.OBS_MIN || sgn(o) === sgn(c)) ? null : name + ' inverted';
    let bad = dis(cmdN, obsN, 'NORTH'); if (!bad) bad = dis(cmdE, obsE, 'EAST'); if (!bad) bad = dis(cmdUp, obsUp, 'UP');
    if (!bad) {
      this.badStreak = 0; this.badAxis = '';
      const judged = Math.abs(cmdN) > AxisMonitor.CMD_MIN || Math.abs(cmdE) > AxisMonitor.CMD_MIN || Math.abs(cmdUp) > AxisMonitor.CMD_MIN;
      if (judged && this.verdict !== 'OK') this.verdict = 'OK';
      return null;
    }
    if (bad !== this.badAxis) { this.badAxis = bad; this.badStreak = 0; }
    if (++this.badStreak < AxisMonitor.STREAK) return null;
    this.verdict = 'FAULT: ' + bad; return bad;
  };

  // ───────────────────────────────────────────── vehicle (icarus-sim acStep, generalised)
  /* The sim's model: commands reach the aircraft LATENCY_MS after they are sent, then the
     aircraft flies that velocity. Translation uses the sim's measured 500 ms. Yaw uses the
     one-tick lag Primitives.yawBy's own comment describes. DJI's auto modes (takeoff, landing,
     return-to-home) are not ICARUS code and are approximated plainly. */
  function Vehicle() { this.reset(); }
  Vehicle.LATENCY_MS = 500;
  Vehicle.YAW_LAG_MS = 100;
  Vehicle.prototype.reset = function () {
    this.e = 0; this.n = 0; this.u = 0; this.hdg = 0;
    this.v = [0, 0, 0, 0]; this.queue = []; this.joystick = false;
    this.flying = false; this.auto = '';   // '', 'TAKEOFF', 'LANDING', 'GO_HOME'
    this.batt = 87; this.sats = 0;
  };
  Vehicle.prototype.fcMode = function () {
    if (this.auto === 'TAKEOFF') return 'AUTO_TAKEOFF';
    if (this.auto === 'LANDING') return 'AUTO_LANDING';
    if (this.auto === 'GO_HOME') return 'GO_HOME';
    if (this.joystick) return 'JOYSTICK';
    return 'GPS_ATTI';
  };
  Vehicle.prototype.command = function (vE, vN, vUp, yaw, now) { this.queue.push({ at: now, c: [vE, vN, vUp, yaw] }); };
  /** integrate dt seconds ending at time now */
  Vehicle.prototype.step = function (dt, now) {
    // deliver queued commands whose latency has elapsed
    while (this.queue.length && now - this.queue[0].at >= Vehicle.LATENCY_MS) {
      const q = this.queue.shift(); this.v = [q.c[0], q.c[1], q.c[2], this.v[3]];
    }
    for (const q of this.queue) if (now - q.at >= Vehicle.YAW_LAG_MS) this.v[3] = q.c[3];
    let vE = 0, vN = 0, vU = 0, vY = 0;
    if (this.auto === 'TAKEOFF') {
      vU = 0.8; if (this.u + vU * dt >= 1.2) { this.u = 1.2; this.auto = ''; this.flying = true; this.onTakeoff && this.onTakeoff(); return; }
    } else if (this.auto === 'LANDING') {
      vU = this.u > 3 ? -1.5 : -0.7;
    } else if (this.auto === 'GO_HOME') {
      const h = Math.hypot(this.e, this.n);
      if (h > 0.5) { const s = Math.min(5, h); vE = -this.e / h * s; vN = -this.n / h * s; if (this.u < 20) vU = 1.5; }
      else { this.auto = 'LANDING'; }
    } else if (this.joystick && this.flying) {
      [vE, vN, vU, vY] = this.v;
    }
    if (!this.flying && this.auto !== 'TAKEOFF') { vE = vN = vU = vY = 0; }
    this.obs = [vN, vE, vU];
    this.e += vE * dt; this.n += vN * dt; this.u += vU * dt;
    this.hdg = ((this.hdg + vY * dt) % 360 + 360) % 360;
    if (this.flying && this.u <= 0) {
      this.u = 0;
      if (this.auto === 'LANDING') { this.flying = false; this.auto = ''; this.joystick = false; this.onLanded && this.onLanded(); }
    }
    if (this.flying) this.batt = Math.max(5, this.batt - dt * 0.055);
  };

  global.IcarusCore = { SimClock, Limits, EnvelopeGuard, Verdict, isAdvisory, vstr, Primitives: P, Autopilot, AxisMonitor, Vehicle, TICK_MS };
})(window);
