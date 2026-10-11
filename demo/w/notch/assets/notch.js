"use strict";
/* =====================================================================================
   K·A·M Notch — web replica. Rebuilt from the app's SwiftUI source:
   Look.swift (themes × modes, fonts, house colours), Views.swift (panel, header, player,
   timeline, controls, EQ, settings, effects, notch shape, sizes), Modes.swift (cassette /
   vinyl / disc / Game Boy art + player), PhotoDevices.swift (photoreal decks, coordinates),
   Devices.swift (marquee, meters, counter, Disc), Overlays.swift (collapsed size, lyric
   strip, peek), RetroFuture.swift (terminal FX, stencil), Glass.swift, Hub.swift,
   AudioTap.swift (band analysis), Lyrics.swift (line timing), main.swift (springs, hover).
   TaskBar.swift (the task bar across the menu bar and the live ticker under it), Feeds.swift
   (ticker items, clock block).
   THEME (palette) and MODE (foundation) are independent axes, exactly as in the app.
   Track 1 is a real public-domain recording (assets/AUDIO-LICENCE.txt) played through the
   Web Audio API, which also drives the EQ. Tracks 2–3, the ticker feed and the hub are mock.
   ===================================================================================== */
(() => {

const reducedMQ = matchMedia("(prefers-reduced-motion: reduce)");
const darkMQ = matchMedia("(prefers-color-scheme: dark)");
let REDUCED = reducedMQ.matches;

/* ---------- colour ---------- */
const hx = h => { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const toHex = a => "#" + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, f) => { const x = hx(a), y = hx(b); return toHex(x.map((v, i) => v + (y[i] - v) * f)); };
const rgba = (h, a) => { const [r, g, b] = hx(h); return `rgba(${r},${g},${b},${a})`; };
const WHITE = "#ffffff", BLACK = "#000000";

/* ---------- THEMES (palette axis) — Look.swift Theme.base ---------- */
const T = (id, name, bezel, bezelInk, screen, ink, ink2, label, accent) => ({ id, name, bezel, bezelInk, screen, ink, ink2, label, accent });
const BASE = [
  T("kam", "K·A·M TERMINAL", "#3A1A80", "#00D4FF", "#1F0B4C", "#00D4FF", "#00FF88", "#9A86D8", "#C79BFF"),
  T("kamneg", "K·A·M NEGATIVE", "#33DDF5", "#2E0A62", "#0FC3E6", "#2E0A62", "#4A1A9E", "#1F5A78", "#3A0A6E"),
  T("kampink", "K·A·M PINK", "#3E1678", "#FF66CC", "#2A0C56", "#FF66CC", "#FFC2EC", "#C59BEA", "#FF9AD8"),
  T("kampinkneg", "PINK NEGATIVE", "#F06ABF", "#3A0A6E", "#E4489F", "#2E0A62", "#52168F", "#7C2A78", "#3A0A6E"),
  T("rust", "RUST", "#1A1206", "#FFB000", "#0B0703", "#FFB000", "#00D4FF", "#8A6A34", "#FF6A00"),
  T("ride", "RIDE", "#000000", "#FFFF00", "#000000", "#FFFFFF", "#FFFF00", "#FFFF00", "#FFFF00"),
  T("arcade78", "ARCADE", "#14001F", "#FFE400", "#07010F", "#FFE400", "#FF2E88", "#6C5CFF", "#00F0FF"),
  T("nes", "KES", "#7C7C7C", "#000000", "#000000", "#FCFCFC", "#BCBCBC", "#F83800", "#FCA044"),
  T("vboy", "WAR", "#1A0000", "#E00000", "#000000", "#FF3030", "#B00000", "#800000", "#FF5050"),
  T("synth", "SYNTHWAVE", "#0B0221", "#FF2A6D", "#0B0221", "#05D9E8", "#FF2A6D", "#D1F7FF", "#F9C80E"),
  null, // CLEAN slot: expands to CLEAN + CLEAN NEGATIVE, following Light / Dark
];
const CLEAN_DARK = ["#1C1C1C", "#FFFFFF", "#000000", "#FFFFFF", "#C8C8C8", "#8A8A8A", "#E6E6E6"];
const CLEAN_LIGHT = ["#E8E8E8", "#000000", "#FFFFFF", "#000000", "#3A3A3A", "#7A7A7A", "#1A1A1A"];
const systemDark = () => darkMQ.matches;
const cleanTheme = () => T("clean", "CLEAN", ...(systemDark() ? CLEAN_DARK : CLEAN_LIGHT));
const cleanNeg = () => T("cleanneg", "CLEAN NEGATIVE", ...(!systemDark() ? CLEAN_DARK : CLEAN_LIGHT));
function makeCustom(screen, ink, ink2, accent) {
  return T("custom", "CUSTOM", mix(screen, WHITE, 0.1), ink, screen, ink, ink2, mix(ink, screen, 0.5), accent);
}
const CUSTOM = makeCustom("#0A0A12", "#FF66CC", "#66E0FF", "#AA66FF");
const themesAll = () => BASE.flatMap(t => t ? [t] : [cleanTheme(), cleanNeg()]).concat([CUSTOM]);
const themeNamed = id => { const all = themesAll(); return all.find(t => t.id === id) || all[0]; };

/* House accents — Look.swift House */
const H = {
  kam: { green: "#00FF88", cyan: "#00D4FF", amber: "#FFCC00", purple: "#AA66FF", pink: "#FF66CC", blue: "#3388FF" },
  pink: { green: "#FF66CC", cyan: "#FFC2EC", amber: "#FF9AD8", purple: "#FF4FB8", pink: "#FF2D95", blue: "#FFB3E6" },
  kamNeg: { green: "#2E0A62", cyan: "#4A1A9E", amber: "#3A0A6E", purple: "#2E0A62", pink: "#6A0A8A", blue: "#42127A" },
  pinkNeg: { green: "#2E0A62", cyan: "#52168F", amber: "#3A0A6E", purple: "#2E0A62", pink: "#6A0A8A", blue: "#42127A" },
};

/* ---------- MODES (foundation axis) — Look.swift Mode ---------- */
const MODES = [
  ["pixel", "PIXEL"], ["ios", "iOS"], ["digital", "DIGITAL"], ["kam", "K·A·M"],
  ["cassette", "CASSETTE"], ["vinyl", "VINYL"], ["cd", "CD"], ["gameboy", "GAME BOY"],
];
const EQSTYLES = ["auto", "pixel", "smooth", "led", "ascii", "vu", "thin", "lcd", "mirror", "wave", "dots"];
const eqResolved = (s, m) => s !== "auto" ? s : ({ pixel: "pixel", ios: "smooth", digital: "led", cd: "led", kam: "ascii", cassette: "vu", vinyl: "thin", gameboy: "lcd" })[m];

/* fonts per mode × role — Look.font */
const F = (fam, size, w = 400, extra = {}) => Object.assign({ fam, size, w }, extra);
const FONTS = {
  pixel: { brand: F("silk", 11, 700), title: F("ps2p", 10), artist: F("silk", 11), album: F("silk", 9), small: F("silk", 8), chip: F("silk", 8) },
  ios: { brand: F("rounded", 12, 700), title: F("sf", 14, 600), artist: F("sf", 12), album: F("sf", 11), small: F("sf", 10, 500, { tab: 1 }), chip: F("rounded", 10, 600) },
  digital: { brand: F("mono", 11, 700), title: F("mono", 13, 600), artist: F("mono", 11), album: F("mono", 9, 300), small: F("mono", 9, 500), chip: F("mono", 9, 500) },
  kam: { brand: F("mono", 11, 800), title: F("mono", 12, 700), artist: F("mono", 11, 500), album: F("mono", 10), small: F("mono", 9), chip: F("mono", 9) },
  cassette: { brand: F("rounded", 11, 900), title: F("marker", 15), artist: F("marker", 12), album: F("mono", 9, 500), small: F("mono", 9, 600), chip: F("mono", 9, 600) },
  vinyl: { brand: F("serif", 12, 700), title: F("serif", 15, 600), artist: F("serif", 12, 400, { it: 1 }), album: F("serif", 10), small: F("serif", 9, 500), chip: F("serif", 9, 500) },
  cd: { brand: F("rounded", 11, 800), title: F("mono", 12, 700), artist: F("mono", 10, 500), album: F("mono", 9), small: F("mono", 9, 600), chip: F("mono", 9, 600) },
  gameboy: { brand: F("ps2p", 9), title: F("ps2p", 9), artist: F("ps2p", 7), album: F("ps2p", 6), small: F("ps2p", 6), chip: F("ps2p", 6) },
};
const FAM = { silk: "'Silkscreen', monospace", ps2p: "'Press Start 2P', monospace", sf: "var(--sf)", rounded: "var(--rounded)", mono: "var(--mono)", serif: "var(--serif)", marker: "var(--marker)" };
const fontCSS = f => `font:${f.it ? "italic " : ""}${f.w} ${f.size}px/1.2 ${FAM[f.fam]};${f.tab ? "font-variant-numeric:tabular-nums;" : ""}`;
const sysFont = (size, w = 400, fam = "sf", it = false) => fontCSS({ fam, size, w, it });

/* Look = one theme × one mode */
function makeLook(themeId, m, given) {
  const t = given || themeNamed(themeId);
  const isKAM = ["kam", "kampink", "kamneg", "kampinkneg"].includes(t.id);
  const house = ({ kampink: H.pink, kamneg: H.kamNeg, kampinkneg: H.pinkNeg })[t.id] || H.kam;
  const [r, g, b] = hx(t.screen).map(v => v / 255);
  const L = {
    t, m, isKAM, house,
    lightGround: 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35,
    font: role => fontCSS(FONTS[m][role]),
    text: s => ["ios", "vinyl", "cassette"].includes(m) ? s : s.toUpperCase(),
    tracking: m === "digital" ? 1.5 : 0,
    panelRadius: { pixel: 14, ios: 26, digital: 16, kam: 22, cassette: 22, vinyl: 24, cd: 22, gameboy: 10 }[m],
    artRadius: { pixel: 4, ios: 14, digital: 3, kam: 0, cassette: 2, vinyl: 99, cd: 99, gameboy: 0 }[m],
    isDevice: ["cassette", "vinyl", "cd", "gameboy"].includes(m),
    ramp: [0, 0.34, 0.67, 1].map(f => mix(t.screen, t.ink, f)),
    empty: rgba(t.label, 0.25),
    eqColors: isKAM ? [house.green, house.cyan, house.purple, house.cyan] : [t.ink, t.ink2, t.accent, t.ink2],
    edge: isKAM ? [house.purple, house.cyan, house.green] : [t.accent, t.ink, t.ink2],
  };
  // Look.band: things drawn on the black band beside the notch. On bright grounds the theme's dark inks
  // vanish against black, so the band uses the ground colour itself as its ink.
  Object.defineProperty(L, "band", { get() {
    if (!L.lightGround) return L; const gnd = t.screen;
    return makeLook(null, m, T(t.id + "-band", t.name, mix(gnd, BLACK, .6), gnd, BLACK, gnd, mix(gnd, WHITE, .4), mix(gnd, BLACK, .3), gnd));
  } });
  L.ink = (g) => {
    if (!isKAM) return g === "play" ? t.ink2 : g === "heartFill" ? t.accent : t.ink;
    return ({ prev: house.cyan, next: house.cyan, play: house.green, pause: house.amber, heart: house.pink, heartFill: house.pink,
      open: house.purple, settings: house.blue, back: house.blue, lyrics: house.pink, output: house.cyan, agent: house.purple })[g];
  };
  return L;
}

/* ---------- demo data (made up) ---------- */
function lyr(lines, start, step, dur) {
  const out = []; let t = start, i = 0;
  while (t < dur - 4) { out.push({ t, text: lines[i % lines.length] }); t += step; i++; }
  return out;
}
const TRACKS = [
  // A real recording, public domain (see assets/AUDIO-LICENCE.txt). Instrumental, so the "lyric" lines are captions.
  { title: "Gymnopédie No. 1", artist: "Erik Satie", album: "Robin Alciatore, piano · Musopen · public domain", duration: 183.6, n: 1, bpm: 66,
    real: true, src: "assets/gymnopedie-no1.mp3",
    art: ["#14213d", "#4a5d8f", "#d9c7a6", "#fff3da", 0.68, 0.34],
    lines: lyr(["(instrumental — no lyrics)", "Gymnopédie No. 1 · Erik Satie, 1888", "Lent et douloureux — slow and sorrowful",
      "Robin Alciatore, piano", "Public-domain recording via Musopen"], 2, 9, 183.6) },
  { title: "Neon Static", artist: "Glass Harbour (mock)", album: "Mock track · no audio", duration: 212, n: 4, bpm: 124, mock: true,
    art: ["#06243c", "#0b6f8a", "#30d0c8", "#e9f6ff", 0.7, 0.28],
    lines: lyr(["(placeholder line) headlights on the overpass", "counting stations in the dark", "", "(demo lyric) static on the radio",
      "the city folds into a spark", "keep the engine humming low"], 5, 7, 212) },
  { title: "Paper Satellites", artist: "Lumen Drift (mock)", album: "Mock track · no audio", duration: 245, n: 7, bpm: 96, mock: true,
    art: ["#2a0b18", "#a3263f", "#ff8a3d", "#ffe7a8", 0.5, 0.62],
    lines: lyr(["(placeholder line) folding maps into the sky", "paper satellites drift by", "(demo lyric) small lights over sleeping towns", "",
      "all the signals coming down", "hold the orbit, hold it still"], 7, 7.5, 245) },
];
const OUTPUTS = [["hifispeaker", "MacBook Speakers"], ["headphones", "Headphones"], ["hifispeaker", "Studio Display"]];
const HUB = [["K·A·M", "#00D4FF"], ["Command", "#3388FF"], ["WORK", "#FF8800"], ["Intel Engine", "#22CC55"], ["Lab", "#FF3355"]];
const HUB_SHORT = { "Command": "CMD", "Intel Engine": "INTEL", "WORK": "WORK", "K·A·M": "K·A·M", "Lab": "LAB" };
/* Ticker items (TaskBar.swift TickerView, Feeds.swift TickerFeed) — all mock. hot = drawn in the accent. */
const TICKER = [
  ["NEXT", "10:00 Seminar · Room 2.04", 1], ["WORLD", "(demo) Ceasefire talks resume in Geneva"], ["LATER", "14:00 Library · reading list"],
  ["DAILIES", "2/4 done · left: run, read"], ["TECH", "(demo) Open-weights model tops a coding benchmark"], ["LECTURE", "Week 3 · forecasting methods"],
  ["WAKE", "07:30 · iMac ✓ · M3 ✓"], ["MARKETS", "(demo) FTSE 100 +0.4% · GBP/USD 1.27"], ["MISSION", "Ship the portfolio window"],
  ["SCIENCE", "(demo) Probe returns first images from orbit", 1],
];

/* generated cover art (one canvas per track) */
function makeArt(tr) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d"); const [a, b, d, sun, sx, sy] = tr.art;
  const g = x.createLinearGradient(0, 0, 256, 256); g.addColorStop(0, a); g.addColorStop(0.55, b); g.addColorStop(1, d);
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.globalAlpha = 0.18; x.strokeStyle = "#fff"; x.lineWidth = 1;
  for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(0, 150 + i * i * 2.2); x.lineTo(256, 150 + i * i * 2.2); x.stroke(); }
  x.globalAlpha = 1; x.fillStyle = sun; x.beginPath(); x.arc(sx * 256, sy * 256, 46, 0, Math.PI * 2); x.fill();
  tr.canvas = c; tr.url = c.toDataURL("image/png");
}
TRACKS.forEach(makeArt);

