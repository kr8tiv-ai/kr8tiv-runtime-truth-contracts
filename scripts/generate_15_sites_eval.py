"""Generate 15 sites across 3 prompt tiers to eval the current Cipher model.

Tier A (5): balanced-descriptive — the existing SimPO eval set (baseline)
Tier B (5): casual/vibe-led — non-dev client describing feelings, no tech named
Tier C (5): awwwards-technical — hyper-specific, senior-creative-director level

Same SYSTEM prompt as generate_enhanced.py, so the only variable that changes
across tiers is the user prompt style. Output: out/{LABEL}/ with 15 HTML files,
per-site .meta.json, and an index.html grouped by tier with slop flags.

Usage:
  set CIPHER_API_URL=https://xxx.trycloudflare.com
  set CIPHER_MODEL=kin-cipher-simpo
  python scripts/generate_15_sites_eval.py [label]

Env:
  CIPHER_API_URL (default: http://localhost:11434)
  CIPHER_MODEL   (default: kin-cipher-simpo)
"""
import os, re, time, json, urllib.request, webbrowser, sys
from pathlib import Path
from datetime import datetime

try:
    from scripts.cipher_prompting import (
        assert_supported_local_model,
        build_gemma4_prompt,
        clean_generated_text,
    )
except ImportError:
    from cipher_prompting import (  # type: ignore
        assert_supported_local_model,
        build_gemma4_prompt,
        clean_generated_text,
    )

API = os.environ.get("CIPHER_API_URL", "http://localhost:11434").rstrip("/")
MODEL = os.environ.get("CIPHER_MODEL", "kin-cipher-simpo")
LABEL = sys.argv[1] if len(sys.argv) > 1 else "v8-eval15-" + datetime.now().strftime("%H%M%S")
OUT = Path(__file__).resolve().parent.parent / "out" / LABEL
OUT.mkdir(parents=True, exist_ok=True)

# Same enhanced system prompt as generate_enhanced.py — so tiers only vary by user prompt.
SYSTEM = """You are Cipher, the Code Kraken. Build COMPLETE Awwwards-quality single-file HTML.

RULES (non-negotiable):
- NO Tailwind. Vanilla CSS only with :root custom properties.
- CDN inline: Lenis, GSAP, ScrollTrigger, SplitText (and Three.js when the prompt calls for 3D).
- All content visible on first paint. Parents stay opacity:1 — only animate children.
- Never reference DOM ids that don't exist.
- Output ONLY complete HTML starting with <!DOCTYPE html>. No fences, no preamble.

AWWWARDS MOTION STACK (use this exact pattern — it's what 48% of SOTD winners use):
```
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
```

LENIS INIT (correct pattern — NEVER call lenis.stop()):
```
const lenis = new Lenis({ autoRaf: true, lerp: 0.08 });
gsap.registerPlugin(ScrollTrigger);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

GSAP REVEAL PATTERN (from ravi-klaassens, Awwwards SOTD Apr 15 2026):
```
gsap.utils.toArray('section').forEach((sec) => {
  gsap.from(sec.children, {
    y: 40, opacity: 0, stagger: 0.08, duration: 0.8,
    scrollTrigger: { trigger: sec, start: 'top 80%' },
    ease: 'expo.out',
  });
});
```

CSS TOKENS (use :root variables, clamp() for fluid type, oklch() for modern color):
```
:root {
  --color-bg: #f6f4ef;
  --color-text: #161614;
  --color-accent: #c5a47e;
  --font-display: 'Playfair Display', serif;
  --font-body: 'Inter', sans-serif;
  --ease: cubic-bezier(0.25, 1, 0.5, 1);
}
h1 { font-size: clamp(2.5rem, 8vw, 6rem); }
```

STRUCTURE: aim for 5-7 semantic sections. Include nav, hero, at least 3 content sections, CTA, footer.
TYPOGRAPHY: serif-display + sans-body pairing. Letter-spacing -0.02em on headlines.
IMAGES: use picsum.photos/seed/{n}/1600/1200 for variety.

BUILD THE COMPLETE SITE. Make it AT LEAST 10KB of HTML. Rich, editorial, award-worthy."""

