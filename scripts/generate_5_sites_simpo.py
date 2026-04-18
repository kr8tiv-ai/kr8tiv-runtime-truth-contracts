"""Generate 5 full sites with SimPO-trained Cipher via local Ollama API.
Writes to out/v{LABEL}/ — 5 sites matching the SimPO validation set.

Usage:
  python scripts/generate_5_sites_simpo.py [label]

Env:
  CIPHER_API_URL (default: http://localhost:11434)
  CIPHER_MODEL   (default: cipher-simpo)
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
MODEL = os.environ.get("CIPHER_MODEL", "cipher-simpo")

LABEL = sys.argv[1] if len(sys.argv) > 1 else "v5-simpo-" + datetime.now().strftime("%H%M%S")
OUT_DIR = Path(__file__).resolve().parent.parent / "out" / LABEL
OUT_DIR.mkdir(parents=True, exist_ok=True)

SYSTEM = (
    "You are Cipher, the Code Kraken. Build COMPLETE Awwwards-quality single-file HTML. "
    "NO Tailwind. Vanilla CSS only. Only Three.js/GSAP/Lenis (CDN inline). "
    "All content visible on first paint. Never reference DOM ids that don't exist. "
    "Parents stay opacity:1. Output ONLY complete HTML starting with <!DOCTYPE html>. No fences."
)

PROMPTS = {
    "01-architecture-firm": (
        "Build a COMPLETE Awwwards architecture firm site 'MERIDIAN STUDIO'. "
        "Sticky nav + Projects/Studio/Process/Contact. "
        "Hero: serif headline 'We design buildings that hold light' over architectural photo (picsum 1018). "
        "6 project cards with picsum + hover overlay of year/location. "
        "Studio philosophy 3-col (Material/Light/Form) serif. "
        "Process timeline 5 steps. Press strip. Journal 3 articles. Contact. Footer. "
        "Lenis + GSAP y:30->0. Playfair + Inter. Cream #f6f4ef, beige accent #c5a47e. Editorial."
    ),
    "02-tech-saas": (
        "Build a COMPLETE Awwwards tech SaaS site 'NIMBUS' (AI cloud infra). "
        "NO Tailwind. Vanilla CSS + :root. Sticky nav + Try Free CTA. "
        "Hero: 'Infrastructure that thinks ahead' + Three.js particle bg + gradient headline #6366f1->#ec4899. "
        "6 feature cards with SVG icons hover lift. Code snippet in pre/code. "
        "Pricing Hobby/Pro $49/Team $299 with toggle. 3 testimonials. Final CTA. Footer. "
        "Dark #0a0a14, Inter font. Lenis scroll."
    ),
    "03-photographer": (
        "Build a COMPLETE Awwwards photography portfolio 'KAI MORI'. "
        "NO preloader. NO lenis.stop(). Sections opacity:1 by default; only animate y30->0. "
        "Minimal nav. Hero: full-screen landscape (picsum 33), small-caps 'Iceland, 2024 - no. 17'. "
        "Intro centered serif 80ch. Masonry 12 photos (picsum 40-51) hover reveals. "
        "Featured series image strip + essay. About + portrait. Press 4 pubs. Huge serif email. "
        "Cream #f6f4ef, charcoal #161614, earth #8b6f47. Playfair + Inter."
    ),
    "04-creative-studio": (
        "Build a COMPLETE Awwwards creative studio 'OBSCURA'. "
        "Sticky nav + 'Start a project' CTA. "
        "Hero: serif 'We make screens worth staring at' + Three.js rotating wireframe icosahedron bg. "
        "4 vertical project cards with picsum. Horizontal GSAP infinite-scroll marquee of 7 services. "
        "2-col about with italic emphasis. 4 stats with GSAP counter from 0. "
        "Massive 'hello@obscura.studio' link. Footer. "
        "Dark #0a0a0a, cream #f5f1ea, gold #e8c547. Lenis + difference cursor."
    ),
    "05-threejs-nova": (
        "Build a COMPLETE Awwwards Three.js experience 'NOVA' album launch. "
        "CRITICAL: title parent opacity:1 - only spans start opacity:0 (opacity multiplies through cascade). "
        "Full-viewport Three.js: 200 particles wave, mouse reactive, colors cycle #d4af37<->#6c5ce7. BufferGeometry. "
        "Serif 'NOVA' clamp(6rem,15vw,14rem) + subtitle. GSAP blur(20)->blur(0) letter stagger via manual span split. "
        "3 sections over continuous bg. About poetic paragraph. "
        "9 tracks (#/title/duration, hover reveals Listen). Pre-order link. Credits + social. "
        "Lenis + ScrollTrigger drives Three.js camera via scroll. Bg #0a0814. Cursor circle grows on hover."
    ),
}


def build_prompt(system: str, user: str) -> str:
    return build_gemma4_prompt(system, user)


def generate(user_prompt: str, max_tokens: int = 4096) -> tuple[str, dict]:
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
            "num_ctx": 8192,
            "stop": ["<|turn>", "<turn|>"],
        },
    }).encode()
    req = urllib.request.Request(
        f"{API}/api/generate",
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (cipher-client/1.0)",
        },
    )
    with urllib.request.urlopen(req, timeout=14400) as resp:  # 4-hour timeout
        data = json.loads(resp.read().decode())
    return data.get("response", ""), data


def clean(text: str) -> str:
    return clean_generated_text(text)


def ensure_html(text: str) -> str:
    if "<!DOCTYPE" not in text and "<html" not in text:
        return f"<!DOCTYPE html><html><body><pre>{text}</pre></body></html>"
    return text


def slop_flags(html: str) -> list[str]:
    """Detect known slop patterns — the same ones SimPO was trained to reject."""
    flags = []
    low = html.lower()
    if "cdn.tailwindcss" in low or "tailwindcss.com" in low:
        flags.append("TAILWIND")
    if "lenis.stop(" in low:
        flags.append("LENIS_STOP")
    if "getelementbyid" in low:
        import re as _r
        ids = _r.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", html)
        for i in ids:
            if f'id="{i.lower()}"' not in low and f"id='{i.lower()}'" not in low:
                flags.append(f"BROKEN_REF:{i}")
    return flags


def main():
    assert_supported_local_model(MODEL)
    print(f"Cipher SimPO 5-site generation")
    print(f"  API: {API}")
    print(f"  Model: {MODEL}")
    print(f"  Output: {OUT_DIR}\n")

    results = []
    for name, prompt in PROMPTS.items():
        print(f"-> {name} ...", flush=True)
        t0 = time.time()
        try:
            raw, meta = generate(prompt)
        except Exception as e:
            print(f"   FAIL: {e}")
            continue
        elapsed = time.time() - t0
        rate = meta.get('eval_count', 0) / max(meta.get('eval_duration', 1) / 1e9, 0.001)
        cleaned = clean(raw)
        html = ensure_html(cleaned)
        flags = slop_flags(html)
        path = OUT_DIR / f"{name}.html"
        path.write_text(html, encoding="utf-8")
        (OUT_DIR / f"{name}.meta.json").write_text(json.dumps({
            "tokens": meta.get("eval_count"),
            "seconds": round(elapsed, 1),
            "tokens_per_sec": round(rate, 2),
            "api": API,
            "model": MODEL,
            "chars": len(html),
            "slop_flags": flags,
        }, indent=2), encoding="utf-8")
        status = "CLEAN" if not flags else "SLOP: " + ", ".join(flags)
        print(f"   {len(html):>7,} chars | {meta.get('eval_count','?'):>4} tok | {elapsed:>4.0f}s | {rate:>4.1f} t/s | {status}")
        results.append((name, path, len(html), elapsed, rate, flags))

    # Build comparison index
    rows = "\n".join(
        f'<tr><td><a href="{p.name}">{name}</a></td>'
        f'<td>{c:,}</td><td>{s:.0f}s</td><td>{r:.1f} t/s</td>'
        f'<td>{"<span style=color:#5f5>CLEAN</span>" if not f else "<span style=color:#f55>" + ", ".join(f) + "</span>"}</td></tr>'
        for name, p, c, s, r, f in results
    )
    idx = OUT_DIR / "index.html"
    idx.write_text(f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Cipher SimPO - {LABEL}</title>
<style>
body{{font-family:system-ui;max-width:1000px;margin:60px auto;padding:24px;background:#0a0a0f;color:#e8e8ff}}
h1{{color:#a4f;font-weight:300;letter-spacing:-0.02em}}
.meta{{color:#888;font-size:13px;margin-bottom:24px}}
table{{width:100%;border-collapse:collapse;margin-top:24px}}
th,td{{text-align:left;padding:12px;border-bottom:1px solid #333}}
th{{color:#aaa;font-weight:500;font-size:12px;letter-spacing:0.1em;text-transform:uppercase}}
a{{color:#9bf;text-decoration:none}} a:hover{{color:#fff;text-decoration:underline}}
</style></head><body>
<h1>Cipher SimPO - {LABEL}</h1>
<p class="meta">API: {API} &middot; Model: {MODEL} &middot; Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
<table>
<thead><tr><th>Site</th><th>Chars</th><th>Time</th><th>Speed</th><th>Slop Check</th></tr></thead>
<tbody>{rows}</tbody>
</table>
</body></html>""", encoding="utf-8")

    clean_count = sum(1 for _,_,_,_,_,f in results if not f)
    print(f"\nDONE. {len(results)}/{len(PROMPTS)} sites generated.")
    print(f"Clean (no slop): {clean_count}/{len(results)}")
    print(f"Open: {idx}")
    try:
        webbrowser.open(idx.as_uri())
    except Exception as e:
        print(f"(browser open failed: {e})")


if __name__ == "__main__":
    main()