/* ---------- state ---------- */
const S = {
  theme: "kampink", mode: "kam", expanded: false, page: "player", overlay: "none", flash: null,
  hoverOpen: true, showArt: true, showEQ: true, fx: true, fxStrength: 0.35, eqStyle: "auto",
  lyrics: false, lyricStrip: true, peek: true, titleStrip: false, liveEQ: true, hub: true, taskbar: false, ticker: true,
  idx: 0, pos: 0, playing: false, volume: 70, liked: new Set(), pin: false, output: 0,
};
const notch = { w: 200, h: 32 };
const track = () => TRACKS[S.idx];
const look = () => makeLook(S.theme, S.mode);
const frac = () => track().duration > 0 ? Math.min(1, S.pos / track().duration) : 0;
const clock = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function lyricIndex(tr, pos) { let idx = null; for (let i = 0; i < tr.lines.length; i++) if (tr.lines[i].t <= pos + 0.25) idx = i; return idx; }
function lyricLine(tr, pos, off = 0) { const i = (lyricIndex(tr, pos) ?? -1) + off; if (i < 0 || i >= tr.lines.length) return null; return tr.lines[i].text || "♪"; }

/* ---------- glyphs ---------- */
const PIX = {
  play: ["#......", "###....", "#####..", "#######", "#####..", "###....", "#......"],
  pause: ["##...##", "##...##", "##...##", "##...##", "##...##", "##...##", "##...##"],
  next: ["#....##", "##...##", "###..##", "####.##", "###..##", "##...##", "#....##"],
  prev: ["##....#", "##...##", "##..###", "##.####", "##..###", "##...##", "##....#"],
  heart: [".##.##.", "#..#..#", "#.....#", "#.....#", ".#...#.", "..#.#..", "...#..."],
  heartFill: [".##.##.", "#######", "#######", "#######", ".#####.", "..###..", "...#..."],
  open: ["..#####", ".....##", "....#.#", "...#..#", "..#....", ".#.....", "#......"],
  settings: ["..#....", "#######", "..#....", ".......", "....#..", "#######", "....#.."],
  back: ["...#...", "..#....", ".#.....", "#######", ".#.....", "..#....", "...#..."],
  lyrics: ["..###..", "..###..", "#.###.#", "#.###.#", ".#...#.", "..###..", "...#..."],
  output: ["...#..#", "..##.#.", "####.#.", "####.#.", "..##.#.", "...#..#", "......."],
};
function pixelIcon(g, cell) {
  const rows = PIX[g]; let r = "";
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
  return `<svg width="${7 * cell}" height="${rows.length * cell}" viewBox="0 0 7 ${rows.length}" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const ASCII = { prev: "|◂", play: "▸", pause: "‖", next: "▸|", heart: "♡", heartFill: "♥", open: "↗", settings: "≡", back: "←", lyrics: "♪", output: "◖)" };
const HEART = "M12 20.6s-7.6-4.7-9.5-9.3C1 7.9 3.2 4.3 6.8 4.3c2.2 0 3.7 1.2 5.2 3.2 1.5-2 3-3.2 5.2-3.2 3.6 0 5.8 3.6 4.3 7C19.6 15.9 12 20.6 12 20.6z";
function gearPath() {
  let d = ""; const n = 8;
  for (let i = 0; i < n * 2; i++) {
    const a0 = (i / (n * 2)) * Math.PI * 2, a1 = ((i + 1) / (n * 2)) * Math.PI * 2, r = i % 2 ? 7.4 : 9.6;
    const p = (a, rr) => `${(12 + rr * Math.cos(a)).toFixed(2)} ${(12 + rr * Math.sin(a)).toFixed(2)}`;
    d += (i ? "L" : "M") + p(a0, r) + "L" + p(a1, r);
  }
  return d + "Z";
}
/* SF Symbol stand-ins (24-unit grid) */
const SYM = {
  "play.fill": { f: "M7 4.6c0-.9 1-1.4 1.7-.9l11.2 7.4c.7.4.7 1.4 0 1.8L8.7 20.3c-.7.5-1.7 0-1.7-.9z" },
  "play": { s: "M7.5 4.8v14.4L19.4 12z" },
  "pause.fill": { f: "M6 4.5h4v15H6zM14 4.5h4v15h-4z" },
  "pause": { s: "M6.5 4.8h3v14.4h-3zM14.5 4.8h3v14.4h-3z" },
  "backward.fill": { f: "M11.6 5.3v13.4L2 12zM22 5.3v13.4L12.4 12z" },
  "forward.fill": { f: "M12.4 5.3v13.4L22 12zM2 5.3v13.4L11.6 12z" },
  "backward.end": { s: "M5.5 5v14M19 5.6v12.8L8.6 12z" },
  "forward.end": { s: "M18.5 5v14M5 5.6v12.8L15.4 12z" },
  "backward.end.fill": { f: "M4.5 4.6h2.7v14.8H4.5zM19.6 4.9v14.2L8.4 12z" },
  "forward.end.fill": { f: "M16.8 4.6h2.7v14.8h-2.7zM4.4 4.9v14.2L15.6 12z" },
  "heart": { s: HEART }, "heart.fill": { f: HEART },
  "arrow.up.right": { s: "M6.5 17.5L17 7M8.6 6.6H17.4V15.4" },
  "arrow.up.right.square": { s: "M5.5 3.8h13a1.7 1.7 0 0 1 1.7 1.7v13a1.7 1.7 0 0 1-1.7 1.7h-13a1.7 1.7 0 0 1-1.7-1.7v-13a1.7 1.7 0 0 1 1.7-1.7zM9 15l6-6M10.3 9H15v4.7" },
  "slider.horizontal.3": { s: "M3 6h18M3 12h18M3 18h18", x: '<rect x="6.5" y="3.5" width="3" height="5" rx="1"/><rect x="14" y="9.5" width="3" height="5" rx="1"/><rect x="9" y="15.5" width="3" height="5" rx="1"/>' },
  "gearshape": { s: gearPath(), x: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/>' },
  "chevron.left": { s: "M15 4.5L7.5 12l7.5 7.5" },
  "music.mic": { s: "M12.6 11.4L4 20", x: '<circle cx="15.5" cy="8.5" r="5"/>' },
  "airplayaudio": { s: "M6.4 16.6a8 8 0 1 1 11.2 0M9 14.2a4.4 4.4 0 1 1 6 0", f: "M12 14.2l5 6.8H7z" },
  "hifispeaker": { s: "M7.2 2.8h9.6a1.4 1.4 0 0 1 1.4 1.4v15.6a1.4 1.4 0 0 1-1.4 1.4H7.2a1.4 1.4 0 0 1-1.4-1.4V4.2a1.4 1.4 0 0 1 1.4-1.4z", x: '<circle cx="12" cy="15" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="7.2" r="1.5"/>' },
  "headphones": { s: "M4 15v-3a8 8 0 0 1 16 0v3", x: '<rect x="3" y="14" width="4.5" height="7" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="7" rx="1.5"/>' },
  "speaker.wave.2.fill": { f: "M3 9h4.2l5.3-4.6v15.2L7.2 15H3z", s: "M15.6 8.6a5 5 0 0 1 0 6.8M18.6 5.8a9 9 0 0 1 0 12.4" },
  "speaker.slash.fill": { f: "M3 9h4.2l5.3-4.6v15.2L7.2 15H3z", s: "M3.5 3.5l17 17" },
  "alarm.fill": { f: "M12 6.2a7.4 7.4 0 1 1 0 14.8 7.4 7.4 0 0 1 0-14.8z", s: "M3.6 6.4l3.2-2.8M20.4 6.4l-3.2-2.8M7 20.2l-1.6 1.6M17 20.2l1.6 1.6", x: '<path d="M12 9.6v4.2l2.6 1.6" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>' },
  "eject.fill": { f: "M12 3.6l8.4 9.4H3.6zM3.6 15.6h16.8v3.6H3.6z" },
};
const WEIGHT = { light: 1.3, regular: 1.7, medium: 1.9, semibold: 2.1, bold: 2.4, heavy: 2.8 };
function sym(name, size, weight = "regular") {
  const d = SYM[name] || SYM["play.fill"]; const sw = WEIGHT[weight] || 1.7; const px = (size * 1.12).toFixed(1);
  return `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">` +
    (d.f ? `<path d="${d.f}"/>` : "") +
    (d.s ? `<path d="${d.s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>` : "") +
    (d.x || "") + `</svg>`;
}
const SF = {
  prev: f => f ? "backward.fill" : "backward.end", play: f => f ? "play.fill" : "play", pause: f => f ? "pause.fill" : "pause",
  next: f => f ? "forward.fill" : "forward.end", heart: () => "heart", heartFill: () => "heart.fill",
  open: f => f ? "arrow.up.right" : "arrow.up.right.square", settings: f => f ? "slider.horizontal.3" : "gearshape",
  back: () => "chevron.left", lyrics: () => "music.mic", output: f => f ? "airplayaudio" : "hifispeaker",
};
/* GlyphView: one glyph, drawn the way the mode draws things */
function glyph(g, L, size) {
  switch (L.m) {
    case "pixel": return pixelIcon(g, Math.max(1, Math.round(size / 7)));
    case "ios": return sym(SF[g](true), size, "semibold");
    case "digital": case "cd": return sym(SF[g](false), size, "light");
    case "kam": return `<span class="ascii" style="font-size:${size}px">${ASCII[g]}</span>`;
    case "cassette": return sym(SF[g](true), size, "heavy");
    case "vinyl": return sym(SF[g](true), size, "regular");
    case "gameboy": return pixelIcon(g, 1);
  }
}

/* CtrlButton */
function ctrl(g, L, o = {}) {
  const ink = L.ink(g), compact = !!o.compact, hero = !!o.hero;
  const w = compact ? 22 : hero ? 40 : 32, h = compact ? 18 : 24;
  let cls = "cb", st = `--c:${ink};`, inner = "";
  switch (L.m) {
    case "pixel":
      cls += " cb-px"; inner = glyph(g, L, compact ? 7 : 10);
      st += `--hc:${L.t.screen};width:${w}px;height:${h}px;background:${compact ? "transparent" : L.t.bezel};${compact ? "" : `box-shadow:inset 0 0 0 1px ${ink};`}`; break;
    case "ios": {
      const d = compact ? 24 : hero ? 48 : 36, dep = compact ? 0.4 : hero ? 1.1 : 0.8;
      cls += " cb-ios glass"; inner = `<span style="color:${hero ? "#fff" : ink};display:flex">${glyph(g, L, compact ? 10 : hero ? 18 : 14)}</span>`;
      st += `width:${d}px;height:${d}px;${hero ? `background:linear-gradient(${rgba(ink, .22)},${rgba(ink, .22)}),rgba(255,255,255,.07);` : ""}box-shadow:0 ${5 * dep}px ${10 * dep}px rgba(0,0,0,${.35 * dep});`; break;
    }
    case "digital": case "cd":
      cls += " cb-dg"; inner = `<span style="display:flex">${glyph(g, L, compact ? 10 : 13)}</span>`;
      st += `width:${w}px;height:${h}px;--st:${rgba(ink, compact ? 0 : .4)};--sth:${rgba(ink, compact ? 0 : .9)};`; break;
    case "kam":
      if (compact) { cls += " cb-kc"; inner = glyph(g, L, 10); st += `width:${w}px;height:${h}px;--hc:${L.t.ink};`; }
      else {
        cls += " cb-k"; st += `height:${h}px;--hc:${L.t.screen};font:${12}px var(--mono);gap:1px;`;
        inner = `<span style="color:${L.t.label}">[</span><span class="g">${glyph(g, L, 12)}</span><span style="color:${L.t.label}">]</span>`;
      } break;
    case "cassette":
      inner = glyph(g, L, compact ? 10 : 11); st += `width:${w}px;height:${h}px;`; break;
    case "vinyl": {
      const d = compact ? 20 : hero ? 36 : 28;
      cls += " cb-v"; inner = `<span style="color:${hero ? L.t.screen : ink};display:flex">${glyph(g, L, compact ? 9 : hero ? 13 : 11)}</span>`;
      st += `width:${d}px;height:${d}px;background:${hero ? ink : "transparent"};--st:${rgba(ink, hero || compact ? 0 : .35)};--sth:${rgba(ink, hero || compact ? 0 : .9)};`; break;
    }
    case "gameboy":
      cls += " cb-gb"; inner = glyph(g, L, 7); st = `--c:${L.ramp[2]};--hc:${L.ramp[3]};width:${w}px;height:${h}px;`; break;
  }
  if (o.opacity != null) st += `opacity:${o.opacity};`;
  return `<button class="${cls}" style="${st}" data-act="${o.act || ""}" title="${esc(o.title || "")}" aria-label="${esc(o.title || g)}">${inner}</button>`;
}