# =========================================================================
# TIER A — balanced-descriptive (existing 5 baseline)
# =========================================================================
TIER_A = {
    "A1-architecture-firm": (
        "Build a COMPLETE Awwwards architecture firm site 'MERIDIAN STUDIO'. "
        "Hero: oversized serif headline 'We design buildings that hold light' with GSAP letter stagger reveal, "
        "over a full-bleed architectural photo (picsum 1018). Below hero: horizontal scrolling project strip "
        "with 6 projects (each has image, title, year, location — hover reveals description). "
        "Studio philosophy section: asymmetric 2-column layout, large pull-quote in serif, "
        "3 principles (Material/Light/Form) as numbered items with GSAP counter animation. "
        "Process timeline: 5 steps in a vertical timeline with scroll-triggered reveals. "
        "Press logos strip (6 placeholder logos). Journal section: 3 articles in a masonry grid. "
        "Contact: split screen with large serif email + form. Footer with sitemap. "
        "Lenis + GSAP + ScrollTrigger. Playfair + Inter. Cream #f6f4ef, beige #c5a47e. Editorial."
    ),
    "A2-tech-saas": (
        "Build a COMPLETE Awwwards tech SaaS site 'NIMBUS' (AI cloud infrastructure). "
        "Hero: gradient headline (#6366f1 to #ec4899) 'Infrastructure that thinks ahead', "
        "with a Three.js particle system background (200 points, BufferGeometry, mouse-reactive). "
        "Below hero: animated code terminal showing deployment commands (typewriter effect via GSAP). "
        "Features: 6 cards in 3x2 grid, each with an inline SVG icon, title, description, hover lift effect. "
        "Live metrics dashboard section: 4 large numbers with GSAP counter animation (99.99% uptime, etc). "
        "Code snippet section: syntax-highlighted pre/code block showing API usage. "
        "Pricing: 3 tiers (Hobby free / Pro $49 / Team $299) with monthly/annual toggle. "
        "Testimonials: horizontal carousel of 3 developer quotes with avatar + company. "
        "Final CTA: newsletter signup with gradient button. Footer with API docs links. "
        "Dark theme #0a0a14, Inter font, purple-pink accent. Lenis smooth scroll."
    ),
    "A3-photographer": (
        "Build a COMPLETE Awwwards photography portfolio 'KAI MORI'. "
        "NO preloader. Sections opacity:1 by default — only animate children y:30 to 0. "
        "Hero: full-viewport landscape (picsum 33) with small-caps caption 'Iceland, 2024 — no. 17', "
        "centered at bottom with a thin rule above. "
        "Intro: centered serif paragraph (max-width 80ch) about the photographer's philosophy. "
        "Gallery: CSS grid masonry layout with 12 images (picsum 40-51), hover reveals title overlay. "
        "Featured series: horizontal image strip that scrolls with GSAP horizontal scroll trigger, "
        "followed by an essay paragraph about the series. "
        "About: split layout with portrait (picsum 64) and bio text. "
        "Press: 4 publication logos. "
        "Contact: massive serif email link centered, 'say hello' subtext. "
        "Cream #f6f4ef, charcoal #161614, earth #8b6f47. Playfair + Inter. Lenis + GSAP."
    ),
    "A4-creative-studio": (
        "Build a COMPLETE Awwwards creative studio site 'OBSCURA'. "
        "Sticky nav with 'Start a project' CTA button (accent color). "
        "Hero: oversized serif headline 'We make screens worth staring at', "
        "with a Three.js rotating wireframe icosahedron in the background (IcosahedronGeometry, wireframe material). "
        "Work section: 4 vertical project cards in a row, full-height images (picsum), "
        "title + category revealed on hover with mix-blend-mode: difference overlay. "
        "Marquee: infinite horizontal scrolling text of services (Design / Development / Motion / Strategy / Branding / 3D / Sound) "
        "using GSAP horizontal loop. "
        "About: 2-column layout with large italic pull-quote on left, body text on right. "
        "Stats: 4 large numbers (projects, awards, team, years) with GSAP counter from 0. "
        "Contact: massive 'hello@obscura.studio' link in serif. "
        "Footer. Dark #0a0a0a, cream #f5f1ea, gold #e8c547. Lenis + custom cursor with mix-blend-mode."
    ),
    "A5-threejs-nova": (
        "Build a COMPLETE Awwwards Three.js experience for 'NOVA' album launch. "
        "CRITICAL: title container must stay opacity:1 — only the letter spans inside start at opacity:0. "
        "Full-viewport Three.js scene: 200 particles in a wave formation using BufferGeometry, "
        "mouse-reactive (particles follow cursor with lerp), colors cycle between #d4af37 and #6c5ce7. "
        "Title 'NOVA' in massive serif (clamp(6rem,15vw,14rem)) positioned over the scene, "
        "with GSAP blur(20px) to blur(0) letter stagger using manually created spans. "
        "Below the hero: 3 content sections that scroll over the continuous Three.js background. "
        "Section 1 — About: poetic paragraph about the album's journey. "
        "Section 2 — Tracklist: 9 tracks in a list (#, title, duration), hover reveals 'Listen' link. "
        "Section 3 — Pre-order CTA with release date + streaming links. "
        "Credits + social links at bottom. "
        "Lenis + ScrollTrigger drives Three.js camera.position.z from scroll progress. "
        "Background #0a0814. Cursor circle that grows on hover via CSS."
    ),
}

