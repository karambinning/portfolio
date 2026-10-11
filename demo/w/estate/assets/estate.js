/* The estate — inside the second brain.
   The centrepiece is Command's anatomical brain (noise-deformed twin hemispheres, notes as motes coloured
   by domain, wiki-link edges, electric synapses firing), ported to the portfolio's CRT look.
   The graph is GENERATED HERE as a demo, in graph-data.json's shape ({nodes:[{id,label,group}], links:[{source,target}]}):
   every title is invented. The four machines stick out of the brain on axons; selecting one "SSHes in"
   and opens its intelligence profile. The machine profiles are real. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const KB = window.KB, reduce = KB.reduce;
const $ = s => document.querySelector(s);
const stage = $('#stage'), host = $('#host'), nodesEl = $('#nodes'), ticker = $('#ticker'), hud = $('#hud');
const tip = $('#tip'), readout = $('#readout'), floatsEl = $('#floats');
const profile = $('#profile'), pSsh = $('#pSsh'), pBody = $('#pBody'), pTag = $('#pTag'), homeBtn = $('#home');

/* ---------- the machines (real) ---------- */
const M = {
  m1: { app:{ show:'command', label:'Command · showcase · demo data' }, name:'M1', c:'#3d8bff', k:'THE HUB', s:'HOLDS THE VAULT', ndc:[-1, 1], where:'Always-on at home',
    specs:[['Machine','MacBook Pro 13"'],['Chip','Apple M1'],['Memory','8 GB'],['Storage','256 GB + the 12 TB vault drive'],['System','macOS 26']],
    role:'The always-on hub. It holds the canonical vault on its 12 TB drive and serves it to the other three machines. It is the one writer the rest of the estate depends on.',
    runs:[['Command','the dashboard I run the estate from: machines, agents and jobs on one screen. This brain is its centrepiece.'],
          ['YerDad','the director agent. It coordinates the other agents and reports back to me.'],
          ['Sentinel','the security watch. It compares every machine against a known-good baseline and alerts me on Telegram when something drifts.'],
          ['THEMIS','a legal-research agent that would rather refuse than guess.'],
          ['Career-node server','the back end the Work app on the M3 talks to.'],
          ['Local models','small language models that run on the machine itself.']] },
  m3: { app:{ show:'work', label:'The Work app · showcase · demo data' }, name:'M3', c:'#ff7a00', k:'THE CAREER NODE', s:'DAILY MACHINE', ndc:[1, 1], where:'With me, where I study',
    specs:[['Machine','MacBook Pro 14"'],['Chip','Apple M3 Pro'],['Memory','18 GB'],['System','macOS 15']],
    role:'My daily machine, and the career node. It is where I study, write and run my working life. It reads and writes the vault through the M1.',
    runs:[['The Work app','job triage, a pipeline from first find to offer, and an outreach drafter.'],
          ['Mission OS','inside the Work app: outreach, and part of a London Tech Week company contact list.'],
          ['Morning brief','a short summary of the day, ready when I wake.'],
          ['K·A·M Notch','a music app that lives in the MacBook’s notch.'],
          ['Local models','for drafting and sorting without leaving the machine.']] },
  imac: { app:{ log:true, label:'The Builder on KAM, overnight · mock log' }, name:'iMac', c:'#ff3355', k:'THE LAB', s:'BUILDS OVERNIGHT', ndc:[-1, -1], where:'Where I study',
    specs:[['Machine','iMac 24"'],['Chip','Apple M1'],['Memory','8 GB'],['Storage','512 GB'],['System','macOS 15']],
    role:'The lab. It does the long, unattended work overnight, and keeps an off-site copy of the vault in case the hub is ever lost.',
    runs:[['The Builder','an overnight agent that works on KAM while I sleep and leaves a night report in the vault.'],
          ['KAM development server','where the private beta of KAM is built and tested.'],
          ['Intelligence collector database','the store the rest of the fleet queries for collected data.'],
          ['Vault mirror','an off-site backup copy. A mirror, never a second vault.']] },
  yerson: { app:{ show:'intel', label:'The intel engine · showcase · demo data' }, name:'YerSon', c:'#00ff88', k:'THE INTEL ENGINE', s:'COLLECTING', ndc:[1, -1], where:'Always-on at home',
    specs:[['Machine','MacBook 12"'],['Chip','Intel Core m3'],['Memory','8 GB'],['System','macOS 13']],
    role:'The intelligence engine. An older, fanless 12-inch MacBook given one job: watch the world and file what it finds.',
    runs:[['Collection cycles','news, geopolitics, research, markets, law and jobs, gathered on a schedule.'],
          ['Local classification','a local model reads and sorts each item before anything is filed.'],
          ['Filing','results go into the vault’s lake as machine output, kept apart from my notes.'],
          ['Telegram agent','its own agent I can message for a briefing or a status check.']] },
};
const IDS = Object.keys(M);

/* ---------- demo graph, same shape as graph-data.json ---------- */
// folder colours as Command maps them
const DOM = {
  '00-desk':         { col:'#00d4ff', c:[-1.05, 1.0, 0.95] },
  '10-kam':          { col:'#00bcd4', c:[-1.35,-0.5, 0.85] },
  '20-icarus':       { col:'#ff9f1c', c:[-1.2, 0.8,-1.05] },
  '30-dissertation': { col:'#aa66ff', c:[-1.25,-0.55,-0.95] },
  '40-career':       { col:'#ffcc00', c:[ 1.3, 0.75, 0.75] },
  '50-fleet':        { col:'#ff7700', c:[ 1.4,-0.45, 0.6] },
  '60-people':       { col:'#44aaff', c:[ 1.2, 0.7,-1.1] },
  '90-library':      { col:'#cc88ff', c:[ 1.3,-0.5,-1.0] },
};
const TITLES = {
  '00-desk':['half-formed-idea-night-layer','links-to-read-later','quick-capture-train-thoughts','todo-before-term','idea-weather-overlay','scratch-route-costs','unsorted-sketches','question-for-later'],
  '10-kam':['globe-layer-ideas','council-voices-review','news-region-filter','module-map','briefing-layout','signal-radio-sources','home-module-sketch','life-timeline-design','office-roles','private-beta-checklist','empty-states-rule','local-first-principle'],
  '20-icarus':['wing-loading-check','control-law-notes','bench-sim-results','servo-latency-test','glide-ratio-estimate','flight-log-format','failsafe-modes','propeller-choice'],
  '30-dissertation':['reading-list-forecasting-methods','base-rates','event-data-sources','ethics-gate-checklist','model-calibration','case-selection','supervision-notes','validation-plan','chapter-outline'],
  '40-career':['interview-prep-themes','cv-structure','outreach-tone-guide','pipeline-review','events-recap','skills-gap-list','portfolio-plan','cover-letter-patterns'],
  '50-fleet':['machine-roles','baseline-explained','backup-schedule','scheduled-jobs','vault-mirror-check','remote-access-rules','power-and-wake','naming-rules'],
  '60-people':['contact-note-template','thank-you-list','mentors','study-group','introductions-owed','birthdays'],
  '90-library':['how-git-handles-large-trees','retrieval-signal-to-noise','databases-and-file-sync','cybersecurity-basics','prompting-notes','graph-layouts','crt-shader-tricks','reading-list-history'],
};
const AGENTS = ['builder','scout','archivist','sentinel','intel','yerdad'];
let seed = 20261011;
const rng = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = a => a[(rng() * a.length) | 0];
const day = () => `2026-10-${String(1 + ((rng() * 10) | 0)).padStart(2, '0')}`;

const graph = { nodes: [], links: [] };
const byGroup = {};
function addNode(group, kind, label){
  const id = kind === 'note' ? `${group}/notes/${label}.md` : `${group}/agent/${label}`;
  const n = { id, label, group, kind, i: graph.nodes.length };
  graph.nodes.push(n); (byGroup[group] = byGroup[group] || []).push(n);
  return n;
}
Object.keys(DOM).forEach(g => {
  TITLES[g].forEach(t => addNode(g, 'note', rng() < .45 ? `${day()}--${t}` : t));
  const na = 5 + ((rng() * 4) | 0);
  for (let i = 0; i < na; i++) addNode(g, 'agent', `${day()}/${pick(AGENTS)}.md`);
});
graph.nodes.forEach(n => {
  const k = 1 + ((rng() * 2.4) | 0);
  for (let j = 0; j < k; j++){
    const pool = rng() < .82 ? byGroup[n.group] : graph.nodes, m = pick(pool);
    if (m !== n) graph.links.push({ source: n.id, target: m.id });
  }
});

/* ---------- log ---------- */
const LOG = [];
function log(id, text, c){
  const d = new Date(), f = x => String(x).padStart(2, '0');
  LOG.push(`<div style="--c:${c}">${f(d.getHours())}:${f(d.getMinutes())}:${f(d.getSeconds())} <b>${id}</b>${text}</div>`);
  while (LOG.length > 2) LOG.shift(); ticker.innerHTML = LOG.join('');
}