/* ---------- art slots (Modes.swift ArtSlot) ---------- */
function artTile(L, size, border) {
  const r = size > 30 ? L.artRadius : Math.min(L.artRadius, 4);
  const shadow = L.m === "ios" && size > 30 ? "box-shadow:0 8px 14px rgba(0,0,0,.45);" : "";
  return `<div style="position:relative;width:${size}px;height:${size}px;flex:none;border-radius:${Math.min(r, size / 2)}px;background:${L.t.bezel};${shadow}">
    <img src="${track().url}" alt="" style="width:100%;height:100%;display:block;border-radius:inherit;${L.m === "pixel" ? "image-rendering:pixelated;" : ""}">
    <div style="position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px ${border};"></div></div>`;
}
function cassetteArt(L, width) { // Modes.swift Cassette
  const h = width * 0.64, big = width > 50, p = frac();
  const w = width * 0.62, wh = h * 0.3, full = wh * 0.95, core = wh * 0.32;
  const reel = pack => `<div style="width:${pack}px;height:${pack}px;border-radius:50%;background:#3A2618;display:flex;align-items:center;justify-content:center;flex:none">
      <div class="spin" data-rate="240" style="width:${core}px;height:${core}px;border-radius:50%;background:#E8E2D0;position:relative">${[0, 1, 2, 3, 4, 5].map(i =>
        `<i style="position:absolute;left:50%;top:50%;width:${Math.max(1, core * .12)}px;height:${core * .3}px;background:rgba(0,0,0,.7);transform:translate(-50%,-50%) rotate(${i * 60}deg) translateY(${-core * .3}px)"></i>`).join("")}</div></div>`;
  return `<div style="position:relative;width:${width}px;height:${h}px;flex:none">
    <div style="position:absolute;inset:0;border-radius:${width * .06}px;background:${mix(L.t.bezel, BLACK, .3)};box-shadow:inset 0 0 0 1px ${rgba(L.t.label, .6)}"></div>
    <div class="vstack" style="position:absolute;inset:0;align-items:center">
      <div style="position:relative;margin-top:${h * .07}px;width:${width * .88}px;height:${h * .62}px;border-radius:2px;overflow:visible">
        <div style="position:absolute;inset:0;border-radius:2px;overflow:hidden;background:${rgba(L.t.ink2, .85)}">
          <div style="position:absolute;left:0;right:0;bottom:0;height:${big ? 3 : 1}px;background:linear-gradient(90deg,${L.edge.join(",")})"></div></div>
        <div class="hstack" style="position:absolute;left:50%;top:50%;transform:translate(-50%,calc(-50% + ${big ? 2 : 0}px));width:${w}px;height:${wh}px;border-radius:${wh / 2}px;background:rgba(0,0,0,.85);justify-content:space-between;padding:0 ${wh * .15}px">
          ${reel(core + (full - core) * (1 - p))}${reel(core + (full - core) * p)}</div>
      </div>
      <div style="margin-top:auto;width:${width * .55}px;height:${h * .2}px;background:${mix(L.t.bezel, BLACK, .5)};clip-path:polygon(10% 0,90% 0,100% 100%,0 100%)"></div>
    </div></div>`;
}
function vinylArt(L, size) { // Modes.swift Vinyl (no arm at small sizes)
  const step = Math.max(1.2, size / 40);
  const grooves = []; for (let r = size * .2; r < size * .49; r += step) grooves.push(`<circle cx="${size / 2}" cy="${size / 2}" r="${r.toFixed(2)}"/>`);
  return `<div style="position:relative;width:${size}px;height:${size}px;flex:none">
    <div class="circle" style="position:absolute;inset:0;background:#0B0B0C"></div>
    <svg width="${size}" height="${size}" style="position:absolute;inset:0" fill="none" stroke="rgba(255,255,255,.07)" stroke-width=".5">${grooves.join("")}</svg>
    <img class="spin circle" data-rate="200" src="${track().url}" alt="" style="position:absolute;left:${size * .31}px;top:${size * .31}px;width:${size * .38}px;height:${size * .38}px;object-fit:cover">
    <div class="circle" style="position:absolute;left:50%;top:50%;width:${Math.max(2, size * .04)}px;height:${Math.max(2, size * .04)}px;transform:translate(-50%,-50%);background:${L.t.screen}"></div>
    <div class="circle" style="position:absolute;inset:0;background:conic-gradient(from 90deg,transparent,rgba(255,255,255,.12),transparent,transparent,rgba(255,255,255,.08),transparent)"></div></div>`;
}
function discArt(L, size) { // Devices.swift Disc
  const rainbow = ["red", "orange", "yellow", "#34c759", "cyan", "#0a84ff", "#af52de", "red"].map(c => `color-mix(in srgb, ${c} 55%, transparent)`);
  return `<div style="position:relative;width:${size}px;height:${size}px;flex:none">
    <div class="circle" style="position:absolute;inset:0;background:conic-gradient(from 90deg,${rainbow.join(",")})"></div>
    <div class="circle" style="position:absolute;inset:${size * .02}px;background:#C8C8CC"></div>
    <img class="spin circle" data-rate="320" src="${track().url}" alt="" style="position:absolute;left:${size * .03}px;top:${size * .03}px;width:${size * .94}px;height:${size * .94}px;object-fit:cover">
    <div class="circle" style="position:absolute;left:50%;top:50%;width:${size * .36}px;height:${size * .36}px;transform:translate(-50%,-50%);background:rgba(218,218,223,.85)"></div>
    <div class="circle" style="position:absolute;left:50%;top:50%;width:${size * .15}px;height:${size * .15}px;transform:translate(-50%,-50%);background:${L.t.screen}"></div></div>`;
}
/* DitherArt: art posterised to the 4-shade LCD ramp with a 4×4 Bayer dither */
function ditherURL(L, n) {
  const src = track().canvas, c = document.createElement("canvas"); c.width = c.height = n;
  const x = c.getContext("2d"); x.drawImage(src, 0, 0, n, n);
  const d = x.getImageData(0, 0, n, n), px = d.data;
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], ramp = L.ramp.map(hx);
  for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) {
    const i = (y * n + xx) * 4, v = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
    const t = (bayer[(y % 4) * 4 + xx % 4] + 0.5) / 16 - 0.5;
    const col = ramp[Math.max(0, Math.min(3, Math.round(v * 3 + t)))];
    px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255;
  }
  x.putImageData(d, 0, 0); return c.toDataURL();
}
const ditherArt = (L, size) => `<img src="${ditherURL(L, size > 30 ? 40 : 20)}" alt="" style="width:${size}px;height:${size}px;image-rendering:pixelated;display:block;flex:none">`;
function artSlot(L, size, border) {
  switch (L.m) {
    case "cassette": return cassetteArt(L, size * 1.5);
    case "vinyl": return vinylArt(L, size);
    case "gameboy": return ditherArt(L, size);
    case "cd": return discArt(L, size);
    default: return artTile(L, size, border);
  }
}

/* ---------- EQ (Views.swift EQView) ---------- */
function eqWidth(st, h) {
  return ({ pixel: 18, smooth: 18, mirror: 18, led: 22, ascii: Math.ceil(h * 0.62 * 4), vu: 24, thin: 15, lcd: 19, wave: 26, dots: 16 })[st];
}
const eq = (L, h) => { const st = eqResolved(S.eqStyle, L.m); return `<canvas class="eq" data-h="${h}" data-style="${st}" width="1" height="1" style="width:${eqWidth(st, h)}px;height:${h}px"></canvas>`; };
function synthetic(t) { return [0, 1, 2, 3].map(k => 0.25 + 0.3 * (Math.sin(t * (5 + k * 1.7) + k) + 1)); }
function drawEQ(cv, L, v, active) {
  const h = +cv.dataset.h, st = cv.dataset.style, w = eqWidth(st, h), dpr = Math.min(3, devicePixelRatio || 1);
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const x = cv.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  const c = L.eqColors, lab = L.t.label;
  const rr = (X, Y, W, Hh, r) => { x.beginPath(); x.roundRect ? x.roundRect(X, Y, W, Hh, Math.min(r, W / 2, Hh / 2)) : x.rect(X, Y, W, Hh); x.fill(); };
  switch (st) {
    case "pixel": for (let i = 0; i < 4; i++) { const s = Math.max(1, Math.round(v[i] * (h / 3))); x.fillStyle = active ? c[i] : lab; x.fillRect(i * 5, h - s * 3, 3, s * 3); } break;
    case "smooth": for (let i = 0; i < 4; i++) { const bh = Math.max(3, v[i] * h); x.fillStyle = active ? c[i] : lab; rr(i * 5, (h - bh) / 2, 3, bh, 1.5); } break;
    case "led": { const segs = Math.floor(h / 3); for (let i = 0; i < 4; i++) { const on = Math.round(v[i] * segs); const top = h - (segs * 3 - 1);
      for (let s = 0; s < segs; s++) { x.fillStyle = segs - s <= on ? c[i] : rgba(lab, .2); x.fillRect(i * 6, top + s * 3, 4, 2); } } break; }
    case "ascii": { const b = "▁▂▃▄▅▆▇█"; x.font = `${h}px ui-monospace, Menlo, monospace`; x.textBaseline = "bottom";
      for (let i = 0; i < 4; i++) { x.fillStyle = active ? c[i] : lab; x.fillText(b[Math.min(7, Math.floor(v[i] * 7.99))], i * h * 0.62, h + 1); } break; }
    case "vu": { const lr = [(v[0] + v[1]) / 2, (v[2] + v[3]) / 2], cols = [L.house.green, L.house.green, L.house.green, L.house.amber, "#FF3355"], rh = h / 2 - 2, top = (h - (rh * 2 + 2)) / 2;
      for (let ch = 0; ch < 2; ch++) for (let s = 0; s < 5; s++) { x.fillStyle = s < lr[ch] * 5.5 ? cols[s] : rgba(lab, .25); x.fillRect(s * 5, top + ch * (rh + 2), 4, rh); } break; }
    case "thin": for (let i = 0; i < 4; i++) { const bh = Math.max(2, v[i] * h); x.fillStyle = active ? rgba(L.t.ink, .9) : lab; rr(i * 4.5, (h - bh) / 2, 1.5, bh, .75); } break;
    case "lcd": for (let i = 0; i < 4; i++) { const s = Math.max(1, Math.round(v[i] * (h / 2))); x.fillStyle = active ? L.ramp[3 - i % 2] : L.ramp[1]; x.fillRect(i * 5, h - s * 2, 4, s * 2); } break;
    case "mirror": [3, 1, 0, 2].forEach((i, j) => { const bh = Math.max(2, v[i] * h); x.fillStyle = active ? c[i] : lab; rr(j * 5, (h - bh) / 2, 3, bh, 1); }); break;
    case "wave": { const pts = [0, ...v, 0], n = pts.length - 1, P = k => [w * k / n, h * (1 - pts[k] * 0.9) - 1];
      x.beginPath(); pts.forEach((_, k) => { const p = P(k); if (k === 0) x.moveTo(...p); else { const q = P(k - 1); x.quadraticCurveTo(q[0], q[1], (q[0] + p[0]) / 2, (q[1] + p[1]) / 2); if (k === n) x.lineTo(...p); } });
      const g = x.createLinearGradient(0, 0, w, 0); (active ? c : [lab, lab]).forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
      x.strokeStyle = g; x.lineWidth = 1.5; x.lineCap = "round"; x.lineJoin = "round"; x.stroke(); break; }
    case "dots": { const rows = Math.max(3, Math.floor(h / 3.5)); for (let i = 0; i < 4; i++) { const on = Math.round(v[i] * rows); const top = h - (rows * 3.5 - 1);
      for (let r = 0; r < rows; r++) { x.fillStyle = rows - r <= on ? (active ? c[i] : lab) : rgba(lab, .15); x.beginPath(); x.arc(i * 4.5 + 1.25, top + r * 3.5 + 1.25, 1.25, 0, Math.PI * 2); x.fill(); } } break; }
  }
}

/* ---------- simulated audio tap (AudioTap.swift analyse(): 4 bands, AGC, fast attack / soft release) ---------- */
const TAP = { bands: [0, 0, 0, 0], smooth: [0, 0, 0, 0], peak: [1e-3, 1e-3, 1e-3, 1e-3], acc: 0, pub: 0 };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function rawBands(pos, bpm) {
  const beat = 60 / bpm, ph = (pos % beat) / beat, bar = Math.floor(pos / beat) % 4, e8 = ((pos % (beat / 2)) / (beat / 2));
  const kick = Math.exp(-ph * 9), snare = (bar === 1 || bar === 3) ? Math.exp(-ph * 6) : 0, hat = Math.exp(-e8 * 14);
  const swell = 0.5 + 0.5 * Math.sin(pos * 2 * Math.PI / (beat * 8));
  return [0.12 + kick + 0.1 * rnd(), 0.25 + 0.3 * swell + 0.4 * kick + 0.3 * snare + 0.08 * rnd(),
          0.2 + 0.8 * snare + 0.25 * swell + 0.1 * rnd(), 0.12 + 0.7 * hat + 0.35 * snare + 0.15 * rnd()];
}
function tapStep(dt) {
  // The real recording, when it is the one playing: read it through the analyser (realTap, below).
  if (S.playing && S.liveEQ && track().real && AUD.an && !AUD.el.paused) { realTap(dt); return; }
  const fr = 1024 / 48000; TAP.acc += Math.min(dt, 0.25);
  while (TAP.acc >= fr) {
    TAP.acc -= fr;
    const v = S.playing ? rawBands(S.pos, track().bpm) : [0, 0, 0, 0];
    for (let b = 0; b < 4; b++) {
      TAP.peak[b] = Math.max(v[b], TAP.peak[b] * 0.997, 1e-3);
      const target = Math.pow(Math.min(1, v[b] / TAP.peak[b]), 1.6);
      TAP.smooth[b] += (target - TAP.smooth[b]) * (target > TAP.smooth[b] ? 0.65 : 0.18);
    }
  }
  TAP.pub += dt; if (TAP.pub >= 1 / 30) { TAP.pub = 0; TAP.bands = TAP.smooth.slice(); }
}
const eqLevels = (t) => S.liveEQ ? TAP.bands : synthetic(t);
const stereo = (t) => { if (!S.playing) return [0, 0]; if (S.liveEQ) { const b = TAP.bands; return [(b[0] + b[1]) / 2, (b[2] + b[3]) / 2 + 0.1]; } return [0.5 + 0.3 * Math.sin(t * 7), 0.45 + 0.3 * Math.sin(t * 9 + 1)]; };

/* ---------- small builders ---------- */
const marquee = (bind, font, color, glow, h) =>
  `<div class="mq" data-mq="${bind}" style="height:${h}px;${font}color:${color};${glow ? `text-shadow:0 0 3px ${rgba(color, .8)};` : ""}"><div class="mq-in"></div></div>`;

function timeline(L) {
  const lit = L.isKAM ? L.house.cyan : L.t.ink, head = L.isKAM ? L.house.green : L.t.ink2;
  let bar = "";
  switch (L.m) {
    case "pixel": bar = `<div class="tl-px" data-cells="7" data-clit="${lit}" data-chead="${head}" data-cempty="${L.empty}"></div>`; break;
    case "gameboy": bar = `<div class="tl-gb" data-cells="6" data-clit="${L.ramp[3]}" data-chead="${L.ramp[3]}" data-cempty="${L.ramp[1]}"></div>`; break;
    case "ios": bar = `<div class="tl-ios glass" style="background:rgba(255,255,255,.06)"><div class="fill" data-fill style="background:linear-gradient(${lit},${rgba(lit, .75)})"></div>
        <div class="knob glass" data-knob style="background:linear-gradient(${rgba(lit, .22)},${rgba(lit, .22)}),rgba(255,255,255,.25);box-shadow:0 4px 8px rgba(0,0,0,.28)"></div></div>`; break;
    case "digital": case "cd": {
      let ticks = ""; for (let i = 0; i < 11; i++) ticks += `<i style="position:absolute;left:calc(${i * 10}% - ${i / 10}px);top:50%;width:1px;height:${i % 5 === 0 ? 7 : 4}px;transform:translateY(-50%);background:${rgba(L.t.label, .6)}"></i>`;
      bar = `<i style="position:absolute;left:0;right:0;top:5.5px;height:1px;background:${rgba(L.t.label, .35)}"></i>${ticks}
        <i data-fill style="position:absolute;left:0;top:5px;height:2px;background:${lit};box-shadow:0 0 3px ${lit}"></i>
        <i data-head style="position:absolute;top:1px;width:2px;height:10px;margin-left:-1px;background:${head};box-shadow:0 0 4px ${head}"></i>`; break;
    }
    case "kam": bar = `<div class="nowrap" data-kambar style="position:absolute;left:0;right:0;top:-1px;font:11px/14px var(--mono);overflow:hidden"></div>`; break;
    case "vinyl": bar = `<i style="position:absolute;left:0;right:0;top:5.5px;height:1px;background:${rgba(L.t.label, .4)}"></i>
        <i data-fill style="position:absolute;left:0;top:5.5px;height:1px;background:${lit}"></i><i class="tl-v-dot" data-dot style="background:${lit}"></i>`; break;
    case "cassette": bar = `<i style="position:absolute;left:0;right:0;top:4px;height:4px;border-radius:1px;background:#3A2618"></i>
        <i data-fill style="position:absolute;left:0;top:4px;height:4px;border-radius:1px;background:${lit}"></i>
        <i data-head style="position:absolute;top:1px;width:6px;height:10px;margin-left:-3px;border-radius:1px;background:${mix(L.t.label, WHITE, .5)}"></i>`; break;
  }
  return `<div class="tl" data-tl data-lab="${L.t.label}" data-ink2="${L.t.ink2}" data-lit="${lit}">
    <div class="tl-bar" data-scrub="tl">${bar}</div>
    <div class="tl-clock" style="${L.font("small")}color:${L.t.label}"><span data-bind="pos"></span><span data-bind="rem"></span></div></div>`;
}

