/* K·B terminal frame. Usage in a window page:
   <body data-self="kam" data-brand="[K·A·M]" data-unit="K·A·M INTELLIGENCE TERMINAL · UNIT 02" data-status="PRIVATE BETA" style="--a:#00d4ff;--b:#ff66cc">
     <div class="term on"> <header data-frame></header> <main class="t-body">…</main> <nav data-hub></nav> </div>
   The header, unit line and hub bar are filled in from the body's data attributes. */
(() => {
  const B = document.body, d = B.dataset;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WINDOWS = [
    ['icarus','ICARUS','#ff8a3d'], ['kam','K·A·M','#00d4ff'], ['themis','THEMIS','#ffcc00'],
    ['quant','QUANT TRADING','#ff3355'], ['declaration','DECLARATION','#c084fc'], ['notch','NOTCH','#ff66cc'],
    ['ride','RIDE','#ffe400'], ['futurewarfare','FUTURE WARFARE','#ff4444'],
  ];

  const head = document.querySelector('header[data-frame]');
  if (head){
    head.innerHTML = `<div class="t-head"><span class="t-brand">${d.brand || '[K·B]'}</span>
        <span class="t-icons" aria-hidden="true">${d.icons || '♪ ◖) ◷'}</span><span class="sp"></span>
        ${d.link ? `<a class="t-link" href="${d.link}" target="_blank" rel="noopener">${d.linkLabel || 'OPEN'} ↗</a>` : ''}</div>
      <div class="t-unit"><span>${d.unit || 'K·B TERMINAL · UNIT 01'}</span><span class="live">${d.status || 'SIGNAL'} <i></i> ${d.statusTail || 'LIVE'}</span></div>`;
  }
  const hub = document.querySelector('nav[data-hub]');
  if (hub){
    hub.className = 't-hub'; hub.setAttribute('aria-label', 'Other windows');
    hub.innerHTML = `<button type="button" data-open="" style="--c:var(--hub-hub)">K·B HUB</button>` +
      WINDOWS.map(([id, label, c]) => `<button type="button" class="br" data-open="${id}" style="--c:${c}" ${id === d.self ? 'aria-current="true"' : ''}>${label}</button>`).join('');
    hub.addEventListener('click', e => {
      const b = e.target.closest('[data-open]'); if (!b) return;
      // the portfolio page listens for this and swaps windows; standalone, it does nothing
      parent !== window && parent.postMessage({ kbOpen: b.dataset.open }, '*');
    });
  }
  const roll = document.createElement('div'); roll.className = 'roll'; document.querySelector('.term')?.appendChild(roll);
  if (d.mock !== 'none'){ const m = document.createElement('span'); m.className = 't-mock'; m.textContent = d.mock || 'mock data · illustration'; (hub || document.body).appendChild(m); }

  /* a channel page embedded in the portfolio hands scrolling back to it, unless something inside can scroll */
  if (d.channel !== undefined && parent !== window){
    const canScroll = (el, dir) => { for (let n = el; n && n !== document.documentElement; n = n.parentElement){
      const cs = getComputedStyle(n); if (!/(auto|scroll)/.test(cs.overflowY)) continue;
      if (dir > 0 ? n.scrollTop + n.clientHeight < n.scrollHeight - 2 : n.scrollTop > 2) return true; } return false; };
    addEventListener('wheel', e => { if (!canScroll(e.target, Math.sign(e.deltaY))){ e.preventDefault(); parent.postMessage({ kbWheel: e.deltaY }, '*'); } }, { passive:false });
    addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      const f = ['ArrowDown','PageDown',' '].includes(e.key), b = ['ArrowUp','PageUp'].includes(e.key);
      if ((f || b) && !canScroll(e.target, f ? 1 : -1)){ e.preventDefault(); parent.postMessage({ kbStep: f ? 1 : -1 }, '*'); }
    });
    let ty = null; addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive:true });
    addEventListener('touchend', e => { if (ty === null) return; const dy = ty - e.changedTouches[0].clientY; ty = null;
      if (document.body.classList.contains('holding')) return; // a press-and-hold is not a swipe
      if (Math.abs(dy) > 60 && !canScroll(e.target, Math.sign(dy))) parent.postMessage({ kbStep: Math.sign(dy) }, '*'); }, { passive:true });
  }

  /* deconstruct / reconstruct on request from the portfolio (the dissertation transitions): every element, see dismantle.js */
  (function(){
    if (parent === window) return;
    const src = (document.currentScript && document.currentScript.src) || '';
    const sc = document.createElement('script'); sc.src = src.replace(/frame\.js(\?.*)?$/, 'dismantle.js$1'); document.head.appendChild(sc);
    addEventListener('message', e => { const m = e.data || {}, D = window.KBDismantle; if (!D) return;
      if (m.kbDecon) D.run(document.body, 'out', m.kbDecon, m.color);
      else if (m.kbRecon) D.run(document.body, 'in', m.kbRecon, m.color);
      else if (m.kbRestore) D.restore(document.body); });
  })();

  /* helpers each window can use */
  const KB = window.KB = {
    reduce,
    // type text into an element; resolves when done
    type(el, text, cps = 70){
      if (reduce){ el.textContent = text; return Promise.resolve(); }
      return new Promise(res => { let i = 0; const t = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length){ clearInterval(t); res(); } }, 1000 / cps); });
    },
    twitch(el){ if (reduce || !el) return; el.classList.remove('t-twitch'); void el.offsetWidth; el.classList.add('t-twitch'); },
    // a short square-wave blip; silent until the visitor has interacted (browser rule)
    // respects the portfolio's [ SOUND ] toggle (same origin, shared setting)
    soundOn(){ try { return localStorage.getItem('kb-sound') !== 'off'; } catch (e) { return true; } },
    beep(freq = 660, ms = 70, vol = .04){
      // minimal sound: window UI is silent unless a page opts in (body data-sfx), e.g. a game
      return; // no sound anywhere on the site (by choice)
      try {
        KB._ac = KB._ac || new (window.AudioContext || window.webkitAudioContext)();
        const ac = KB._ac, t = ac.currentTime;
        // a crushed square tone with a short noise transient: harsher and more digital than a plain beep
        if (!KB._crush){ const n = 1024, k = new Float32Array(n); for (let i = 0; i < n; i++){ const x = i / n * 2 - 1; k[i] = Math.round(x * 6) / 6; }
          KB._crush = ac.createWaveShaper(); KB._crush.curve = k; KB._crush.connect(ac.destination); }
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'square'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * .6), t + ms / 1000);
        g.gain.setValueAtTime(vol * .35, t); g.gain.exponentialRampToValueAtTime(.0001, t + ms / 1000);
        o.connect(g); g.connect(KB._crush); o.start(t); o.stop(t + ms / 1000 + .02);
        const len = Math.floor(ac.sampleRate * .012), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ac.createBufferSource(), f = ac.createBiquadFilter(), ng = ac.createGain();
        f.type = 'bandpass'; f.frequency.value = 3500 + Math.random() * 1500; f.Q.value = 5; ng.gain.value = vol * .45;
        src.buffer = buf; src.connect(f); f.connect(ng); ng.connect(ac.destination); src.start(t);
      } catch (e) {}
    },
    bar(p){ return `<div class="t-bar">[<div class="fill" style="--p:${Math.round(p * 100)}%"><i></i></div>]</div>`; },
    meter(n, on){ return `<div class="t-meter">${Array.from({ length: n }, (_, i) => `<i class="${i < on ? 'on' : ''}" style="height:${40 + i * (60 / n)}%"></i>`).join('')}</div>`; },
  };
})();
