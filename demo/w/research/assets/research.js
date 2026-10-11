/* Research design channel: the moving wall of essay text, the typed line, and the literature lights. */
(() => {
  const ESSAY = window.RD_ESSAY || [];
  const reduce = window.KB ? KB.reduce : matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SEC = {
    intro:['§0','var(--c-intro)'], question:['§Q','var(--c-q)'], osint:['§1','var(--c-osint)'], war:['§2','var(--c-war)'],
    hmt:['§3','var(--c-hmt)'], resil:['§4','var(--c-resil)'], method:['§M','var(--c-method)'], refs:['REF','var(--c-refs)'],
  };
  const TERMS = /\b(OSINT|human-machine teaming|NEWS|WORLD|SIGNAL|COUNCIL|KAM|multipolar(?: world)?|civilian)\b/g;
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

  // number each sentence within its section, so the wall reads like a marked-up manuscript
  const count = {};
  const items = ESSAY.map(([sec, text]) => {
    count[sec] = (count[sec] || 0) + 1;
    const [tag, col] = SEC[sec] || SEC.intro;
    return { sec, col, html: `<p class="s" data-sec="${sec}" style="--sc:${col}"><span class="n">${tag}.${String(count[sec]).padStart(2, '0')}</span>${esc(text).replace(TERMS, '<em>$1</em>')}</p>` };
  });

  const bg = document.getElementById('bg');
  function build(){
    const w = bg.clientWidth || innerWidth;
    const n = Math.max(1, Math.min(5, Math.floor(w / 280)));
    bg.innerHTML = '';
    for (let c = 0; c < n; c++){
      // each column starts at a different point in the essay, so no two read alike
      const start = Math.floor((c / n) * items.length);
      const seq = items.slice(start).concat(items.slice(0, start)).map(i => i.html).join('');
      const col = document.createElement('div'); col.className = 'col';
      const inner = document.createElement('div'); inner.className = 'col-in';
      inner.innerHTML = seq + seq;     // doubled: scrolling half its height loops seamlessly
      col.appendChild(inner); bg.appendChild(col);
      const speed = 9 + (c % 3) * 3; // px per second, slow
      inner.style.setProperty('--dur', Math.round(inner.scrollHeight / 2 / speed) + 's');
    }
  }
  build();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });

  // the typed line: one real sentence at a time, typed in its section's colour, then faded
  const term = document.querySelector('.term');
  let typer = null, typing = false, paused = false;
  const LIVE = ESSAY.filter(([sec, t]) => sec !== 'refs' && t.length > 50 && t.length < 230);
  async function typeOne(){
    if (reduce || paused || !LIVE.length) return;
    typing = true;
    const [sec, text] = LIVE[Math.floor(Math.random() * LIVE.length)];
    typer = document.createElement('div'); typer.className = 'typer';
    typer.style.setProperty('--tc', (SEC[sec] || SEC.intro)[1]);
    const W = term.clientWidth, H = term.clientHeight;
    typer.style.left = Math.round(16 + Math.random() * Math.max(0, W - Math.min(420, W * .8) - 32)) + 'px';
    typer.style.top = Math.round(H * (.12 + Math.random() * .7)) + 'px';
    typer.setAttribute('aria-hidden', 'true');
    term.insertBefore(typer, term.querySelector('.veil'));
    await new Promise(res => {
      let i = 0; const t = setInterval(() => {
        if (!typer){ clearInterval(t); return res(); }
        typer.textContent = text.slice(0, ++i);
        if (i >= text.length){ clearInterval(t); res(); }
      }, 34);
    });
    await new Promise(r => setTimeout(r, 2600));
    if (typer){ const t = typer; t.classList.add('out'); setTimeout(() => t.remove(), 1000); typer = null; }
    typing = false;
    setTimeout(typeOne, 900);
  }
  if (!reduce) setTimeout(typeOne, 1400);

  // hold / resume the moving text
  const pause = document.getElementById('pause');
  if (reduce){ pause.hidden = true; }
  pause.addEventListener('click', () => {
    paused = !paused; pause.setAttribute('aria-pressed', paused);
    pause.querySelector('span').textContent = paused ? '▸ RUN TEXT' : '‖ HOLD TEXT';
    bg.querySelectorAll('.col-in').forEach(el => el.style.animationPlayState = paused ? 'paused' : 'running');
    if (paused && typer){ typer.remove(); typer = null; }
    if (!paused && !typing) typeOne();
    window.KB && KB.beep(paused ? 330 : 660, 40);
  });

  // the four literatures
  const READ = {
    osint: ['OSINT METHODOLOGY', 'How open sources are searched, collected, analysed and used, and why a civilian platform must treat security and privacy as seriously as professional intelligence does.'],
    war:   ['WAR STUDIES & HISTORICAL CONTEXT', 'Why analysis that ignores history produces strategic error, read through Mearsheimer, Wendt, Fukuyama and Doyle on power, order and peace.'],
    hmt:   ['AI & HUMAN-MACHINE TEAMING', 'How AI can extend a person’s analytical reach while the person still directs, interprets and judges. This is where the COUNCIL module sits.'],
    resil: ['INFORMATION RESILIENCE IN CONFLICT', 'How cyber warfare reaches civilians and information itself (Clarke and Knake on Estonia, Georgia, Syria and Iraq), and what that means for a platform that unifies everything.'],
  };
  const read = document.getElementById('readout');
  const lits = document.querySelectorAll('.lit');
  lits.forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    lits.forEach(x => x.setAttribute('aria-pressed', x === b && on));
    if (!on){
      delete document.body.dataset.lit; read.style.removeProperty('--rc');
      read.innerHTML = '<div class="k">SELECT A LITERATURE</div><p>Its sentences light up in the text behind.</p>';
      return;
    }
    const k = b.dataset.lit, [title, text] = READ[k];
    document.body.dataset.lit = k;
    read.style.setProperty('--rc', `var(--c-${k})`);
    read.innerHTML = `<div class="k">${title}</div><p></p>`;
    const p = read.querySelector('p');
    window.KB ? (KB.type(p, text, 110), KB.twitch(read), KB.beep(880, 40)) : (p.textContent = text);
  }));
})();