function volInner(L) {
  const v = S.volume / 100, ink = L.isKAM ? L.house.cyan : L.t.ink;
  if (["pixel", "gameboy", "kam"].includes(L.m)) {
    const on = Math.round(v * 8);
    return `<div class="hstack" style="gap:1px;align-items:flex-end;height:12px">${[...Array(8)].map((_, i) => `<i style="flex:1;height:${3 + i}px;background:${i < on ? ink : L.empty}"></i>`).join("")}</div>`;
  }
  if (L.m === "ios") return `<div style="position:relative;height:12px"><div class="glass" style="position:absolute;left:0;right:0;top:2px;height:8px;border-radius:99px;background:rgba(255,255,255,.06)"></div>
      <div style="position:absolute;left:1.5px;top:3.5px;height:5px;border-radius:99px;width:max(5px, calc((100% - 3px) * ${v}));background:${ink}"></div></div>`;
  return `<div style="position:relative;height:12px"><div style="position:absolute;left:0;right:0;top:4.5px;height:3px;border-radius:99px;background:${rgba(L.t.label, .3)}"></div>
      <div style="position:absolute;left:0;top:4.5px;height:3px;border-radius:99px;width:max(3px, calc(100% * ${v}));background:${ink}"></div></div>`;
}
function volumeBar(L) {
  return `<div class="hstack" style="gap:4px;width:72px;flex:none" title="Volume">
    <span data-volicon style="color:${L.t.label};display:flex">${sym(S.volume === 0 ? "speaker.slash.fill" : "speaker.wave.2.fill", 8, "regular")}</span>
    <div style="flex:1;cursor:pointer;touch-action:none" data-scrub="vol">${volInner(L)}</div></div>`;
}

/* ---------- header (Views.swift Expanded.header) ---------- */
function header(L) {
  const t = L.t;
  const brandColor = t.id === "kam" ? H.kam.cyan : t.id === "kamneg" ? H.kam.purple : L.isKAM ? L.house.purple : t.accent;
  let left = `<button class="hstack" data-act="cycle" title="Cycle style" style="gap:6px;flex:none">
      <span class="nowrap" style="${L.font("brand")}color:${brandColor}">${L.m === "kam" ? "[K·A·M]" : "K·A·M"}</span>
      ${S.flash ? `<span class="nowrap" style="${L.font("small")}color:${t.label}">${esc(S.flash)}</span>` : ""}</button>`;
  if (!S.flash) {
    left += ctrl("lyrics", L, { compact: true, act: "lyrics", opacity: S.lyrics ? 1 : 0.45, title: S.lyrics ? "Hide lyrics" : "Show lyrics" });
    left += ctrl("output", L, { compact: true, act: "outputs", opacity: S.page === "outputs" ? 1 : 0.7, title: "Output device" });
    left += `<span class="hstack nowrap" title="Alarm 07:30 (mock)" style="gap:3px;color:${t.ink};opacity:.85;flex:none">${sym("alarm.fill", 10, "semibold")}<span style="${L.font("chip")}font-variant-numeric:tabular-nums">07:30</span></span>`;
  }
  let right = "";
  if (S.page === "player") {
    right += `<button class="hstack nowrap" data-act="openapp" title="Open Music (not in the demo)" style="gap:3px;${L.font("small")}color:${L.ink("open")};flex:none">${esc(L.text("Music"))}${sym("arrow.up.right", 7, "bold")}</button>`;
    if (S.showEQ) right += eq(L, 10);
  }
  right += ctrl(S.page === "player" ? "settings" : "back", L, { compact: true, act: "settings", title: S.page === "player" ? "Settings" : "Back" });
  return `<div class="hstack" style="gap:8px;height:${notch.h}px;padding:0 20px;flex:none">${left}<div style="flex:1;min-width:${notch.w + 12}px"></div>${right}</div>`;
}

/* ---------- standard player (PIXEL / iOS / DIGITAL / K·A·M) ---------- */
function standardPlayer(L) {
  const tr = track(), liked = S.liked.has(S.idx), fx = S.fx;
  const glow = (L.m === "digital" || L.m === "kam") && fx ? `text-shadow:0 0 4px ${rgba(L.t.ink, .8 * S.fxStrength)};` : "";
  const trk = L.tracking ? `letter-spacing:${L.tracking}px;` : "";
  const stencil = L.m === "kam" && fx ? `<div class="hstack nowrap" style="height:9px;font:700 7px/9px var(--mono);color:${L.t.label};justify-content:space-between;flex:none"><span>K·A·M AUDIO TERMINAL · UNIT 01</span><span>SIGNAL ● LIVE</span></div>` : "";
  const textBlock = S.lyrics
    ? `<div class="tx" data-bind="lyr0" style="${L.font("artist")}${trk}color:${L.t.ink2}"></div><div class="tx" data-bind="lyr1" style="${L.font("album")}${trk}color:${L.t.label}"></div>`
    : `<div class="tx" style="${L.font("artist")}${trk}color:${L.t.ink2}">${esc(L.text(tr.artist))}</div>
       <div class="tx" style="${L.font("album")}${trk}color:${L.t.label}">${L.m === "kam" ? "// " : ""}${esc(L.text(tr.album))}</div>`;
  return `<div class="vstack" style="gap:10px;padding:0 20px;justify-content:center;height:100%">
    ${stencil}
    <div class="hstack" style="gap:14px;align-items:flex-start">
      <div data-act="dblplay" title="Double-click: play / pause">${artSlot(L, 64, L.m === "ios" ? "transparent" : L.t.ink)}</div>
      <div class="vstack" style="gap:5px;flex:1;min-width:0">
        <div class="tx" style="${L.font("title")}${trk}${glow}">${L.m === "kam" ? `<span style="color:${L.t.label}">&gt; </span>` : ""}<span style="color:${L.t.ink}">${esc(L.text(tr.title))}</span>${L.m === "kam" && fx ? `<span data-cursor style="color:${L.t.ink}">_</span>` : ""}</div>
        ${textBlock}
        ${timeline(L)}
      </div>
    </div>
    <div class="hstack" style="gap:${L.m === "ios" ? 14 : 8}px">
      ${ctrl(liked ? "heartFill" : "heart", L, { act: "like", title: "Like" })}
      <div style="flex:1"></div>
      ${ctrl("prev", L, { act: "prev", title: "Previous" })}
      ${ctrl(S.playing ? "pause" : "play", L, { hero: true, act: "play", title: S.playing ? "Pause" : "Play" })}
      ${ctrl("next", L, { act: "next", title: "Next" })}
      <div style="flex:1"></div>
      ${volumeBar(L)}
    </div></div>`;
}

/* ---------- photoreal devices (PhotoDevices.swift) ---------- */
const PHOTO = { w: 1344, h: 576 };
const photoStage = (name) => `<div class="hstack" style="height:100%;padding:0 14px;justify-content:center"><div class="pstage" data-stage="${name}"></div></div>`;
function hotspot(r, s, o) {
  const [x, y, w, h] = r, rad = o.round ? w / 2 * s : 4 * s, glow = o.glow || "#ffffff";
  return `<button class="hs" data-act="${o.act}" title="${esc(o.title || "")}" aria-label="${esc(o.title || o.act)}" style="left:${x * s}px;top:${y * s}px;width:${w * s}px;height:${h * s}px;border-radius:${rad}px;background:rgba(0,0,0,${o.latched ? .22 : 0});--glow:${glow};--glowa:${rgba(glow, .55)}">
    ${o.latched ? `<span class="latch"></span>` : ""}
    ${o.symbol ? `<span style="display:flex;color:${o.symbolColor || "rgba(0,0,0,.55)"};transform:translateY(${o.latched ? 1.5 : 0}px)">${sym(o.symbol, Math.min(w, h) * s * .34, "bold")}</span>` : ""}</button>`;
}
function levelMeter(L, ch) {
  let segs = ""; for (let i = 0; i < 18; i++) segs += `<i style="flex:1;height:5px"></i>`;
  return `<div class="hstack" style="gap:4px"><span style="font:700 7px/1 var(--mono);color:${rgba(L.t.ink, .6)}">${ch}</span>
    <div class="hstack" data-meter="${ch === "L" ? 0 : 1}" style="gap:1.5px;flex:1">${segs}</div></div>`;
}
function cassettePhoto(L, s) {
  const tr = track(), liked = S.liked.has(S.idx), hubs = [[263, 231], [437, 231]];
  const keys = [[750, 390, 104, 92], [866, 390, 96, 92], [971, 390, 90, 92], [1069, 390, 81, 92], [1157, 390, 86, 92]];
  const D = [694, 96, 590, 186];
  let o = "";
  hubs.forEach((hb, i) => { o += `<div class="abs circle" data-pack="${i}" data-cx="${hb[0] * s}" data-cy="${hb[1] * s}" style="background:rgba(42,26,16,.55)"></div>`; });
  hubs.forEach(hb => {
    o += `<div class="hub spin" data-rate="150" style="left:${(hb[0] - 52) * s}px;top:${(hb[1] - 52) * s}px;width:${104 * s}px;height:${104 * s}px;
      background-image:url(assets/devices/cassette-deck.jpg);background-size:${PHOTO.w * s}px ${PHOTO.h * s}px;background-position:${-(hb[0] - 52) * s}px ${-(hb[1] - 52) * s}px"></div>`;
  });
  o += `<div class="abs vstack noshrink" style="left:${D[0] * s}px;top:${D[1] * s}px;width:${D[2] * s}px;height:${D[3] * s}px;padding:6px ${10 * s / 0.35}px;gap:5px">
      ${marquee("vfd", sysFont(12, 600, "mono"), L.t.ink, true, 15)}
      <div class="hstack" style="gap:8px"><div class="vstack" style="gap:3px;flex:1">${levelMeter(L, "L")}${levelMeter(L, "R")}</div>
        <div class="hstack" style="gap:1px" data-bind-counter>${[0, 1, 2].map(() => `<span style="width:10px;height:15px;background:#111;box-shadow:inset 0 0 0 .5px rgba(255,255,255,.15);font:700 11px/15px var(--mono);color:#fff;text-align:center"></span>`).join("")}</div></div>
      <div data-scrub="vfd" style="position:relative;height:10px;cursor:pointer;touch-action:none">
        <i style="position:absolute;left:0;right:0;top:4px;height:2px;background:${rgba(L.t.ink, .15)}"></i>
        <i data-fill style="position:absolute;left:0;top:4px;height:2px;background:${L.t.ink};box-shadow:0 0 3px ${L.t.ink}"></i></div></div>`;
  o += hotspot(keys[0], s, { symbol: "backward.end.fill", act: "prev", title: "Previous" });
  o += hotspot(keys[1], s, { latched: S.playing, symbol: "play.fill", act: "playonly", title: "Play" });
  o += hotspot(keys[2], s, { latched: !S.playing, symbol: "pause.fill", act: "pauseonly", title: "Pause" });
  o += hotspot(keys[3], s, { symbol: "forward.end.fill", act: "next", title: "Next" });
  o += hotspot(keys[4], s, { latched: liked, symbol: liked ? "heart.fill" : "heart", symbolColor: liked ? "#D0306A" : "rgba(0,0,0,.55)", act: "like", title: "Like" });
  o += hotspot([300, 440, 88, 38], s, { symbol: "eject.fill", act: "openapp", title: "Open Music (not in the demo)" });
  o += `<div class="abs circle" style="left:${(72 - 7) * s}px;top:${(461 - 7) * s}px;width:${14 * s}px;height:${14 * s}px;background:#FF2020;opacity:${S.playing ? 1 : .35};${S.playing ? "box-shadow:0 0 6px red" : ""}"></div>`;
  return o;
}
let lastArm = 0, armPlaying = null, armAnimUntil = 0;
function armAngleFor(r) {
  const pivot = [607, 76], platter = [328, 236], len = 300; let best = 0, err = Infinity;
  for (let i = 0; i <= 900; i++) { const a = i / 10 * Math.PI / 180; const x = pivot[0] - len * Math.sin(a), y = pivot[1] + len * Math.cos(a);
    const e = Math.abs(Math.hypot(x - platter[0], y - platter[1]) - r); if (e < err) { err = e; best = i / 10; } }
  return best;
}
const ARM_OUTER = armAngleFor(214 - 10), ARM_INNER = armAngleFor(214 * 0.36);
const armAngle = () => S.playing ? ARM_OUTER + (ARM_INNER - ARM_OUTER) * frac() : 0;
function turntablePhoto(L, s) {
  const R = 214, pl = [328, 236], pivot = [607, 76], ap = [348, 228], asz = [688, 1024], k = 300 / 782 * s, liked = S.liked.has(S.idx), tr = track();
  let o = `<div class="abs" style="left:${(pl[0] - R) * s}px;top:${(pl[1] - R) * s}px;width:${2 * R * s}px;height:${2 * R * s}px">
      <img src="assets/devices/record.png" alt="" class="circle" style="position:absolute;inset:0;width:100%;height:100%;box-shadow:0 ${3 * s}px ${5 * s}px rgba(0,0,0,.55)">
      <div class="spin circle" data-rate="200" style="position:absolute;left:50%;top:50%;width:${.6 * R * s}px;height:${.6 * R * s}px;margin:${-.3 * R * s}px 0 0 ${-.3 * R * s}px;overflow:hidden">
        <img src="${tr.url}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">
        <div class="circle" style="position:absolute;inset:0;background:rgba(0,0,0,.08);box-shadow:inset 0 0 0 1px rgba(0,0,0,.35)"></div></div>
      <div class="circle" style="position:absolute;left:50%;top:50%;width:${8 * s}px;height:${8 * s}px;margin:${-4 * s}px 0 0 ${-4 * s}px;background:radial-gradient(circle ${6 * s}px at 0 0,#EEEEEE,#777777)"></div></div>`;
  o += `<img src="assets/devices/tonearm.png" alt="" data-arm style="position:absolute;pointer-events:none;left:${pivot[0] * s - ap[0] * k}px;top:${pivot[1] * s - ap[1] * k}px;width:${asz[0] * k}px;height:${asz[1] * k}px;
      transform-origin:${ap[0] / asz[0] * 100}% ${ap[1] / asz[1] * 100}%;transform:rotate(${lastArm}deg);filter:drop-shadow(2px 3px 3px rgba(0,0,0,.6))">`;
  o += hotspot([48, 469, 52, 52], s, { round: true, latched: S.playing, act: "play", title: S.playing ? "Stop" : "Start" });
  o += hotspot([127, 487, 27, 27], s, { round: true, act: "prev", title: "Previous" });
  o += hotspot([172, 487, 27, 27], s, { round: true, act: "next", title: "Next" });
  const lines = S.lyrics ? `<div class="tx" data-bind="lyr0" style="${L.font("artist")}color:${L.t.ink2}"></div><div class="tx" data-bind="lyr1" style="${L.font("album")}color:${L.t.label}"></div>`
    : `<div class="tx" style="${sysFont(13, 400, "serif", true)}color:${L.t.ink2}">${esc(tr.artist)}</div>`;
  o += `<div class="abs vstack" style="left:${720 * s}px;top:${60 * s}px;width:${560 * s}px;height:${440 * s}px;gap:6px">
      <div class="tx" style="${sysFont(17, 600, "serif")}color:${L.t.ink}">${esc(tr.title)}</div>${lines}<div style="flex:1"></div>
      <div data-scrub="tt" style="position:relative;height:12px;cursor:pointer;touch-action:none;flex:none">
        <i style="position:absolute;left:0;right:0;top:5.5px;height:1px;background:rgba(255,255,255,.18)"></i>
        <i data-fill style="position:absolute;left:0;top:5.5px;height:1px;background:${L.t.ink}"></i>
        <i data-dot style="position:absolute;top:2.5px;width:7px;height:7px;margin-left:-3.5px;border-radius:50%;background:${L.t.ink}"></i></div>
      <div class="hstack" style="gap:10px;${sysFont(10, 500, "serif")}color:rgba(255,255,255,.55);flex:none">
        <span data-bind="ttpos"></span><div style="flex:1"></div>
        <button data-act="like" title="Like" style="display:flex;color:${L.ink("heart")}">${sym(liked ? "heart.fill" : "heart", 10, "regular")}</button>
        <button data-act="openapp" title="Open Music (not in the demo)" style="display:flex;color:${L.ink("open")}">${sym("arrow.up.right", 10, "regular")}</button>
        <div style="flex:1"></div><span>${clock(tr.duration)}</span></div></div>`;
  return o;
}
function cdPhoto(L, s) {
  const well = [299, 264], R = 200, lcd = [690, 108, 578, 142], liked = S.liked.has(S.idx), ink = L.t.ink;
  let o = `<div class="abs" style="left:${(well[0] - R) * s}px;top:${(well[1] - R) * s}px">${discArt(L, 2 * R * s)}</div>`;
  const lr = R + 18;
  o += `<div class="abs circle" style="left:${(well[0] - lr) * s}px;top:${(well[1] - lr) * s}px;width:${2 * lr * s}px;height:${2 * lr * s}px;pointer-events:none;
      background:linear-gradient(135deg,rgba(255,255,255,.22),transparent 33%,transparent 66%,rgba(255,255,255,.06)),rgba(0,0,0,.28)"></div>`;
  o += `<div class="abs vstack noshrink" style="left:${lcd[0] * s}px;top:${lcd[1] * s}px;width:${lcd[2] * s}px;height:${lcd[3] * s}px;padding:4px 10px;gap:3px;color:${ink};text-shadow:0 0 3px ${rgba(ink, .6)}">
      <div class="hstack" style="gap:10px;align-items:baseline">
        <span style="font:700 16px/1.1 var(--mono)">${String(track().n % 100).padStart(2, "0")}</span>
        <span data-bind="cdtime" style="font:700 20px/1.1 var(--mono)"></span><div style="flex:1"></div>
        <span style="display:flex;filter:drop-shadow(0 0 3px ${rgba(ink, .6)})">${sym(S.playing ? "play.fill" : "pause.fill", 9)}</span></div>
      ${marquee("cd", sysFont(10, 600, "mono"), ink, false, 12)}
      <div data-scrub="cd" data-segs style="display:flex;gap:1px;height:8px;align-items:center;cursor:pointer;touch-action:none"></div></div>`;
  const xs = [754, 850, 946, 1043, 1139], syms = ["backward.end.fill", S.playing ? "pause.fill" : "play.fill", "forward.end.fill", liked ? "heart.fill" : "heart", "eject.fill"];
  const acts = ["prev", "play", "next", "like", "openapp"], titles = ["Previous", "Play / pause", "Next", "Like", "Open Music (not in the demo)"];
  xs.forEach((x, i) => { o += hotspot([x - 32, 373, 64, 46], s, { round: true, glow: ink, symbol: syms[i], symbolColor: "rgba(255,255,255,.55)", act: acts[i], title: titles[i] }); });
  o += `<div class="abs" data-wheel title="Volume — drag up / down" style="left:${1246 * s}px;top:${348 * s}px;width:${52 * s}px;height:${82 * s}px;cursor:ns-resize;touch-action:none"></div>`;
  return o;
}

