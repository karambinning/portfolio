/* K·A·M RIDE — portfolio console demo.
   Sprites, themes, buddy species, boss names/rules and the turbo road are ported from the app's
   Kotlin source (Themes.kt, Pixel.kt, GameUi.kt, game/Buddy.kt, game/Game.kt, game/FastRun.kt) via
   the faithful web port in demo/ride. The game around them is a demo made for this page:
   keys stand in for hills. Mock data only — no GPS, no maps, no places. */
(() => {
"use strict";
const $ = id => document.getElementById(id);
const cv = $("scr"), g = cv.getContext("2d");
const W = 256, H = 144, GROUND = 120, PX = 52, SIM = 6;
cv.width = W; cv.height = H; g.imageSmoothingEnabled = false;

const mq = matchMedia("(prefers-reduced-motion: reduce)");
let RM = mq.matches;
mq.addEventListener ? mq.addEventListener("change", e => { RM = e.matches; }) : mq.addListener(e => { RM = e.matches; });
const store = {
  get(k, d) { try { const v = localStorage.getItem("kamride." + k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("kamride." + k, v); } catch (e) {} },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---------- Themes.kt ---------- */
const THEMES = [
  { id: "kam",  name: "K·A·M",       screen: "#04080F", ink: "#00D4FF", ink2: "#00FF88", label: "#4A6888", accent: "#AA66FF" },
  { id: "ride", name: "RIDE",        screen: "#000000", ink: "#FFFFFF", ink2: "#FFFF00", label: "#FFFF00", accent: "#FFFF00" },
  { id: "nes",  name: "NES",         screen: "#000000", ink: "#FCFCFC", ink2: "#BCBCBC", label: "#F83800", accent: "#FCA044" },
  { id: "vboy", name: "VIRTUAL BOY", screen: "#000000", ink: "#FF1A1A", ink2: "#B00000", label: "#800000", accent: "#FF5050" },
];
/* ---------- game/Buddy.kt ---------- */
const SPECIES = [
  { id: "bit", root: "BIT", frame: ["....XXXX....", "..XXXXXXXX..", ".XXXXXXXXXX.", ".XX..XX..XX.", ".XX..XX..XX.", ".XXXXXXXXXX.", ".XXXX..XXXX.", "..XXXXXXXX..", "...XXXXXX...", "..X......X..", ".X........X."], legs2: "...X....X..." },
  { id: "bot", root: "BOT", frame: [".....X......", "..XXXXXXXX..", "..XXXXXXXX..", "..X..XX..X..", "..X..XX..X..", "..XXXXXXXX..", "..XX.X.X.XX.", "XXXXXXXXXXXX", "..XXXXXXXX..", "..XX....XX..", "..XX....XX.."], legs2: "...XX..XX..." },
  { id: "pip", root: "PIP", frame: ["....XXXX....", "...XXXXXX...", "..XXXXXXXX..", "..XX.XX.XXX.", "..XXXXXXXXXX", "..XXXXXXXXX.", ".XXXXXXXXX..", "XXXXXXXXXX..", "..XXXXXXX...", "...X...X....", "..XX..XX...."], legs2: "...XX..XX..." },
  { id: "kit", root: "KIT", frame: [".X........X.", ".XX......XX.", ".XXXXXXXXXX.", ".XX.XXXX.XX.", ".XXXXXXXXXX.", "..XXX..XXX..", "...XXXXXX...", "..XXXXXXXX.X", "..XXXXXXXXX.", "..X.X..X.X..", "..X......X.."], legs2: "...X....X..." },
  { id: "goo", root: "GOO", frame: ["............", "....XXXX....", "..XXXXXXXX..", ".XXX.XX.XXX.", ".XXX.XX.XXX.", "XXXXXXXXXXXX", "XXXX....XXXX", "XXXXXXXXXXXX", "XXXXXXXXXXXX", "X.XX.XX.XX.X", "X..X.XX.X..X"], legs2: ".X.XX..XX.X." },
];
function petFrames(id) {          // Screens.kt petFrames(): frame 0, and frame 1 bobbed down a row
  const s = SPECIES.find(x => x.id === id) || SPECIES[0];
  return [s.frame, ["............", ...s.frame.slice(0, 9), s.legs2]].map(f => {
    const bob = /^\.*$/.test(f[0]), rows = bob ? f.slice(1) : f.slice();
    return bob ? [".".repeat(12), ...rows] : [...rows, ".".repeat(12)];
  });
}
/* ---------- GameUi.kt sprites ---------- */
const COIN = ["..XXXX..", ".X....X.", "X..XX..X", "X..XX..X", "X..XX..X", "X..XX..X", ".X....X.", "..XXXX.."];
const COIN_SPIN = [COIN,
  ["...XX...", "..X..X..", "..X.XX..", "..X.XX..", "..X.XX..", "..X.XX..", "..X..X..", "...XX..."],
  ["...XX...", "...XX...", "...XX...", "...XX...", "...XX...", "...XX...", "...XX...", "...XX..."],
  ["...XX...", "..X..X..", "..XX.X..", "..XX.X..", "..XX.X..", "..XX.X..", "..X..X..", "...XX..."]];
const SHOT = [".XX.", "XXXX", "XXXX", ".XX."];
const GOLEM = ["...XXXXXXXX...", "..XX..XX..XX..", "..XXXXXXXXXX..", "XXXX.XXXX.XXXX", "XX.XXXXXXXX.XX", "XX.XX....XX.XX", "...XXXXXXXX...", "...XXX..XXX...", "..XXXX..XXXX..", "..XXX....XXX.."];
const DRAKE = ["X...........XX", "XX.......XXXX.", ".XXX...XXX.XX.", "..XXXXXXXXXXXX", "...XXXXXXXX...", "..XXXXXXXXXX..", ".XX.XXXXXX.XX.", "XX..XX..XX..XX", "....XX..XX....", "...XXX..XXX..."];
const KING = ["X..X..XX..X..X", "XXXXXXXXXXXXXX", ".XXXXXXXXXXXX.", ".XX..XXXX..XX.", ".XX..XXXX..XX.", ".XXXXXXXXXXXX.", ".XXX......XXX.", "..XXXXXXXXXX..", ".XX.XXXXXX.XX.", "XX..XX..XX..XX"];
const SLIME = ["....XXXXXX....", "..XXXXXXXXXX..", ".XXXXXXXXXXXX.", ".XX..XXXX..XX.", "XXX..XXXX..XXX", "XXXXXXXXXXXXXX", "XXXX.XXXX.XXXX", "XXXXX....XXXXX", ".XXXXXXXXXXXX.", "X.X.X.X.X.X.X."];
const bossArt = n => n.includes("GOLEM") ? GOLEM : n.includes("DRAKE") ? DRAKE : n.includes("KING") ? KING : SLIME;
const NAMES = ["HILL SLIME", "RIDGE GOLEM", "SLOPE DRAKE", "SUMMIT KING"];          // game/Game.kt
const xpFor = l => 50 * l * (l - 1);                                                     // Rules
const levelFor = xp => Math.min(99, Math.max(1, Math.floor((1 + Math.sqrt(1 + 8 * xp / 100)) / 2)));
const FREE_RIDE_MAX_HP = 14, BOSS_COINS = 5, BASELINE_KMH = 25, FR_FACTOR = 1.2;       // Game.kt, FastRun.kt
const TURBO_KMH = Math.round(BASELINE_KMH * FR_FACTOR);                                  // 30
/* demo-only sprites */
const WHEEL = [
  ["..XXXXX..", ".X..X..X.", "X...X...X", "X...X...X", "XXXXXXXXX", "X...X...X", "X...X...X", ".X..X..X.", "..XXXXX.."],
  ["..XXXXX..", ".X.....X.", "X.X...X.X", "X..X.X..X", "X...X...X", "X..X.X..X", "X.X...X.X", ".X.....X.", "..XXXXX.."]];
const CONE = ["...X...", "..XXX..", "..X.X..", "..XXX..", ".XXXXX.", ".X...X.", ".XXXXX.", "XXXXXXX"];
const ROCK = ["..XXX...", ".XXXXXX.", "XX.XXXXX", "XXXXX.XX", "XXXXXXXX"];
const POWER = ["...X...", ".X.X.X.", "X..X..X", "X..X..X", "X.....X", ".X...X.", "..XXX.."];

/* ---------- drawing helpers ---------- */
const sprCache = new Map();
function spr(rows, color) {
  const k = color + "|" + rows.join("/");
  let c = sprCache.get(k);
  if (!c) {
    c = document.createElement("canvas"); c.width = Math.max(...rows.map(r => r.length)); c.height = rows.length;
    const x = c.getContext("2d"); x.fillStyle = color;
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) if (r[i] === "X") x.fillRect(i, y, 1, 1); });
    sprCache.set(k, c);
  }
  return c;
}
function draw(rows, color, x, y, s = 1) { const c = spr(rows, color); g.drawImage(c, Math.round(x), Math.round(y), c.width * s, c.height * s); }
function rect(c, x, y, w, h) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function txt(s, x, y, c, size = 8, align = "left", fam = "PS2P") {
  g.font = `${size}px "${fam}"`; g.textBaseline = "top"; g.textAlign = align; g.fillStyle = c; g.fillText(s, Math.round(x), Math.round(y));
}
function tw(s, size = 8, fam = "PS2P") { g.font = `${size}px "${fam}"`; return g.measureText(s).width; }
function line(x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  g.fillStyle = c;
  for (;;) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
const hex2 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function mix(a, b, f) { const A = hex2(a), B = hex2(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * f).toString(16).padStart(2, "0")).join(""); }
const pad = (n, k, c = "0") => String(Math.max(0, Math.floor(n))).padStart(k, c);
const blink = (t, hz = 2) => RM || Math.floor(t * hz) % 2 === 0;

/* ---------- state ---------- */
const UI = { theme: clamp(+store.get("theme", 1) || 0, 0, THEMES.length - 1), species: store.get("species", "bit") };
/* sound follows the portfolio's shared setting (localStorage kb-sound; "off" = silent) */
const soundOn = () => (window.KB && typeof KB.soundOn === "function") ? KB.soundOn() : (() => { try { return localStorage.getItem("kb-sound") !== "off"; } catch (e) { return true; } })();
function setSound(on) { try { localStorage.setItem("kb-sound", on ? "on" : "off"); } catch (e) {} }
if (!SPECIES.some(s => s.id === UI.species)) UI.species = "bit";
let P;
function pal() {
  const t = THEMES[UI.theme];
  P = { bg: t.screen, ink: t.ink, ink2: t.ink2, lab: t.label, acc: t.accent,
        d1: mix(t.screen, t.ink2, .10), d2: mix(t.screen, t.ink2, .22), d3: mix(t.screen, t.ink2, .42), dw: mix(t.screen, t.ink, .45) };
}
pal();
const species = () => SPECIES.find(s => s.id === UI.species) || SPECIES[0];
let hi = +store.get("hi", 0) || 0;

let mode = "off", modeT = 0, clock = 0;
let G = null;
const held = { L: false, R: false };
const MISSIONS = [
  { k: "KM", title: "RIDE 2 KM", target: 2, unit: "KM", get: () => G.dist / 1000 },
  { k: "CLIMB", title: "CLIMB 14 M", target: 14, unit: "M", get: () => G.totalClimb },
  { k: "TURBO", title: "TURBO FOR 10 S", target: 10, unit: "S", get: () => G.turboSec },
  { k: "BOSS", title: "BEAT A CLIMB BOSS", target: 1, unit: "", get: () => G.beaten },
];
function newGame() {
  G = { lap: 1, phase: "ride", stage: 0, phaseDist: 0, kmh: 18, dist: 0, x: 0, h: 0, vy: 0, invul: 0,
        coins: 0, score: 0, xp: 0, lvl: 1, items: [], nextSpawn: 230, slope: 0, slopeT: 0, boss: null, shots: [],
        power: 0, climbM: 0, totalClimb: 0, charge: 0, lowT: 0, grace: 0, beaten: 0, turboSec: 0, turboCharge: 0,
        prompt: false, T: null, done: {}, lap0: null, shake: 0, bfT: 0, bf: 0, scoreAcc: 0 };
  G.lap0 = lapStart();
}
const lapStart = () => ({ dist: G.dist, coins: G.coins, score: G.score, boss: "-", turbo: 0 });

/* ---------- sound: synthesised with Web Audio, only after the first key or tap ---------- */
const AU = { ctx: null, out: null };
function audio() {
  return null; // no sound anywhere on the site (by choice)
  if (!soundOn()) return null;
  try {
    if (!AU.ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      AU.ctx = new C(); AU.out = AU.ctx.createGain(); AU.out.gain.value = .32; AU.out.connect(AU.ctx.destination);
    }
    if (AU.ctx.state === "suspended") AU.ctx.resume();
  } catch (e) { return null; }
  return AU.ctx;
}
function tone(f, at, dur, o = {}) {
  const c = AU.ctx; if (!c || !soundOn()) return;
  const { type = "square", vol = .1, to = null, vib = 0 } = o;
  const t = c.currentTime + at, os = c.createOscillator(), gn = c.createGain();
  os.type = type; os.frequency.setValueAtTime(f, t);
  if (to) os.frequency.exponentialRampToValueAtTime(to, t + dur);
  if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 6; lg.gain.value = vib; l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + dur); }
  gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol, t + .005); gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
  os.connect(gn); gn.connect(AU.out); os.start(t); os.stop(t + dur + .03);
}
function noise(at, dur, o = {}) {
  const c = AU.ctx; if (!c || !soundOn()) return;
  const { vol = .2, freq = 900, type = "lowpass", to = null } = o;
  const t = c.currentTime + at, n = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
  src.buffer = buf; f.type = type; f.frequency.setValueAtTime(freq, t); if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(f); f.connect(gn); gn.connect(AU.out); src.start(t); src.stop(t + dur + .02);
}
const notes = (list, gap, dur, o) => list.forEach((f, i) => tone(f, i * gap, dur, o));
const sfx = {
  power() { noise(0, .28, { vol: .35, freq: 220 }); tone(90, 0, .35, { type: "sine", vol: .4, to: 32 }); tone(15600, .05, .5, { type: "sine", vol: .006 }); },
  tick() { tone(1760, 0, .03, { vol: .03 }); },
  mem() { tone(2600, 0, .012, { vol: .018 }); },
  chime() {  // the K·A·M RIDE start-up sound
    notes([392, 494, 587, 784], .07, .12, { vol: .07 });
    tone(196, .29, 1.1, { type: "sine", vol: .14 });
    [784, 988, 1175].forEach(f => tone(f, .3, 1.25, { type: "triangle", vol: .08, vib: 5 }));
    tone(1568, .3, .55, { vol: .025 }); tone(2349, .42, .45, { vol: .015 });
  },
  start() { tone(659, 0, .07, { vol: .07 }); tone(1319, .07, .2, { vol: .07 }); },
  coin() { tone(988, 0, .07, { vol: .06 }); tone(1319, .065, .2, { vol: .06 }); },
  jump() { tone(260, 0, .15, { vol: .06, to: 640 }); },
  hit() { noise(0, .2, { vol: .3, freq: 1400, to: 200 }); tone(220, 0, .22, { vol: .07, to: 70 }); },
  warn() { [880, 587, 880, 587, 880, 587].forEach((f, i) => tone(f, i * .11, .1, { vol: .055 })); },
  pedal(k) { tone(110 + k * 7, 0, .05, { type: "triangle", vol: .12 }); },
  shot() { tone(1400, 0, .11, { vol: .045, to: 280 }); },
  bossHit() { noise(0, .1, { vol: .18, freq: 2400, type: "bandpass" }); },
  ko() { notes([523, 659, 784, 1047, 784], .085, .12, { vol: .07 }); tone(1047, .43, .5, { vol: .07 }); tone(523, .43, .5, { type: "triangle", vol: .1 }); },
  escape() { tone(660, 0, .45, { vol: .06, to: 180 }); },
  lvl() { notes([523, 659, 784, 1047, 1319, 1568], .05, .09, { vol: .05 }); notes([262, 330, 392, 523], .075, .1, { type: "triangle", vol: .08 }); },
  turbo() { tone(170, 0, .65, { type: "sawtooth", vol: .05, to: 1500 }); noise(0, .65, { vol: .08, freq: 300, to: 5000, type: "bandpass" }); },
  mission() { notes([1047, 1319, 1568], .06, .1, { vol: .05 }); },
  clear() { notes([523, 523, 784, 784, 880, 1047, 784], .11, .12, { vol: .06 }); tone(1047, .8, .6, { type: "triangle", vol: .09 }); },
};

