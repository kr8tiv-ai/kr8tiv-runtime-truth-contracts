"""Generate Awwwards-quality website examples via a HuggingFace Inference Endpoint.

Usage:
  1. Matt deploys `Auroraventures/cipher-sft-merged` as an HF Inference Endpoint via the
     web UI (see .planning/staged-rolling-oasis.md — the UI path bypasses the 403
     "Payment method required" API error).
  2. Copy the endpoint URL from the dashboard (looks like
     https://xxxxxxxx.us-east-1.aws.endpoints.huggingface.cloud) into
     scripts/endpoint_config.json.
  3. Export HF_TOKEN (or put it in the config) and run:
        python scripts/generate_via_hf_endpoint.py

Config file format (scripts/endpoint_config.json — gitignored):
    {
      "endpoint_url": "https://xxxxxxxx.us-east-1.aws.endpoints.huggingface.cloud",
      "hf_token_env": "HF_TOKEN",
      "model": "Auroraventures/cipher-sft-merged"
    }

The endpoint runs TGI with an OpenAI-compatible /v1/chat/completions route; this script
uses that route rather than the legacy /generate endpoint so it works across TGI versions.
"""
import json
import os
import re
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT_DIR = ROOT / "out" / "sites_hf"
CONFIG_PATH = HERE / "endpoint_config.json"

SYSTEM = (
    "You are Cipher, the Code Kraken. You build Awwwards-quality websites with Three.js, GSAP, "
    "Lenis, vanilla JS, and modern CSS. Output complete single-file HTML documents starting with "
    "<!DOCTYPE html>. No markdown fences, no preamble."
)

PROMPTS = {
    "01-hero-particles": (
        "Build a complete single-file HTML page with a stunning hero section featuring a "
        "Three.js particle system that responds to mouse movement. Include CDN imports for "
        "Three.js. Use GSAP from CDN for the headline entrance animation. Style with custom "
        "CSS - dark theme with bioluminescent blue/purple accents (#9bf, #a4f). Include a "
        "headline 'Cipher.ai' and subheadline 'The Code Kraken sees what others miss.' Make "
        "it Awwwards-quality. Output ONLY the complete HTML."
    ),
    "02-portfolio-scroll": (
        "Build a complete single-file HTML page that's a portfolio with smooth scrolling "
        "using Lenis from CDN. Include 3 project sections with parallax images and GSAP "
        "scroll-triggered text reveals. Dark elegant theme with custom serif typography. "
        "Use placeholder images from picsum.photos. Include CDN scripts inline. Output "
        "ONLY complete HTML."
    ),
    "03-3d-card": (
        "Build a complete single-file HTML page with an interactive 3D card that flips and "
        "rotates on mouse hover. Use vanilla JS with CSS 3D transforms. Glassmorphism style "
        "with backdrop-filter. Include subtle GSAP animations for entry. Make the card show "
        "a Cipher product preview. Output ONLY complete HTML."
    ),
}


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        sys.exit(
            f"Config missing: {CONFIG_PATH}\n"
            "Copy scripts/endpoint_config.example.json to scripts/endpoint_config.json "
            "and fill in your endpoint URL."
        )
    cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    url = cfg.get("endpoint_url", "").rstrip("/")
    if not url or url.startswith("https://REPLACE"):
        sys.exit("endpoint_url in endpoint_config.json is not set.")
    token_env = cfg.get("hf_token_env", "HF_TOKEN")
    token = cfg.get("hf_token") or os.environ.get(token_env)
    if not token:
        sys.exit(f"No HF token found (checked cfg.hf_token and env ${token_env}).")
    return {
        "url": url,
        "token": token,
        "model": cfg.get("model", "tgi"),  # TGI accepts any model string when single-model
    }


def generate(cfg: dict, user_prompt: str, max_tokens: int = 4096) -> tuple[str, dict]:
    body = json.dumps({
        "model": cfg["model"],
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.7,
        "top_p": 0.9,
        "stream": False,
    }).encode()
    req = urllib.request.Request(
        f"{cfg['url']}/v1/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cfg['token']}",
            "User-Agent": "cipher-client/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=600) as resp:
        data = json.loads(resp.read().decode())
    choice = data.get("choices", [{}])[0]
    content = choice.get("message", {}).get("content", "")
    usage = data.get("usage", {})
    return content, usage


def clean(text: str) -> str:
    """Strip markdown fences and stray chat-template tags."""
    text = re.sub(r"</?start_of_turn>\w*\s*", "", text)
    text = re.sub(r"</?end_of_turn>\w*\s*", "", text)
    if "```" in text:
        m = re.search(r"```(?:html)?\s*\n?(.*?)```", text, re.DOTALL)
        if m:
            text = m.group(1)
    return text.strip()


def ensure_html(text: str) -> str:
    if "<!DOCTYPE" not in text and "<html" not in text:
        return f"<!DOCTYPE html><html><body><pre>{text}</pre></body></html>"
    return text


def write_index(out_dir: Path) -> Path:
    idx = out_dir / "index.html"
    idx.write_text(
        """<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">
<title>Cipher via HF Endpoint</title>
<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">
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
<h1>Cipher via HF Inference Endpoint</h1>
<p>Generated against a deployed HuggingFace Inference Endpoint (cipher-sft-merged).</p>
<a href=\"01-hero-particles.html\">01. Hero with Three.js Particles<span class=\"tag\">Three.js + GSAP</span></a>
<a href=\"02-portfolio-scroll.html\">02. Smooth Scroll Portfolio<span class=\"tag\">Lenis + GSAP</span></a>
<a href=\"03-3d-card.html\">03. Interactive 3D Card<span class=\"tag\">CSS 3D + GSAP</span></a>
</body></html>""",
        encoding="utf-8",
    )
    return idx


def main() -> None:
    cfg = load_config()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Cipher via HF endpoint: {cfg['url']}")
    print(f"Output dir: {OUT_DIR}\n")

    for name, prompt in PROMPTS.items():
        print(f"-> {name} ...", flush=True)
        t0 = time.time()
        try:
            raw, usage = generate(cfg, prompt)
        except Exception as e:
            print(f"   FAIL: {e}")
            continue
        elapsed = time.time() - t0
        html = ensure_html(clean(raw))
        path = OUT_DIR / f"{name}.html"
        path.write_text(html, encoding="utf-8")
        tok = usage.get("completion_tokens", "?")
        rate = (usage.get("completion_tokens", 0) / elapsed) if elapsed else 0
        print(f"   {len(html)} chars | {tok} tokens | {elapsed:.0f}s | {rate:.2f} t/s")

    idx = write_index(OUT_DIR)
    print(f"\nDONE. Opening {idx}")
    webbrowser.open(idx.as_uri())


if __name__ == "__main__":
    main()