# =========================================================================
# TIER B — casual/vibe-led (new 5, non-dev client style)
# No libs named, no hex codes, no versions. Only feelings, pacing, mood.
# Tests: can the model infer the Awwwards stack from the SYSTEM prompt alone?
# =========================================================================
TIER_B = {
    "B1-sunday-coffee-shop": (
        "make me a website for my coffee shop. "
        "it should feel like waking up on a slow sunday morning — you know that feeling when the first sip hits "
        "and everything gets warm and quiet? like that. the shop is called SLOWHAND. we roast our own beans. "
        "i want it to feel cozy but also kind of beautiful, like a magazine spread about somewhere you'd actually go. "
        "steam rising off a cup somewhere. warm orange lights. the scroll shouldn't be fast, it should feel like "
        "wandering around inside the place. show our drinks, our beans, a little story about how we started, "
        "and a map thing. don't make it look like a normal coffee site. make it look like a painting."
    ),
    "B2-falling-upwards-skaters": (
        "ok so. FALLING UPWARDS. it's my streetwear brand but we're all skaters. the site needs to feel like "
        "kickflipping down a hill at like 2am with your headphones in and that one song is playing. "
        "the fonts should be LOUD. things should crash into the screen when you scroll. photos should glitch a "
        "little when you hover. some stuff should be crooked on purpose. attitude. i want people who land on this "
        "to immediately feel like they're not cool enough to wear it, and that's the point. we drop 4 times a year, "
        "the next drop is called DIRTWING. need a homepage, the shop (tees/hoodies/caps/pants), about us (we are "
        "4 skaters from portland), lookbook, and how to get on the mailing list for drops. "
        "no pastel colors. no clean corporate shit. no stock photos of people high-fiving."
    ),
    "B3-lumen-indie-game": (
        "i'm launching my indie game. it's called LUMEN. you're a tiny light in a huge dark ocean trying to find "
        "other lights. the homepage should feel lonely AND hopeful at the same time — like right before the sun "
        "comes up. when someone moves their mouse i want little particles to swim toward it, like curious fish. "
        "there should be some subtle music vibe in the corner (not actually playing, just looks like it could). "
        "need space for a trailer, a wishlist-on-steam button, the story of the game, screenshots that look like "
        "they're underwater, and the dev log. i don't want it to shout at anyone. whisper. let people lean in."
    ),
    "B4-safe-harbor-therapy": (
        "a website for my therapy practice — it's called SAFE HARBOR. my clients are mostly people with anxiety "
        "so the instant they land i need them to feel calm. not fake calm. actually calm. soft greens, creams, "
        "the kind of colors you see in a garden in the morning. slow everything. no pop-ups. no aggressive CTAs. "
        "no countdown timers. no urgency anywhere. it should feel like exhaling. a quiet intro about me, "
        "what anxiety looks like and that it's okay, how therapy works, what a first session is actually like, "
        "fees (be matter-of-fact about this, not salesy), and a contact form that doesn't feel like a form. "
        "like you're writing a letter. the whole site should feel like somewhere you could take a deep breath."
    ),
    "B5-nonnas-bakery": (
        "my grandma's bakery. she's 81. we've been open since 1979 — 47 years. finally getting a website. "
        "it's called NONNA'S and it's bread, sourdough, pastries, italian cookies. the site should feel like "
        "you can smell bread through the screen. i want it to look a little handwritten in places, like someone "
        "wrote notes on it. warm. old-school but not ugly. don't make it look like a tech startup that sells bread. "
        "make it look like the kind of place where they remember your name and always slip you an extra cookie. "
        "need: our story (47 years, 3 generations), what we bake (bread/pastries/cookies/special orders), "
        "hours, where we are, the catering stuff, and maybe a little section where grandma shares a tip each month. "
        "the website equivalent of a hug."
    ),
}