/* ---------- cards (GameUi.kt PopupHost: one at a time, queued) ---------- */
const cards = []; let card0 = null;
const sr = $("sr");
function card(c) { cards.push(c); sr.textContent = c.lines.map(l => l[0]).join(" "); }
function cardKO(name, coins) { card({ style: "C", dur: 1.9, lines: [["K.O.!", 24, "acc"], [name, 8, "ink"], [`+${coins} COINS`, 8, "ink2"]] }); }

/* ---------- particles and floating text ---------- */
let parts = [], floats = [];
function sparks(x, y, n = 22, big = 1) {
  if (RM) return;
  const cols = ["acc", "ink", "ink2"];
  for (let k = 0; k < n; k++) {
    const a = k * (2 * Math.PI / n) + (k % 3) * .2, sp = (60 + (k * 53 % 5) * 18) * big;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, t: 0, life: .8, c: cols[k % 3], sz: 3 });
  }
}
function floatTxt(s, x, y, c = "ink2") { floats.push({ s, x, y, t: 0, c }); }

/* ---------- flow ---------- */
const BOOT = [
  [.40, "K·A·M SYSTEMS   8-BIT", "ink2"], [.65, "(C) 2026 KARAM BINNING", "dw"], [1.0, "CPU ............. OK", "ink"],
  [1.3, "MEM", "ink"], [2.05, "GPS ........... MOCK", "ink"], [2.3, "MAPS ........ OFFLINE", "ink"],
  [2.55, "CART .. KAM-RIDE.ROM", "ink"], [2.8, "BUDDY ......... ", "ink"], [3.1, "BOOT OK", "acc"],
];
let bootFired = 0, chimed = false, memTick = 0;
function powerOn() {
  audio(); mode = "boot"; modeT = 0; bootFired = 0; chimed = false; memTick = 0;
  cards.length = 0; card0 = null; parts = []; floats = [];
  sfx.power(); $("led").classList.add("on"); sr.textContent = "Powering on.";
}
function toTitle() { mode = "title"; modeT = 0; if (!chimed) { chimed = true; sfx.chime(); } sr.textContent = "K·A·M RIDE. Press start: Space or tap."; }
function startGame() { newGame(); mode = "play"; modeT = 0; sfx.start(); card({ style: "I", dur: 1.3, lines: [["LAP 1", 16, "acc"], ["LET'S RIDE!", 8, "ink"]] }); }
function nextLap() {
  G.lap++; G.phase = "ride"; G.stage = 0; G.phaseDist = 0; G.T = null; G.items = []; G.nextSpawn = G.x + W + 40;
  G.lap0 = lapStart(); mode = "play"; modeT = 0; sfx.start();
  card({ style: "I", dur: 1.3, lines: [[`LAP ${G.lap}`, 16, "acc"], ["THE BOSSES GROW", 8, "ink"]] });
}
function press() {
  audio();
  if (mode === "off") return powerOn();
  if (mode === "boot") return toTitle();
  if (mode === "title") return startGame();
  if (mode === "clear") { if (modeT > .8) nextLap(); return; }
  if (mode === "play") action();
}
function action() {
  if (G.phase === "ride") { if (G.h <= 0) { G.vy = 210; G.h = .01; sfx.jump(); } }
  else if (G.phase === "boss") { G.power = Math.min(G.power + 1, 9); sfx.pedal(G.kmh); }
  else if (G.phase === "turbo") { G.kmh = Math.min(G.kmh + 2.2, 52); sfx.pedal(G.kmh); }
}