/* ---------- HUD + domain key ---------- */
hud.innerHTML = `<div class="big">THE ESTATE</div><span class="l1"><span class="top" id="hTop">~/VAULT</span> <span id="hTail">· inside the second brain</span><br></span>
  NODES <em id="hN">0</em> · LINKS <em id="hL">0</em> · FIRING <em id="hF">0</em><span class="demo"> · a sample, titles invented</span>`;
const hN = $('#hN'), hL = $('#hL'), hF = $('#hF'), hTop = $('#hTop'), hTail = $('#hTail');
$('#chips').innerHTML = `<span><i style="--k:#00f0ff"></i>my note</span><span><i class="o"></i>agent output</span>` +
  Object.entries(DOM).map(([g, d]) => `<span><i style="--k:${d.col}"></i>${g.slice(3)}</span>`).join('');

/* ---------- machine cards (HTML, so they are real buttons) ---------- */
const nodeBtns = {}; let cardHover = null;
IDS.forEach((id, i) => {
  const m = M[id], b = document.createElement('button');
  b.type = 'button'; b.className = 'mnode'; b.style.setProperty('--c', m.c); b.style.setProperty('--d', (i * .7) + 's');
  b.innerHTML = `<b>${m.name}<small>SSH ›</small></b><span class="k">${m.k}</span>`;
  if (!reduce) b.classList.add('pre');
  b.setAttribute('aria-label', `${m.name}, ${m.k.toLowerCase()}. Connect and open its profile.`);
  b.addEventListener('click', () => go(id));
  b.addEventListener('pointerenter', () => { cardHover = hubHover = id; });
  b.addEventListener('pointerleave', () => { cardHover = hubHover = null; });
  b.addEventListener('focus', () => { hubHover = id; }); b.addEventListener('blur', () => { hubHover = null; });
  nodesEl.appendChild(b); nodeBtns[id] = b;
});

/* ---------- three.js scene ---------- */
let renderer, composer, bloom, gl = true;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  if (!renderer.getContext()) throw new Error('no context');
} catch (e) { gl = false; }

const W = () => host.clientWidth, H = () => host.clientHeight;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07010f);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
const brain = new THREE.Group(); scene.add(brain);
brain.rotation.set(.32, .85, 0);