/* ---------- Game Boy (Modes.swift GameBoyPlayer) ---------- */
function gameboyPlayer(L) {
  const sh = L.ramp, tr = track(), liked = S.liked.has(S.idx), k = 16, c = mix(L.t.bezel, BLACK, .4);
  const arrow = (ch, act, x, y, t) => `<button data-act="${act}" title="${t}" style="position:absolute;left:${k + x}px;top:${k + y}px;width:16px;height:16px;font:8px/16px var(--sf);color:${L.t.label};text-align:center">${ch}</button>`;
  const round = (s, act, t) => `<button data-act="${act}" title="${t}" style="width:24px;height:24px;border-radius:50%;flex:none;font:8px/24px 'Press Start 2P',monospace;color:${L.t.screen};text-align:center;padding-left:1px;
      background:${L.isKAM ? (s === "A" ? L.house.green : L.house.pink) : L.t.accent};${s === "B" ? "transform:translateY(6px)" : ""}">${s}</button>`;
  const pill = (s, act, t) => `<button class="vstack" data-act="${act}" title="${t}" style="gap:3px;align-items:center"><i style="display:block;width:22px;height:6px;border-radius:3px;background:${L.t.label};transform:rotate(-20deg)"></i>
      <span style="font:5px/1.2 'Press Start 2P',monospace;color:${L.t.label}">${s}</span></button>`;
  const lineEl = S.lyrics ? `<div class="tx" data-bind="gblyr" style="${L.font("artist")}color:${sh[3]}"></div>`
    : `<div class="tx" style="${L.font("artist")}color:${sh[2]}">${esc(L.text(tr.artist))}</div>`;
  return `<div class="hstack" style="gap:16px;padding:0 18px;height:100%">
    <div style="flex:1;min-width:0;padding:6px;background:${L.t.bezel};border-bottom-right-radius:14px">
      <div class="vstack" style="gap:4px;padding:8px;background:${sh[0]};box-shadow:inset 0 0 0 2px ${sh[1]}">
        <div class="hstack" style="gap:8px;align-items:flex-start">${ditherArt(L, 48)}
          <div class="vstack" style="gap:5px;min-width:0;flex:1">
            <div class="tx" style="${L.font("title")}color:${sh[3]}">${esc(L.text(tr.title))}</div>${lineEl}
            <div class="hstack" style="gap:4px;${L.font("small")}"><span style="color:${sh[3]}">${liked ? "♥" : "♡"}</span><span style="color:${sh[2]}">${S.playing ? "PLAY" : "PAUSE"}</span></div>
          </div></div>
        ${timeline(L)}
      </div></div>
    <div class="vstack" style="gap:8px;align-items:center;flex:none">
      <div class="hstack" style="gap:14px">
        <div style="position:relative;width:${k * 3}px;height:${k * 3}px">
          <i style="position:absolute;left:0;top:${k}px;width:${k * 3}px;height:${k}px;background:${c}"></i>
          <i style="position:absolute;left:${k}px;top:0;width:${k}px;height:${k * 3}px;background:${c}"></i>
          ${arrow("◀", "prev", -k, 0, "Previous")}${arrow("▶", "next", k, 0, "Next")}${arrow("▲", "volup", 0, -k, "Volume up")}${arrow("▼", "voldown", 0, k, "Volume down")}
        </div>
        <div class="hstack" style="gap:6px;transform:rotate(-20deg)">${round("B", "like", "Like")}${round("A", "play", "Play / pause")}</div>
      </div>
      <div class="hstack" style="gap:8px">${pill("SELECT", "openapp", "Open player (not in the demo)")}${pill("START", "settings", "Settings")}</div>
    </div></div>`;
}

/* ---------- settings / outputs pages ---------- */
function chip(s, on, L, act, raw = false) {
  const ink = L.isKAM ? L.house.cyan : L.t.ink, txt = raw ? s : L.text(s), label = L.m === "kam" ? `[${txt}]` : txt;
  if (L.m === "ios") {
    return `<button class="chip glass" data-act="${act}" style="${L.font("chip")}color:${on ? "#fff" : ink};padding:4px 10px;border-radius:99px;${on ? `background:linear-gradient(${rgba(ink, .22)},${rgba(ink, .22)}),rgba(255,255,255,.07);` : ""}box-shadow:0 2px 4px rgba(0,0,0,.14)">${esc(label)}</button>`;
  }
  const radius = ["vinyl"].includes(L.m) ? 99 : ["digital", "cassette"].includes(L.m) ? 4 : 0, pad = L.m === "kam" ? 2 : 6;
  return `<button class="chip" data-act="${act}" style="${L.font("chip")}color:${on ? L.t.screen : ink};padding:3px ${pad}px;border-radius:${radius}px;background:${on ? ink : "transparent"};${L.m === "kam" ? "" : `box-shadow:inset 0 0 0 1px ${rgba(ink, .6)};`}">${esc(label)}</button>`;
}
function settingsPage(L) {
  const row = (title, content) => `<div class="hstack" style="gap:10px;align-items:flex-start;min-height:20px">
      <div class="nowrap" style="${L.font("small")}color:${L.t.label};width:44px;height:20px;display:flex;align-items:center;flex:none">${esc(L.text(title))}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;min-height:20px;flex:1">${content}</div></div>`;
  const sw = themesAll().map(t => `<button class="sw" data-act="theme:${t.id}" title="${esc(t.name)}" style="background:${t.screen};box-shadow:inset 0 0 0 ${S.theme === t.id ? 2 : 1}px ${S.theme === t.id ? L.t.ink : rgba(L.t.label, .4)}">
      <i style="background:${t.ink}"></i><i style="background:${t.ink2}"></i><i style="background:${t.accent}"></i></button>`).join("");
  const fxName = S.fxStrength < 0.5 ? "FX subtle" : S.fxStrength < 0.9 ? "FX medium" : "FX full";
  return `<div class="vstack" style="gap:7px;padding:0 20px;overflow:hidden">
    ${row("Style", `<div class="hstack" style="gap:5px;flex-wrap:wrap">${sw}</div>`)}
    ${row("Mode", MODES.map(([id, name]) => chip(name, S.mode === id, L, "mode:" + id, true)).join(""))}
    ${row("EQ", EQSTYLES.map(e => chip(e.toUpperCase(), S.eqStyle === e, L, "eq:" + e, true)).join(""))}
    ${row("Show", chip("Hover open", S.hoverOpen, L, "tog:hoverOpen") + chip("Art", S.showArt, L, "tog:showArt") + chip("EQ", S.showEQ, L, "tog:showEQ") + chip("FX", S.fx, L, "tog:fx") + chip(fxName, S.fx, L, "fxs"))}
    ${row("Extras", chip("Lyric strip", S.lyricStrip, L, "tog:lyricStrip") + chip("Peek", S.peek, L, "tog:peek") + chip("Title strip", S.titleStrip, L, "tog:titleStrip") + chip("Live EQ ● rec", S.liveEQ, L, "tog:liveEQ") + chip("K·A·M HUB", S.hub, L, "tog:hub") + chip("Task bar", S.taskbar, L, "tog:taskbar") + chip("Ticker", S.ticker, L, "tog:ticker"))}
  </div>`;
}
function outputsPage(L) {
  const ink = L.isKAM ? L.house.cyan : L.t.ink, rad = ["ios", "vinyl"].includes(L.m) ? 99 : 4;
  const c = (symb, name, on, col, act) => `<button class="hstack" data-act="${act}" style="gap:6px;padding:5px 9px;border-radius:${rad}px;color:${on ? L.t.screen : col};background:${on ? ink : "transparent"}">
      ${sym(symb, 11)}<span class="nowrap" style="${L.font("chip")}">${esc(L.text(name))}</span></button>`;
  return `<div class="vstack" style="gap:8px;padding:0 20px">
    <div style="${L.font("small")}color:${L.t.label}">${esc(L.text("Play to"))}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${OUTPUTS.map(([sy, n], i) => c(sy, n, S.output === i, ink, "out:" + i)).join("")}${c("airplayaudio", "AirPlay & more", false, L.t.label, "")}</div>
  </div>`;
}
function hubDock(L) {
  const chips = HUB.map(([name, tint]) => {
    const n = name === "K·A·M" ? name : L.text(name);
    return `<span class="nowrap" title="Hub app (not linked in the demo)" style="${L.font("chip")}${L.m === "digital" ? "letter-spacing:1px;" : ""}color:${tint};padding:2px 0;${L.lightGround ? "text-shadow:0 0 1.5px rgba(0,0,0,.55);" : ""}">${L.m === "kam" ? `[${esc(n)}]` : esc(n)}</span>`;
  }).join("");
  return `<div class="hstack" style="gap:14px;padding:0 20px;height:26px;flex:none"><span class="nowrap" style="${L.font("small")}color:${L.t.label}">${esc(L.text("K·A·M HUB"))}</span>${chips}</div>`;
}

/* ---------- expanded panel ---------- */
function playerBody(L) {
  if (L.m === "cassette") return photoStage("cassette");
  if (L.m === "vinyl") return photoStage("vinyl");
  if (L.m === "cd") return photoStage("cd");
  if (L.m === "gameboy") return gameboyPlayer(L);
  return standardPlayer(L);
}
function expandedHTML(L, size) {
  let body;
  if (S.page === "settings") body = `<div style="flex:1;min-height:0">${settingsPage(L)}</div>`;
  else if (S.page === "outputs") body = `<div style="flex:1;min-height:0">${outputsPage(L)}</div>`;
  else body = `<div style="flex:1;min-height:0">${playerBody(L)}</div>${S.hub ? hubDock(L) : ""}`;
  return `<div class="vstack" style="width:${size.w}px;height:${size.h}px;padding:0 12px 12px;gap:8px">${header(L)}${body}</div>`;
}