/* ---------- ride: side-on, BIT on the bike ---------- */
const groundY = x => GROUND - (x - PX - 9) * G.slope;
function spawnPattern(wx) {
  const r = Math.random(), it = G.items;
  if (r < .32) { const n = 3 + Math.floor(rnd(0, 3)); for (let i = 0; i < n; i++) it.push({ kind: "coin", wx: wx + i * 12, h: 3 }); return wx + n * 12; }
  if (r < .62) {
    const kind = Math.random() < .6 ? "cone" : "rock";
    it.push({ kind, wx: wx + 30 });
    for (let i = 0; i < 5; i++) it.push({ kind: "coin", wx: wx + 4 + i * 12, h: 8 + Math.round(Math.sin(i / 4 * Math.PI) * 24) });
    return wx + 64;
  }
  if (r < .82) { it.push({ kind: "rock", wx }); for (let i = 0; i < 3; i++) it.push({ kind: "coin", wx: wx - 8 + i * 12, h: 30 }); return wx + 30; }
  for (let i = 0; i < 4; i++) it.push({ kind: "coin", wx: wx + i * 12, h: 18 }); return wx + 48;
}
function gainCoin(n, x, y) { G.coins += n; G.score += 10 * n; G.xp += 4 * n; floatTxt("+" + n, x, y); sfx.coin(); }
function crash(x, y) {
  const lost = Math.min(3, G.coins); G.coins -= lost;
  G.invul = 1.2; G.kmh *= .45; G.shake = RM ? 0 : .25; sfx.hit();
  if (lost) floatTxt("-" + lost, x, y, "acc");
  if (!RM) for (let i = 0; i < lost; i++) parts.push({ x, y, vx: rnd(-50, 50), vy: rnd(-120, -60), t: 0, life: .9, c: "acc", sz: 3, coin: true });
}
function updRide(dt) {
  const target = held.R && !held.L ? 34 : held.L && !held.R ? 13 : 24;
  G.kmh += (target - G.kmh) * Math.min(1, dt * 1.8);
  const m = G.kmh / 3.6 * SIM * dt; G.dist += m; G.phaseDist += m;
  G.x += G.kmh * 3 * dt;
  G.slope += (0 - G.slope) * Math.min(1, dt * 2.5);
  if (G.h > 0) { G.vy -= 640 * dt; G.h += G.vy * dt; if (G.h <= 0) { G.h = 0; G.vy = 0; } }
  const quiet = (G.stage === 0 && G.phaseDist > 540) || G.prompt;
  while (G.nextSpawn < G.x + W + 24) G.nextSpawn = quiet ? G.nextSpawn + 40 : spawnPattern(G.nextSpawn) + 50 + rnd(0, 60);
  const top = GROUND - G.h - 26, bot = GROUND - G.h;
  for (const it of G.items) {
    if (it.got) continue;
    const sx = it.wx - G.x;
    if (it.kind === "coin") {
      const cy = GROUND - it.h - 8;
      if (sx + 8 > PX - 3 && sx < PX + 22 && cy + 8 > top && cy < bot) { it.got = true; gainCoin(1, sx + 4, cy); }
    } else if (G.invul <= 0) {
      const w = it.kind === "cone" ? 7 : 8, ht = it.kind === "cone" ? 8 : 5;
      if (sx + w - 2 > PX && sx + 2 < PX + 20 && G.h < ht - 1) { it.hit = true; it.got = true; crash(sx + 3, GROUND - 14); }
    }
  }
  G.items = G.items.filter(it => it.wx - G.x > -20 && !(it.got && it.kind === "coin"));
  G.scoreAcc += m; while (G.scoreAcc >= 10) { G.scoreAcc -= 10; G.score++; }
  if (G.stage === 0 && G.phaseDist >= 640) startBoss();
  else if (G.stage === 1 && G.phaseDist >= 220) {
    if (!G.prompt) { G.prompt = true; sr.textContent = "Hold right for turbo: 20% above your pace."; }
    if (G.kmh >= TURBO_KMH) G.turboCharge += dt; else G.turboCharge = Math.max(0, G.turboCharge - dt * .5);
    if (G.turboCharge >= 1.5) startTurbo();
  }
}