function noise3(x, y, z){   // Command's compact multi-octave noise → gyri and sulci
  let n = 0, amp = 1, freq = 1;
  for (let o = 0; o < 3; o++){
    n += amp * (Math.sin(x * freq * 1.1 + y * freq * 2.3) * Math.cos(y * freq * 1.7 + z * freq * .9) * Math.sin(z * freq * 1.3 + x * freq * .7));
    amp *= .5; freq *= 2.1;
  }
  return n;
}
const wireMats = [], bodyMats = [];
const BUILD_PLANE = new THREE.Plane(new THREE.Vector3(0, -1, 0), 99);   // keeps y < constant
/* KAM-terminal hologram shell: cyan rim light, fine moving scanlines, and a green scan band that sweeps the brain */
const SHELL = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uSweep: { value: 0 }, uBuild: { value: 99 }, uCol: { value: new THREE.Color(0x00d4ff) }, uAcc: { value: new THREE.Color(0x00ff88) } },
  vertexShader: `varying vec3 vN; varying vec3 vW;
    void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uTime; uniform float uSweep; uniform float uBuild; uniform vec3 uCol; uniform vec3 uAcc; varying vec3 vN; varying vec3 vW;
    void main(){
      if (vW.y > uBuild) discard;                       // live build: the shell exists only behind the scan plane
      vec3 v = normalize(cameraPosition - vW);
      float rim = pow(1.0 - abs(dot(normalize(vN), v)), 2.4);
      float scan = 0.55 + 0.45 * step(0.5, fract(vW.y * 26.0 - uTime * 0.8));
      float band = smoothstep(0.12, 0.0, abs(vW.y - uSweep));
      float edge = smoothstep(0.1, 0.0, abs(vW.y - uBuild));
      vec3 c = uCol * rim * 1.1 * scan + uAcc * band * (0.35 + rim) + vec3(0.75, 1.0, 1.0) * edge * 0.9;
      gl_FragColor = vec4(c, clamp(rim * 0.8 + band * 0.45 + edge * 0.6, 0.0, 1.0));
    }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
});
function hemisphere(side){
  const seg = innerWidth < 600 ? 48 : 64;
  const geo = new THREE.SphereGeometry(1.6, seg, seg), pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++){
    v.fromBufferAttribute(pos, i);
    if (v.x * side < 0) v.x *= .06;               // flatten the medial face
    v.z *= 1.22;
    if (v.y > .1 && v.z > -.3) v.y *= 1.03;
    v.multiplyScalar(1 + noise3(v.x * 3.6 + side * 9, v.y * 3.6, v.z * 3.6) * .085);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true; geo.computeVertexNormals();
  const wireMat = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: [BUILD_PLANE] });
  wireMats.push(wireMat);
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0x041022, transparent: true, opacity: .45, depthWrite: false, clippingPlanes: [BUILD_PLANE] }); bodyMats.push(bodyMat);
  g.add(new THREE.Mesh(geo, bodyMat));
  const shell = new THREE.Mesh(geo, SHELL); shell.renderOrder = 1;   // holographic rim + scanlines + sweep band
  g.add(shell);
  g.add(new THREE.LineSegments(new THREE.WireframeGeometry(geo), wireMat));
  g.position.x = side > 0 ? .5 : -.5;
  return g;
}
brain.add(hemisphere(1), hemisphere(-1));
scene.add(new THREE.AmbientLight(0xffffff, .32));
[[0x8b7bff, .9, [-3, 4, 6]], [0x00f0ff, .8, [3, -3, 5]], [0x00ff88, .35, [0, 5, -4]]].forEach(([c, i, p]) => { const l = new THREE.PointLight(c, i, 18, 0); l.position.set(...p); scene.add(l); });

/* holographic HUD around the brain: thin rings with tick marks in the KAM accents, and a sweep ring */
const HOLO = new THREE.Group(); HOLO.position.y = -.1; scene.add(HOLO);
function ring(r, col, op, ticks, dashed){
  const pts = []; for (let i = 0; i <= 160; i++){ const a = i / 160 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = dashed ? new THREE.LineDashedMaterial({ color: col, transparent: true, opacity: op, dashSize: .09, gapSize: .07, blending: THREE.AdditiveBlending, depthWrite: false })
                     : new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
  const line = new THREE.Line(geo, mat); if (dashed) line.computeLineDistances();
  const g = new THREE.Group(); g.add(line);
  if (ticks){
    const tp = [];
    for (let i = 0; i < ticks; i++){ const a = i / ticks * Math.PI * 2, l = i % 6 ? .05 : .14; tp.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), new THREE.Vector3(Math.cos(a) * (r + l), 0, Math.sin(a) * (r + l))); }
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tp), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op * 1.3, blending: THREE.AdditiveBlending, depthWrite: false })));
  }
  return g;
}
const RINGS3 = [
  [ring(2.32, 0xaa66ff, .32, 96, false), .26, 0, .05],
  [ring(2.46, 0xffcc00, .22, 0, true), -.32, .2, -.035],
  [ring(2.2, 0xff66cc, .2, 48, false), Math.PI / 2 + .25, .1, .03],
];
RINGS3.forEach(([g, rx, rz]) => { g.rotation.x = rx; g.rotation.z = rz; HOLO.add(g); });
const sweepRing = ring(1, 0x00ff88, .55, 0, false); scene.add(sweepRing);

/* notes as motes inside the hemispheres */
const rngPos = () => (rng() + rng() + rng() - 1.5) * .55;
function placeIn(group){
  const d = DOM[group], side = d.c[0] > 0 ? 1 : -1;
  const p = new THREE.Vector3(d.c[0] + rngPos(), d.c[1] + rngPos(), d.c[2] + rngPos() * 1.2);
  const hx = side * .5, q = new THREE.Vector3(p.x - hx, p.y, p.z / 1.22), L = q.length(), max = 1.42;
  if (L > max) q.multiplyScalar(max * (.86 + rng() * .14) / L);
  if (q.x * side < .12) q.x = side * (.12 + rng() * .3);
  return new THREE.Vector3(q.x + hx, q.y, q.z * 1.22);
}
const CAP = 420;
// a soft round glow for every mote (the CRT version of Command's motes)
const DOT = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.9)'); g.addColorStop(.5, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
function pointsLayer(size, opacity){
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CAP * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(CAP * 3), 3));
  geo.setDrawRange(0, 0);
  const mat = new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, map: DOT, alphaTest: .01 });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 2; brain.add(pts);
  return { pts, geo, mat, n: 0, nodes: [] };
}
const notesL = pointsLayer(.2, 1), agentL = pointsLayer(.12, .6), lakeL = pointsLayer(.08, .8);
function pushPoint(L, p, col, node){
  if (L.n >= CAP) return;
  L.geo.attributes.position.setXYZ(L.n, p.x, p.y, p.z);
  const c = new THREE.Color(col); if (L === agentL) c.multiplyScalar(.7);
  L.geo.attributes.color.setXYZ(L.n, c.r, c.g, c.b);
  L.nodes[L.n] = node; L.n++; L.geo.setDrawRange(0, L.n);
  L.geo.attributes.position.needsUpdate = true; L.geo.attributes.color.needsUpdate = true;
  L.geo.computeBoundingSphere();
}
graph.nodes.forEach(n => { n.pos = placeIn(n.group); pushPoint(n.kind === 'note' ? notesL : agentL, n.pos, DOM[n.group].col, n); });

/* the lake: machine output, kept outside the cortex, under it like a cerebellum */
const LAKE = new THREE.Vector3(0, -1.32, -1.5);
function lakePoint(){ return new THREE.Vector3(LAKE.x + (rng() - .5) * 1.5, LAKE.y + (rng() - .5) * .5, LAKE.z + (rng() - .5) * .8); }
for (let i = 0; i < 160; i++) pushPoint(lakeL, lakePoint(), '#8b7bff', null);

/* wiki-link edges */
const byId = Object.fromEntries(graph.nodes.map(n => [n.id, n]));
const LINKCAP = 900;
const linkGeo = new THREE.BufferGeometry();
linkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINKCAP * 6), 3));
linkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(LINKCAP * 6), 3));
const linkMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false });
const linkLines = new THREE.LineSegments(linkGeo, linkMat); linkLines.frustumCulled = false; brain.add(linkLines);
let nLinks = 0;
const adj = new Map();
function pushLink(l){
  const a = byId[l.source], b = byId[l.target]; if (!a || !b || nLinks >= LINKCAP) return;
  const P = linkGeo.attributes.position, C = linkGeo.attributes.color, ca = new THREE.Color(DOM[a.group].col);
  P.setXYZ(nLinks * 2, a.pos.x, a.pos.y, a.pos.z); P.setXYZ(nLinks * 2 + 1, b.pos.x, b.pos.y, b.pos.z);
  C.setXYZ(nLinks * 2, ca.r, ca.g, ca.b); C.setXYZ(nLinks * 2 + 1, ca.r * .5, ca.g * .5, ca.b * .5);
  nLinks++; linkGeo.setDrawRange(0, nLinks * 2); P.needsUpdate = true; C.needsUpdate = true;
  (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a);
}
graph.links.forEach(pushLink);
let countK = 1;
const counts = () => { hN.textContent = Math.round(graph.nodes.length * countK); hL.textContent = Math.round(nLinks * countK); };
counts();

/* system core: the lint, at the thalamic centre */
const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.17, 1), new THREE.MeshBasicMaterial({ color: 0xff2e88 }));
const coreHalo = new THREE.Mesh(new THREE.SphereGeometry(.34, 20, 20), new THREE.MeshBasicMaterial({ color: 0xff2e88, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false }));
brain.add(core, coreHalo);
const lintRing = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xff2e88, wireframe: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
brain.add(lintRing); let lintT = -9;

/* hover marker */
const marker = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: .9, depthTest: false }));
marker.visible = false; brain.add(marker);

/* ---------- electric synapses (Command's jagged arcs) ---------- */
const firings = [];
function synapse(from, to, colour, life = 1){
  const SEGS = 16, pts = [], dir = new THREE.Vector3().subVectors(to, from), len = dir.length();
  const up = Math.abs(dir.y / (len || 1)) > .9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const p1 = new THREE.Vector3().crossVectors(dir, up).normalize(), p2 = new THREE.Vector3().crossVectors(dir, p1).normalize();
  for (let i = 0; i <= SEGS; i++){
    const t = i / SEGS, bell = Math.sin(t * Math.PI), p = new THREE.Vector3().lerpVectors(from, to, t);
    p.addScaledVector(p1, (Math.random() - .5) * len * .1 * bell).addScaledVector(p2, (Math.random() - .5) * len * .1 * bell);
    pts.push(p);
  }
  const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(colour), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat); line.renderOrder = 3;
  const sparkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colour), transparent: true, depthTest: false });
  const spark = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), sparkMat); spark.position.copy(from); spark.renderOrder = 4;
  const glowMat = new THREE.SpriteMaterial({ map: DOT, color: new THREE.Color(colour), transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
  const glow = new THREE.Sprite(glowMat); glow.scale.setScalar(.42); glow.renderOrder = 4; spark.add(glow);
  brain.add(line, spark);
  firings.push({ line, mat, spark, sparkMat, glowMat, from: from.clone(), to: to.clone(), life, max: life });
  while (firings.length > 28) kill(firings.shift());
}
function kill(f){ brain.remove(f.line, f.spark); f.line.geometry.dispose(); f.mat.dispose(); f.spark.geometry.dispose(); f.sparkMat.dispose(); f.glowMat.dispose(); }
function fireRandom(){
  if (!nLinks) return;
  const l = graph.links[(Math.random() * graph.links.length) | 0], a = byId[l.source], b = byId[l.target];
  if (a && b) synapse(a.pos, b.pos, DOM[a.group].col);
}

/* ---------- machines on axons ---------- */
const anchorOf = { m1: new THREE.Vector3(0, 0, 0), m3: new THREE.Vector3(...DOM['40-career'].c), imac: new THREE.Vector3(...DOM['10-kam'].c), yerson: LAKE.clone() };
const MX = {};
IDS.forEach(id => {
  const col = new THREE.Color(M[id].c);
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(id === 'm1' ? .2 : .16, 1), new THREE.MeshBasicMaterial({ color: col }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(id === 'm1' ? .34 : .27, 20, 16), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .015, blending: THREE.AdditiveBlending, depthWrite: false }));
  mesh.userData.machine = id;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: col, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(id === 'm1' ? .5 : .42);
  const band = ring(id === 'm1' ? .3 : .25, col, .8, 12, false);
  scene.add(mesh, halo, glow, band);
  MX[id] = { mesh, halo, glow, band, pos: new THREE.Vector3(), phase: IDS.indexOf(id) * Math.PI / 2, spawn: 1 };
});
/* the hubs orbit the brain on one close, tilted ring, like moons; slower when hovered, still while a profile is open */
let orbitA = 2.2, orbitC = 2.35, theta = .5, orbitSpeed = .11, hubHover = null;
const ORBIT_TILT = .5, ORBIT_Y = -.1;
const orbitPos = (ph, out) => out.set(Math.cos(theta + ph) * orbitA, ORBIT_Y - ORBIT_TILT * Math.sin(theta + ph), Math.sin(theta + ph) * orbitC);
let orbitLine = null;
function buildOrbitLine(){
  if (orbitLine){ scene.remove(orbitLine); orbitLine.geometry.dispose(); }
  const pts = []; for (let i = 0; i <= 160; i++){ const a = i / 160 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * orbitA, ORBIT_Y - ORBIT_TILT * Math.sin(a), Math.sin(a) * orbitC)); }
  orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x00d4ff, transparent: true, opacity: .35, dashSize: .06, gapSize: .06, blending: THREE.AdditiveBlending, depthWrite: false }));
  orbitLine.computeLineDistances(); scene.add(orbitLine);
}
const tmpA = new THREE.Vector3();
function updateHubs(dt){
  const want = sel || !hubsLive ? 0 : hubHover ? .015 : .11;
  orbitSpeed = sel ? 0 : orbitSpeed + (want - orbitSpeed) * Math.min(1, dt * 4);
  if (!reduce) theta += orbitSpeed * dt;
  for (const id of IDS){
    const x = MX[id]; orbitPos(x.phase, x.pos);
    const on = !sel || sel === id;
    x.mesh.position.copy(x.pos); x.halo.position.copy(x.pos); x.glow.position.copy(x.pos); x.band.position.copy(x.pos);
    x.band.lookAt(camera.position); x.band.rotateX(Math.PI / 2);
    x.glow.material.opacity = on ? .9 : .2; x.mesh.material.opacity = on ? 1 : .3; x.mesh.material.transparent = !on;
    const k = x.spawn, vis = k > .001;
    x.mesh.visible = x.halo.visible = x.glow.visible = x.band.visible = vis;
    x.mesh.scale.setScalar(k); x.glow.scale.setScalar((IDS.indexOf(id) ? .42 : .5) * k); x.band.scale.setScalar(k * (1 + 2.2 * (1 - k)));
  }
}
const hubLocal = id => brain.worldToLocal(MX[id].pos.clone());

/* ---------- layout ---------- */
let D = 7, zf = 1, offX = 0, offTgt = 0, sel = null, aspect = 1;
const look = new THREE.Vector3(0, -.1, 0), lookTgt = look.clone(), camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
const narrow = () => W() < 600;
// phone layout (CSS ≤600px): every phone-only behaviour below is gated on this
const PHONE = () => matchMedia('(max-width:600px)').matches, TOUCH = () => PHONE() && matchMedia('(pointer:coarse)').matches;
function homeCam(){ camTgt.set(0, .35, D / zf); lookTgt.set(0, -.1, 0); offTgt = 0; }
function layout(){
  const w = W(), h = H(); if (w < 20 || h < 20) return;
  aspect = w / h; camera.aspect = aspect;
  // the brain fills the screen: as big as the height allows, leaving the side columns for the callouts
  const tan = Math.tan(THREE.MathUtils.degToRad(21));
  const fracW = narrow() ? .8 : Math.max(.3, (w / 2 - COL - 24) / (w / 2));
  D = Math.max(1.78 / (narrow() ? .5 : .56) / tan, 2.25 / fracW / (tan * aspect));
  if (gl){
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
    if (composer){ composer.setSize(w, h); bloom.setSize(w, h); }
  }
  placeCallouts();
  // size the hubs' orbit: just outside the brain, but its widest point stays inside the band between the callout columns
  const pxPerUnit = (h / 2) / (tan * D), maxX = narrow() ? w / 2 - 14 : w / 2 - COL - 34;
  orbitA = Math.max(1.6, Math.min(2.3, maxX / pxPerUnit));
  orbitC = 2.35;
  buildOrbitLine();
  if (sel) aim(sel); else homeCam();
  if (!camPos.lengthSq() || reduce){ camPos.copy(camTgt); look.copy(lookTgt); offX = offTgt; }
  dirty = true;
}
function aim(id){
  const p = MX[id].pos, a = brain.localToWorld(tmpA.copy(anchorOf[id]));
  lookTgt.copy(p).lerp(a, .25);
  camTgt.copy(lookTgt).add(new THREE.Vector3(0, .25, (narrow() ? D * .6 : D * 1.02) / Math.max(.8, zf)));
  offTgt = narrow() ? 0 : W() * .2;        // the profile takes the right 40%; centre the subject in the rest
}

/* ---------- callouts around the brain, with leader lines ---------- */
const COL = 262;
const cos = [...document.querySelectorAll('.co')];
const leaders = $('#leaders');
const ANCH = {
  l1: () => new THREE.Vector3(0, .05, 0),
  l2: () => byGroup['10-kam'].find(n => n.kind === 'note').pos,
  l3: () => new THREE.Vector3(0, -.22, 0),
  r1: () => byGroup['40-career'].find(n => n.kind === 'agent').pos,
  r2: () => LAKE,
  r3: () => new THREE.Vector3(LAKE.x + .55, LAKE.y + .05, LAKE.z + .2),
};
function placeCallouts(){
  if (narrow()){ cos.forEach(c => { c.style.left = c.style.top = ''; }); return; }
  const w = W(), h = H();
  for (const side of ['l', 'r']){
    const col = cos.filter(c => c.dataset.slot[0] === side), hs = col.map(c => c.offsetHeight);
    const x = side === 'l' ? 18 : w - COL - 18, top = 70, bottom = h - 60;
    const ys = [top, 0, bottom - hs[2]]; ys[1] = Math.round((ys[0] + hs[0] + ys[2]) / 2 - hs[1] / 2);
    col.forEach((c, i) => { c.style.left = x + 'px'; c.style.top = ys[i] + 'px'; });
  }
}
function drawLeaders(){
  if (narrow() || sel){ return; }
  let s = '';
  for (const c of cos){
    const slot = c.dataset.slot;
    const x0 = slot[0] === 'l' ? c.offsetLeft + COL + 6 : c.offsetLeft - 6, y0 = c.offsetTop + 9;
    project(ANCH[slot](), sp);
    const col = c._col || (c._col = getComputedStyle(c).getPropertyValue('--c').trim() || '#00f0ff');
    if (c.classList.contains('hide')) continue;
    const kx = x0 + (slot[0] === 'l' ? 22 : -22), pr = reduce ? 1 : Math.max(0, Math.min(1, (performance.now() - (c._lt || 0)) / 380));
    // the leader draws itself from the callout into the brain
    const seg1 = Math.abs(kx - x0), seg2 = Math.hypot(sp[0] - kx, sp[1] - y0), tot = seg1 + seg2, d = pr * tot;
    let ex = kx, ey = y0, path = `M${x0},${y0} H${kx}`;
    if (d < seg1){ ex = x0 + (kx - x0) * d / seg1; path = `M${x0},${y0} H${ex.toFixed(1)}`; }
    else { const f = (d - seg1) / (seg2 || 1); ex = kx + (sp[0] - kx) * f; ey = y0 + (sp[1] - y0) * f; path += ` L${ex.toFixed(1)},${ey.toFixed(1)}`; }
    s += `<g><path d="${path}" stroke="${col}"/><circle cx="${x0}" cy="${y0}" r="2" fill="${col}"/>` +
         (pr >= 1 ? `<circle cx="${sp[0].toFixed(1)}" cy="${sp[1].toFixed(1)}" r="3.2" fill="${col}"/><circle cx="${sp[0].toFixed(1)}" cy="${sp[1].toFixed(1)}" r="7" fill="none" stroke="${col}" stroke-width=".8"/>`
                  : `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="2.4" fill="#fff"/>`) + `</g>`;
  }
  leaders.innerHTML = s;
}

/* ---------- interaction: drag to turn, pinch or buttons to zoom; the wheel is left to the page ---------- */
let rotV = { x: 0, y: 0 }, dragging = false, hoverNode = null, dirty = true;
const ptrs = new Map(); let pinch0 = 0, zf0 = 1, downAt = null;
host.addEventListener('pointerdown', e => {
  host.setPointerCapture?.(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2){ const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zf0 = zf; }
  downAt = [e.clientX, e.clientY, performance.now()]; dragging = true; rotV = { x: 0, y: 0 };
});
host.addEventListener('pointermove', e => {
  if (ptrs.has(e.pointerId)){
    const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2){ const [a, b] = [...ptrs.values()]; setZoom(zf0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / (pinch0 || 1)); return; }
    const dx = e.clientX - prev[0], dy = e.clientY - prev[1];
    brain.rotation.y += dx * .006; brain.rotation.x = Math.max(-.7, Math.min(.7, brain.rotation.x + dy * .004));
    rotV = { x: dy * .004, y: dx * .006 }; dirty = true; tip.style.display = 'none';
    return;
  }
  hover(e);
});
const up = e => {
  ptrs.delete(e.pointerId); if (ptrs.size) return; dragging = false;
  if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 5 && performance.now() - downAt[2] < 500) click(e);
  downAt = null;
};
host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
host.addEventListener('pointerleave', () => { tip.style.display = 'none'; marker.visible = false; hoverNode = null; dirty = true; });
function setZoom(z){ zf = Math.max(.7, Math.min(1.7, z)); if (sel) aim(sel); else homeCam(); if (reduce){ camPos.copy(camTgt); look.copy(lookTgt); } dirty = true; }
$('#zIn').addEventListener('click', () => setZoom(zf * 1.18));
$('#zOut').addEventListener('click', () => setZoom(zf / 1.18));
$('#zReset').addEventListener('click', () => { brain.rotation.set(.32, .85, 0); setZoom(1); });

const ray = new THREE.Raycaster(), m2 = new THREE.Vector2();
function cast(e){
  const r = host.getBoundingClientRect(); m2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(m2, camera); ray.params.Points.threshold = .07 / Math.sqrt(zf);
  const mh = ray.intersectObjects(IDS.map(id => MX[id].mesh))[0];
  if (mh) return { machine: mh.object.userData.machine };
  const hits = ray.intersectObjects([notesL.pts, agentL.pts]);
  if (hits.length){ const h = hits[0], L = h.object === notesL.pts ? notesL : agentL; return { node: L.nodes[h.index] }; }
  return null;
}
function hover(e){
  if (!gl || sel) return;
  const h = cast(e), r = host.getBoundingClientRect();
  if (h && h.node){
    const n = h.node, links = (adj.get(n) || []).length;
    tip.style.setProperty('--c', DOM[n.group].col);
    tip.innerHTML = `<b>${n.group.toUpperCase()} · ${n.kind === 'note' ? 'MY NOTE' : 'AGENT OUTPUT'}</b>${n.kind === 'note' ? n.label + '.md' : 'agent/' + n.label}<br><span>${links} link${links === 1 ? '' : 's'} · demo title · click for more</span>`;
    tip.style.display = 'block';
    const x = e.clientX - r.left + 14, y = e.clientY - r.top + 12;
    tip.style.left = Math.min(x, r.width - tip.offsetWidth - 8) + 'px'; tip.style.top = Math.min(y, r.height - tip.offsetHeight - 8) + 'px';
    marker.position.copy(n.pos); marker.material.color.set(DOM[n.group].col); marker.visible = true; hoverNode = n; host.style.cursor = 'pointer';
  } else if (h && h.machine){
    hubHover = h.machine;
    tip.style.setProperty('--c', M[h.machine].c); tip.innerHTML = `<b>${M[h.machine].name} · ${M[h.machine].k}</b><span>click to connect</span>`;
    tip.style.display = 'block'; tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 12) + 'px';
    marker.visible = false; hoverNode = null; host.style.cursor = 'pointer';
  } else { tip.style.display = 'none'; marker.visible = false; hoverNode = null; host.style.cursor = ''; if (hubHover && !cardHover) hubHover = null; }
  dirty = true;
}
function click(e){
  if (!gl) return;
  const h = cast(e);
  if (h && h.machine){ go(h.machine); return; }
  if (h && h.node){ if (sel){ home(); return; } if (h.node === shownNode) closeReadout(); else showNode(h.node); return; }
  // a click on empty space dismisses whatever is open: the note readout, or a machine profile
  if (!closeReadout() && sel) home();
}
let shownNode = null;
function closeReadout(){
  if (!shownNode) return false;
  shownNode = null; readout.classList.remove('on'); marker.visible = false; dirty = true; return true;
}
function showNode(n){
  shownNode = n;
  const nb = adj.get(n) || [], c = DOM[n.group].col;
  readout.style.setProperty('--c', c); readout.classList.add('on');
  readout.innerHTML = `<button type="button" aria-label="Close the note">[ × ]</button><b>${n.group.toUpperCase()} / ${n.kind === 'note' ? 'NOTES' : 'AGENT'}</b>
    <strong>${n.kind === 'note' ? n.label + '.md' : n.label}</strong><br>${n.kind === 'note'
      ? 'A note I wrote or promoted. It ranks above machine output in search.'
      : 'Filed by an agent. It stays in the agent folder until I promote it.'}<br><span style="color:var(--dim)">${nb.length} wiki-link${nb.length === 1 ? '' : 's'} · invented for this demo</span>`;
  readout.querySelector('button').addEventListener('click', closeReadout);
  if (!reduce) nb.slice(0, 6).forEach(m => synapse(n.pos, m.pos, c, 1.3));
  KB.beep(880, 35); dirty = true;
}

/* ---------- floating titles (mock filings) ---------- */
const FL = [];
function floatAt(text, local, c, ttl = 3.6){
  const el = document.createElement('div'); el.className = 'float'; el.style.setProperty('--c', c);
  el.textContent = narrow() ? text.split('/').filter(Boolean).pop() : text; floatsEl.appendChild(el);
  FL.push({ el, p: local.clone(), t0: T, ttl });
}
const STATIC = [];
function label(text, local, c){ const el = document.createElement('div'); el.className = 'float'; el.style.setProperty('--c', c); el.style.opacity = .85; el.textContent = text; floatsEl.appendChild(el); STATIC.push({ el, p: local.clone() }); }
label('system/ · the lint', new THREE.Vector3(0, -.42, 0), '#ff2e88');
label('lake/ · machine output', new THREE.Vector3(0, -1.75, -1.5), '#8b7bff');

/* ---------- mock activity: machines file into the brain ---------- */
const EVENTS = [
  ['yerson', 'lake', null, 'intel → lake/reports/intel/geopolitics/', 'filed 14 items · geopolitics'],
  ['yerson', 'lake', null, 'intel → lake/reports/intel/markets/', 'filed 9 items · markets'],
  ['yerson', 'lake', null, 'intel → lake/reports/intel/research/', 'filed 6 items · research'],
  ['imac', '10-kam', 'agent', 'builder', 'night report filed · 10-kam'],
  ['m3', '40-career', 'note', 'notes/interview-prep-follow-ups.md', 'note saved · 40-career'],
  ['m3', '30-dissertation', 'note', 'notes/forecast-error-measures.md', 'note saved · 30-dissertation'],
  ['m3', '90-library', 'note', 'notes/how-search-ranks-notes.md', 'note saved · 90-library'],
  ['m3', '10-kam', 'note', 'notes/globe-night-layer.md', 'note saved · 10-kam'],
  ['m3', '00-desk', 'note', 'notes/idea-to-sort-later.md', 'captured to the desk'],
  ['m1', '50-fleet', 'agent', 'sentinel', 'sentinel · baseline holding'],
  ['m1', '60-people', 'agent', 'yerdad', 'director report filed'],
];
const PENDING = [];
function fireEvent(){
  const [m, to, kind, text, msg] = EVENTS[(Math.random() * EVENTS.length) | 0];
  // the hub fires a synapse straight into the brain; the filing lands when the spark arrives
  const k = { to, kind, text }, target = to === 'lake' ? lakePoint() : placeIn(to);
  synapse(hubLocal(m), target, M[m].c, 1.2);
  PENDING.push({ m, k, target, at: T + .7 });
  log(M[m].name.toUpperCase(), ' ' + msg, M[m].c);
}
function arrive(m, k, target){
  if (k.to === 'lake'){ pushPoint(lakeL, target, '#8b7bff', null); floatAt(k.text, target, '#8b7bff'); return; }
  const label = k.kind === 'note' ? k.text.replace(/^notes\//, '').replace(/\.md$/, '') + '-' + ((Math.random() * 90 + 10) | 0) : `2026-10-11/${k.text}.md`;
  const n = addNode(k.to, k.kind, label); n.pos = target;
  pushPoint(k.kind === 'note' ? notesL : agentL, n.pos, DOM[k.to].col, n);
  const peer = pick(byGroup[k.to].filter(x => x !== n)); const l = { source: n.id, target: peer.id };
  byId[n.id] = n; graph.links.push(l); pushLink(l); counts();
  synapse(n.pos, peer.pos, DOM[k.to].col, .9);
  floatAt(k.kind === 'note' ? `${k.to}/notes/${label}.md` : `${k.text} → ${k.to}/agent/2026-10-11/`, n.pos, k.kind === 'note' ? DOM[k.to].col : '#9fdfe8');
}

/* ---------- loop ---------- */
let T = 0, last = performance.now(), nextFire = .3, nextEvent = 1.4, nextLint = 2.5;
const v3 = new THREE.Vector3();
function project(local, out){ v3.copy(local); brain.localToWorld(v3); v3.project(camera); out[0] = (v3.x + 1) / 2 * W() - (camera.view && camera.view.enabled ? 0 : 0); out[1] = (1 - v3.y) / 2 * H(); out[2] = v3.z; return out; }
const sp = [0, 0, 0];
function frame(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const animating = !reduce;
  if (animating){
    T += dt;
    if (!dragging){
      if (Math.abs(rotV.y) > .0002 || Math.abs(rotV.x) > .0002){ brain.rotation.y += rotV.y; brain.rotation.x = Math.max(-.7, Math.min(.7, brain.rotation.x + rotV.x)); rotV.y *= .94; rotV.x *= .94; }
      else if (!hoverNode) brain.rotation.y += dt * .07;
    }
    if (live && T > nextFire){ nextFire = T + .22 + Math.random() * .25; fireRandom(); }
    if (filings && T > nextEvent){ nextEvent = T + 1.8 + Math.random() * 1.2; fireEvent(); }
    if (live && T > nextLint){ nextLint = T + 9; lintT = T; log('SYSTEM', ' lint pass · 0 faults', '#ff2e88'); }
  }
  // camera eases toward its target (snaps under reduced motion)
  const e = reduce ? 1 : 1 - Math.pow(.002, dt);
  const bs = buildS(now);
  applyBuild(bs);
  if (bs < BUILD_END && !sel){ camPos.copy(camTgt); camPos.z += D * .22 * (1 - ease(bs / 2.2)); }   // a slow settle while it builds
  else camPos.lerp(camTgt, e);
  look.lerp(lookTgt, e); offX += (offTgt - offX) * e;
  camera.position.copy(camPos); camera.lookAt(look);
  if (Math.abs(offX) > .5) camera.setViewOffset(W(), H(), offX, 0, W(), H()); else camera.clearViewOffset();
  camera.updateProjectionMatrix();

  if ((animating && !waiting) || dirty || (bs < BUILD_END && !waiting)){   // a preloaded page waiting for its hand-over renders once, not every frame
    brain.updateMatrixWorld();
    updateHubs(dt);
    for (let i = PENDING.length - 1; i >= 0; i--) if (T >= PENDING[i].at){ const p = PENDING.splice(i, 1)[0]; arrive(p.m, p.k, p.target); }
    for (const id of IDS){
      const x = MX[id], pulse = reduce ? 0 : (Math.sin(T * 2.4 + IDS.indexOf(id)) + 1) / 2;
      x.halo.scale.setScalar(1 + pulse * .25); x.mesh.rotation.y += reduce ? 0 : dt * .8;
    }
    // hologram: shell scanlines, the sweep band and its ring, the slow HUD rings
    const sweepY = reduce ? .4 : Math.sin(T * .45) * 1.75;
    SHELL.uniforms.uTime.value = T; SHELL.uniforms.uSweep.value = sweepY;
    const sr = Math.sqrt(Math.max(0, 1 - Math.pow(sweepY / 1.85, 2)));
    const ringY = bs < 1.4 ? buildY : sweepY, rr = Math.sqrt(Math.max(0, 1 - Math.pow(ringY / 1.85, 2)));
    sweepRing.position.y = ringY; sweepRing.scale.set(2.25 * rr + .05, 1, 2.2 * rr + .05);
    sweepRing.visible = rr > .08 && bs > .3;
    if (!reduce) RINGS3.forEach(([g, , , sp]) => { g.rotation.y += sp * dt; });
    // firings
    for (let i = firings.length - 1; i >= 0; i--){
      const f = firings[i]; if (!reduce) f.life -= dt * 1.4;
      if (f.life <= 0){ kill(f); firings.splice(i, 1); continue; }
      const k = 1 - f.life / f.max, tr = Math.min(1, k / .6);
      f.spark.position.lerpVectors(f.from, f.to, tr); f.spark.scale.setScalar(.7 + .6 * Math.sin(tr * Math.PI));
      f.sparkMat.opacity = f.life > .4 ? 1 : f.life / .4; f.glowMat.opacity = f.sparkMat.opacity; f.mat.opacity = Math.min(1, (f.life / f.max) * 1.2);
    }
    hF.textContent = firings.length;
    // core + lint sweep
    const cp = reduce ? 0 : (Math.sin(T * 2) + 1) / 2;
    coreHalo.scale.setScalar(1 + cp * .3);
    const lk = (T - lintT) / 2.4;
    if (lk >= 0 && lk < 1){ lintRing.scale.setScalar(.2 + lk * 2.4); lintRing.material.opacity = .35 * (1 - lk); } else lintRing.material.opacity = 0;
    wireMats.forEach(m => { m.opacity = .09 + cp * .03; });
    if (gl){ composer ? composer.render() : renderer.render(scene, camera); }
    // HTML layers follow the 3D scene
    const w = W(), h = H();
    const lo = narrow() ? 6 : COL + 30, top = narrow() ? 78 : 104, floor = h - 60 - (shownNode ? readout.offsetHeight + 32 : 0);   // never under the note readout
    const cards = IDS.map(id => {
      // each card rides with its hub: inward of it (towards the brain's centre line), below it when the hub passes in front,
      // above it when it passes behind; always inside the band between the callout columns
      const b = nodeBtns[id];
      v3.copy(MX[id].pos).project(camera);
      let x = (v3.x + 1) / 2 * w, y = (1 - v3.y) / 2 * h;
      const bw = b.offsetWidth, bh = b.offsetHeight, z = MX[id].pos.z, front = z > 0;
      x -= Math.max(-1, Math.min(1, (x - w / 2) / 60)) * (bw / 2 + 14);
      y += (front ? 1 : -1) * (bh / 2 + 16);
      return { id, b, x, y, bw, bh, z, front };
    });
    const clampC = c => { c.x = Math.max(lo + c.bw / 2, Math.min(w - lo - c.bw / 2, c.x)); c.y = Math.max(top + c.bh / 2, Math.min(floor - c.bh / 2, c.y)); };
    cards.forEach(clampC);
    // cards never sit on each other: when two meet, the one further back moves up, the nearer one down
    for (let pass = 0; pass < 4; pass++) for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++){
      const A = cards[i], B = cards[j];
      const ox = (A.bw + B.bw) / 2 + 6 - Math.abs(A.x - B.x), oy = (A.bh + B.bh) / 2 + 6 - Math.abs(A.y - B.y);
      if (ox <= 0 || oy <= 0) continue;
      const [back, near] = A.z < B.z ? [A, B] : [B, A];
      back.y -= oy / 2; near.y += oy / 2; clampC(back); clampC(near);
      const oy2 = (A.bh + B.bh) / 2 + 6 - Math.abs(A.y - B.y);
      if (oy2 > 0){ const dir = back.x <= near.x ? -1 : 1, ox2 = (A.bw + B.bw) / 2 + 6 - Math.abs(A.x - B.x); back.x += dir * ox2 / 2; near.x -= dir * ox2 / 2; clampC(back); clampC(near); }
    }
    for (const c of cards){
      c.b.style.zIndex = c.front ? 8 : 7; c.b.classList.toggle('behind', !c.front && !sel);
      c.b.style.transform = `translate(${c.x}px,${c.y}px) translate(-50%,-50%)`;
    }
    for (let i = FL.length - 1; i >= 0; i--){
      const f = FL[i], k = (T - f.t0) / f.ttl;
      if (k > 1 && !reduce){ f.el.remove(); FL.splice(i, 1); continue; }
      project(f.p, sp); const fw = f.el.offsetWidth;
      f.el.style.transform = `translate(${Math.max(4, Math.min(w - fw - 4, sp[0] - fw / 2))}px,${sp[1] - 14 - (reduce ? 0 : k * 22)}px)`;
      f.el.style.opacity = reduce ? .9 : (k < .12 ? k / .12 : 1 - Math.max(0, k - .55) / .45) * (sel ? .3 : 1);
    }
    for (const s of STATIC){ project(s.p, sp); const fw = s.el.offsetWidth; s.el.style.transform = `translate(${sp[0] - fw / 2}px,${sp[1]}px)`; s.el.style.opacity = sel ? .25 : .85; }
    drawLeaders();
    dirty = false;
  }
  requestAnimationFrame(frame);
}

/* a live screen inside a profile: the real page at a fixed 1280×800, scaled to whatever room the profile has left.
   The profile never scrolls on desktop: the screen takes the remaining height, and the text zooms down slightly if it must. */
const SCR_W = 1280, SCR_H = 800, SCR_MIN = 104;
const pScroll = document.querySelector('#profile .p-scroll');
function fitProfile(){
  if (!profile.classList.contains('open')) return;
  const scr = pBody.querySelector('.p-screen'), isShow = !!(scr && scr.dataset.show), isLog = scr && (scr.classList.contains('p-log') || isShow);
  pBody.style.zoom = ''; if (scr){ scr.style.height = '0px'; scr.style.width = ''; }
  if (PHONE()){
    if (!scr) return;
    const fw = scr.parentElement.getBoundingClientRect().width;
    const hh = isShow ? fw / 1.45 : isLog ? scr.firstElementChild.getBoundingClientRect().height + 14 : fw * SCR_H / SCR_W;
    scr.style.height = Math.round(hh) + 'px'; scr.style.width = '100%'; scr.style.setProperty('--s', (fw / SCR_W).toFixed(4));
    return;
  }
  const padB = 12, top = pScroll.getBoundingClientRect().top;
  const contentBottom = () => pBody.getBoundingClientRect().bottom - top + pScroll.scrollTop + padB;
  const room = () => pScroll.clientHeight - contentBottom() - 2;
  let k = 1;
  if (room() < SCR_MIN){                                   // not enough room even for a small screen: zoom the text down
    k = Math.max(narrow() ? .86 : .7, Math.min(1, (pScroll.clientHeight - 2) / (contentBottom() + SCR_MIN)));
    pBody.style.zoom = k;
  }
  if (!scr) return;
  const fullW = scr.parentElement.getBoundingClientRect().width;            // visual px
  const ideal = isShow ? fullW / 1.7 : isLog ? Math.min(fullW / 1.6, scr.firstElementChild.getBoundingClientRect().height + 14 * k) : fullW * SCR_H / SCR_W;
  const r = room(), hVis = Math.max(SCR_MIN * k, Math.min(ideal, r)), wVis = isLog ? fullW : Math.min(fullW, hVis * SCR_W / SCR_H);
  scr.style.height = (hVis / k) + 'px'; scr.style.width = isShow ? '100%' : (wVis / k) + 'px';
  scr.style.setProperty('--s', ((wVis / k) / SCR_W).toFixed(4));
}
new ResizeObserver(() => fitProfile()).observe(profile);

/* ---------- SSH in / out ---------- */
let seq = 0;
function go(id){
  if (sel === id) return;
  closeReadout(); const my = ++seq; sel = id; const m = M[id];
  aim(id); if (reduce){ camPos.copy(camTgt); look.copy(lookTgt); offX = offTgt; }
  IDS.forEach(k => { nodeBtns[k].classList.toggle('dim', k !== id); nodeBtns[k].classList.toggle('sel', k === id); });
  document.querySelectorAll('[data-go]').forEach(b => b.setAttribute('aria-pressed', b.dataset.go === id));
  homeBtn.disabled = false; document.body.classList.add('ssh');
  tip.style.display = 'none'; marker.visible = false;
  hTop.textContent = `SSH · ${m.name}`; hTop.style.color = m.c; hTail.textContent = '· tunnel open';
  if (!narrow()) showCallouts(false);
  // phone: flush under the header (the frame's .term is the containing block for the fixed profile)
  profile.style.top = narrow() ? Math.round(document.querySelector('.term > header').getBoundingClientRect().bottom - termEl.getBoundingClientRect().top) + 'px' : '';   // phone: sit flush under the header
  if (PHONE()){ const ctl = document.getElementById('ctl'); profile.style.bottom = Math.max(0, Math.round(termEl.getBoundingClientRect().bottom - ctl.getBoundingClientRect().top)) + 'px'; }
  profile.style.setProperty('--c', m.c); profile.classList.add('open'); profile.setAttribute('aria-hidden', 'false');
  if (PHONE()) profile.querySelector('.p-scroll').scrollTop = 0;
  pTag.textContent = `INTELLIGENCE PROFILE · ${m.name.toUpperCase()}`;
  pBody.classList.remove('in'); stopShow(); pBody.innerHTML = render(m); requestAnimationFrame(fitProfile);
  const sh = pBody.querySelector('[data-show]'); if (sh && window.KBShow) stopShow = KBShow.mount(sh, sh.dataset.show);
  pSsh.innerHTML = '<div><span class="pr">visitor@estate ~ %</span> <span class="cmd"></span></div><div class="l1"></div><div class="l2 ok"></div>';
  KB.beep(520, 50); KB.twitch(profile);
  log('SSH', ` connecting to ${m.name}…`, m.c);
  if (!reduce) for (let i = 0; i < 5; i++) setTimeout(() => sel === id && live && synapse(hubLocal(id), pick(graph.nodes).pos, m.c, 1.2), i * 160);
  if (!TOUCH()) $('#pBack').focus({ preventScroll: true });
  const q = s => pSsh.querySelector(s);
  KB.type(q('.cmd'), `ssh ${id}`, 22)
    .then(() => my === seq && KB.type(q('.l1'), `→ tunnel up · brain ⇄ ${m.name} · key accepted`, 90))
    .then(() => my === seq && KB.type(q('.l2'), `→ connected. ${m.k.toLowerCase()} · profile follows`, 90))
    .then(() => { if (my !== seq) return; pBody.classList.add('in'); KB.beep(880, 40); log(m.name.toUpperCase(), ' session open · read-only', m.c); });
  dirty = true;
}
let stopShow = () => {};
function home(){
  if (!sel) return;
  stopShow(); stopShow = () => {};
  const was = sel; seq++; sel = null;
  homeCam(); if (reduce){ camPos.copy(camTgt); look.copy(lookTgt); offX = 0; }
  IDS.forEach(k => nodeBtns[k].classList.remove('dim', 'sel'));
  document.querySelectorAll('[data-go]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  profile.classList.remove('open'); profile.setAttribute('aria-hidden', 'true'); homeBtn.disabled = true; document.body.classList.remove('ssh');
  hTop.textContent = '~/VAULT'; hTop.style.color = 'var(--a)'; hTail.textContent = '· inside the second brain';
  showCallouts(true);
  log('SSH', ' logout · back in the brain', '#00f0ff');
  KB.beep(330, 50); if (!TOUCH()) nodeBtns[was].focus({ preventScroll: true });
  dirty = true;
}
const BUILD_LOG = [
  ['01:02', 'builder · wake · branch night/2026-10-11'], ['01:03', 'read plan · 3 tasks from the KAM backlog'],
  ['01:20', 'task 1 · globe layer legend · tests 41/41', 'ok'], ['02:11', 'task 2 · news region filter · tests 38/38', 'ok'],
  ['03:05', 'task 3 · empty-state copy · 1 test failing', 'bad'], ['03:22', 'fix · rerun · tests 39/39', 'ok'],
  ['04:10', 'lint · build · bundle checked', 'ok'], ['04:12', 'no merge · waits for my review'],
  ['04:13', 'night report → 10-kam/agent/2026-10-11/builder.md'], ['04:13', 'sleep'],
];
function appBlock(m){
  const a = m.app; if (!a) return '';
  if (a.log) return `<div class="p-sec p-app"><div class="t-label p-scr-head"><span>${a.label}</span></div>
    <div class="p-screen p-log" role="img" aria-label="A mock overnight build log"><div class="p-log-in">${BUILD_LOG.map(([t, x, k]) =>
      `<div><time>${t}</time> ${x}${k === 'ok' ? ' <em>✓</em>' : k === 'bad' ? ' <em class="bad">✗</em>' : ''}</div>`).join('')}<div class="cur">_</div></div></div></div>`;
  return `<div class="p-sec p-app"><div class="t-label p-scr-head"><span>${a.label}</span></div>
    <div class="p-screen" data-show="${a.show}" role="img" aria-label="An animated showcase of ${m.name}'s app, with invented data"></div></div>`;
}
function render(m){
  const load = 3 + ((m.name.length * 7) % 6);   // illustrative only
  return `<div class="p-name"><b>${m.name}</b><span>${m.k}</span><span class="p-where">${m.where}</span></div>
    <p class="t-p p-role">${m.role}</p>
    <div class="p-specs">${m.specs.map(([k, v]) => `<span><i>${k}</i> ${v}</span>`).join('')}</div>
    <div class="p-sec"><div class="t-label">What runs on it</div><ul class="runs">${m.runs.map(([k, v]) => `<li><b>${k}</b>: ${v}</li>`).join('')}</ul></div>
    ${appBlock(m)}
    <div class="stat-row"><span>STATE <em>● ONLINE</em></span><span>SENTINEL <em>BASELINE HOLDING</em></span>
      <span class="ld">LOAD ${KB.meter(10, load)}<small>ILLUSTRATIVE</small></span></div>`;
}

$('#pBack').addEventListener('click', home);
homeBtn.addEventListener('click', home);
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
addEventListener('keydown', e => { if (e.key === 'Escape'){ if (!closeReadout()) home(); } });

/* callouts and machine cards fade in once the build has placed the hubs */
const calloutsEl = document.getElementById('callouts');
function reveal(){
  calloutsEl.style.visibility = '';
  cos.forEach((c, i) => setTimeout(() => { if (!sel){ c.classList.remove('hide'); c._lt = performance.now(); } dirty = true; }, reduce ? 0 : i * 90));
  IDS.forEach((id, i) => setTimeout(() => nodeBtns[id].classList.remove('pre'), reduce ? 0 : 150 + i * 90));
}
const showCallouts = on => cos.forEach(c => c.classList.toggle('hide', !on));

/* ---------- arrival: the estate grows out of the hack-in window and builds itself live (~2.2 s) ----------
   The portfolio types its commands in a small centred terminal window, then posts {kbArrive:1}. This page starts as that
   same window, expands it to full screen and constructs the scene on a timeline. Nothing is created per frame: the build
   only moves a clipping plane, draw ranges, scales, visibility and opacity. Reduced motion shows the finished state. */
const BUILD_END = 2.8, FR = 6, BAR = 27;   // frame inset from the edges, and its title bar
// nothing ambient runs until the build has made the things it needs: firing and the lint once the links are drawn,
// hub filings once the hubs exist
let buildT0 = null, waiting = false, finalDone = false, live = false, filings = false, hubsLive = true, buildY = 99;
let revealed = false, titleTyped = false, firstFire = false, logIdx = 0;
const ease = k => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
const clamp01 = k => Math.max(0, Math.min(1, k));
const termEl = document.querySelector('.term'), bigEl = hud.querySelector('.big'), dockEl = document.querySelector('.dock');
const bframe = document.createElement('div'); bframe.className = 'bframe'; bframe.setAttribute('aria-hidden', 'true');
bframe.innerHTML = `<div class="bf-bar"><i></i><i></i><i></i><span>karam@m1 — /vault — second brain</span></div>
  <div class="bf-line"><span class="pr">visitor@kb ~ %</span> mount /vault --estate<br><span class="ok">→ handing over to the estate…</span><b>_</b></div>
  <div class="blog"></div>`;
document.body.appendChild(bframe);
const blog = bframe.querySelector('.blog'), bfLine = bframe.querySelector('.bf-line'), bfBar = bframe.querySelector('.bf-bar');
const BLOG = () => [[.1, 'compiling shell…'], [.5, `placing ${graph.nodes.length} nodes…`], [.95, `linking ${nLinks} synapses…`],
  [1.35, 'spawning hubs…'], [1.6, 'mounting tiers…'], [1.8, 'ready · vault mounted']];
/* construction grid and axes, drawn in and out during the build */
const CONSTRUCT = new THREE.Group(); scene.add(CONSTRUCT); CONSTRUCT.visible = false;
const cMats = [];
{
  const grid = new THREE.GridHelper(9, 18, 0x00d4ff, 0x0b5d70); grid.position.y = -1.95;
  const gm = Array.isArray(grid.material) ? grid.material : [grid.material];
  gm.forEach(m => { m.transparent = true; m.depthWrite = false; m.blending = THREE.AdditiveBlending; m.userData.base = .55; cMats.push(m); });
  CONSTRUCT.add(grid);
  const ax = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3.2, 0, 0), new THREE.Vector3(3.2, 0, 0), new THREE.Vector3(0, -2.4, 0), new THREE.Vector3(0, 2.6, 0), new THREE.Vector3(0, 0, -3), new THREE.Vector3(0, 0, 3)]);
  ax.setAttribute('color', new THREE.Float32BufferAttribute([1, .4, .8, 1, .4, .8, 0, 1, .53, 0, 1, .53, 1, .8, 0, 1, .8, 0], 3));
  const am = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); am.userData.base = .7; cMats.push(am);
  CONSTRUCT.add(new THREE.LineSegments(ax, am));
}
function termRect(){
  const vw = innerWidth, vh = innerHeight, w = Math.min(620, vw - 24), h = Math.min(220, vh - 24);
  return [(vw - w) / 2, (vh - h) / 2, w, h];
}
function buildS(now){
  if (reduce || !gl) return BUILD_END;
  if (buildT0 === null) return waiting ? 0 : BUILD_END;
  return (now - buildT0) / 1000;
}
function applyBuild(s){
  if (s >= BUILD_END){ if (!finalDone) finalize(); return; }
  finalDone = false;
  // 1 · the window expands to the full screen; the scene is clipped to it
  // it settles as the estate's permanent window frame, FR px in from the edges
  const f = ease(s / .6), [x0, y0, w0, h0] = termRect(), vw = innerWidth, vh = innerHeight;
  const L = x0 + (FR - x0) * f, T0 = y0 + (FR - y0) * f, Wd = w0 + (vw - 2 * FR - w0) * f, Hd = h0 + (vh - 2 * FR - h0) * f;
  bframe.classList.remove('settled');
  Object.assign(bframe.style, { display: 'block', left: L + 'px', top: T0 + 'px', width: Wd + 'px', height: Hd + 'px', right: 'auto', bottom: 'auto' });
  // the page itself is clipped to the inside of the window (below its title bar)
  const tr = termEl.getBoundingClientRect(), cl = Math.max(0, L + 1 - tr.left), ct = Math.max(0, T0 + BAR - tr.top),
        cr = Math.max(0, tr.right - (L + Wd - 1)), cb = Math.max(0, tr.bottom - (T0 + Hd - 1));
  termEl.style.clipPath = f < 1 ? `inset(${ct}px ${cr}px ${cb}px ${cl}px)` : 'none';
  bfLine.style.opacity = 1 - clamp01(s / .45);
  blog.style.opacity = 1 - clamp01((s - 1.9) / .3);
  const lines = BLOG();
  while (logIdx < lines.length && s >= lines[logIdx][0]){ const d = document.createElement('div'); d.textContent = '› ' + lines[logIdx][1]; blog.appendChild(d); logIdx++; }
  // construction grid and axes
  const go = clamp01((s - .15) / .4) * (1 - clamp01((s - 1.7) / .6));
  CONSTRUCT.visible = go > .01; cMats.forEach(m => { m.opacity = m.userData.base * go; });
  CONSTRUCT.scale.setScalar(.6 + .4 * ease((s - .15) / .5));
  // 2 · the shell is traced in by a scan plane rising through it
  const ks = clamp01((s - .35) / 1.0), kio = ks * ks * (3 - 2 * ks);            // ease in and out, so the plane is seen to travel
  buildY = s < .35 ? -2.3 : -2.1 + 4.5 * kio;
  SHELL.uniforms.uBuild.value = buildY; BUILD_PLANE.constant = buildY;
  const kc = ease((s - .55) / .3); core.scale.setScalar(Math.max(.001, kc)); coreHalo.visible = kc > .5;
  //    nodes pop in domain by domain, links draw themselves
  const kn = clamp01((s - .75) / .75);
  for (const Lr of [notesL, agentL, lakeL]){ Lr.geo.setDrawRange(0, Math.floor(Lr.n * kn)); Lr.mat.size = Lr.base * (1 + .6 * (1 - kn)); }
  linkGeo.setDrawRange(0, Math.floor(nLinks * clamp01((s - 1) / .7)) * 2);
  HOLO.visible = s > 1.15; HOLO.scale.setScalar(.75 + .25 * ease((s - 1.15) / .5));
  if (orbitLine) orbitLine.visible = s > 1.35;
  floatsEl.style.opacity = clamp01((s - 1.3) / .4);
  live = s > 1.7; filings = s > 2.0;
  if (live && !firstFire){ firstFire = true; for (let i = 0; i < 5; i++) fireRandom(); nextFire = T + .3; nextLint = T + 3; nextEvent = T + 99; }
  if (filings && nextEvent > T + 50) nextEvent = T + .6;
  // 3 · the hubs spawn from a point with a ring, then start to orbit
  IDS.forEach((id, i) => { MX[id].spawn = ease((s - 1.4 - i * .08) / .35); nodeBtns[id].classList.toggle('pre', s < 1.75 + i * .07); });
  hubsLive = s > 1.85;
  // 4 · title types, HUD counts up, callouts and leader lines draw in last
  const kh = clamp01((s - 1.6) / .3); hud.style.opacity = kh; dockEl.style.opacity = kh;
  countK = clamp01((s - 1.7) / .5); counts();
  if (s >= 1.75 && !titleTyped){ titleTyped = true; KB.type(bigEl, 'THE ESTATE', 18); }
  if (s >= 1.9 && !revealed){ revealed = true; reveal(); }
}
function finalize(){
  finalDone = true; buildT0 = null; waiting = false;
  Object.assign(bframe.style, { display: 'block', left: '', top: '', width: '', height: '', right: '', bottom: '' });
  bframe.classList.add('settled'); termEl.style.clipPath = 'none';
  BUILD_PLANE.constant = 99; SHELL.uniforms.uBuild.value = 99; buildY = 99;
  core.scale.setScalar(1); coreHalo.visible = true;
  for (const Lr of [notesL, agentL, lakeL]){ Lr.geo.setDrawRange(0, Lr.n); Lr.mat.size = Lr.base; }
  linkGeo.setDrawRange(0, nLinks * 2);
  CONSTRUCT.visible = false; HOLO.visible = true; HOLO.scale.setScalar(1); if (orbitLine) orbitLine.visible = true;
  floatsEl.style.opacity = ''; hud.style.opacity = ''; dockEl.style.opacity = '';
  live = true; filings = true; hubsLive = true; IDS.forEach(id => { MX[id].spawn = 1; nodeBtns[id].classList.remove('pre'); });
  countK = 1; counts();
  if (!titleTyped){ titleTyped = true; bigEl.textContent = 'THE ESTATE'; }
  if (!revealed){ revealed = true; reveal(); }
  dirty = true;
}
function startBuild(){
  if (reduce || !gl){ finalize(); return; }
  if (sel) home(); closeReadout();
  buildT0 = performance.now(); waiting = false; finalDone = false;
  revealed = titleTyped = firstFire = false; logIdx = 0; blog.innerHTML = '';
  // a replay starts clean: nothing left in flight from before
  live = filings = false;
  while (firings.length) kill(firings.pop());
  PENDING.length = 0; FL.forEach(f => f.el.remove()); FL.length = 0;
  nextFire = T + 99; nextEvent = T + 99; nextLint = T + 99; lintT = -99; lintRing.material.opacity = 0;
  calloutsEl.style.visibility = 'hidden'; leaders.innerHTML = '';
  bigEl.textContent = ''; cos.forEach(c => c.classList.add('hide'));
  IDS.forEach(id => nodeBtns[id].classList.add('pre'));
  for (const id of IDS) MX[id].spawn = 0;
}
function BOOT_BUILD(){
  [notesL, agentL, lakeL].forEach(Lr => { Lr.base = Lr.mat.size; });
  if (reduce || !gl){ finalize(); return; }
  waiting = true; bigEl.textContent = ''; for (const id of IDS) MX[id].spawn = 0;
  IDS.forEach(id => nodeBtns[id].classList.add('pre'));
  addEventListener('message', e => { if (e.data && e.data.kbArrive) startBuild(); });
  if (window.__kbArrive) startBuild();                                 // the hand-over arrived before this module loaded
  else if (parent === window) setTimeout(startBuild, 350);            // standalone: build straight away
  else setTimeout(() => { if (waiting) startBuild(); }, 6000);         // embedded but never told: don't stay a window forever
}

/* ---------- boot ---------- */
if (gl){
  host.appendChild(renderer.domElement); renderer.localClippingEnabled = true;
  if (innerWidth >= 600){
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .42, .3, .62);
    composer.addPass(bloom);
  }
} else {
  $('#nogl').hidden = false;
}
if (!reduce) cos.forEach(c => c.classList.add('hide'));
new ResizeObserver(layout).observe(host);
layout();
BOOT_BUILD();
log('SYSTEM', ' vault mounted · 4 machines · lint clean', '#ff2e88');
if (TOUCH()){ const zs = document.querySelector('.zoom span'); if (zs) zs.textContent = 'drag to turn · tap a node'; }
if (reduce){
  floatAt('10-kam/notes/2026-10-09--globe-layer-ideas.md', byGroup['10-kam'][0].pos, DOM['10-kam'].col, 1e9);
  floatAt('intel → lake/reports/intel/markets/', LAKE, '#8b7bff', 1e9);
  for (let i = 0; i < 6; i++) fireRandom();     // a still frame with a few synapses lit
  firings.forEach(f => { f.life = f.max * .55; });
}
requestAnimationFrame(t => { last = t; frame(t); });
