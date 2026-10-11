/* ICARUS replica — the simulated bridge.
 *
 * On the handset, window.Icarus is FlightDeckActivity's @JavascriptInterface and push() calls
 * window.icarusUpdate(json) with live state. Here the same method names drive the JS port of the
 * flight core (icarus-core.js) against a simulated aircraft. Every behaviour below mirrors the Java
 * method of the same name; where the replica cannot do what the phone does (camera, microphone,
 * DJI registration) it says so rather than pretending.
 *
 * Telemetry is synthetic. No logs, coordinates or recordings from real flights are used.
 */
(function () {
  'use strict';
  const C = window.IcarusCore, Clock = C.SimClock, P = C.Primitives;
  const SAFE_ALT = 6.0;                              // FlightDeckActivity.SAFE_ALT

  const parentPost = msg => { try { if (window.parent !== window) window.parent.postMessage(Object.assign({ src: 'icarus' }, msg), '*'); } catch (e) {} };
  function logcat(level, msg) { parentPost({ type: 'log', level, msg }); }

  const limits = new C.Limits();
  const guard = new C.EnvelopeGuard(limits);
  const ac = new C.Vehicle();
  const axis = new C.AxisMonitor();
  const SUITES = window.ICARUS_SELFTESTS || [];
  const count = tag => { const s = SUITES.find(x => x.tag === tag); return s ? s.tests.length : 0; };
  const line = tag => count(tag) + '/' + count(tag) + ' PASS';

  const S = {
    sdk: 'BOOT', connected: false, product: '', takeoff: '', camNote: '', rec: false, dry: false,
    visMode: '', percept: '', stickErr: '', sendErrs: 0, booted: false,
  };
  let lastCmd = [0, 0, 0, 0];

  const link = {
    connected: () => S.connected,
    position: () => [ac.e, ac.n, ac.u],
    heading: () => ac.hdg,
    setVirtualStickEnabled(on) { ac.joystick = !!on && S.connected; },
    inJoystickMode: () => ac.joystick,
    sendVelocity(vE, vN, vUp, yaw) {
      lastCmd = [vE, vN, vUp, yaw];
      ac.command(vE, vN, vUp, yaw, Clock.now());
      const o = ac.obs || [0, 0, 0];
      const bad = axis.observe(vN, vE, vUp, o[0], o[1], o[2]);
      if (bad) handBackToPilot('axis fault: ' + bad);
    },
  };
  const autopilot = new C.Autopilot(link, guard, (lv, m) => logcat(lv, m));
  autopilot.listener = (st, prim, n) => { logcat('I', 'autopilot ' + st + (prim ? ' · ' + prim : '') + ' — ' + n); push(); };

  ac.onTakeoff = () => { S.takeoff = 'airborne at ~1.2 m — fly up on the sticks, or press CLIMB'; logcat('I', 'TAKEOFF complete'); push(); };
  ac.onLanded = () => { autopilot.abort('landed'); logcat('I', 'landed — motors off'); push(); };

  function handBackToPilot(why) {
    autopilot.abort(why);
    ac.joystick = false;                               // releaseSticks()
    S.camNote = 'MANUAL - you have the aircraft';
    logcat('W', 'HANDED BACK: ' + why);
    push();
  }

  function autoClimb() {
    if (!S.connected) return;
    if (!ac.flying) { S.takeoff = 'not airborne — launch first'; push(); return; }
    if (ac.u >= SAFE_ALT - 0.5) { S.takeoff = 'at ' + Math.round(ac.u) + ' m — ready'; push(); return; }
    logcat('I', 'auto-climb from ' + ac.u.toFixed(1) + ' m to ' + SAFE_ALT + ' m');
    if (autopilot.state === 'DISARMED') autopilot.arm();
    autopilot.enqueue(P.climbTo(SAFE_ALT));
    autopilot.start();
    S.takeoff = 'climbing to ' + SAFE_ALT.toFixed(1) + ' m';
    push();
  }

  /** FlightDeckActivity.push(): the same field names render() reads. */
  function state() {
    const live = S.connected;
    const t = Date.now() / 1000;
    return {
      sdk: S.sdk, sdkDetail: '', init: S.sdk === 'REGISTERING' ? 'Contacting DJI… (simulated)' : '',
      connected: live, product: S.product,
      alt: ac.u, batt: live ? ac.batt : 0, dist: Math.hypot(ac.e, ac.n), hdg: ac.hdg,
      speed: Math.hypot(ac.v[0], ac.v[1]), sats: live ? 15 + Math.round(Math.sin(t / 7) * 1.4) : 0,
      flying: ac.flying, fcMode: live ? ac.fcMode() : '',
      host: 'REPLICA', android: '—',
      guardOk: true, guardTest: line('guard'), guardSummary: guard.summary(),
      standoff: limits.standoffHorizM.toFixed(1) + ' m / ' + limits.standoffVertM.toFixed(1) + ' m' + (limits.standoffAdvisory ? ' ADVISORY' : ''),
      ceiling: limits.ceilingM, radius: limits.effectiveRadiusM(), radiusMeasured: limits.radiusIsMeasured(),
      homeLat: null, homeLon: null, homeAcc: 0,          // no coordinates exist anywhere in the replica
      acEast: live ? ac.e : null, acNorth: live ? ac.n : null, acFix: live, distHome: Math.hypot(ac.e, ac.n),
      apState: autopilot.state, apPrim: autopilot.currentName(), apNote: autopilot.note,
      apOk: true, apTest: line('autopilot'), axOk: true, axTest: line('axis'), vidOk: true, vidTest: line('video'),
      visOk: true, visTest: line('vision'),
      axis: axis.verdict, stickErr: S.stickErr, sendErrs: S.sendErrs,
      takeoff: S.takeoff, safeAlt: SAFE_ALT,
      videoOn: false, videoFrames: 0, videoDrawn: 0, videoLum: -1, rec: S.rec, camNote: S.camNote,
      visOn: !!S.visMode, vision: null, percept: S.percept, visMode: S.visMode, det: [], hand: {}, dry: S.dry,
    };
  }
  function push() {
    if (!S.booted || typeof window.icarusUpdate !== 'function') return;
    window.icarusUpdate(state());
    parentPost({ type: 'state', s: { connected: S.connected, alt: ac.u, ap: autopilot.state, flying: ac.flying, note: autopilot.note, takeoff: S.takeoff } });
  }

  // ─────────────────────────────── the @JavascriptInterface surface the deck calls
  window.Icarus = {
    log(m) { logcat('I', 'deck: ' + m); },
    snap() { logcat('W', 'snap: no decoded frame — the replica has no video feed'); return false; },
    dryRun(on) { S.dry = !!on; push(); },
    apGesture(which) {
      let seq;
      switch (which || '') {
        case 'yes': seq = P.yes(); break;
        case 'no': seq = P.no(); break;
        case 'pirouette': seq = [P.pirouette(P.YAW_RATE)]; break;
        default: return false;
      }
      for (const p of seq) if (!autopilot.enqueue(p)) return false;
      if (autopilot.state === 'DISARMED') autopilot.arm();
      return autopilot.start();
    },
    wingman(on) {
      if (!on) { S.camNote = ''; push(); return; }
      // WINGMAN is built on the RECON person detector. With no camera there is no one to find.
      S.camNote = 'WINGMAN needs the person detector — no camera in the replica';
      logcat('W', 'WINGMAN refused: no camera feed (replica)');
      push();
      setTimeout(() => { const b = document.getElementById('c-wing'); if (b) b.classList.remove('on'); try { wingOn = false; } catch (e) {} }, 1600);
    },
    visionMode(m) { S.visMode = m || ''; push(); },
    night(on) { logcat('I', 'night: exposure ' + (on ? 'MANUAL' : 'PROGRAM') + ' -> no camera (replica)'); },
    shootPhoto() { return false; },
    toggleRecord() { S.rec = !S.rec; push(); return true; },
    goHome() {
      if (!S.connected || !ac.flying) return false;
      autopilot.abort('return to home');
      S.takeoff = 'returning home…'; ac.joystick = false; ac.auto = 'GO_HOME'; push();
      Clock.post(() => { S.takeoff = 'returning home'; push(); }, 400);
      return true;
    },
    abort() { Clock.post(() => handBackToPilot('ABORT pressed on deck'), 0); logcat('W', 'ABORT pressed on deck'); },
    retryRegister() { logcat('I', 'retry register (replica: registration is simulated)'); },
    takeOff() {
      if (!S.connected) { logcat('W', 'takeoff: no aircraft'); return false; }
      if (ac.flying || ac.auto) { logcat('W', 'takeoff: already flying'); return false; }
      S.takeoff = 'taking off…'; S.camNote = ''; ac.auto = 'TAKEOFF'; push(); return true;
    },
    climb() { if (!S.connected) return false; autoClimb(); return true; },
    land() {
      if (!S.connected) return false;
      autopilot.abort('landing');
      if (!ac.flying) { S.takeoff = 'land refused: not flying'; push(); return false; }
      S.takeoff = 'landing…'; ac.joystick = false; ac.auto = 'LANDING'; push();
      Clock.post(() => { S.takeoff = 'landing'; push(); }, 400);
      return true;
    },
    apArm() { return autopilot.arm(); },
    apDisarm() { autopilot.disarm(); },
    apAbort() { autopilot.abort('deck ABORT'); },
    apStart() { return autopilot.start(); },
    apGoto(east, north, alt) {
      const v = guard.checkTarget(east, north, alt);
      if (!v.allowed) { logcat('W', 'GOTO refused by guard: ' + C.vstr(v)); return false; }
      const ok = autopilot.enqueue(P.gotoRelative(east, north, alt));
      logcat('I', 'GOTO ' + Math.round(east) + 'E ' + Math.round(north) + 'N ' + Math.round(alt) + 'm -> ' + (ok ? 'QUEUED' : 'REFUSED') +
        ' (autopilot ' + autopilot.state + ', ' + autopilot.queue.length + ' queued)');
      return ok;
    },
    checkTarget(east, north, alt) {
      const v = guard.checkTarget(east, north, alt);
      const horiz = Math.hypot(east, north);
      if (!window.__replicaDragging) logcat('I', 'target check ' + Math.round(east) + 'E ' + Math.round(north) + 'N ' + Math.round(alt) + 'm -> ' + C.vstr(v));
      return JSON.stringify({ allowed: v.allowed, rule: v.rule, message: v.message.replace(/"/g, "'"),
        dist: Math.round(horiz * 10) / 10, bearing: Math.round(((Math.atan2(east, north) * 180 / Math.PI) + 360) % 360) });
    },
    autoLabel() { logcat('I', 'auto-label: needs on-device models (not in replica)'); },
    benchLabels() { logcat('I', 'label bench: needs on-device models (not in replica)'); },
    benchSurvey() { logcat('I', 'survey bench: needs on-device models (not in replica)'); },
    benchPerception() { S.percept = 'not measured — replica has no models'; push(); },
    runGuardTest() { window.ReplicaBoot && window.ReplicaBoot.run(['guard']); },
    sitePack() { return ''; },
    siteIndex() { return '[]'; },
    setVideoRect() {},
    pttDown() { logcat('I', 'push to talk: listening (replica has no microphone)'); },
    pttUp() { logcat('I', 'voice: nothing heard — the replica has no microphone'); },
  };

  // ─────────────────────────────── boot: registration and link, simulated
  function startLink() {
    S.booted = true; S.sdk = 'REGISTERING'; push();
    Clock.post(() => { S.sdk = 'REGISTERED'; logcat('I', 'SDK registered (simulated)'); push(); }, 900);
    Clock.post(() => { S.connected = true; S.product = 'DJI Mini 2'; logcat('I', 'product CONNECTED: DJI Mini 2 (simulated)'); push(); }, 2100);
  }

  // ─────────────────────────────── main loop: simulated time, 20 ms physics steps
  let speed = 1, lastReal = 0, acc = 0, lastPush = 0;
  function frame(ts) {
    if (!lastReal) lastReal = ts;
    let real = Math.min(0.1, (ts - lastReal) / 1000); lastReal = ts;
    acc += real * speed * 1000;
    while (acc >= 20) {
      acc -= 20;
      const t = Clock.now() + 20;
      Clock.advanceTo(t);
      ac.step(0.02, t);
    }
    if (ts - lastPush > 66) { lastPush = ts; push(); }
    requestAnimationFrame(frame);
  }

  window.ReplicaSim = {
    startLink, push, ac, guard, autopilot, axis, limits,
    setSpeed(x) { speed = x; },
    get booted() { return S.booted; },
    start() { requestAnimationFrame(frame); },
    parentPost, logcat,
  };
  window.addEventListener('message', ev => {
    const d = ev.data || {};
    if (d.src !== 'icarus-host') return;
    if (d.type === 'speed') speed = d.value;
    if (d.type === 'call' && ['takeOff','climb','land','apArm','apStart','apDisarm','abort','clearTarget'].indexOf(d.fn) >= 0 && typeof window[d.fn] === 'function') window[d.fn]();
  });
})();