/* ---------- collapsed notch ---------- */
/* ---------- task bar (TaskBar.swift TaskBarView, the notched-Mac layout) ---------- */
// The free span of the menu bar: from the end of the app's menus to the first status item.
function barGap() {
  const scr = document.getElementById("scr"), sr = scr.getBoundingClientRect(), k = sr.width / SCR.w || 1;
  const l = scr.querySelector(".menubar .l").getBoundingClientRect(), r = scr.querySelector(".menubar .r").getBoundingClientRect();
  const mid = SCR.w / 2;
  let lo = (l.right - sr.left) / k + 12, hi = (r.left - sr.left) / k - 10;
  lo = Math.min(lo, mid - notch.w / 2 - 40); hi = Math.max(hi, mid + notch.w / 2 + 60);
  return { lo, hi: Math.max(hi, lo + 200), mid };
}
function hubButton(L, name, tint, v) {
  const full = name === "K·A·M" ? name : L.text(name);
  const n = v === "initial" ? name.slice(0, 1) : v === "short" || v === "bare" ? (HUB_SHORT[name] || full) : full;
  return `<span class="nowrap" title="${esc(name)} (not linked in the demo)" style="${L.font("chip")}${L.m === "digital" ? "letter-spacing:1px;" : ""}color:${tint}">${L.m === "kam" && v !== "bare" && v !== "initial" ? `[${esc(n)}]` : esc(n)}</span>`;
}
const hubVariants = (L, list, gaps) => list.map((v, i) => `<div class="hstack fitv" style="gap:${gaps[i]}px">${HUB.map(([n, c]) => hubButton(L, n, c, v)).join("")}</div>`).join("");
function taskbarHTML(L0, size) {
  const L = L0.band, g = barGap(), tr = track();
  const notchLeft = Math.max(0, g.mid - notch.w / 2 - g.lo), right = Math.max(0, g.hi - (g.mid + notch.w / 2)), hubLeft = notchLeft >= 110;
  const alarm = `<span class="hstack nowrap" title="Alarm 07:30 (mock)" style="gap:4px;color:${L.t.ink};flex:none">${sym("alarm.fill", 10, "semibold")}<span style="${L.font("chip")}">07:30</span></span>`;
  const left = `<div class="hstack" style="width:${notchLeft}px;padding:0 14px 0 10px;flex:none">${alarm}
      ${hubLeft ? `<div data-fit style="flex:1;min-width:0;margin-left:12px;display:flex;justify-content:center">${hubVariants(L, ["full", "short", "bare", "initial"], [14, 12, 10, 8])}</div>` : ""}</div>`;
  const remain = clock(tr.duration - S.pos);
  const now = `<div class="hstack" style="gap:8px;flex:1;min-width:0;padding:0 12px 0 10px">
      <div style="width:${L.m === "cassette" ? 24 : 16}px;display:flex;justify-content:center;flex:none">${artSlot(L, 16, L.t.accent)}</div>
      <div class="vstack" style="flex:1;min-width:0;gap:1px">
        ${marquee("bar", L.font("chip"), S.lyrics ? L.t.label : L.t.ink, false, 11)}
        ${S.lyrics ? `<div class="tx" data-bind="barlyr" style="height:13px;${L.font("small")}color:${L.t.ink}"></div>` : ""}</div>
      ${S.showEQ ? eq(L, 10) : ""}
      <span data-bind="barrem" style="${L.font("small")}color:${L.t.label};flex:none;font-variant-numeric:tabular-nums">-${remain}</span></div>`;
  const rightHTML = `<div class="hstack" style="width:${right}px;flex:none">
      ${!hubLeft ? `<div data-fit style="padding-left:10px;flex:none;max-width:45%;display:flex">${hubVariants(L, ["short", "initial"], [10, 8])}</div>` : ""}${now}</div>`;
  return `<div class="hstack" style="width:${size.w}px;height:${size.h}px">${left}<div style="width:${notch.w}px;flex:none"></div>${rightHTML}</div>`;
}

function collapsedHTML(L, size) {
  const tr = track();
  if (size.bar) return taskbarHTML(L, size);
  if (S.overlay === "changed") { // PeekView (track changed)
    return `<div style="width:${size.w}px;height:${size.h}px;padding:0 7px" class="vstack">
      <div class="hstack" style="height:${notch.h}px"><div class="wing" style="width:56px">${artSlot(L, 24, L.t.accent)}</div><div style="flex:1;min-width:${notch.w}px"></div>
        <div class="wing" style="width:56px">${eq(L, 14)}</div></div>
      <div class="tx" style="flex:1;display:flex;align-items:center;justify-content:center;padding:0 14px;${L.font("album")}">
        <span class="tx"><span style="color:${L.t.ink}">${esc(L.text(tr.title))}</span><span style="color:${L.t.ink2}">${esc(L.text("  ·  " + tr.artist))}</span></span></div></div>`;
  }
  let strip = "";
  if (S.lyrics && S.lyricStrip && S.playing) strip = `<div style="height:20px;padding:0 14px;display:flex;align-items:center;justify-content:center;overflow:hidden">
      <div class="tx" data-bind="strip" style="${L.font("artist")}color:${L.t.ink};text-align:center"></div></div>`;
  else if (S.titleStrip) strip = `<div style="height:20px;padding:0 14px">${marquee("title", L.font("album"), L.t.ink, false, 20)}</div>`;
  return `<div style="width:${size.w}px;height:${size.h}px;padding:0 7px" class="vstack">
    ${S.showArt || S.showEQ ? `<div class="hstack" style="height:${notch.h}px">
      <div class="wing" style="width:36px">${S.showArt ? artSlot(L, 20, L.isKAM ? L.house.purple : L.t.accent) : ""}</div>
      <div style="flex:1;min-width:${notch.w}px"></div>
      <div class="wing" style="width:36px">${S.showEQ ? eq(L, 14) : ""}</div></div>` : `<div style="height:${notch.h}px"></div>`}
    ${strip}</div>`;
}

/* sizes — NotchState.expandedSize / collapsedSize */
function targetSize(L) {
  const e2 = 2 * 7;
  if (S.expanded) {
    const dock = S.hub && S.page === "player" ? 30 : 0, tall = L.isDevice, roomy = L.m === "ios";
    const ph = S.page === "settings" ? (roomy ? 268 : 222) : tall ? 224 : roomy ? 184 : 152;
    return { w: Math.max(notch.w + 400, 540) + 24, h: notch.h + ph + dock, ear: 12, r: L.panelRadius };
  }
  if (S.overlay === "changed") return { w: notch.w + 2 * 56 + e2, h: notch.h + 26, ear: 7, r: 16 };
  if (S.taskbar) { const g = barGap(); return { w: g.hi - g.lo, h: notch.h, ear: 7, r: 10, x: (g.lo + g.hi) / 2 - g.mid, bar: true }; }
  let w = notch.w + (S.showArt || S.showEQ ? 2 * 36 : 0), h = notch.h;
  if (S.lyrics && S.lyricStrip && S.playing) { w = notch.w + 2 * 56; h += 22; }
  else if (S.titleStrip) { w = notch.w + 2 * 56; h += 22; }
  return { w: w + e2, h, ear: 7, r: 10 };
}
/* NotchShape: concave shoulders into the top edge, rounded bottom corners */
function notchPath(W, Hh, ear, radius) {
  const e = Math.min(ear, W / 4), b = Math.max(0, Math.min(radius, (W - 2 * e) / 2, Hh - e));
  const f = n => n.toFixed(2);
  return `M0 0 Q${f(e)} 0 ${f(e)} ${f(e)} L${f(e)} ${f(Hh - b)} Q${f(e)} ${f(Hh)} ${f(e + b)} ${f(Hh)} L${f(W - e - b)} ${f(Hh)} Q${f(W - e)} ${f(Hh)} ${f(W - e)} ${f(Hh - b)} L${f(W - e)} ${f(e)} Q${f(W - e)} 0 ${f(W)} 0 Z`;
}

/* ---------- effects (Views.swift Effects, RetroFuture.swift TerminalFX) ---------- */
function effectsHTML(L) {
  if (!S.fx) return "";
  const k = S.fxStrength, ink = L.t.ink;
  switch (L.m) {
    case "kam": return `<div style="position:absolute;inset:0;background-image:linear-gradient(90deg,${rgba(ink, .035 * k)} .5px,transparent .5px),linear-gradient(${rgba(ink, .035 * k)} .5px,transparent .5px);background-size:14px 14px"></div>
      <div style="position:absolute;inset:0;background:repeating-linear-gradient(180deg,rgba(0,0,0,${(L.lightGround ? .10 : .38) * k}) 0 1.2px,transparent 1.2px 3px)"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle 260px at 25% 10%,rgba(255,255,255,${.07 * k}),transparent)"></div>
      ${REDUCED ? "" : `<div data-beam style="position:absolute;left:0;right:0;top:0;height:37px;will-change:transform">
        <div style="height:36px;background:linear-gradient(transparent,${rgba(ink, .10 * Math.max(k, .5))})"></div>
        <div style="height:1px;background:${rgba(ink, .35 * Math.max(k, .5))};box-shadow:0 0 3px ${rgba(ink, k)}"></div></div>`}
      <div style="position:absolute;inset:0;background:radial-gradient(circle 400px at 50% 50%,transparent 110px,rgba(0,0,0,${(L.lightGround ? .25 : .6) * k}) 400px)"></div>
      ${k > 0.5 && !REDUCED ? `<div data-flicker style="position:absolute;inset:0;background:#000;opacity:0"></div>` : ""}`;
    case "pixel": return `<div style="position:absolute;inset:0;background:repeating-linear-gradient(180deg,${rgba(ink, .035)} 0 1px,transparent 1px 3px)"></div>`;
    case "digital": case "cd": return `<div style="position:absolute;inset:0;background:radial-gradient(circle 260px at 50% 100%,${rgba(ink, .10)},transparent)"></div>`;
    case "ios": return `<div style="position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.06),transparent 50%)"></div>`;
    case "cassette": return `<div style="position:absolute;inset:0;background:repeating-linear-gradient(180deg,rgba(255,255,255,.025) 0 .5px,transparent .5px 1px,rgba(255,255,255,.012) 1px 1.5px,transparent 1.5px 2px,rgba(255,255,255,.012) 2px 2.5px,transparent 2.5px 3px,rgba(255,255,255,.012) 3px 3.5px,transparent 3.5px 4px)"></div>`;
    case "vinyl": return `<div style="position:absolute;inset:0;background:radial-gradient(circle 320px at 0 0,rgba(255,176,96,.07),transparent)"></div>`;
    case "gameboy": return `<div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(0,0,0,.18) 0 .5px,transparent .5px 2px)"></div>`;
  }
}

/* ---------- render ---------- */
const panel = document.getElementById("panel"), content = document.getElementById("content");
const lyrAmbient = document.getElementById("lyrAmbient"), lyrFx = document.getElementById("lyrFx"), lyrFeather = document.getElementById("lyrFeather"), lyrEdge = document.getElementById("lyrEdge");
let target = null, cur = null, lastKey = "";

function render(fade = false) {
  const L = look(); target = targetSize(L);
  content.innerHTML = S.expanded ? expandedHTML(L, target) : collapsedHTML(L, target);
  content.style.width = target.w + "px"; content.style.height = target.h + "px";
  if (fade && !REDUCED) { content.classList.remove("fade"); void content.offsetWidth; content.classList.add("fade"); }
  panel.style.backgroundColor = S.expanded ? L.t.screen : "#000";
  lyrAmbient.innerHTML = S.expanded && L.m === "ios" ? `<div style="position:absolute;inset:0;overflow:hidden">
      <img src="${track().url}" alt="" style="position:absolute;left:50%;top:50%;width:100%;height:auto;min-height:100%;object-fit:cover;transform:translate(-50%,-50%) scale(1.6);filter:blur(60px) saturate(1.5);opacity:.75">
      <div style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.55))"></div></div>` : "";
  lyrFx.innerHTML = S.expanded ? effectsHTML(L) : "";
  lyrFeather.innerHTML = S.expanded ? `<div style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:${notch.w}px;height:${notch.h + 26}px;filter:blur(8px)">
      <div style="position:absolute;inset:0 0 auto 0;height:${notch.h}px;background:#000;border-radius:0 0 14px 14px"></div>
      <div style="position:absolute;left:12px;right:12px;top:${notch.h - 6}px;height:26px;background:linear-gradient(rgba(0,0,0,.6),rgba(0,0,0,.25),transparent)"></div></div>` : "";
  const edgeH = L.m === "ios" ? 0 : L.m === "digital" ? 1 : 2;
  lyrEdge.innerHTML = S.expanded && edgeH ? `<div style="position:absolute;bottom:0;left:${L.panelRadius + 12}px;right:${L.panelRadius + 12}px;height:${edgeH}px;background:linear-gradient(90deg,${L.edge.join(",")})"></div>` : "";
  postRender(L);
  renderTicker(L);
  syncChrome(L);
  target.x = target.x || 0;
  if (!cur) cur = { w: target.w, h: target.h, ear: target.ear, r: target.r, x: target.x, vw: 0, vh: 0, ve: 0, vr: 0, vx: 0 };
  if (REDUCED) Object.assign(cur, { w: target.w, h: target.h, ear: target.ear, r: target.r, x: target.x });
  applyShape();
  lastKey = "";
}

function postRender(L) {
  // photo stages: fit 1344×576 in the available box, then place overlays in photo pixels
  content.querySelectorAll("[data-stage]").forEach(st => {
    const box = st.parentElement, aw = box.clientWidth - 28, ah = box.clientHeight;
    let w = aw, h = w * PHOTO.h / PHOTO.w; if (h > ah) { h = ah; w = h * PHOTO.w / PHOTO.h; }
    st.style.width = w + "px"; st.style.height = h + "px";
    const s = w / PHOTO.w, name = st.dataset.stage;
    const photo = { cassette: "cassette-deck.jpg", vinyl: "turntable-base.jpg", cd: "cd-player.jpg" }[name];
    st.innerHTML = `<img class="photo" src="assets/devices/${photo}" alt="">` + (name === "cassette" ? cassettePhoto(L, s) : name === "vinyl" ? turntablePhoto(L, s) : cdPhoto(L, s));
  });
  // cell bars
  content.querySelectorAll(".tl-px, .tl-gb").forEach(el => {
    const per = +el.dataset.cells, n = Math.max(8, Math.floor(el.clientWidth / per));
    el.innerHTML = "<i></i>".repeat(n);
  });
  content.querySelectorAll("[data-segs]").forEach(el => {
    const n = Math.max(10, Math.floor(el.clientWidth / 5)); el.innerHTML = `<i style="flex:1;height:3px"></i>`.repeat(n);
  });
  content.querySelectorAll("[data-mq]").forEach(el => { el._text = null; });
  // FirstFit: the first hub variant that fits its span (full names → short → bare → initials → nothing)
  content.querySelectorAll("[data-fit]").forEach(box => {
    const vs = [...box.children]; vs.forEach(v => v.style.display = "none");
    const fitV = vs.find(v => { v.style.display = "flex"; const ok = v.scrollWidth <= box.clientWidth + 0.5; if (!ok) v.style.display = "none"; return ok; });
    if (!fitV) vs.forEach(v => v.style.display = "none");
  });
}

/* marquee: scrolls at 28 pt/s with a 48 pt gap, only when the text overflows (Devices.swift Marquee) */
function setMarquee(el, text) {
  if (el._text === text) return; el._text = text;
  const inn = el.firstElementChild; inn.classList.remove("run"); inn.innerHTML = `<span>${esc(text)}</span>`;
  const w = inn.firstElementChild.offsetWidth;
  if (w > el.clientWidth && !REDUCED) {
    inn.innerHTML = `<span>${esc(text)}</span><span>${esc(text)}</span>`;
    inn.style.setProperty("--w", (w + 48) + "px"); inn.style.setProperty("--d", ((w + 48) / 28) + "s"); inn.classList.add("run");
  } else if (w > el.clientWidth) { inn.style.maxWidth = "100%"; inn.firstElementChild.style.cssText = "overflow:hidden;text-overflow:ellipsis"; }
}

