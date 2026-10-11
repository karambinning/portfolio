/* Showcases of three apps: Command (M1), the Work app (M3) and the intel engine (YerSon).
   They are not the apps and give no access to them. Each one is a small terminal in the portfolio's own style,
   coloured in the app's theme, playing on a loop with invented demo content and nothing to click.
   KBShow.mount(host, 'command' | 'work' | 'intel') returns a stop function. */
(function(){
  if (window.KBShow) return;
  const css = `
.kbs{position:absolute;inset:0;container-type:inline-size;overflow:hidden;background:#03070d;color:#b9cad6;pointer-events:none;user-select:none;
  font:600 clamp(9px,2.5cqw,13px)/1.6 var(--mono,'IBM Plex Mono',ui-monospace,Menlo,monospace);padding:.9em 1.1em;display:flex;flex-direction:column;gap:.7em}
.kbs::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 1px,transparent 1px 3px);pointer-events:none}
.kbs .h{display:flex;justify-content:space-between;align-items:baseline;gap:1em;color:var(--k);letter-spacing:.16em;border-bottom:1px solid color-mix(in srgb,var(--k) 45%,transparent);padding-bottom:.4em;white-space:nowrap}
.kbs .h b{font-weight:700;text-shadow:0 0 10px color-mix(in srgb,var(--k) 60%,transparent)}
.kbs .h span{color:#5d7486;font-size:.85em}
.kbs .h i{display:inline-block;width:.55em;height:.55em;border-radius:50%;background:var(--k);box-shadow:0 0 8px var(--k);margin-right:.5em;animation:kbsB 1.1s steps(1) infinite}
@keyframes kbsB{50%{opacity:.2}}
.kbs .g{display:grid;grid-template-columns:repeat(var(--n,4),1fr);gap:.6em}
.kbs .c{border:1px solid color-mix(in srgb,var(--k) 30%,transparent);padding:.35em .55em;white-space:nowrap;overflow:hidden}
.kbs .c small{display:block;color:#5d7486;font-size:.78em;letter-spacing:.16em}
.kbs .c b{color:var(--k);font-size:1.25em}
.kbs .m{height:.35em;background:rgba(255,255,255,.07);margin-top:.3em}.kbs .m i{display:block;height:100%;background:var(--k);transition:width .5s steps(5)}
.kbs .log{flex:1;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end}
.kbs .log div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kbs .log time{color:var(--k);margin-right:.6em}
.kbs .k{color:var(--k)} .kbs .ok{color:#00ff88} .kbs .no{color:#ff3355} .kbs .y{color:#ffcc00} .kbs .d{color:#5d7486}
.kbs .cur{color:var(--k);animation:kbsB 1s steps(1) infinite}
.kbs .stamp{display:inline-block;animation:kbsS .22s steps(3) both}
@keyframes kbsS{from{transform:scale(1.9);opacity:0}to{transform:none;opacity:1}}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const now = () => new Date().toTimeString().slice(0, 5);
  // type a line into the log, character by character, in the portfolio's terminal manner
  function typeLine(log, html, text, keep){
    const d = document.createElement('div'); d.innerHTML = html; const t = document.createElement('span'); d.appendChild(t); log.insertBefore(d, log.querySelector('.cur'));
    let k = 0; const iv = setInterval(() => { k += 2; t.textContent = text.slice(0, k); if (k >= text.length) clearInterval(iv); }, 18);
    while (log.children.length > keep + 1) log.firstChild.remove();
    return d;
  }

  const KINDS = {
    /* Command: the estate on one screen, blue */
    command(el, every){
      el.style.setProperty('--k', '#3d8bff');
      const M = [['M1', '#3d8bff'], ['M3', '#ff7a00'], ['iMac', '#ff3355'], ['YerSon', '#00ff88']];
      const EV = [['sentinel', 'baseline holding on all four machines', 'ok'], ['yerson', 'geopolitics cycle filed · 12 items', ''], ['builder', 'night branch · tests passing', 'ok'],
        ['warden', 'nightly checks clean', 'ok'], ['yerdad', 'two decisions waiting for me', 'y'], ['moltimus', 'digest drafted', ''], ['verifier', 'pass before done', 'ok'], ['scout', 'search finished · 6 sources', '']];
      el.innerHTML = `<div class="h"><b><i></i>COMMAND</b><span>the estate on one screen</span></div>
        <div class="g">${M.map(([n, c], i) => `<div class="c" style="--k:${c}"><small>${n}</small><b>● ON</b><div class="m"><i data-m="${i}" style="width:30%"></i></div></div>`).join('')}</div>
        <div class="g" style="--n:3"><div class="c"><small>SENTINEL</small><b class="ok">SECURE</b></div><div class="c"><small>TASKS TODAY</small><b data-k="t">14</b></div><div class="c"><small>WAITING</small><b class="y">2</b></div></div>
        <div class="log"><div class="cur">_</div></div>`;
      const log = el.querySelector('.log'); let i = 0, n = 14;
      every(() => {
        el.querySelectorAll('[data-m]').forEach(m => m.style.width = (15 + Math.random() * 60).toFixed(0) + '%');
        const [who, what, cl] = EV[i++ % EV.length];
        typeLine(log, `<time>${now()}</time><span class="${cl || 'k'}">${who}</span> · `, what, 6);
        if (i % 3 === 0) el.querySelector('[data-k=t]').textContent = ++n;
      }, 1300);
    },

    /* the Work app: every new listing gets a yes or a no, orange */
    work(el, every){
      el.style.setProperty('--k', '#ff7a00');
      const J = [['Policy research intern', 'London', 'summer'], ['Geopolitical risk intern', 'London', 'winter'], ['OSINT research intern', 'UK', 'summer'],
        ['Security studies research assistant', 'UK', 'winter'], ['Political risk intern', 'Paris', 'summer'], ['Defence analysis intern', 'Brussels', 'winter'],
        ['Data and policy intern', 'London', 'summer'], ['Conflict data intern', 'Geneva', 'summer']];
      el.innerHTML = `<div class="h"><b><i></i>W·O·R·K · JOBS</b><span>one yes or no at a time</span></div>
        <div class="g" style="--n:4">${[['NEW', 'n', 'k'], ['YES', 'y', 'ok'], ['NO', 'x', 'no'], ['APPLIED', 'a', 'y']].map(([l, k, c]) => `<div class="c"><small>${l}</small><b class="${c}" data-k="${k}">0</b></div>`).join('')}</div>
        <div class="log"><div class="cur">_</div></div>`;
      const log = el.querySelector('.log'), c = { n: 0, y: 0, x: 0, a: 0 }; let i = 0, last = null;
      const put = () => Object.keys(c).forEach(k => el.querySelector(`[data-k=${k}]`).textContent = c[k]);
      every(() => {
        if (last){
          const yes = Math.random() < .6; c[yes ? 'y' : 'x']++; if (yes && Math.random() < .45) c.a++;
          last.insertAdjacentHTML('beforeend', ` <span class="stamp ${yes ? 'ok' : 'no'}">[ ${yes ? '✓ YES' : '✕ NO'} ]</span>`); last = null;
        } else {
          const [t, w, s] = J[i++ % J.length]; c.n++;
          last = typeLine(log, `<span class="${s === 'summer' ? 'ok' : 'k'}">[${s.toUpperCase()}]</span> `, `${t} · ${w}`, 7);
        }
        put();
      }, 1000);
    },

    /* the intel engine: collect, classify, file, green */
    intel(el, every){
      el.style.setProperty('--k', '#00ff88');
      const D = [['GEO', '#ffcc00'], ['NEWS', '#00ff88'], ['MARKETS', '#00d4ff'], ['LAW', '#c08bff'], ['JOBS', '#ff7a00'], ['RESEARCH', '#7fe0ff']];
      const H = ['Ceasefire talks resume as mediators propose new terms', 'Sanctions package targets shipping intermediaries', 'Chip stocks rally on strong demand',
        'Election commission postpones vote', 'New guidance on data protection for researchers', 'Coastal state extends naval patrol zone',
        'Think tank opens summer research internships', 'Study links supply shocks to regional instability', 'Alliance agrees to pool air-defence procurement'];
      el.innerHTML = `<div class="h"><b><i></i>YERSON_ · INTEL ENGINE</b><span>collect · classify · file</span></div>
        <div class="g" style="--n:6">${D.map(([d, c], i) => `<div class="c" style="--k:${c}"><small>${d}</small><div class="m"><i data-d="${i}" style="width:20%"></i></div></div>`).join('')}</div>
        <div class="g" style="--n:3">${[['COLLECTED', 'c'], ['CLASSIFIED', 'l'], ['FILED', 'f']].map(([l, k]) => `<div class="c"><small>${l}</small><b data-k="${k}">0</b></div>`).join('')}</div>
        <div class="log"><div class="cur">_</div></div>`;
      const log = el.querySelector('.log'), c = { c: 120, l: 118, f: 115 }; let i = 0;
      every(() => {
        const di = (Math.random() * D.length) | 0, [d, dc] = D[di], lv = ['low', 'med', 'high'][(Math.random() * 2.4) | 0];
        typeLine(log, `<time>${now()}</time><span style="color:${dc}">[${d}·${lv}]</span> `, H[i++ % H.length], 7);
        const m = el.querySelector(`[data-d="${di}"]`); m.style.width = (parseFloat(m.style.width) + 15) % 100 + '%';
        c.c++; if (i % 2) c.l++; if (i % 3 === 0) c.f += 2; Object.keys(c).forEach(k => el.querySelector(`[data-k=${k}]`).textContent = c[k]);
      }, 1100);
    },
  };

  function mount(host, kind){
    const el = document.createElement('div'); el.className = 'kbs'; el.setAttribute('aria-hidden', 'true'); host.appendChild(el);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let iv = null; const every = (f, ms) => { f(); f(); f(); if (!reduce) iv = setInterval(() => el.isConnected ? f() : clearInterval(iv), ms); };
    KINDS[kind](el, every);
    return () => { clearInterval(iv); el.remove(); };
  }
  window.KBShow = { mount };
})();
