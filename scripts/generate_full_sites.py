"""Generate full multi-section websites with Cipher.
Writes to out/v{N}-{label}/ so each run is preserved for comparison.

Usage:
  set CIPHER_API_URL=https://your-colab-tunnel.trycloudflare.com   (optional)
  python scripts/generate_full_sites.py [version_label]
"""
import os, re, time, json, urllib.request, webbrowser, sys
from pathlib import Path
from datetime import datetime

API = os.environ.get("CIPHER_API_URL", "http://localhost:11434").rstrip("/")
MODEL = os.environ.get("CIPHER_MODEL", "kin-cipher")

# Version label — defaults to timestamp if not given
LABEL = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime("v-%Y%m%d-%H%M%S")
OUT_DIR = Path(__file__).resolve().parent.parent / "out" / LABEL
OUT_DIR.mkdir(parents=True, exist_ok=True)

SYSTEM = (
    "You are Cipher, the Code Kraken. You build complete Awwwards-quality marketing websites "
    "as single-file HTML documents. Every site must include: navigation bar, hero section, "
    "features/services section, social proof or testimonials, call-to-action section, and footer. "
    "Use Three.js, GSAP, Lenis, vanilla JS, and modern CSS. Dark elegant aesthetic unless specified. "
    "Load libraries from CDN inline. Use placeholder images from picsum.photos. "
    "Output ONLY the complete HTML document starting with <!DOCTYPE html>. "
    "No markdown fences, no preamble."
)

PROMPTS = {
    "01-saas-landing": (
        "Build a COMPLETE SaaS landing page for a developer tool called 'Tidepool' "
        "(a real-time collaborative code editor for teams). Include: "
        "(1) sticky navigation with logo + links (Features, Pricing, Docs, Sign In) + CTA button, "
        "(2) hero section with massive headline, subheadline, two CTAs, and a subtle Three.js animated background, "
        "(3) features section with 6 feature cards (custom SVG icons, hover animations), "
        "(4) live demo section with video placeholder and GSAP-animated code snippet preview, "
        "(5) pricing tiers section with 3 cards (Free, Pro $29/mo, Team $99/mo) with toggle for monthly/annual, "
        "(6) testimonials slider with 3 dev quotes and avatars, "
        "(7) final CTA section with newsletter signup, "
        "(8) footer with sitemap and socials. "
        "Smooth scroll with Lenis, GSAP scroll-triggered reveals for every section, "
        "proper semantic HTML and responsive design. Awwwards-quality."
    ),
    "02-creative-agency": (
        "Build a COMPLETE creative agency portfolio website for 'Depth & Draft' "
        "(a boutique design studio). Include: "
        "(1) navigation with logo + links (Work, Studio, Journal, Contact) + 'Start a project' CTA, "
        "(2) hero with oversized typography, GSAP text-reveal animation, and cursor-following gradient blob, "
        "(3) featured work grid with 6 case study cards (picsum.photos images, custom hover effect that reveals project title + year), "
        "(4) about/studio section with a grid of 4 team member photos and short bios, "
        "(5) capabilities list (Brand Identity, Web Design, Motion, Art Direction) with animated counters for stats, "
        "(6) testimonial quote with large serif typography, "
        "(7) contact CTA section with email and social links, "
        "(8) footer with office address and footer navigation. "
        "Smooth Lenis scroll, custom cursor with mix-blend-mode, bold serif headlines (Playfair Display), "
        "GSAP scroll reveals throughout. Awwwards-style."
    ),
    "03-product-launch": (
        "Build a COMPLETE product launch landing page for 'Lumen Lamp' "
        "(a premium designer desk lamp). Include: "
        "(1) navigation (Design, Tech, Buy) + Buy Now CTA, "
        "(2) hero with 3D-rotating product image (use CSS 3D transforms with a picsum image as placeholder), "
        "   headline 'Light, Reimagined' and subheadline + CTA, "
        "(3) scrolling feature callouts with large imagery and short captions (Wireless Charging Base, 24h Battery, Adaptive Color Temperature, Voice Control), "
        "(4) specifications table with 8 rows, "
        "(5) testimonials from 3 designers with their workspaces shown, "
        "(6) pricing with single price ($249) + shipping info + CTA, "
        "(7) newsletter + limited edition FAQ, "
        "(8) footer. "
        "Use Lenis smooth scroll, GSAP product-rotation animation on hero + scroll-linked animations for feature callouts, "
        "elegant serif typography, lots of whitespace. Premium minimalist aesthetic (not dark — light/beige palette)."
    ),
}