/* ---------- spring (SwiftUI .spring(response:dampingFraction:)) ---------- */
let spring = { resp: 0.32, damp: 0.82 };
function applyShape() {
  panel.style.width = cur.w + "px"; panel.style.height = cur.h + "px"; panel.style.transform = `translateX(calc(-50% + ${cur.x.toFixed(2)}px))`;
  const p = `path("${notchPath(cur.w, cur.h, cur.ear, cur.r)}")`;
  panel.style.clipPath = p; panel.style.webkitClipPath = p;
}
function stepSpring(dt) {
  if (!target || !cur) return;
  const k = Math.pow(2 * Math.PI / spring.resp, 2), c = 4 * Math.PI * spring.damp / spring.resp;
  let moving = false; const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
  for (let i = 0; i < n; i++) for (const [p, v] of [["w", "vw"], ["h", "vh"], ["ear", "ve"], ["r", "vr"], ["x", "vx"]]) {
    const a = -k * (cur[p] - target[p]) - c * cur[v]; cur[v] += a * h; cur[p] += cur[v] * h;
  }
  for (const [p, v] of [["w", "vw"], ["h", "vh"], ["ear", "ve"], ["r", "vr"], ["x", "vx"]]) {
    if (Math.abs(cur[p] - target[p]) > 0.05 || Math.abs(cur[v]) > 0.05) moving = true; else { cur[p] = target[p]; cur[v] = 0; }
  }
  if (moving || cur._dirty !== JSON.stringify(target)) { applyShape(); cur._dirty = moving ? null : JSON.stringify(target); }
}

/* ---------- live updates ---------- */
function updateTimeline(el, f, L) {
  const scrubbing = el.querySelector(".tl-bar").classList.contains("scrub");
  const cells = el.querySelector(".tl-px, .tl-gb");
  if (cells) {
    const kids = cells.children, n = kids.length, on = Math.round(f * n);
    if (cells._on !== on) { cells._on = on; for (let i = 0; i < n; i++) kids[i].style.background = i < on ? (i === on - 1 ? cells.dataset.chead : cells.dataset.clit) : cells.dataset.cempty; }
  }
  const fill = el.querySelector("[data-fill]");
  if (fill) fill.style.width = L.m === "ios" ? `max(7px, calc((100% - 3px) * ${f}))` : f * 100 + "%";
  const head = el.querySelector("[data-head]"); if (head) head.style.left = f * 100 + "%";
  const dot = el.querySelector("[data-dot]"); if (dot) dot.style.left = f * 100 + "%";
  const knob = el.querySelector("[data-knob]"); if (knob) knob.style.left = f * 100 + "%";
  const kb = el.querySelector("[data-kambar]");
  if (kb) {
    const cellsN = Math.max(8, Math.floor((kb.clientWidth - 14) / 6.6)), on = Math.round(f * cellsN), key = cellsN + ":" + on;
    if (kb._k !== key) { kb._k = key; kb.innerHTML = `<span style="color:${L.t.label}">[</span><span style="color:${el.dataset.lit}">${"█".repeat(on)}</span><span style="color:${L.t.label}">${"·".repeat(cellsN - on)}</span><span style="color:${L.t.label}">]</span>`; }
  }
  const pos = el.querySelector('[data-bind="pos"]'), rem = el.querySelector('[data-bind="rem"]'), d = track().duration;
  const a = clock(f * d), b = "-" + clock(d * (1 - f));
  if (pos.textContent !== a) pos.textContent = a; if (rem.textContent !== b) rem.textContent = b;
  pos.style.color = scrubbing ? el.dataset.ink2 : "";
}

let scrub = null; // { kind, el, f }
function frameUpdate(now) {
  const L = look(), t = now / 1000, tr = track();
  const fNow = frac();
  const fOf = kind => scrub && scrub.kind === kind ? scrub.f : fNow;
  content.querySelectorAll("[data-tl]").forEach(el => updateTimeline(el, fOf("tl"), L));
  // spinning parts: deg = playing ? t * rate : 0 (the app snaps back to 0 when paused)
  content.querySelectorAll(".spin").forEach(el => { el.style.transform = S.playing && !REDUCED ? `rotate(${(t * +el.dataset.rate) % 360}deg)` : "rotate(0deg)"; });
  // EQ
  const active = S.playing, lv = active ? eqLevels(t) : [0, 0, 0, 0];
  if (!REDUCED || !frameUpdate._last || now - frameUpdate._last > 250) {
    content.querySelectorAll("canvas.eq").forEach(cv => drawEQ(cv, L, lv, active));
    content.querySelectorAll("[data-meter]").forEach(m => {
      const lvl = stereo(t)[+m.dataset.meter], segs = m.children, n = segs.length;
      for (let i = 0; i < n; i++) {
        const lit = i < lvl * n * 1.05, hot = i >= n - 2, warm = i >= n - 5;
        segs[i].style.background = lit ? (hot ? "#FF3355" : warm ? L.house.amber : (L.isKAM ? L.house.green : L.t.ink)) : rgba(L.t.label, .18);
      }
    });
    frameUpdate._last = now;
  }
  // text binds
  const pos = S.pos, set = (sel, v) => content.querySelectorAll(sel).forEach(el => { if (el.textContent !== v) el.textContent = v; });
  if (S.lyrics) {
    set('[data-bind="lyr0"]', L.text(lyricLine(tr, pos) ?? "♪"));
    set('[data-bind="lyr1"]', L.text(lyricLine(tr, pos, 1) ?? " "));
    set('[data-bind="gblyr"]', L.text(lyricLine(tr, pos) ?? "♪"));
    const strip = content.querySelector('[data-bind="strip"]');
    if (strip) { const idx = lyricIndex(tr, pos) ?? -1, v = L.text(lyricLine(tr, pos) ?? "♪");
      if (strip._i !== idx) { strip._i = idx; strip.textContent = v; if (!REDUCED) strip.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 250, easing: "ease-out" }); } }
  }
  content.querySelectorAll("[data-mq]").forEach(el => {
    const kind = el.dataset.mq;
    const line = S.lyrics ? lyricLine(tr, pos) : null;
    const text = kind === "vfd" ? (line ?? `${tr.title} — ${tr.artist}`).toUpperCase()
      : kind === "cd" ? (line ?? `${tr.title} · ${tr.artist}`).toUpperCase()
      : kind === "bar" ? L.band.text(tr.title) + "  ·  " + L.band.text(tr.artist)
      : L.text(tr.title) + "  ·  " + L.text(tr.artist);
    setMarquee(el, text);
  });
  const bl = content.querySelector('[data-bind="barlyr"]'); if (bl) { const v = lyricLine(tr, pos); set('[data-bind="barlyr"]', v && v !== "♪" ? v : ""); }
  set('[data-bind="barrem"]', "-" + clock(tr.duration - pos));
  tickerClock();
  const ctr = content.querySelector("[data-bind-counter]");
  if (ctr) { const d = String(Math.floor(pos) % 1000).padStart(3, "0"); [...ctr.children].forEach((c, i) => { if (c.textContent !== d[i]) c.textContent = d[i]; }); }
  const vfd = content.querySelector('[data-scrub="vfd"] [data-fill]'); if (vfd) vfd.style.width = fOf("vfd") * 100 + "%";
  const tt = content.querySelector('[data-scrub="tt"]');
  if (tt) { const f = fOf("tt"); tt.querySelector("[data-fill]").style.width = f * 100 + "%"; tt.querySelector("[data-dot]").style.left = f * 100 + "%"; set('[data-bind="ttpos"]', clock(f * tr.duration)); }
  const segs = content.querySelector("[data-segs]");
  if (segs) { const f = fOf("cd"), n = segs.children.length, on = Math.floor(f * n * 1000) / 1000;
    if (segs._f !== on) { segs._f = on; for (let i = 0; i < n; i++) segs.children[i].style.background = i < f * n ? L.t.ink : rgba(L.t.ink, .15); } }
  set('[data-bind="cdtime"]', clock(fOf("cd") * tr.duration));
  content.querySelectorAll("[data-pack]").forEach(el => {
    const i = +el.dataset.pack, p = fNow, s = parseFloat(el.dataset.cx) / [263, 437][i], r = (50 + 40 * (i === 0 ? 1 - p : p)) * s;
    el.style.left = (+el.dataset.cx - r) + "px"; el.style.top = (+el.dataset.cy - r) + "px"; el.style.width = el.style.height = 2 * r + "px";
  });
  const arm = content.querySelector("[data-arm]");
  if (arm) {
    // the arm eases (1.2 s) only when playback starts / stops; otherwise it tracks progress directly
    if (armPlaying !== S.playing) { if (armPlaying !== null && !REDUCED) armAnimUntil = now + 1250; armPlaying = S.playing; }
    const anim = now < armAnimUntil, tr = anim ? "transform 1.2s ease-in-out" : "none";
    if (arm.style.transition !== tr) { arm.style.transition = tr; arm.getBoundingClientRect(); }
    const a = armAngle(); if (Math.abs(a - lastArm) > 0.01 || !arm._set) { if (!anim || !arm._set || arm._anim !== armAnimUntil) { arm._set = true; arm._anim = armAnimUntil; arm.style.transform = `rotate(${a}deg)`; lastArm = a; } }
  }
  const cursor = content.querySelector("[data-cursor]"); if (cursor) cursor.style.opacity = REDUCED || Math.floor(t * 2) % 2 === 0 ? 1 : 0;
  const beam = lyrFx.querySelector("[data-beam]");
  if (beam) { const per = 4.2, ph = (t % per) / per, y = -30 + (panel.clientHeight + 60) * ph; beam.style.transform = `translateY(${y - 36}px)`; }
  const fl = lyrFx.querySelector("[data-flicker]"); if (fl) { const n = Math.floor(t * 9) % 37; fl.style.opacity = n === 3 || n === 17 ? 0.07 : 0; }
}

/* ---------- the real recording, through the Web Audio API ---------- */
// Nothing is fetched or played until the visitor presses play (browsers require a click anyway).
const AUD = { el: null, ctx: null, an: null, gain: null, buf: null, noGraph: false, failed: false };
const RT = { peak: [1e-6, 1e-6, 1e-6, 1e-6], smooth: [0, 0, 0, 0], pub: 0 };
function audioEl() {
  if (AUD.el) return AUD.el;
  const el = AUD.el = new Audio();
  el.preload = "none"; el.src = TRACKS[0].src;
  el.addEventListener("loadedmetadata", () => { if (isFinite(el.duration) && el.duration > 0) TRACKS[0].duration = el.duration; });
  el.addEventListener("ended", () => { if (track().real) setTrack(S.idx + 1, true); });
  el.addEventListener("error", () => { AUD.failed = true; if (track().real) { S.playing = false; render(); } note("The recording could not be loaded."); });
  return el;
}
function graph() {
  if (AUD.ctx || AUD.noGraph) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext, ctx = new C();
    const src = ctx.createMediaElementSource(AUD.el), an = ctx.createAnalyser(), g = ctx.createGain();
    an.fftSize = 2048; an.smoothingTimeConstant = 0;
    src.connect(an); an.connect(g); g.connect(ctx.destination);   // the tap sits before the volume, as AudioTap does
    Object.assign(AUD, { ctx, an, gain: g, buf: new Float32Array(an.frequencyBinCount) });
  } catch (e) { AUD.noGraph = true; }
}
function applyVolume() {
  if (!AUD.el) return; const v = S.volume / 100;
  if (AUD.gain) { if (AUD.gain.gain.value !== v) AUD.gain.gain.value = v; if (AUD.el.volume !== 1) AUD.el.volume = 1; }
  else if (AUD.el.volume !== v) AUD.el.volume = v;
}
function syncAudio() {
  const real = track().real;
  if (real && S.playing) {
    const el = audioEl(); graph(); AUD.ctx && AUD.ctx.state === "suspended" && AUD.ctx.resume();
    if (Math.abs((el.currentTime || 0) - S.pos) > 0.5) { try { el.currentTime = S.pos; } catch (e) {} }
    applyVolume();
    const p = el.play(); if (p && p.catch) p.catch(() => { if (track().real) { S.playing = false; render(); } });
  } else if (AUD.el && !AUD.el.paused) AUD.el.pause();
}
/* AudioTap.swift analyse(): four bands (40·160·640·2500·10000 Hz), slow automatic gain per band,
   fast attack, soft release, published at 30 Hz. Here the spectrum comes from an AnalyserNode. */
function realTap(dt) {
  const an = AUD.an, b = AUD.buf; an.getFloatFrequencyData(b);
  const hz = AUD.ctx.sampleRate / an.fftSize, edges = [40, 160, 640, 2500, 10000];
  for (let k = 0; k < 4; k++) {
    const lo = Math.max(1, Math.floor(edges[k] / hz)), hi = Math.min(b.length - 1, Math.max(lo + 1, Math.floor(edges[k + 1] / hz)));
    let sum = 0; for (let i = lo; i < hi; i++) { const m = Math.pow(10, b[i] / 20); if (isFinite(m)) sum += m * m; }
    const v = Math.sqrt(sum / (hi - lo));
    RT.peak[k] = Math.max(v, RT.peak[k] * 0.997, 1e-6);
    const target = Math.pow(Math.min(1, v / RT.peak[k]), 1.6);
    RT.smooth[k] += (target - RT.smooth[k]) * (target > RT.smooth[k] ? 0.65 : 0.18);
  }
  RT.pub += dt; if (RT.pub >= 1 / 30) { RT.pub = 0; TAP.bands = RT.smooth.slice(); }
}

/* ---------- transport ---------- */
function setTrack(i, peek) {
  S.idx = (i + TRACKS.length) % TRACKS.length; S.pos = 0;
  if (AUD.el) { try { AUD.el.currentTime = 0; } catch (e) {} }
  syncAudio();
  if (peek && !S.expanded && S.peek) showOverlay("changed", 4); else render();
}
let overlayToken = 0;
function showOverlay(o, secs) {
  if (S.expanded) return; const tok = ++overlayToken; S.overlay = o; spring = { resp: .32, damp: .82 }; render(true);
  setTimeout(() => { if (overlayToken !== tok) return; S.overlay = "none"; spring = { resp: .32, damp: .9 }; render(true); }, secs * 1000);
}
function setExpanded(e) {
  if (e === S.expanded) return;
  if (e) { overlayToken++; S.overlay = "none"; S.expanded = true; spring = { resp: .35, damp: .8 }; awaySince = null; render(true); }
  else { S.expanded = false; spring = { resp: .3, damp: .9 }; render(true); setTimeout(() => { if (!S.expanded) { S.page = "player"; } }, 320); }
}
function flash(name) {
  S.flash = name; render(); const n = name;
  setTimeout(() => { if (S.flash === n) { S.flash = null; render(); } }, 1400);
}
const cycleTheme = () => { const all = themesAll(), i = all.findIndex(t => t.id === S.theme); S.theme = all[(i + 1) % all.length].id; };