# =========================================================================
# TIER C — awwwards-technical (new 5, senior-creative-director level)
# Names exact libs/versions, oklch tokens, shader specs, ScrollTrigger config,
# perf budgets, a11y requirements. Tests ceiling behavior.
# =========================================================================
TIER_C = {
    "C1-parallax-labs-flowfield": (
        "Build a single-page FX-studio site 'PARALLAX LABS'. "
        "Full-viewport WebGL flowfield shader (curl-noise fragment — implement it), "
        "targeting 120fps on an M2. Pingpong FBO via three.js r161 WebGLRenderTarget at half-float precision, "
        "DPR capped at 2, resize debounced 120ms. "
        "Lenis 1.1.20 { autoRaf:true, lerp:0.08, syncTouch:true }. "
        "GSAP 3.12.5 with ScrollTrigger + SplitText registered. "
        "Hero typography uses font-variation-settings:'wght' 280, 'opsz' 96 — animated on scroll via GSAP "
        "from wght 280 → 900 over 40% of viewport. "
        "Color system with oklch only: "
        "--bg: oklch(95% 0.02 85), --ink: oklch(12% 0.03 260), --accent: oklch(70% 0.18 45). "
        "ScrollTrigger pins the canvas for 3 viewport-heights while 4 case-study chapters snap past "
        "(snap:1/3, scrub:0.6, toggleActions:'play none reverse none'). "
        "Sticky horizontal marquee of 14 services at 160px/s (GSAP infinite x-loop). "
        "FOUC prevented via font-display:optional and preload links for the variable font. "
        "Focus-visible ring: 2px oklch(70% 0.18 45 / 0.6) with 4px offset. "
        "prefers-reduced-motion replaces the flowfield canvas with a static noisy SVG and kills all scrub animations. "
        "CLS budget 0 — reserve intrinsic sizes on every image/canvas. Minimum 18 KB HTML."
    ),
    "C2-atlas-volume-gallery": (
        "Three.js r161 volumetric gallery 'ATLAS VOLUME'. "
        "24 hero images arranged as a logarithmic spiral in 3D space using InstancedMesh "
        "(BoxGeometry 3×4×0.02). Load a texture atlas (use picsum.photos/seed/N/512/768 for 24 placeholders, "
        "composite into a 2048² via Canvas2D at runtime). "
        "Post-processing: UnrealBloomPass (threshold:0.85, strength:0.35, radius:0.8), "
        "ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace. "
        "OrbitControls disabled — custom GSAP camera path on scroll using MotionPathPlugin with cubic-bezier "
        "control points in world units. "
        "Hover state: raycaster + damped lerp on the targeted instance's scale (1 → 1.08) + matrix update via "
        "instanceMatrix.needsUpdate. "
        "Lenis 1.1.20 with lerp 0.06. ScrollTrigger scrub:1.2 drives camera.position + camera.lookAt through "
        "6 waypoints. "
        "CSS: container queries, subgrid for the metadata panel, and "
        "@supports (animation-timeline: scroll()) progressive enhancement for the scroll-progress bar. "
        "Font: variable Inter 3.19 with font-feature-settings:'ss01','cv11','zero'. "
        "Dark theme: oklch(8% 0.02 240) background, oklch(92% 0.015 85) ink."
    ),
    "C3-brutal-quarterly-zine": (
        "Editorial zine 'BRUTAL QUARTERLY №07'. PURE SVG kinetic typography — no raster images except one "
        "blurred noise overlay (≤5KB JPEG, GPU-friendly). "
        "Hero: 8 SVG <text> elements with textLength + lengthAdjust='spacingAndGlyphs', "
        "animated via GSAP stroke-dashoffset, staggered 0.04s, "
        "ease: CustomEase.create('brutal','M0,0 C0.2,0 0.1,1 1,1'). "
        "Grid: CSS subgrid + grid-template-columns: repeat(12, minmax(0,1fr)) with 8-column hanging captions. "
        "Columns align to a baseline grid (line-height:calc(1rem * 1.5)). "
        "Type stack: Monument Grotesk Variable (body), PP Editorial New (display), Reckless Neue Mono (numerics). "
        "Fallback chain: Inter / Playfair Display / IBM Plex Mono. "
        "Color: paper #ECE7DD, ink #121210, cinnabar #D14B3C. "
        "mix-blend-mode:multiply on pull-quotes. "
        ":has(> h2) selector styles numbered sections. "
        "Lenis 1.1.20 with syncTouch:true, touchMultiplier:1.4. "
        "9 articles arranged as a 12-column editorial grid. "
        "TOC with aria-current tracked via IntersectionObserver (rootMargin '-45% 0px 0px 0px'). "
        "No JS fallback: the grid and type still look like a zine."
    ),
    "C4-nocturnal-wave-sequencer": (
        "Ambient music studio 'NOCTURNAL WAVE' with a WORKING 16-step WebAudio sequencer as its hero. "
        "AudioContext(48000, latencyHint:'interactive'). "
        "4 synthesized instruments (implement them inline): "
        "  kick — 60Hz sine with 0.04s exp envelope decay, "
        "  snare — noise buffer (0.1s) + BiquadFilter highpass 1200Hz, "
        "  hat — shortened noise + highpass 7000Hz + gain ramp 0.02s, "
        "  bass — square 110Hz detuned -12 cents. "
        "Master chain: GainNode → DynamicsCompressorNode(threshold:-12, ratio:4, knee:6) → destination. "
        "Sequencer grid: 16×4 cells, click to toggle steps. "
        "GSAP TimelineLite drives the visual playhead in sync with AudioContext.currentTime (sample-accurate — "
        "do NOT rely on setInterval for timing; use the Web Audio lookahead pattern with a 25ms scheduler). "
        "Second Three.js canvas visualizer: AnalyserNode(fftSize:2048) feeds a reactive ribbon "
        "(CatmullRomCurve3 with 512 points) whose vertex positions are displaced in a custom ShaderMaterial "
        "(vertex + fragment GLSL — write both). "
        "Lenis 1.1.20. "
        "Accessibility: play/stop mapped to Space, cells to keys 1-6 (per row), aria-pressed on each cell, "
        "focus ring 2px oklch(85% 0.19 85). "
        "prefers-reduced-motion swaps the ribbon for a static waveform PNG and disables auto-play. "
        "Dark theme only — prefers-color-scheme:light shows a warning banner: "
        "'This site is designed for low-light listening.'"
    ),
    "C5-studio-noir-view-transitions": (
        "Multi-page-feel single HTML — 'STUDIO NOIR' case-studies — using the View Transitions API. "
        "Declare @view-transition { navigation: auto } and scope animations per named element. "
        "Each project card gets view-transition-name:project-N. "
        "6 project cards morph into full case-study detail views on click via document.startViewTransition "
        "(graceful fallback if unsupported: CSS-only class toggle with 300ms crossfade). "
        "Use CSS Anchor Positioning (anchor-name, position-anchor, inset-area) for the floating index that "
        "follows the active section. "
        "Container queries (@container (min-width:64ch)) pivot the layout between stacked and split. "
        "text-wrap: balance on h1/h2, text-wrap: pretty on body paragraphs. "
        "CSS color-mix() for hover states: "
        "  background: color-mix(in oklch, var(--ink) 10%, transparent). "
        "Scrollytelling: ScrollTrigger snaps to case-study sections "
        "(snap:[0,1/6,2/6,3/6,4/6,5/6,1], duration:{min:0.2,max:0.6}, ease:'power1.inOut'). "
        "Lenis 1.1.20 with lerp 0.07. "
        "Type: Söhne Buch + Söhne Breit Kraftig (fallbacks: Inter tight) with "
        "font-feature-settings:'ss01','ss05','calt','kern'. "
        "Palette: ink #0E0E0E, paper #F3EFE8, accent tonal oklch ramp "
        "[oklch(45% 0.18 25), oklch(55% 0.18 25), oklch(65% 0.18 25)]. "
        "Ship goals: Lighthouse Perf ≥92, A11y=100, Best-Practices=100, SEO=100. "
        "20 KB+ HTML."
    ),
}

