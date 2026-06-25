# Motion-Site Research — Claude-generated motion sites (2026)

*Direct web research, 2026-06-23, for the portfolio rebuild.*

## How Claude builds motion sites (the pattern)
Claude writes the **HTML/CSS/JS** for live, interactive sites; **AI video/image generators (Higgsfield)** produce the cinematic background assets; **GSAP** drives scroll-triggered animation. "The kind of landing page that used to take weeks, in an afternoon." Claude's Artifacts / Custom Visuals render interactive HTML/JS (charts, dashboards, animated UI) live. → So our split is exactly right: **I write + wire the site, Higgsfield supplies the cinematic stills, GSAP/Lenis make it move.**

## The 2026 award-winning stack (what to use)
- **Lenis** — the industry-standard smooth/momentum scroll; doesn't break CSS `sticky`. Integrate via `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker.add(t=>lenis.raf(t*1000))`.
- **GSAP + ScrollTrigger** — best for scroll-as-timeline: **pin** sections, **scrub**, **parallax** (`data-speed`: 1.2 = closer/faster, 0.7 = farther/slower), **reveals** (line-by-line), timeline-sync. `anticipatePin:1` avoids pin flashing.
- **Three.js / WebGL + GLSL** — for true 3D scenes synced to scroll (heavier; optional). For us: a Higgsfield still + canvas effects keeps it light + mobile-fast.
- **Node-graph** — SVG/Canvas (D3, Cytoscape, Sigma for big graphs). Our estate map is a custom interactive SVG node-graph — keep it.

## Performance & accessibility (non-negotiable)
- Respect **`prefers-reduced-motion`** (~25% of macOS/iOS users) — disable the heavy motion for them.
- Scroll animation done badly hurts INP/CLS — profile with CPU 4× slowdown.
- **Graceful degradation:** if a CDN (GSAP/Lenis) fails, content must still render (fallback to plain reveals).

## Applied to the Binning portfolio
Lenis smooth scroll · GSAP ScrollTrigger reveals + parallax on the Higgsfield estate backdrop + a pinned cinematic estate moment · the interactive node map kept · reduced-motion + CDN-fail fallbacks. Content = the real infrastructure (ESTATE / AGENTS / ASSETS), honest, uni email, dissertation line.

Sources: [MindStudio — Claude Code + AI video 3D sites](https://www.mindstudio.ai/blog/animated-3d-websites-claude-code-ai-video-generation) · [Lenis](https://github.com/darkroomengineering/lenis) · [GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) · [Codrops — GSAP+Lenis+Three.js gallery](https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/)
