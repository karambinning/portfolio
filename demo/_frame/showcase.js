/* Showcases of the three apps: Command (M1), the Work app (M3) and the intel engine (YerSon).
   These are not the apps. Each is a look-only screen, drawn at 1280×800 in the app's own style and played on a
   loop, with invented demo content and nothing to click. Mount with KBShow.mount(el, 'command'|'work'|'intel');
   it returns a stop function. */
(function(){
  if (window.KBShow) return;
  const css = `
.kbs{position:absolute;left:0;top:0;width:1280px;height:800px;transform-origin:0 0;transform:scale(var(--s,.3));overflow:hidden;
  font:500 13px/1.5 'IBM Plex Mono',ui-monospace,Menlo,monospace;color:#cfe3ef;background:#050a12;pointer-events:none;user-select:none}
.kbs *{box-sizing:border-box}
.kbs .bar{height:46px;display:flex;align-items:center;gap:22px;padding:0 18px;border-bottom:1px solid var(--a);letter-spacing:.22em;font-size:11px;color:#6f8798}
.kbs .bar b{color:var(--a);font-size:13px;letter-spacing:.3em}
.kbs .bar .r{margin-left:auto;color:#cfe3ef;letter-spacing:.1em;font-size:14px}
.kbs .live{display:inline-block;width:8px;height:8px;border-radius:50%;background:#00ff88;box-shadow:0 0 8px #00ff88;margin-right:8px;animation:kbsP 1.2s steps(2) infinite}
@keyframes kbsP{50%{opacity:.25}}
.kbs .side{position:absolute;left:0;top:46px;bottom:0;width:250px;border-right:1px solid rgba(255,255,255,.08);padding:16px 14px}
.kbs .main{position:absolute;left:250px;right:0;top:46px;bottom:0;padding:18px 20px}
.kbs .lbl{font-size:10px;letter-spacing:.28em;color:#58708a;margin:0 0 8px}
.kbs .card{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.02);padding:12px 14px}
.kbs .row{display:flex;gap:12px}
.kbs .num{font:700 30px/1 'IBM Plex Mono',monospace}
.kbs .chip{display:inline-block;border:1px solid currentColor;padding:1px 7px;font-size:10px;letter-spacing:.14em}
.kbs .new{animation:kbsIn .35s steps(4) both}
@keyframes kbsIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
.kbs .stamp{font:700 11px/1 'IBM Plex Mono',monospace;letter-spacing:.2em;padding:4px 8px;border:1px solid currentColor;animation:kbsStamp .25s steps(3) both}
@keyframes kbsStamp{from{transform:scale(1.8);opacity:0}to{transform:none;opacity:1}}
.kbs .tag{position:absolute;right:12px;bottom:10px;border:1px solid var(--a);color:var(--a);font-size:11px;letter-spacing:.18em;padding:3px 10px;background:#050a12}
.kbs .meter{height:6px;background:rgba(255,255,255,.08);margin-top:8px}.kbs .meter i{display:block;height:100%;background:var(--a);transition:width .6s}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const rnd = a => a[(Math.random() * a.length) | 0];
  const clock = () => new Date().toTimeString().slice(0, 8);

  /* ---------- Command: the estate on one screen ---------- */
  function command(el, tick){
    el.style.setProperty('--a', '#00d4ff');
    const M = [['M1', '#3d8bff', 'the hub'], ['M3', '#ff7a00', 'career node'], ['iMac', '#ff3355', 'the lab'], ['YerSon', '#00ff88', 'intel engine']];
    const AG = [['YerDad', '#ffcc00'], ['Builder', '#ff3355'], ['YerSon', '#00ff88'], ['Sentinel', '#c41e3a'], ['Moltimus', '#aa66ff'], ['Scout', '#00d4ff'], ['Warden', '#8fa3b5']];
    const EV = ['sentinel · baseline holding on all four machines', 'yerson · geopolitics cycle filed · 12 items', 'builder · night branch tests passing', 'warden · nightly checks clean',
      'yerdad · two decisions waiting for review', 'moltimus · digest drafted', 'verifier · checked before done', 'scout · search finished · 6 sources'];
    el.innerHTML = `<div class="bar"><b>● BINNING.AI · HQ</b><span>COMMAND</span><span>ROUTINE</span><span>MISSIONS</span><span>INTEL</span><span class="r"><span class="live"></span><span data-k="clk"></span></span></div>
      <div class="side"><div class="lbl">AGENTS</div>${AG.map(([n, c], i) => `<div style="display:flex;align-items:center;gap:10px;padding:7px 8px;border-left:2px solid ${c};margin-bottom:6px;background:rgba(255,255,255,.02)">
        <span style="width:7px;height:7px;border-radius:50%;background:${c}"></span><span style="flex:1">${n}</span><span data-ag="${i}" style="font-size:10px;letter-spacing:.16em;color:#58708a">IDLE</span></div>`).join('')}</div>
      <div class="main"><div class="row" style="margin-bottom:16px">${M.map(([n, c, k], i) => `<div class="card" style="flex:1;border-top:2px solid ${c}">
          <div style="display:flex;justify-content:space-between"><b style="color:${c};letter-spacing:.2em">${n}</b><span style="color:#00ff88;font-size:11px">● ONLINE</span></div>
          <div style="font-size:11px;color:#6f8798">${k}</div><div class="meter" style="--a:${c}"><i data-m="${i}" style="width:30%"></i></div></div>`).join('')}</div>
        <div class="row" style="margin-bottom:16px"><div class="card" style="flex:1"><div class="lbl">SENTINEL</div><div style="color:#00ff88;font-size:20px;letter-spacing:.2em">SECURE</div></div>
          <div class="card" style="flex:1"><div class="lbl">TASKS TODAY</div><div class="num" style="color:#00d4ff" data-k="tasks">14</div></div>
          <div class="card" style="flex:1"><div class="lbl">PASSED REVIEW</div><div class="num" style="color:#00ff88" data-k="ok">13</div></div>
          <div class="card" style="flex:1"><div class="lbl">WAITING FOR ME</div><div class="num" style="color:#ffcc00">2</div></div></div>
        <div class="card" style="height:360px;overflow:hidden"><div class="lbl">LIVE OPERATIONS</div><div data-k="feed"></div></div></div>
      <div class="tag">SHOWCASE · DEMO DATA</div>`;
    const q = s => el.querySelector(s), feed = q('[data-k=feed]');
    let t = 0;
    tick(() => {
      t++; q('[data-k=clk]').textContent = clock();
      el.querySelectorAll('[data-m]').forEach(m => m.style.width = (15 + Math.random() * 55).toFixed(0) + '%');
      el.querySelectorAll('[data-ag]').forEach(a => { const on = Math.random() < .35; a.textContent = on ? 'ACTIVE' : 'IDLE'; a.style.color = on ? '#00ff88' : '#58708a'; });
      if (t % 2 === 0){ q('[data-k=tasks]').textContent = 14 + (t >> 2); q('[data-k=ok]').textContent = 13 + (t >> 2); }
      feed.insertAdjacentHTML('afterbegin', `<div class="new" style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span style="color:#58708a">${clock()}</span>  ${EV[t % EV.length]}</div>`);
      while (feed.children.length > 12) feed.lastChild.remove();
    }, 1100);
  }

  /* ---------- the Work app: jobs triage, pipeline and missions ---------- */
  function work(el, tick){
    el.style.setProperty('--a', '#ff7a00');
    const NAV = ['OVERVIEW', 'JOBS', 'PIPELINE', 'OUTREACH', 'MISSIONS', 'CVS', 'SKILLS', 'LANGUAGE'];
    const JOBS = [['Policy research intern', 'think tank · London', 'summer'], ['Geopolitical risk analyst intern', 'consultancy · London', 'winter'],
      ['Open-source intelligence intern', 'research institute · UK', 'summer'], ['Security studies research assistant', 'university centre · UK', 'winter'],
      ['Political risk intern', 'advisory firm · Paris', 'summer'], ['Defence analysis intern', 'research group · Brussels', 'winter'],
      ['Data and policy intern', 'public body · London', 'summer'], ['Conflict data intern', 'NGO · Geneva', 'summer']];
    el.innerHTML = `<div class="bar" style="border-color:#ff7a00"><b style="font-size:20px;letter-spacing:.35em">W·O·R·K</b><span><span class="live"></span>FLEET LINK</span><span class="r" data-k="clk"></span></div>
      <div class="side">${NAV.map((n, i) => `<div style="padding:9px 12px;margin-bottom:4px;letter-spacing:.24em;font-size:11px;${i === 1 ? 'color:#ff7a00;border-left:2px solid #ff7a00;background:rgba(255,122,0,.08)' : 'color:#6f8798'}">◆ ${n}</div>`).join('')}</div>
      <div class="main"><div style="font:700 34px/1 'IBM Plex Mono',monospace;color:#ff7a00;letter-spacing:.12em;margin-bottom:6px">JOBS</div>
        <div style="color:#6f8798;font-size:12px;letter-spacing:.14em;margin-bottom:16px">every new listing, one yes or no at a time</div>
        <div class="row" style="margin-bottom:16px">${[['NEW TODAY', '#ff7a00', 'new'], ['SAID YES', '#00ff88', 'yes'], ['SAID NO', '#ff3355', 'no'], ['APPLIED', '#00d4ff', 'app'], ['DEADLINES SOON', '#ffcc00', 'dl']].map(([l, c, k]) =>
          `<div class="card" style="flex:1"><div class="lbl">${l}</div><div class="num" style="color:${c}" data-k="${k}">0</div></div>`).join('')}</div>
        <div class="card" style="height:470px;overflow:hidden"><div class="lbl">TRIAGE</div><div data-k="list"></div></div></div>
      <div class="tag">SHOWCASE · DEMO DATA</div>`;
    const q = s => el.querySelector(s), list = q('[data-k=list]'), n = { new: 0, yes: 0, no: 0, app: 0, dl: 2 };
    let t = 0, pending = null;
    const put = () => Object.keys(n).forEach(k => q(`[data-k=${k}]`).textContent = n[k]);
    tick(() => {
      t++; q('[data-k=clk]').textContent = clock();
      if (pending){   // decide the last listing
        const yes = Math.random() < .6; n[yes ? 'yes' : 'no']++; if (yes && Math.random() < .4) n.app++;
        pending.querySelector('.d').innerHTML = `<span class="stamp" style="color:${yes ? '#00ff88' : '#ff3355'}">${yes ? '✓ YES' : '✕ NO'}</span>`;
        pending = null;
      } else {
        const [ti, wh, tr] = JOBS[t % JOBS.length]; n.new++;
        list.insertAdjacentHTML('afterbegin', `<div class="new" style="display:flex;align-items:center;gap:14px;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,.06)">
          <span class="chip" style="color:${tr === 'summer' ? '#00ff88' : '#00d4ff'}">${tr.toUpperCase()}</span><span style="flex:1"><b style="color:#fff;font-weight:600">${ti}</b><br><span style="color:#6f8798;font-size:12px">${wh}</span></span>
          <span class="d" style="color:#6f8798;font-size:11px;letter-spacing:.18em">YES / NO ?</span></div>`);
        pending = list.firstElementChild; while (list.children.length > 8) list.lastChild.remove();
      }
      put();
    }, 1000);
  }

  /* ---------- the intel engine: collect, classify, file ---------- */
  function intel(el, tick){
    el.style.setProperty('--a', '#00ff88'); el.style.color = '#a8f5c8'; el.style.background = '#020803';
    const D = [['GEO', '#ffcc00'], ['NEWS', '#00ff88'], ['MARKETS', '#00d4ff'], ['LAW', '#c08bff'], ['JOBS', '#ff7a00'], ['RESEARCH', '#7fe0ff']];
    const H = ['Ceasefire talks resume as mediators propose new terms', 'Sanctions package targets shipping intermediaries', 'Chip stocks rally on stronger-than-expected demand',
      'Election commission postpones vote citing security concerns', 'New guidance published on data protection for researchers', 'Coastal state extends naval patrol zone',
      'Think tank opens applications for summer research interns', 'Study links supply shocks to regional instability', 'Grain transit agreement extended for six months',
      'Alliance ministers agree to pool air-defence procurement'];
    const LV = [['low', '#58a070'], ['med', '#ffcc00'], ['high', '#ff3355']];
    el.innerHTML = `<div class="bar" style="border-color:#0c3a1a;color:#3f8a5a"><b style="color:#00ff88;font-size:20px;letter-spacing:.12em">YERSON_</b><span>INTELLIGENCE ENGINE</span><span class="r" style="color:#00ff88"><span class="live"></span>LIVE · <span data-k="clk"></span></span></div>
      <div style="position:absolute;left:0;top:46px;width:600px;bottom:0;border-right:1px solid #0c3a1a;padding:14px 16px"><div class="lbl" style="color:#3f8a5a">LIVE FEED</div><div data-k="feed"></div></div>
      <div style="position:absolute;left:600px;right:0;top:46px;bottom:0;padding:14px 18px">
        <div class="lbl" style="color:#3f8a5a">DOMAINS</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px">${D.map(([d, c], i) =>
          `<div style="border:1px solid #0c3a1a;padding:10px 12px" data-d="${i}"><b style="color:${c};letter-spacing:.14em">${d}</b><div style="font-size:11px;color:#3f8a5a" data-ds="${i}">● next cycle soon</div><div class="meter" style="--a:${c}"><i data-dm="${i}" style="width:20%"></i></div></div>`).join('')}</div>
        <div class="row" style="margin-bottom:22px">${[['COLLECTED TODAY', 'col'], ['CLASSIFIED', 'cls'], ['FILED', 'fil']].map(([l, k]) => `<div style="flex:1;border:1px solid #0c3a1a;padding:10px 12px"><div class="lbl" style="color:#3f8a5a">${l}</div><div class="num" style="color:#00ff88" data-k="${k}">0</div></div>`).join('')}</div>
        <div class="lbl" style="color:#3f8a5a">THE PIPELINE</div>
        <div style="border:1px solid #0c3a1a;padding:14px 16px;font-size:14px;line-height:2.1" data-k="pipe"></div></div>
      <div class="tag" style="color:#ffcc00;border-color:#ffcc00;background:#020803">SHOWCASE · DEMO DATA</div>`;
    const q = s => el.querySelector(s), feed = q('[data-k=feed]'), c = { col: 120, cls: 118, fil: 115 };
    let t = 0;
    tick(() => {
      t++; q('[data-k=clk]').textContent = clock();
      const [d, dc] = rnd(D), [lv, lc] = rnd(LV), h = H[t % H.length], di = D.findIndex(x => x[0] === d);
      feed.insertAdjacentHTML('afterbegin', `<div class="new" style="display:flex;gap:10px;align-items:center;padding:5px 0;white-space:nowrap;overflow:hidden">
        <span style="color:#3f8a5a">[${clock()}]</span><span class="chip" style="color:${dc}">${d}</span><span class="chip" style="color:${lc}">${lv}</span><span style="overflow:hidden;text-overflow:ellipsis">${h}</span></div>`);
      while (feed.children.length > 26) feed.lastChild.remove();
      c.col++; if (t % 2) c.cls++; if (t % 3 === 0) c.fil += 2; Object.keys(c).forEach(k => q(`[data-k=${k}]`).textContent = c[k]);
      el.querySelectorAll('[data-ds]').forEach((s, i) => { const on = i === di; s.textContent = on ? '● SCANNING' : '● next cycle soon'; s.style.color = on ? '#ffcc00' : '#3f8a5a'; });
      el.querySelectorAll('[data-dm]').forEach((m, i) => { if (i === di) m.style.width = Math.min(100, parseFloat(m.style.width) + 12) % 100 + '%'; });
      q('[data-k=pipe]').innerHTML = [['collect', h.slice(0, 38) + '…'], ['classify', `local model → ${d.toLowerCase()} · ${lv}`], ['file', 'into the lake, apart from my notes']]
        .map(([k, v], i) => `<div><span style="color:${i <= t % 3 ? '#00ff88' : '#2c5a3a'}">${i <= t % 3 ? '■' : '□'} ${k.padEnd(9, ' ')}</span> <span style="color:${i <= t % 3 ? '#a8f5c8' : '#2c5a3a'}">${v}</span></div>`).join('');
    }, 900);
  }

  const KINDS = { command, work, intel };
  function mount(host, kind){
    const el = document.createElement('div'); el.className = 'kbs'; el.setAttribute('aria-hidden', 'true'); host.appendChild(el);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let iv = null; const tick = (f, ms) => { f(); f(); if (!reduce) iv = setInterval(f, ms); };
    KINDS[kind](el, tick);
    return () => { clearInterval(iv); el.remove(); };
  }
  window.KBShow = { mount };
})();
