"""Generate sites with ENHANCED prompts — inject real Awwwards code snippets as few-shot.
Uses the proven SimPO checkpoint with richer context for better output quality.

Usage:
  set CIPHER_API_URL=https://xxx.trycloudflare.com
  set CIPHER_MODEL=kin-cipher-simpo   (or kin-cipher-sft25)
  python scripts/generate_enhanced.py [label]
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
LABEL = sys.argv[1] if len(sys.argv) > 1 else "v7-enhanced-" + datetime.now().strftime("%H%M%S")
OUT = Path(__file__).resolve().parent.parent / "out" / LABEL
OUT.mkdir(parents=True, exist_ok=True)

# Enhanced system prompt with REAL Awwwards patterns injected
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

PROMPTS = {
    "01-architecture-firm": (
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
    "02-tech-saas": (
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
    "03-photographer": (
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
    "04-creative-studio": (
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
    "05-threejs-nova": (
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


def build_prompt(system: str, user: str) -> str:
    return build_gemma4_prompt(system, user)


def generate(user_prompt: str, max_tokens: int = 8192) -> tuple[str, dict]:
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


def clean(text):
    return clean_generated_text(text)


def slop_flags(html):
    flags = []
    low = html.lower()
    if 'cdn.tailwindcss' in low or 'tailwindcss.com' in low: flags.append('TAILWIND')
    if 'lenis.stop(' in low: flags.append('LENIS_STOP')
    ids = re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", html)
    for i in ids:
        if f'id="{i.lower()}"' not in low and f"id='{i.lower()}'" not in low:
            flags.append(f'BROKEN_REF:{i}')
    return flags


def main():
    assert_supported_local_model(MODEL)
    print(f"Cipher ENHANCED 5-site generation")
    print(f"  API: {API}")
    print(f"  Model: {MODEL}")
    print(f"  Output: {OUT}\n")

    results = []
    for name, prompt in PROMPTS.items():
        print(f"-> {name} ...", flush=True)
        t0 = time.time()
        try:
            data = generate(prompt, max_tokens=8192)
        except Exception as e:
            print(f"   FAIL: {e}")
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
        meta = {
            'tokens': data.get('eval_count'),
            'seconds': round(elapsed, 1),
            'tokens_per_sec': round(data.get('eval_count', 0) / max(data.get('eval_duration', 1) / 1e9, 0.001), 2),
            'chars': len(html),
            'slop_flags': flags,
        }
        (OUT / f'{name}.meta.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
        status = 'CLEAN' if not flags else 'SLOP: ' + ', '.join(flags)
        print(f"   {len(html):>7,} chars | {data.get('eval_count','?'):>5} tok | {elapsed:>5.0f}s | {meta['tokens_per_sec']:>5.1f} t/s | {status}")
        results.append((name, path, len(html), elapsed, meta['tokens_per_sec'], flags))

    rows = '\n'.join(
        f'<tr><td><a href="{p.name}">{n}</a></td><td>{c:,}</td><td>{s:.0f}s</td><td>{r:.1f} t/s</td>'
        f'<td>{"<span style=color:#5f5>CLEAN</span>" if not f else "<span style=color:#f55>" + ", ".join(f) + "</span>"}</td></tr>'
        for n, p, c, s, r, f in results
    )
    idx = OUT / 'index.html'
    idx.write_text(f'''<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cipher Enhanced</title>
<style>body{{font-family:system-ui;max-width:1000px;margin:60px auto;padding:24px;background:#0a0a0f;color:#e8e8ff}}
h1{{color:#a4f;font-weight:300}}table{{width:100%;border-collapse:collapse;margin-top:24px}}
th,td{{text-align:left;padding:12px;border-bottom:1px solid #333}}
a{{color:#9bf;text-decoration:none}}a:hover{{color:#fff}}</style></head><body>
<h1>Cipher Enhanced - {LABEL}</h1>
<p style="color:#888">API: {API} | Model: {MODEL} | {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
<table><thead><tr><th>Site</th><th>Chars</th><th>Time</th><th>Speed</th><th>Slop</th></tr></thead>
<tbody>{rows}</tbody></table></body></html>''', encoding='utf-8')

    clean_count = sum(1 for _,_,_,_,_,f in results if not f)
    print(f"\nDONE. {len(results)}/{len(PROMPTS)} sites. Clean: {clean_count}/{len(results)}")
    print(f"Index: {idx}")
    try:
        webbrowser.open(idx.as_uri())
    except Exception:
        pass


if __name__ == "__main__":
    main()