/* ---------- climb boss (BattlePanel + Game.kt: HP is metres of climbing left) ---------- */
function startBoss() {
  const lvl = G.lap, name = `${NAMES[Math.min(lvl - 1, NAMES.length - 1)]} LV${lvl}`;
  G.phase = "boss"; G.items = []; G.slopeT = .28; G.power = 2; G.climbM = 0; G.charge = 0; G.lowT = 0; G.grace = 2.6; G.shots = [];
  G.boss = { name, lvl, hpMax: FREE_RIDE_MAX_HP, hp: FREE_RIDE_MAX_HP, x: W + 24, hitT: 0, dead: 0, gone: false };
  card({ style: "W", dur: 2.2, art: bossArt(name), lines: [["! WARNING !", 8, "acc"], ["ART"], [name, 8, "ink"], ["CLIMB TO FIGHT!", 8, "ink2"]] });
  sfx.warn();
}
function updBoss(dt) {
  const b = G.boss;
  G.slope += (G.slopeT - G.slope) * Math.min(1, dt * 2);
  if (b.x > 186) b.x = Math.max(186, b.x - 70 * dt);
  if (b.dead) { b.dead += dt; G.kmh += (16 - G.kmh) * dt; G.x += G.kmh * 3 * dt; if (b.dead > 1.2) endBoss(); return; }
  if (b.gone) { b.x += 140 * dt; G.kmh += (10 - G.kmh) * dt; G.x += G.kmh * 3 * dt; if (b.x > W + 40) endBoss(); return; }
  G.power *= Math.exp(-dt / .7);
  if (held.R) G.power = Math.max(G.power, 2.5);
  const target = Math.min(24, 3 + G.power * 1.7);
  G.kmh += (target - G.kmh) * Math.min(1, dt * 4);
  const climb = G.kmh / 3.6 * .85 * dt;
  G.x += G.kmh * 3 * dt; G.dist += G.kmh / 3.6 * SIM * dt * .5;
  G.climbM += climb; G.totalClimb += climb; G.charge += climb;
  b.hp = Math.max(0, b.hpMax - G.climbM);
  while (G.charge >= 2.5) { G.charge -= 2.5; G.shots.push({ t: 0 }); sfx.shot(); }
  if (b.hp <= 0) {
    const reward = BOSS_COINS * b.lvl;
    b.dead = .001; G.coins += reward; G.score += 500 * b.lvl; G.xp += 60; G.beaten++; G.lap0.boss = "K.O.";
    cardKO(b.name, reward); sfx.ko(); G.shake = RM ? 0 : .35; sparks(b.x + 14, groundY(b.x + 14) - 10, 26, 1.3);
    return;
  }
  G.grace -= dt;
  if (G.grace <= 0) {
    if (G.kmh < 6) G.lowT += dt; else G.lowT = Math.max(0, G.lowT - dt * 2);
    if (G.lowT > 3.2) { b.gone = true; G.lap0.boss = "GOT AWAY"; card({ style: "S", dur: 1.9, lines: [["IT GOT AWAY...", 8, "ink"], ["NEXT CLIMB!", 8, "ink2"]] }); sfx.escape(); }
  }
}
function endBoss() { G.phase = "ride"; G.stage = 1; G.phaseDist = 0; G.slopeT = 0; G.boss = null; G.shots = []; G.nextSpawn = G.x + W + 30; G.turboCharge = 0; G.prompt = false; }

/* ---------- turbo road (GameUi.kt RoadScene, OutRun-style; FastRun.kt: 20% above your pace) ---------- */
function startTurbo() {
  G.phase = "turbo"; G.prompt = false; G.items = [];
  G.T = { t: 0, dur: 14, lane: 0, camZ: 0, curve: 0, objs: [], next: .8, bob: 0, n: 0 };
  G.kmh = Math.max(G.kmh, 36);
  card({ style: "C", dur: 1.9, lines: [["TURBO!", 24, "acc"], [`OVER ${TURBO_KMH} KM/H`, 8, "ink"], ["20% ABOVE YOUR PACE", 8, "ink2"]] });
  sfx.turbo(); sparks(W / 2, 60, 18);
}
function updTurbo(dt) {
  const T = G.T; T.t += dt;
  G.kmh += (34 - G.kmh) * Math.min(1, dt * .35);
  const steer = (held.R ? 1 : 0) - (held.L ? 1 : 0);
  T.lane += steer * 1.9 * dt;
  const ct = .75 * Math.sin(T.t * .42) + .25 * Math.sin(T.t * 1.37);
  T.curve += (ct - T.curve) * Math.min(1, dt * 1.2);
  T.lane = clamp(T.lane - T.curve * .5 * dt, -1.3, 1.3);
  T.camZ += G.kmh / 3.6 * dt * 3;
  const m = G.kmh / 3.6 * SIM * dt; G.dist += m; G.turboSec += dt; G.lap0.turbo += dt;
  G.scoreAcc += m; while (G.scoreAcc >= 10) { G.scoreAcc -= 10; G.score++; }
  T.next -= dt;
  if (T.next <= 0 && T.t < T.dur - 1.8) {
    const lane = pick([-1, 0, 1]);
    if (Math.random() < .28) T.objs.push({ kind: "cone", lane, d: 60 });
    else { const n = 1 + Math.floor(rnd(0, 3)); for (let i = 0; i < n; i++) T.objs.push({ kind: "coin", lane, d: 60 + i * 5 }); }
    T.next = rnd(.42, .75);
  }
  const rate = G.kmh / 3.6 * 2.6;
  for (const o of T.objs) {
    const prev = o.d; o.d -= rate * dt;
    if (!o.done && prev > 1.2 && o.d <= 1.2) {
      o.done = true;
      if (Math.abs(o.lane - T.lane) < .45) {
        o.got = true;
        const sx = W / 2 + T.lane * 44;
        if (o.kind === "coin") { gainCoin(1, sx, 104); G.score += 10; }
        else { const lost = Math.min(2, G.coins); G.coins -= lost; G.kmh -= 8; G.shake = RM ? 0 : .25; sfx.hit(); if (lost) floatTxt("-" + lost, sx, 104, "acc"); }
      }
    }
  }
  T.objs = T.objs.filter(o => o.d > -4 && !(o.got && o.kind === "coin"));
  if (T.t >= T.dur) finishLap();
}
function finishLap() {
  G.phase = "done"; G.xp += 40; mode = "clear"; modeT = 0; sfx.clear();
  if (G.score > hi) { hi = G.score; store.set("hi", hi); G.newHi = true; } else G.newHi = false;
  sr.textContent = `Stage clear. Score ${G.score}. Press start for lap ${G.lap + 1}.`;
}