function act(a) {
  const [k, v] = a.split(":");
  switch (k) {
    case "play": S.playing = !S.playing; syncAudio(); render(); break;
    case "playonly": if (!S.playing) { S.playing = true; syncAudio(); render(); } break;
    case "pauseonly": if (S.playing) { S.playing = false; syncAudio(); render(); } break;
    case "prev": setTrack(S.idx - 1); break;
    case "next": setTrack(S.idx + 1); break;
    case "like": S.liked.has(S.idx) ? S.liked.delete(S.idx) : S.liked.add(S.idx); render(); break;
    case "volup": S.volume = Math.min(100, S.volume + 10); render(); break;
    case "voldown": S.volume = Math.max(0, S.volume - 10); render(); break;
    case "lyrics": S.lyrics = !S.lyrics; render(); break;
    case "outputs": S.page = S.page === "outputs" ? "player" : "outputs"; render(); break;
    case "settings": S.page = S.page === "player" ? "settings" : "player"; render(); break;
    case "cycle": cycleTheme(); flash(themeNamed(S.theme).name); break;
    case "theme": S.theme = v; render(); break;
    case "mode": S.mode = v; render(); break;
    case "eq": S.eqStyle = v; render(); break;
    case "tog": S[v] = !S[v]; if (v === "taskbar" && S.taskbar && S.expanded) note("Task bar on — move away to close the panel and see it."); render(); break;
    case "fxs": S.fxStrength = S.fxStrength < 0.5 ? 0.65 : S.fxStrength < 0.9 ? 1.0 : 0.35; render(); break;
    case "out": S.output = +v; render(); break;
    case "openapp": break; // the real app opens the music player; nothing to open in a demo
    case "dblplay": break;
  }
}
const scr = document.getElementById("scr");
scr.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || !b.dataset.act || b.dataset.act === "dblplay") return; act(b.dataset.act);
});
scr.addEventListener("dblclick", e => { if (e.target.closest('[data-act="dblplay"]')) act("play"); });

/* scrubbing: timelines, VFD, plinth, CD bar, volume, CD wheel */
scr.addEventListener("pointerdown", e => {
  const wheel = e.target.closest("[data-wheel]");
  if (wheel) { const y0 = e.clientY, v0 = S.volume; wheel.setPointerCapture(e.pointerId);
    const mv = ev => { S.volume = Math.max(0, Math.min(100, v0 - Math.round((ev.clientY - y0) / scale))); wheel.title = "Volume " + S.volume; applyVolume(); };
    const up = () => { wheel.removeEventListener("pointermove", mv); wheel.removeEventListener("pointerup", up); };
    wheel.addEventListener("pointermove", mv); wheel.addEventListener("pointerup", up); return; }
  const el = e.target.closest("[data-scrub]"); if (!el) return;
  e.preventDefault(); el.setPointerCapture(e.pointerId);
  const kind = el.dataset.scrub;
  const fAt = ev => { const r = el.getBoundingClientRect(); return Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)); };
  if (kind === "vol") {
    const setV = ev => { const nv = Math.round(fAt(ev) * 100); if (nv !== S.volume) { S.volume = nv; el.innerHTML = volInner(look()); applyVolume(); } };
    setV(e);
    const up = () => { el.removeEventListener("pointermove", setV); el.removeEventListener("pointerup", up); render(); };
    el.addEventListener("pointermove", setV); el.addEventListener("pointerup", up); return;
  }
  scrub = { kind, f: fAt(e) }; el.classList.add("scrub");
  const mv = ev => { scrub.f = fAt(ev); };
  const up = ev => { S.pos = fAt(ev) * track().duration; if (track().real && AUD.el) { try { AUD.el.currentTime = S.pos; } catch (er) {} }
    el.removeEventListener("pointermove", mv); el.removeEventListener("pointerup", up);
    setTimeout(() => { scrub = null; el.classList.remove("scrub"); }, 400); };
  el.addEventListener("pointermove", mv); el.addEventListener("pointerup", up);
});

/* hover open / move-away close (main.swift checkMouse: closes 0.35 s after the pointer leaves).
   The pointer resting on this window's own controls or feature list counts as staying. */
let awaySince = null;
panel.addEventListener("pointerenter", e => { if (e.pointerType !== "touch" && !S.expanded && S.hoverOpen) setExpanded(true); });
panel.addEventListener("click", e => { if (!S.expanded && !e.target.closest("[data-act]")) setExpanded(true); });
document.addEventListener("pointermove", e => {
  if (!S.expanded || e.pointerType === "touch") return;
  const r = panel.getBoundingClientRect(), m = 12 * scale;
  const inside = e.clientX >= r.left - m && e.clientX <= r.right + m && e.clientY >= r.top - m && e.clientY <= r.bottom + m;
  if (inside || S.pin || e.target.closest("[data-keep]")) awaySince = null; else if (!awaySince) awaySince = performance.now();
});
document.documentElement.addEventListener("mouseleave", () => { if (S.expanded && !S.pin) awaySince = awaySince || performance.now(); });
// touch: a tap on the desktop outside the panel closes it
scr.addEventListener("pointerdown", e => { if (e.pointerType === "touch" && S.expanded && !S.pin && !panel.contains(e.target)) setExpanded(false); });

/* ---------- ticker (TaskBar.swift TickerView): LIVE block · scrolling strip · clock block ---------- */
const tickerEl = document.getElementById("ticker");
const two = n => String(n).padStart(2, "0");
const hhmm = d => two(d.getHours()) + ":" + two(d.getMinutes());
function renderTicker(L) {
  tickerEl.hidden = !S.ticker; if (!S.ticker) return;
  const key = L.t.id + L.m + (systemDark() ? 1 : 0); if (tickerEl._k === key) return; tickerEl._k = key;
  const t = L.t, ground = L.lightGround ? t.screen : mix(t.screen, BLACK, 0.35);
  const font = ["ios", "vinyl"].includes(L.m) ? "font:500 10.5px/20px var(--sf);" : "font:500 10.5px/20px var(--mono);";
  const sep = `<i style="width:1px;align-self:stretch;background:${rgba(t.label, .35)};flex:none"></i>`;
  const row = TICKER.map(([sec, text, hot]) => `<span class="tk-it"><span style="letter-spacing:1.5px;color:${hot ? t.accent : t.label}">${esc(sec)}</span>` +
    `<span style="font-size:7px;color:${rgba(t.accent, .8)}">◆</span><span style="color:${hot ? t.accent : t.ink}">${esc(text)}</span></span>`).join("") +
    `<span class="tk-it" style="color:${rgba(t.label, .8)}">AS OF <span data-tasof></span> · DEMO FEED</span>`;
  tickerEl.style.cssText = `${font}background:${ground};box-shadow:inset 0 -1px ${rgba(t.label, .3)};`;
  tickerEl.innerHTML = `<div class="tk-live" style="background:${ground}"><i data-tdot style="background:${L.isKAM ? L.house.green : t.ink2}"></i><span style="letter-spacing:2px;color:${t.label}">LIVE</span></div>${sep}
    <div class="tk-win" title="Hover pauses the ticker"><div class="tk-run"><div class="tk-row">${row}</div><div class="tk-row" aria-hidden="true">${row}</div></div></div>${sep}
    <div class="tk-clock" style="background:${ground}"><span style="color:${t.ink}">☁︎ 12° Cloudy</span><span data-tdate style="color:${t.label}"></span><span data-tclock style="color:${t.ink};font-variant-numeric:tabular-nums"></span></div>`;
  const run = tickerEl.querySelector(".tk-run"), w = tickerEl.querySelector(".tk-row").offsetWidth + 60;  // speed 42 pt/s, gap 60
  run.style.setProperty("--tw", w + "px"); run.style.setProperty("--td", (w / 42) + "s");
  tickerEl._min = null; tickerClock();
}
function tickerClock() {
  if (!S.ticker) return; const d = new Date(), m = hhmm(d);
  const dot = tickerEl.querySelector("[data-tdot]"); if (dot) dot.style.opacity = REDUCED || Math.floor(performance.now() / 600) % 2 === 0 ? 1 : 0.25;
  if (tickerEl._min === m) return; tickerEl._min = m;
  const L = look(), date = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
  const set = (sel, v) => { const el = tickerEl.querySelector(sel); if (el) el.textContent = v; };
  set("[data-tclock]", m); set("[data-tdate]", L.text(date)); tickerEl.querySelectorAll("[data-tasof]").forEach(el => el.textContent = m);
}

/* ---------- this window's own controls, feature list and readout ---------- */
const $ = id => document.getElementById(id);
let noteTimer = 0;
function note(msg) { const n = $("note"); if (!n) return; n.textContent = msg; clearTimeout(noteTimer); noteTimer = setTimeout(() => { n.textContent = ""; }, 4200); }
const modeName = id => (MODES.find(m => m[0] === id) || [, id])[1];
function syncChrome(L) {
  const tr = track(), pressed = (id, on) => { const b = $(id); if (b) b.setAttribute("aria-pressed", on); };
  $("xPlay").innerHTML = `<span>${S.playing ? "‖ PAUSE" : "▸ PLAY"}</span>`;
  $("xOpen").innerHTML = `<span>${S.expanded ? "CLOSE NOTCH" : "OPEN NOTCH"}</span>`;
  pressed("xTicker", S.ticker); pressed("xBar", S.taskbar); pressed("xLyrics", S.lyrics); pressed("xPin", S.pin);
  const eqSrc = !S.playing ? "idle" : !S.liveEQ ? "synthetic (Live EQ off)" : tr.real && AUD.an ? "live, from the recording" : tr.real ? "simulated (audio graph unavailable)" : "simulated tap (mock track)";
  $("rTrack").innerHTML = `${esc(tr.title)} <span class="dim">—</span> ${esc(tr.artist)}`;
  $("rTag").textContent = tr.real ? "REAL AUDIO · PUBLIC DOMAIN" : "MOCK TRACK · NO AUDIO";
  $("rTag").className = "t-tag " + (tr.real ? "real" : "mock");
  $("rLook").textContent = `THEME ${L.t.name} · MODE ${modeName(L.m)}`;
  $("rEq").textContent = `EQ ${eqSrc}`;
  $("rCredit").hidden = !tr.real;
}
const X = {
  play: () => act("play"), prev: () => act("prev"), next: () => act("next"),
  open: () => setExpanded(!S.expanded),
  mode: () => { const i = MODES.findIndex(m => m[0] === S.mode); S.mode = MODES[(i + 1) % MODES.length][0]; S.page = "player"; S.expanded ? render() : setExpanded(true); },
  theme: () => { cycleTheme(); S.expanded ? render() : setExpanded(true); },
  settings: () => { S.page = "settings"; S.expanded ? render() : setExpanded(true); },
  ticker: () => { S.ticker = !S.ticker; render(); },
  taskbar: () => { S.taskbar = !S.taskbar; if (S.taskbar && S.expanded) setExpanded(false); else render(); },
  lyrics: () => { S.lyrics = !S.lyrics; if (S.lyrics && !S.expanded && !S.taskbar) note("Lyric strip shows under the closed notch while a track plays."); render(); },
  pin: () => { S.pin = !S.pin; awaySince = null; render(); },
  zoom: () => { ZOOM = !ZOOM; $("xZoom").setAttribute("aria-pressed", ZOOM); if (fit()) render();
    const lap = $("lap"); lap.scrollLeft = ZOOM ? (lap.scrollWidth - lap.clientWidth) / 2 : 0; },
  hub: () => { S.hub = true; S.page = "player"; S.expanded ? render() : setExpanded(true); },
};
document.addEventListener("click", e => {
  const b = e.target.closest("[data-x]"); if (!b) return;
  const f = X[b.dataset.x]; if (f) { f(); if (window.KB && (!KB.soundOn || KB.soundOn())) KB.beep(620, 30, .03); }  // UI blips obey the shared sound setting
});
document.addEventListener("keydown", e => {
  if (e.target.closest("input,textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === "Space" && !e.target.closest("button")) { e.preventDefault(); act("play"); }
});

// The song never autoplays, and it stops when the page is hidden (tab switched, window swapped out).
document.addEventListener("visibilitychange", () => { if (document.hidden && S.playing) { S.playing = false; syncAudio(); render(); } });

/* ---------- fit the MacBook screen into the window ---------- */
const SCR = { w: 780, h: 440 }; let scale = 1, fitKey = "", ZOOM = false;
function fit() {
  const lap = $("lap"), bez = $("bezel"), avW = lap.clientWidth, narrow = avW < 600;
  SCR.w = narrow ? 640 : 780; SCR.h = narrow ? 400 : 440;
  const pad = narrow ? 7 : 10, base = 12;
  const avH = narrow ? Infinity : lap.clientHeight - base - 2 * pad;
  const zoom = narrow && ZOOM;     // on a phone: 1:1 pixels, scroll sideways
  scale = zoom ? 1 : Math.max(0.2, Math.min(1.1, (avW - 2 * pad) / SCR.w, avH / SCR.h));
  lap.classList.toggle("zoom", zoom);
  scr.style.width = SCR.w + "px"; scr.style.height = SCR.h + "px"; scr.style.transform = `scale(${scale})`;
  bez.style.padding = pad + "px"; bez.style.width = (SCR.w * scale + 2 * pad) + "px"; bez.style.height = (SCR.h * scale + 2 * pad) + "px";
  $("inner").style.width = SCR.w * scale + "px"; $("inner").style.height = SCR.h * scale + "px";
  lap.classList.toggle("narrow", narrow);
  if (narrow) lap.style.height = (SCR.h * scale + 2 * pad + base + 4) + "px"; else lap.style.height = "";
  const k = SCR.w + "x" + scale.toFixed(4); if (k === fitKey) return false; fitKey = k; return true;
}
new ResizeObserver(() => { if (fit() && target) { tickerEl._k = null; render(); } }).observe($("lap"));
reducedMQ.addEventListener?.("change", e => { REDUCED = e.matches; tickerEl._k = null; render(); });
darkMQ.addEventListener?.("change", () => { tickerEl._k = null; render(); });

/* ---------- main loop ---------- */
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (S.playing) {
    if (track().real && AUD.el) { if (!scrub && !AUD.el.seeking) S.pos = AUD.el.currentTime || S.pos; applyVolume(); }
    else { S.pos += dt; if (S.pos >= track().duration) setTrack(S.idx + 1, true); }
  }
  tapStep(dt);
  if (REDUCED) { if (target && cur) { Object.assign(cur, { w: target.w, h: target.h, ear: target.ear, r: target.r, x: target.x }); applyShape(); } }
  else stepSpring(dt);
  if (S.expanded && awaySince && !S.pin && now - awaySince > 350) { awaySince = null; setExpanded(false); }
  frameUpdate(now);
  requestAnimationFrame(loop);
}
// a small read-only handle for testing and the portfolio page (state, look, theme list)
window.KAMNotch = { state: S, look: () => look(), themes: () => themesAll().map(t => ({ ...t })), modes: MODES.map(m => m[0]), audio: () => AUD.el && { t: AUD.el.currentTime, paused: AUD.el.paused, ready: AUD.el.readyState, err: AUD.el.error && AUD.el.error.code, graph: !!AUD.an, ctx: AUD.ctx && AUD.ctx.state, bands: TAP.bands.slice() },
  set(o) { Object.assign(S, o); render(); } };
fit();
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
  render(); requestAnimationFrame(loop);
  // a first peek, as the app does on a track change, so the visitor sees where the notch is
  if (!REDUCED) setTimeout(() => { if (!S.expanded) showOverlay("changed", 3.2); }, 900);
});
})();