TIERS = [
    ("A", "balanced-descriptive (baseline — existing SimPO eval set)", TIER_A),
    ("B", "casual / vibe-led (non-dev client style — no libs/hex/versions)", TIER_B),
    ("C", "awwwards-technical (senior CD — exact libs, oklch, shaders, perf budgets)", TIER_C),
]

PROMPTS = {**TIER_A, **TIER_B, **TIER_C}


def build_prompt(system: str, user: str) -> str:
    return build_gemma4_prompt(system, user)


def generate(user_prompt: str, max_tokens: int = 8192) -> dict:
    body = json.dumps({
        "model": MODEL,
        "prompt": build_prompt(SYSTEM, user_prompt),
        "stream": False,
        "raw": True,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "repeat_penalty": 1.05,
            "num_predict": max_tokens,
            "num_ctx": 16384,
            "stop": ["<|turn>", "<turn|>"],
        },
    }).encode()
    req = urllib.request.Request(
        f"{API}/api/generate", data=body,
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (cipher/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=14400) as resp:
        return json.loads(resp.read().decode())


def clean(text: str) -> str:
    return clean_generated_text(text)


def slop_flags(html: str) -> list[str]:
    flags = []
    low = html.lower()
    if 'cdn.tailwindcss' in low or 'tailwindcss.com' in low: flags.append('TAILWIND')
    if 'lenis.stop(' in low: flags.append('LENIS_STOP')
    ids = re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", html)
    for i in ids:
        if f'id="{i.lower()}"' not in low and f"id='{i.lower()}'" not in low:
            flags.append(f'BROKEN_REF:{i}')
    if len(html) < 10240:
        flags.append(f'SHORT:{len(html)}B')
    return flags


def tier_of(name: str) -> str:
    if name.startswith('A'): return 'A'
    if name.startswith('B'): return 'B'
    return 'C'


def main():
    assert_supported_local_model(MODEL)
    print(f"Cipher 15-site TIERED eval")
    print(f"  API: {API}")
    print(f"  Model: {MODEL}")
    print(f"  Output: {OUT}\n")

    results = []
    for tier_letter, tier_desc, tier_prompts in TIERS:
        print(f"=== Tier {tier_letter} — {tier_desc} ===")
        for name, prompt in tier_prompts.items():
            print(f"-> {name} ...", flush=True)
            t0 = time.time()
            try:
                data = generate(prompt, max_tokens=8192)
            except Exception as e:
                print(f"   FAIL: {e}")
                results.append((name, None, 0, 0, 0, [f'FAIL:{type(e).__name__}']))
                continue
            elapsed = time.time() - t0
            raw = data.get('response', '')
            cleaned = clean(raw)
            if '<!DOCTYPE' not in cleaned and '<html' not in cleaned:
                html = f'<!DOCTYPE html><html><body><pre>{cleaned}</pre></body></html>'
            else:
                html = cleaned
            flags = slop_flags(html)
            path = OUT / f'{name}.html'
            path.write_text(html, encoding='utf-8')
            tps = data.get('eval_count', 0) / max(data.get('eval_duration', 1) / 1e9, 0.001)
            meta = {
                'tier': tier_letter,
                'prompt_style': tier_desc,
                'tokens': data.get('eval_count'),
                'seconds': round(elapsed, 1),
                'tokens_per_sec': round(tps, 2),
                'chars': len(html),
                'slop_flags': flags,
            }
            (OUT / f'{name}.meta.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
            status = 'CLEAN' if not flags else 'SLOP: ' + ', '.join(flags)
            print(f"   {len(html):>7,} chars | {data.get('eval_count','?'):>5} tok | {elapsed:>5.0f}s | {tps:>5.1f} t/s | {status}")
            results.append((name, path, len(html), elapsed, tps, flags))
        print()

    # Build index grouped by tier
    sections_html = []
    for tier_letter, tier_desc, tier_prompts in TIERS:
        tier_results = [r for r in results if r[0].startswith(tier_letter)]
        tier_clean = sum(1 for _, _, _, _, _, f in tier_results if not f)
        rows = '\n'.join(
            f'<tr><td><a href="{p.name if p else "#"}">{n}</a></td>'
            f'<td>{c:,}</td><td>{s:.0f}s</td><td>{r:.1f} t/s</td>'
            f'<td>{"<span class=clean>CLEAN</span>" if not f else "<span class=slop>" + ", ".join(f) + "</span>"}</td></tr>'
            for n, p, c, s, r, f in tier_results
        )
        sections_html.append(f'''
<section>
<h2>Tier {tier_letter} <span class=tier-desc>· {tier_desc}</span></h2>
<p class=tier-summary>Clean: {tier_clean}/{len(tier_results)}</p>
<table>
<thead><tr><th>Site</th><th>Chars</th><th>Time</th><th>Speed</th><th>Slop Check</th></tr></thead>
<tbody>{rows}</tbody>
</table>
</section>''')

    total_clean = sum(1 for _, _, _, _, _, f in results if not f)
    idx = OUT / 'index.html'
    idx.write_text(f'''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Cipher 15-site eval — {LABEL}</title>
<style>
body{{font-family:system-ui,-apple-system,sans-serif;max-width:1100px;margin:60px auto;padding:24px;background:#0a0a0f;color:#e8e8ff;line-height:1.6}}
h1{{color:#a4f;font-weight:300;letter-spacing:-0.02em;margin-bottom:8px}}
h2{{color:#ddd;font-weight:500;font-size:18px;letter-spacing:0.05em;text-transform:uppercase;margin-top:48px;padding-bottom:8px;border-bottom:1px solid #222}}
.tier-desc{{color:#777;font-weight:400;text-transform:none;letter-spacing:0;font-size:14px}}
.tier-summary{{color:#888;font-size:13px;margin:4px 0 16px}}
.meta{{color:#888;font-size:13px;margin-bottom:24px}}
table{{width:100%;border-collapse:collapse}}
th,td{{text-align:left;padding:10px 12px;border-bottom:1px solid #222}}
th{{color:#aaa;font-weight:500;font-size:12px;letter-spacing:0.1em;text-transform:uppercase}}
a{{color:#9bf;text-decoration:none}}a:hover{{color:#fff;text-decoration:underline}}
.clean{{color:#5f5}}
.slop{{color:#f55}}
.summary{{margin-top:48px;padding:16px;background:#14141f;border-left:3px solid #a4f}}
</style></head><body>
<h1>Cipher 15-site tiered eval — {LABEL}</h1>
<p class="meta">API: {API} · Model: {MODEL} · {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
{''.join(sections_html)}
<div class=summary>
<strong>Overall:</strong> {total_clean}/{len(results)} clean across 3 tiers<br>
<strong>Tier A</strong> (baseline) · <strong>Tier B</strong> (vibe-led — tests stack inference) · <strong>Tier C</strong> (technical — tests ceiling)
</div>
</body></html>''', encoding="utf-8")

    print(f"DONE. {len(results)}/15 sites generated. Clean overall: {total_clean}/{len(results)}")
    print(f"  Tier A clean: {sum(1 for n,_,_,_,_,f in results if n.startswith('A') and not f)}/5")
    print(f"  Tier B clean: {sum(1 for n,_,_,_,_,f in results if n.startswith('B') and not f)}/5")
    print(f"  Tier C clean: {sum(1 for n,_,_,_,_,f in results if n.startswith('C') and not f)}/5")
    print(f"Index: {idx}")
    try:
        webbrowser.open(idx.as_uri())
    except Exception:
        pass


if __name__ == "__main__":
    main()