/* ---------- per-frame checks ---------- */
function checks() {
  const L = levelFor(G.xp);
  if (L > G.lvl) { G.lvl = L; card({ style: "C", dur: 1.5, lines: [["LEVEL UP!", 16, "acc"], [`${species().root} IS LV ${L}`, 8, "ink"]] }); sfx.lvl(); }
  for (const m of MISSIONS) if (!G.done[m.k] && m.get() >= m.target) {
    G.done[m.k] = 1; G.coins += 15; G.xp += 25;
    card({ style: "I", dur: 1.6, lines: [["MISSION DONE", 8, "acc"], [m.title, 8, "ink"], ["+15 COINS", 8, "ink2"]] }); sfx.mission();
  }
}

/* ---------- update ---------- */
function update(dt) {
  clock += dt; modeT += dt;
  if (mode === "boot") {
    while (bootFired < BOOT.length && modeT >= BOOT[bootFired][0]) { bootFired++; sfx.tick(); }
    if (modeT > 1.3 && modeT < 2.0 && ++memTick % 3 === 0) sfx.mem();
    if (!chimed && modeT >= (RM ? 3.6 : 4.0)) { chimed = true; sfx.chime(); }
    if (modeT > 5.6) toTitle();
  }
  if (mode === "play") {
    G.invul = Math.max(0, G.invul - dt); G.shake = Math.max(0, G.shake - dt);
    G.bfT += dt; if (G.bfT > clamp(1.4 / Math.max(G.kmh, 2), .08, .45)) { G.bfT = 0; G.bf = 1 - G.bf; }
    if (G.phase === "ride") updRide(dt); else if (G.phase === "boss") updBoss(dt); else if (G.phase === "turbo") updTurbo(dt);
    if (G.phase !== "done") checks();
  }
  if (mode === "title") { if ((clock % .4) < dt) { /* pedal anim on the title */ } }
  for (const s of G ? G.shots : []) s.t += dt / .35;
  if (G && G.boss) for (const s of G.shots) if (s.t >= 1 && !s.hit) { s.hit = true; G.boss.hitT = .22; sfx.bossHit(); sparks(G.boss.x + 14, groundY(G.boss.x + 14) - 10, 8, .6); }
  if (G) G.shots = G.shots.filter(s => s.t < 1.05);
  if (G && G.boss) G.boss.hitT = Math.max(0, G.boss.hitT - dt);
  if (!card0 && cards.length) { card0 = cards.shift(); card0.t = 0; }
  if (card0) { card0.t += dt; if (card0.t > card0.dur) card0 = null; }
  for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; }
  parts = parts.filter(p => p.t < p.life);
  for (const f of floats) f.t += dt;
  floats = floats.filter(f => f.t < .7);
}

