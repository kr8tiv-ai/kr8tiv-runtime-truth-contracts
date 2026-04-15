"""Generate Awwwards-quality website examples via local Ollama Cipher.
Uses raw mode with manual Gemma 4 chat template (Ollama's auto-template is broken for our SFT model).
Saves HTML to out/sites/ and opens index.html in the default browser."""
import os, re, time, json, urllib.request, webbrowser
from pathlib import Path

OLLAMA_URL = os.environ.get("CIPHER_API_URL", "http://localhost:11434").rstrip("/")
MODEL = os.environ.get("CIPHER_MODEL", "kin-cipher")
OUT_DIR = Path(__file__).resolve().parent.parent / "out" / "sites"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SYSTEM = ("You are Cipher, the Code Kraken. You build Awwwards-quality websites with Three.js, GSAP, "
          "Lenis, vanilla JS, and modern CSS. Output complete single-file HTML documents starting with "
          "<!DOCTYPE html>. No markdown fences, no preamble.")

PROMPTS = {
    "01-hero-particles": "Build a complete single-file HTML page with a stunning hero section featuring a Three.js particle system that responds to mouse movement. Include CDN imports for Three.js. Use GSAP from CDN for the headline entrance animation. Style with custom CSS - dark theme with bioluminescent blue/purple accents (#9bf, #a4f). Include a headline 'Cipher.ai' and subheadline 'The Code Kraken sees what others miss.' Make it Awwwards-quality. Output ONLY the complete HTML.",
    "02-portfolio-scroll": "Build a complete single-file HTML page that's a portfolio with smooth scrolling using Lenis from CDN. Include 3 project sections with parallax images and GSAP scroll-triggered text reveals. Dark elegant theme with custom serif typography. Use placeholder images from picsum.photos. Include CDN scripts inline. Output ONLY complete HTML.",
    "03-3d-card": "Build a complete single-file HTML page with an interactive 3D card that flips and rotates on mouse hover. Use vanilla JS with CSS 3D transforms. Glassmorphism style with backdrop-filter. Include subtle GSAP animations for entry. Make the card show a Cipher product preview. Output ONLY complete HTML.",
}


def build_prompt(system: str, user: str) -> str:
    """Manual Gemma 4 chat template — Ollama's auto-template breaks our SFT model."""
    return (
        f"<start_of_turn>user\n{system}\n\n{user}<end_of_turn>\n"
        f"<start_of_turn>model\n"
    )


def generate(user_prompt: str, max_tokens: int = 4096) -> tuple[str, dict]:
    body = json.dumps({
        "model": MODEL,
        "prompt": build_prompt(SYSTEM, user_prompt),
        "stream": False,
        "raw": True,  # bypass Ollama's broken template
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "repeat_penalty": 1.05,
            "num_predict": max_tokens,
            "stop": ["<end_of_turn>", "<start_of_turn>"],
        },
    }).encode()
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate",
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
    """Strip channel/thought tags and markdown fences."""
    # Remove <|channel>thought\n<channel|> and similar
    text = re.sub(r'<\|?channel\|?>[a-z]*\s*<?\|?channel\|?>?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<\|channel\|>\w*\s*', '', text)
    text = re.sub(r'</?start_of_turn>\w*\s*', '', text)
    text = re.sub(r'</?end_of_turn>\w*\s*', '', text)
    # Markdown fences
    if "```" in text:
        m = re.search(r"```(?:html)?\s*\n?(.*?)```", text, re.DOTALL)
        if m: text = m.group(1)
    return text.strip()


def ensure_html(text: str) -> str:
    if "<!DOCTYPE" not in text and "<html" not in text:
        return f"<!DOCTYPE html><html><body><pre>{text}</pre></body></html>"
    return text


def main():
    print(f"Cipher generation via Ollama at {OLLAMA_URL} (model: {MODEL})")
    print(f"Output dir: {OUT_DIR}\n")

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
        print(f"   {len(html)} chars | {meta.get('eval_count','?')} tokens | {elapsed:.0f}s | {rate:.2f} t/s")

    # Index page linking the 3 generated sites
    idx = OUT_DIR / "index.html"
    idx.write_text("""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Cipher Generated Sites</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{color-scheme:dark;font-family:system-ui,sans-serif}
body{max-width:760px;margin:60px auto;padding:24px;background:#0a0a0f;color:#e8e8ff}
h1{color:#a4f;font-weight:300;letter-spacing:-1px;margin-bottom:8px}
p{color:#8888aa;margin-bottom:32px}
a{display:block;padding:24px;margin:14px 0;background:#1a1a2e;color:#9bf;
  text-decoration:none;border-radius:12px;border:1px solid #333;
  transition:transform .2s,border-color .2s,background .2s}
a:hover{background:#252550;border-color:#9bf;transform:translateY(-2px)}
.tag{font-size:11px;background:#252540;padding:4px 10px;border-radius:20px;
     display:inline-block;margin-left:8px;color:#9bf;letter-spacing:.5px;text-transform:uppercase}
</style></head><body>
<h1>Cipher \u2014 Generated Sites</h1>
<p>Trained on Awwwards-quality code. Three.js, GSAP, Lenis, vanilla JS.</p>
<a href="01-hero-particles.html">01. Hero with Three.js Particles<span class="tag">Three.js + GSAP</span></a>
<a href="02-portfolio-scroll.html">02. Smooth Scroll Portfolio<span class="tag">Lenis + GSAP</span></a>
<a href="03-3d-card.html">03. Interactive 3D Card<span class="tag">CSS 3D + GSAP</span></a>
</body></html>""", encoding="utf-8")

    print(f"\nDONE. Opening {idx}")
    webbrowser.open(idx.as_uri())


if __name__ == "__main__":
    main()