def build_prompt(system: str, user: str) -> str:
    return (
        f"<start_of_turn>user\n{system}\n\n{user}<end_of_turn>\n"
        f"<start_of_turn>model\n"
    )


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
            "stop": ["<end_of_turn>", "<start_of_turn>"],
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
    with urllib.request.urlopen(req, timeout=7200) as resp:
        data = json.loads(resp.read().decode())
    return data.get("response", ""), data


def clean(text: str) -> str:
    text = re.sub(r'<\|?channel\|?>[a-z]*\s*<?\|?channel\|?>?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<\|channel\|>\w*\s*', '', text)
    text = re.sub(r'</?start_of_turn>\w*\s*', '', text)
    text = re.sub(r'</?end_of_turn>\w*\s*', '', text)
    if "```" in text:
        m = re.search(r"```(?:html)?\s*\n?(.*?)```", text, re.DOTALL)
        if m: text = m.group(1)
    return text.strip()


def ensure_html(text: str) -> str:
    if "<!DOCTYPE" not in text and "<html" not in text:
        return f"<!DOCTYPE html><html><body><pre>{text}</pre></body></html>"
    return text


def main():
    print(f"Cipher full-sites generation")
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
        path = OUT_DIR / f"{name}.html"
        path.write_text(html, encoding="utf-8")
        # Also save raw + meta for debugging
        (OUT_DIR / f"{name}.meta.json").write_text(json.dumps({
            "tokens": meta.get("eval_count"),
            "seconds": round(elapsed, 1),
            "tokens_per_sec": round(rate, 2),
            "api": API,
            "model": MODEL,
            "chars": len(html),
        }, indent=2), encoding="utf-8")
        print(f"   {len(html)} chars | {meta.get('eval_count','?')} tokens | {elapsed:.0f}s | {rate:.2f} t/s")
        results.append((name, path, len(html), elapsed, rate))

    # Build comparison index
    rows = "\n".join(
        f'<tr><td><a href="{p.name}">{name}</a></td><td>{c:,}</td><td>{s:.0f}s</td><td>{r:.1f} t/s</td></tr>'
        for name, p, c, s, r in results
    )
    idx = OUT_DIR / "index.html"
    idx.write_text(f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Cipher — {LABEL}</title>
<style>
body{{font-family:system-ui;max-width:900px;margin:60px auto;padding:24px;background:#0a0a0f;color:#e8e8ff}}
h1{{color:#a4f;font-weight:300}} table{{width:100%;border-collapse:collapse;margin-top:24px}}
th,td{{text-align:left;padding:12px;border-bottom:1px solid #333}}
a{{color:#9bf;text-decoration:none}} a:hover{{color:#fff}}
.meta{{color:#888;font-size:13px;margin-bottom:24px}}
</style></head><body>
<h1>Cipher — {LABEL}</h1>
<p class="meta">API: {API} · Model: {MODEL} · Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
<table>
<thead><tr><th>Site</th><th>Chars</th><th>Time</th><th>Speed</th></tr></thead>
<tbody>{rows}</tbody>
</table>
</body></html>""", encoding="utf-8")

    print(f"\nDONE. {len(results)}/{len(PROMPTS)} sites generated.")
    print(f"Open: {idx}")
    webbrowser.open(idx.as_uri())


if __name__ == "__main__":
    main()