/* ---------- render ---------- */
function stars(scroll) {
  for (let i = 0; i < 34; i++) {
    const x = ((i * 97 + 13) % 300 - scroll * (.03 + (i % 3) * .02)) % 300, y = 24 + (i * 41) % 60;
    rect(i % 5 === 0 ? P.ink : P.d3, x < 0 ? x + 300 : x, y, 1, 1);
  }
}
function sun(cx, cy, r) {
  for (let y = -r; y <= r; y += 2) {
    if (y > 2 && Math.floor((y + r) / 2) % 2 === 1) continue;                // synth-sun stripes in the lower half
    const half = Math.round(Math.sqrt(r * r - y * y)); rect(P.acc, cx - half, cy + y, half * 2, 2);
  }
}
function hills(scroll) {
  for (let x = 0; x < W; x += 2) {
    const a = x + scroll * .15, b = x + scroll * .35;
    const ha = 20 + 9 * Math.sin(a * .045) + 6 * Math.sin(a * .13), hb = 9 + 5 * Math.sin(b * .07) + 3 * Math.sin(b * .21);
    rect(P.d1, x, 102 - Math.round(ha / 2) * 2, 2, 60);
    rect(P.d2, x, 114 - Math.round(hb / 2) * 2, 2, 60);
  }
}
function ground() {
  for (let x = 0; x < W; x += 2) {
    const y = Math.round(groundY(x));
    rect(P.d1, x, y, 2, H - y); rect(P.ink2, x, y, 2, 2);
    if (((x + G.x) % 16 + 16) % 16 < 8) rect(P.dw, x, y + 8, 2, 1);
    rect(P.d2, x, y + 15, 2, 1); rect(P.d2, x, y + 21, 2, 1);
  }
}
function bike(ox, oy, wf, bf, col) {   // ox = rear-wheel centre x, oy = ground; BIT rides on top
  const cy = oy - 5, fr = col || P.ink2, wh = col || P.ink;
  line(ox, cy, ox + 8, cy + 1, fr); line(ox + 8, cy + 1, ox + 5, cy - 8, fr); line(ox + 5, cy - 8, ox, cy, fr);
  line(ox + 5, cy - 7, ox + 15, cy - 7, fr); line(ox + 15, cy - 7, ox + 8, cy + 1, fr); line(ox + 15, cy - 7, ox + 18, cy, fr);
  line(ox + 15, cy - 7, ox + 16, cy - 10, wh); line(ox + 16, cy - 10, ox + 19, cy - 10, wh);
  draw(WHEEL[wf], wh, ox - 4, cy - 4); draw(WHEEL[wf], wh, ox + 14, cy - 4);
  draw(petFrames(UI.species)[bf], col || P.acc, ox - 1, cy - 8 - 11);
}
function player() {
  const fl = G.invul > 0 && !RM && Math.floor(G.invul * 12) % 2 === 0;
  if (fl) return;
  const col = G.invul > 0 && RM ? P.dw : null, wf = RM && G.kmh < 1 ? 0 : G.bf;
  if (G.slope > .005) {
    g.save(); g.translate(PX + 9, GROUND); g.rotate(-Math.atan(G.slope)); bike(-9, -G.h, wf, G.bf, col); g.restore();
  } else bike(PX, GROUND - G.h, wf, G.bf, col);
}
function items() {
  const f = RM ? 0 : Math.floor(clock * 8) % 4;
  for (const it of G.items) {
    const sx = it.wx - G.x; if (sx < -16 || sx > W + 16) continue;
    if (it.kind === "coin") { if (!it.got) draw(COIN_SPIN[f], P.acc, sx, GROUND - it.h - 8); }
    else if (it.kind === "cone") draw(CONE, it.hit ? P.d3 : P.ink, sx, GROUND - 8 + (it.hit ? 1 : 0));
    else draw(ROCK, it.hit ? P.d3 : P.dw, sx, GROUND - 5);
  }
}
function boss() {
  const b = G.boss; if (!b) return;
  const art = bossArt(b.name), by = groundY(b.x + 14) - 20, bob = RM ? 0 : (Math.sin(clock * 5) > 0 ? 2 : 0);
  const hit = b.hitT > 0, dx = hit && !RM ? (Math.floor(b.hitT * 40) % 2 ? 2 : -2) : 0;
  if (b.dead) {
    g.globalAlpha = clamp(1 - b.dead / 1.1, 0, 1);
    draw(art, P.acc, b.x, by + (RM ? 0 : b.dead * 30), 2); g.globalAlpha = 1; return;
  }
  draw(art, hit && !RM ? P.ink : P.acc, b.x + dx, by - bob, 2);
  for (const s of G.shots) {
    if (s.t >= 1) continue;
    const x0 = PX + 20, y0 = GROUND - G.h - 16 - (PX + 20 - PX - 9) * G.slope, x1 = b.x + 8, y1 = by + 8;
    draw(SHOT, P.ink, x0 + (x1 - x0) * s.t, y0 + (y1 - y0) * s.t);
  }
}
function hud() {
  rect(P.bg, 0, 0, W, 22); rect(P.d2, 0, 22, W, 1);
  txt(`${pad(G.kmh, 2, " ")} KM/H`, 4, 4, P.ink);
  txt(`${(G.dist / 1000).toFixed(2)} KM`, 4, 13, P.lab, 8, "left", "Silk");
  draw(COIN_SPIN[RM ? 0 : Math.floor(clock * 6) % 4], P.acc, 100, 4); txt("x" + pad(G.coins, 3), 110, 4, P.ink2);
  txt("LV" + G.lvl, 100, 13, P.lab, 8, "left", "Silk");
  const from = xpFor(G.lvl), to = xpFor(G.lvl + 1), f = clamp((G.xp - from) / (to - from), 0, 1);
  rect(P.lab, 118, 14, 44, 6); rect(P.bg, 119, 15, 42, 4); rect(P.ink2, 119, 15, Math.round(42 * f), 4);
  txt(pad(G.score, 6), W - 4, 4, P.ink, 8, "right");
  const right = G.phase === "boss" ? "GRADE +8%" : G.phase === "turbo" ? `TURBO ${pad(Math.max(0, G.T.dur - G.T.t) + .99, 2)}S` : "GRADE 0%";
  txt(right, W - 4, 13, G.phase === "turbo" ? P.acc : P.lab, 8, "right", "Silk");
}
function bossStrip() {
  const b = G.boss; if (!b || b.dead || b.gone) return;
  txt("CHARGE", 4, 27, P.lab, 8, "left", "Silk");
  const pips = Math.floor(G.charge / 2.5 * 5), px0 = Math.ceil(tw("CHARGE", 8, "Silk")) + 8;
  for (let i = 0; i < 5; i++) { rect(P.ink, px0 + i * 8, 27, 6, 6); if (i >= pips) rect(P.bg, px0 + 1 + i * 8, 28, 4, 4); }
  txt(b.name, W - 4, 26, P.acc, 8, "right");
  const filled = Math.ceil(b.hp / b.hpMax * 10);
  for (let i = 0; i < 10; i++) { const x = W - 4 - 60 + i * 6; rect(P.acc, x, 36, 5, 4); if (i >= filled) rect(P.bg, x + 1, 37, 3, 2); }
  txt(`${Math.ceil(b.hp)} M TO K.O.`, W - 68, 35, P.lab, 8, "right", "Silk");
  if (G.grace < 2.2 && !card0) {
    if (G.lowT > 1) { if (blink(clock, 3)) txt("IT'S GETTING AWAY!", W / 2, 50, P.acc, 8, "center"); rect(P.d2, 88, 61, 80, 3); rect(P.acc, 88, 61, Math.round(80 * clamp(G.lowT / 3.2, 0, 1)), 3); }
    else if (blink(clock, 2.5)) txt("TAP SPACE TO CLIMB!", W / 2, 50, P.ink2, 8, "center");
  }
}
function turboPrompt() {
  if (!G.prompt || card0) return;
  if (blink(clock, 2)) txt("HOLD RIGHT FOR TURBO", W / 2, 32, P.ink2, 8, "center");
  txt(`20% ABOVE YOUR PACE: ${TURBO_KMH}+ KM/H`, W / 2, 43, P.lab, 8, "center", "Silk");
  rect(P.d2, 88, 54, 80, 4); rect(P.acc, 88, 54, Math.round(80 * clamp(G.turboCharge / 1.5, 0, 1)), 4);
}
function road() {
  const T = G.T, w = W, h = H, curve = T.curve, camZ = T.camZ, speed = G.kmh;
  const horizon = Math.round(h * .36), band = 2;
  for (let y = 0, i = 0; y < horizon; y += band, i++) rect(i % 4 < 2 ? P.bg : mix(P.bg, P.acc, .08), 0, y, w, band);
  stars(camZ * 2);
  const sx = w * .5 - curve * w * .25;
  for (let r = 0; r < 6; r++) { const rw = 30 - Math.abs(r - 3) * 7; rect(P.acc, sx - rw / 2, horizon - 18 + r * 3, rw, 2); }
  const shift = curve * w * .15, mtn = mix(P.bg, P.ink2, .35);
  for (let mx = -16, k = 0; mx < w + 16; mx += 16, k++) { const pk = 6 + ((k * 37) % 5) * 3; rect(mtn, mx - shift % 16, horizon - pk, 16, pk); }
  const g1 = mix(P.bg, P.ink2, .16), g2 = mix(P.bg, P.ink2, .08), tar = mix(P.bg, P.ink, .26);
  for (let y = horizon; y < h; y += band) {
    const p = (y - horizon) / (h - horizon), z = 1 / (p + .02), seg = Math.trunc((camZ + z * 6) / 4);
    const c = w / 2 + curve * (1 - p) * (1 - p) * w * .45, rw = w * (.08 + .5 * p), rum = rw * .12;
    rect(seg % 2 === 0 ? g1 : g2, 0, y, w, band);
    rect(seg % 2 === 0 ? P.acc : P.ink, c - rw / 2 - rum, y, rw + rum * 2, band);
    rect(tar, c - rw / 2, y, rw, band);
    if (seg % 3 === 0) rect(P.ink, c - rw * .02, y, Math.max(1, rw * .04), band);
  }
  if (!RM) {
    const n = clamp(Math.trunc(speed / 6), 2, 8);
    for (let s = 0; s < n; s++) { const ly = horizon + ((camZ * 60 + s * 97) % (h - horizon)); rect(P.ink, 4, ly, 2, 10); rect(P.ink, w - 6, (ly + 131) % h, 2, 10); }
  }
  // objects, far to near
  const f = RM ? 0 : Math.floor(clock * 8) % 4;
  for (const o of T.objs.slice().sort((a, b) => b.d - a.d)) {
    if (o.got || o.d < -2) continue;
    const p = clamp(1 / (1 + Math.max(o.d, 0) / 5), 0, 1), y = horizon + (h - horizon) * p;
    const c = w / 2 + curve * (1 - p) * (1 - p) * w * .45, rw = w * (.08 + .5 * p), x = c + o.lane * rw * .3, s = Math.max(.35, p * 2.2);
    const rows = o.kind === "coin" ? COIN_SPIN[f] : CONE, cs = spr(rows, o.kind === "coin" ? P.acc : P.ink);
    g.drawImage(cs, Math.round(x - cs.width * s / 2), Math.round(y - cs.height * s), Math.max(1, Math.round(cs.width * s)), Math.max(1, Math.round(cs.height * s)));
  }
  // BIT from behind: buddy, handlebar, one wheel
  if (++T.n % 8 === 0 && !RM) T.bob = 1 - T.bob;
  const px = Math.round(w / 2 + T.lane * 44), by = h - 4 - T.bob;
  const tread = RM ? 0 : Math.floor(camZ * 4) % 2;
  rect(P.ink, px - 2, by - 12, 4, 12); for (let i = 0; i < 6; i++) if ((i + tread) % 2) rect(P.bg, px - 2, by - 12 + i * 2, 4, 1);
  rect(P.ink2, px - 11, by - 22, 22, 2); rect(P.ink2, px - 1, by - 22, 2, 10);
  draw(petFrames(UI.species)[0], P.acc, px - 12, by - 44, 2);
  txt("TURBO", 4, 27, P.acc, 8, "left");
}
function cardDraw() {
  const c = card0; if (!c) return;
  const pad_ = 8, lines = c.lines;
  let wmax = 0, ht = pad_ * 2 - 4;
  for (const l of lines) {
    if (l[0] === "ART") { wmax = Math.max(wmax, 28); ht += 24; continue; }
    wmax = Math.max(wmax, tw(l[0], l[1])); ht += l[1] + 5;
  }
  const cw = Math.round(wmax + pad_ * 2 + 4), chh = Math.round(ht), cx = W / 2, top = mode === "play" && G.phase === "turbo" ? 26 : Math.round(42 + (78 - chh) / 2);
  let s = 1, a = 1, oy = 0, ox = 0; const t = c.t, out = c.dur - t;
  if (RM) a = Math.min(1, t / .12, out / .12);
  else {
    if (c.style === "W") { oy = t < .3 ? -(1 - t / .3) * 100 : 0; if (t > .3 && t < .6) ox = Math.floor(t * 50) % 2 ? 3 : -3; }
    else if (c.style === "S") a = Math.min(1, t / .15);
    else { const k = clamp(t / .25, 0, 1); s = k < 1 ? .3 + .7 * k + Math.sin(k * Math.PI) * .12 : 1; }
    if (out < .18) { s *= .6 + .4 * (out / .18); a = out / .18; }
  }
  const tick = Math.floor(t / .15);
  const border = RM ? (c.style === "S" ? P.lab : P.acc) : c.style === "C" ? [P.acc, P.ink, P.ink2][tick % 3] : c.style === "W" ? (tick % 2 ? P.ink : P.acc) : c.style === "S" ? P.lab : P.acc;
  g.save(); g.globalAlpha = clamp(a, 0, 1);
  g.translate(cx + ox, top + chh / 2 + oy); g.scale(s, s); g.translate(-cw / 2, -chh / 2);
  rect(border, 0, 0, cw, chh); rect(P.bg, 2, 2, cw - 4, chh - 4);
  let y = pad_;
  for (const l of lines) {
    if (l[0] === "ART") { draw(c.art, P.acc, cw / 2 - 14, y, 2); y += 24; continue; }
    txt(l[0], cw / 2, y, P[l[2]], l[1], "center"); y += l[1] + 5;
  }
  g.restore();
}
function fx() {
  for (const p of parts) {
    g.globalAlpha = clamp(1 - p.t / p.life, 0, 1);
    if (p.coin) draw(COIN, P.acc, p.x - 4, p.y - 4); else rect(P[p.c], p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
  }
  g.globalAlpha = 1;
  for (const f of floats) { g.globalAlpha = clamp(1 - f.t / .7, 0, 1); txt(f.s, f.x, f.y - (RM ? 0 : f.t * 18), P[f.c], 8, "center", "Silk"); }
  g.globalAlpha = 1;
}
function renderOff() {
  rect("#000", 0, 0, W, H);
  const c = mix("#000000", THEMES[UI.theme].ink2, .55);
  draw(POWER, c, W / 2 - 7, 40, 2);
  if (blink(clock, 1)) { txt("PRESS ANY KEY", W / 2, 70, c, 8, "center"); txt("TO POWER ON", W / 2, 82, c, 8, "center"); }
  txt("OR TAP THE SCREEN", W / 2, 104, mix("#000000", THEMES[UI.theme].ink, .35), 8, "center", "Silk");
}
function renderBoot() {
  rect(P.bg, 0, 0, W, H);
  const t = modeT;
  if (!RM && t < .35) {          // CRT warm-up: a line opens, then the picture
    if (t < .17) rect(P.ink, W / 2 - (W / 2) * (t / .17), H / 2 - 1, W * (t / .17), 2);
    else { const k = (t - .17) / .18; g.globalAlpha = 1 - k; rect(P.ink, 0, H / 2 - (H / 2) * k, W, H * k); g.globalAlpha = 1; }
    return;
  }
  if (t < 3.4) {
    let y = 10;
    for (let i = 0; i < bootFired; i++) {
      const [, s, c] = BOOT[i]; let str = s;
      if (s === "MEM") { const k = clamp((t - 1.3) / .7, 0, 1); str = `MEMORY ...... ${pad(k * 64, 2, " ")}K${k >= 1 ? " OK" : ""}`; }
      if (s.startsWith("BUDDY")) str = s + species().root;
      txt(str, 10, y, P[c]); y += 12;
    }
    if (blink(t, 3)) rect(P.ink2, 10, y, 7, 8);
    return;
  }
  logo(t - 3.4);
}
function logo(t) {
  const land = RM ? 0 : .55, k = clamp(t / .55, 0, 1);
  let y = 30;
  if (!RM && t < land) { const e = 1 - Math.pow(1 - k, 3); y = -30 + 60 * e + (k > .8 ? Math.sin((k - .8) * 15) * 4 : 0); }
  txt("K·A·M", W / 2, y, P.ink, 24, "center");
  const rd = "R I D E", n = RM ? rd.length : clamp(Math.floor((t - .7) / .09), 0, rd.length);
  txt(rd.slice(0, n), W / 2, 62, P.acc, 16, "center");
  if (t > 1.4) txt("© K·A·M SYSTEMS", W / 2, 120, P.lab, 8, "center", "Silk");
}
function renderTitle() {
  rect(P.bg, 0, 0, W, H);
  stars(clock * 10);
  sun(206, 72, 14);
  for (let x = 0; x < W; x += 2) rect(P.d1, x, 98 - Math.round((10 + 6 * Math.sin((x + clock * 6) * .05)) / 2) * 2, 2, 20);
  rect(P.d2, 0, 98, W, H - 98); rect(P.ink2, 0, 98, W, 2);
  for (let x = 0; x < W; x += 16) rect(P.dw, ((x - clock * 50) % W + W) % W, 106, 8, 1);
  txt("K·A·M", W / 2, 10, P.ink, 24, "center");
  txt("R I D E", W / 2, 40, P.acc, 16, "center");
  const f = RM ? 0 : Math.floor(clock * 4) % 2;
  bike(W / 2 - 9, 98 - (RM ? 0 : f), f, f);
  if (blink(clock, 2)) txt("PRESS START", W / 2, 112, P.ink2, 8, "center");
  txt("SPACE · ENTER · TAP", W / 2, 124, P.lab, 8, "center", "Silk");
  txt(`HI ${pad(hi, 6)}`, W - 4, 4, P.lab, 8, "right", "Silk");
  txt(`${species().root} · BABY`, 4, 4, P.lab, 8, "left", "Silk");
}
function renderClear() {
  road();
  g.globalAlpha = .82; rect(P.bg, 0, 0, W, H); g.globalAlpha = 1;
  const L = G.lap0, x0 = 44, x1 = W - 44;
  rect(P.acc, 18, 8, W - 36, 128); rect(P.bg, 20, 10, W - 40, 124);
  txt(`LAP ${G.lap} CLEAR!`, W / 2, 18, P.acc, 16, "center");
  const rows = [["DIST", `${((G.dist - L.dist) / 1000).toFixed(2)} KM`], ["COINS", `+${Math.max(0, G.coins - L.coins)}`], ["BOSS", L.boss], ["TURBO", `${Math.round(L.turbo)} S`], ["SCORE", pad(G.score, 6)]];
  rows.forEach(([k, v], i) => { txt(k, x0, 42 + i * 11, P.lab, 8, "left", "Silk"); txt(v, x1, 41 + i * 11, i === 4 ? P.ink2 : P.ink, 8, "right"); });
  txt(G.newHi ? "NEW HI-SCORE!" : `HI ${pad(hi, 6)}`, W / 2, 98, G.newHi ? P.acc : P.lab, 8, "center", "Silk");
  txt("RIDE SAVED · GPX + TCX (DEMO)", W / 2, 108, P.dw, 8, "center", "Silk");
  if (modeT > .8 && blink(clock, 2)) txt("PRESS START", W / 2, 120, P.ink2, 8, "center");
}
function renderPlay() {
  g.save();
  if (G.shake > 0 && !RM) g.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2)));
  if (G.phase === "turbo") road();
  else {
    rect(P.bg, 0, 0, W, H); stars(G.x); sun(206, 64 + Math.round(G.slope * 40), 14); hills(G.x); ground(); items(); boss(); player();
  }
  fx();
  g.restore();
  hud();
  if (G.phase === "boss") bossStrip(); else if (G.phase === "ride") turboPrompt();
  cardDraw();
}
function render() {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  if (mode === "off") renderOff();
  else if (mode === "boot") renderBoot();
  else if (mode === "title") renderTitle();
  else if (mode === "play") renderPlay();
  else if (mode === "clear") { renderClear(); cardDraw(); }
}

/* ---------- loop ---------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  update(dt); render();
  requestAnimationFrame(frame);
}
(document.fonts ? Promise.all([document.fonts.load('8px "PS2P"'), document.fonts.load('8px "Silk"')]).catch(() => {}) : Promise.resolve())
  .then(() => requestAnimationFrame(frame));
render();

/* ---------- input: keyboard ---------- */
const GAME_KEYS = [" ", "Spacebar", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"];
addEventListener("keydown", e => {
  if (e.target && e.target.closest && e.target.closest("button,a,input,textarea,select") && (e.key === " " || e.key === "Enter")) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (GAME_KEYS.includes(k)) e.preventDefault();
  if (k === "m" || k === "M") { if (!e.repeat) toggleSound(); if (mode !== "off") return; }
  if (k === "Tab" || k === "Shift" || k === "Escape") return;
  if (k === "ArrowLeft") held.L = true;
  if (k === "ArrowRight") held.R = true;
  if (e.repeat) return;
  if (mode === "off") return powerOn();
  if (k === " " || k === "Spacebar" || k === "Enter" || k === "ArrowUp") press();
  else if (mode === "boot") toTitle();
});
addEventListener("keyup", e => { if (e.key === "ArrowLeft") held.L = false; if (e.key === "ArrowRight") held.R = false; });
addEventListener("blur", () => { held.L = held.R = false; });

/* ---------- input: screen tap + touch pad ---------- */
cv.addEventListener("pointerdown", e => { e.preventDefault(); cv.focus({ preventScroll: true }); press(); });
document.querySelectorAll(".pk").forEach(b => {
  const k = b.dataset.k;
  const up = () => { b.classList.remove("down"); if (k !== "A") held[k] = false; };
  b.addEventListener("pointerdown", e => {
    e.preventDefault(); b.classList.add("down");
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
    if (k === "A") press(); else { held[k] = true; if (mode === "off") powerOn(); else if (mode === "boot") toTitle(); }
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => b.addEventListener(ev, up));
  b.addEventListener("click", e => { if (e.detail === 0 && k === "A") press(); });    // keyboard activation
});

/* ---------- controls bar ---------- */
function label(id, s) { $(id).querySelector("span").textContent = s; }
function toggleSound() { const on = !soundOn(); setSound(on); label("bSound", on ? "♪ ON" : "♪ OFF"); if (on) { audio(); sfx.coin(); } }
label("bSound", soundOn() ? "♪ ON" : "♪ OFF");
addEventListener("storage", e => { if (e.key === "kb-sound") label("bSound", soundOn() ? "♪ ON" : "♪ OFF"); });
label("bTheme", "THEME " + THEMES[UI.theme].name);
label("bBuddy", "BUDDY " + species().root);
const blurIfMouse = (e, b) => { if (e.detail > 0) b.blur(); };
$("bSound").addEventListener("click", e => { toggleSound(); blurIfMouse(e, e.currentTarget); });
$("bTheme").addEventListener("click", e => {
  UI.theme = (UI.theme + 1) % THEMES.length; store.set("theme", UI.theme); pal(); label("bTheme", "THEME " + THEMES[UI.theme].name);
  KB.beep(660, 40); blurIfMouse(e, e.currentTarget);
});
$("bBuddy").addEventListener("click", e => {
  UI.species = SPECIES[(SPECIES.indexOf(species()) + 1) % SPECIES.length].id; store.set("species", UI.species); label("bBuddy", "BUDDY " + species().root);
  KB.beep(880, 40); blurIfMouse(e, e.currentTarget);
});
$("bPower").addEventListener("click", e => { G = null; powerOn(); blurIfMouse(e, e.currentTarget); });
document.querySelectorAll("[data-pane]").forEach(btn => btn.addEventListener("click", e => {
  document.querySelectorAll("[data-pane]").forEach(x => x.setAttribute("aria-pressed", x === btn));
  document.querySelectorAll(".pane").forEach(p => p.classList.toggle("on", p.id === "p-" + btn.dataset.pane));
  KB.twitch($("p-" + btn.dataset.pane)); KB.beep(520, 40); blurIfMouse(e, btn);
}));

/* ---------- missions pane: live from the game ---------- */
function missionsPane() {
  const ms = $("ms");
  ms.innerHTML = MISSIONS.map(m => {
    const v = G ? Math.min(m.get(), m.target) : 0, done = G && G.done[m.k];
    const val = m.unit === "KM" ? v.toFixed(1) : Math.floor(v);
    return `<div class="row${done ? " done" : ""}"><span>${done ? "◆" : "◇"} ${m.title}</span><span class="v">${val}/${m.target}${m.unit ? " " + m.unit : ""}</span>${KB.bar(v / m.target)}</div>`;
  }).join("");
  $("sScore").textContent = G ? G.score : 0; $("sHi").textContent = hi; $("sLv").textContent = G ? G.lvl : 1; $("sCoins").textContent = G ? G.coins : 0;
}
missionsPane();
setInterval(() => { if ($("p-missions").classList.contains("on")) missionsPane(); }, 300);

/* test hook: state, and jumps to a phase for screenshots */
window.kamride = {
  state: () => ({ mode, phase: G && G.phase, coins: G && G.coins, score: G && G.score, lvl: G && G.lvl, dist: G && G.dist }),
  boss() { if (mode === "play" && G.phase === "ride") { G.stage = 0; G.phaseDist = 640; } },
  turbo() { if (mode === "play") { if (G.boss) G.boss = null; G.phase = "ride"; startTurbo(); } },
};
})();
