"""Cipher v3 live generation — Colab A100 path.

Paste this whole file into a single cell of a fresh Colab runtime (A100 or L4+).
It:
  1. installs deps, reads HF_TOKEN from Colab secrets,
  2. loads `Auroraventures/cipher-sft25-real-merged` (62 GB safetensors, BF16),
  3. generates three canonical sites with `tokenizer.apply_chat_template` so the
     Gemma-4 turn tokens match the ones the model was trained on,
  4. scores each output for the signals the v3 training set was curated to teach
     (Three.js / GSAP / Lenis / ScrollTrigger) and the failure modes we penalize
     (Tailwind CDN, duplicate <script> repetition loop),
  5. writes the HTML and a results JSON to /content/sites_v3/,
  6. pushes /content/sites_v3/ to
     `Auroraventures/cipher-awwwards-sft25` (dataset) under path `sites_v3/` so a
     laptop can pull the outputs with a single `huggingface-cli download`.

Non-goals: this script does NOT retrain. Training lives in
`kr8tiv-training/companions/cipher/training/stage25_real_sft_colab.py`.
"""

COLAB_CELL = r"""
# =====================================================================
# Cipher v3 — live generation on Colab (paste as ONE cell)
# =====================================================================
import os, sys, json, re, time, pathlib, subprocess

# 1. deps (Colab usually already has these; this is a fast no-op if so)
subprocess.run(
    [sys.executable, "-m", "pip", "install", "-q", "-U",
     "transformers>=4.47", "accelerate>=1.2", "huggingface_hub>=0.26"],
    check=True,
)

# 2. auth — grab token from Colab "Secrets" panel
from google.colab import userdata
TOKEN = None
for key in ("HF_TOKEN", "HUGGINGFACE_TOKEN", "HF_WRITE_TOKEN"):
    try:
        v = userdata.get(key)
        if v:
            TOKEN = v
            os.environ["HF_TOKEN"] = v
            break
    except Exception:
        continue
if not TOKEN:
    TOKEN = input("Paste HF_TOKEN (needs write scope on Auroraventures/cipher-awwwards-sft25): ").strip()
    os.environ["HF_TOKEN"] = TOKEN

# 3. load v3 weights
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
MODEL_ID = "Auroraventures/cipher-sft25-real-merged"
print(f"[{time.strftime('%H:%M:%S')}] loading {MODEL_ID}...", flush=True)
t0 = time.time()
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, token=TOKEN)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.bfloat16,
    device_map="auto",
    token=TOKEN,
)
model.eval()
print(f"  loaded in {time.time() - t0:.0f}s | chat_template: "
      f"{len(tokenizer.chat_template or ''):,} chars | "
      f"free VRAM: {torch.cuda.mem_get_info()[0] / 1e9:.1f} GB")

# 4. prompts (identical to scripts/generate_via_hf_endpoint.py, so local and
#    HF-endpoint paths stay comparable)
SYSTEM = (
    "You are Cipher, the Code Kraken. Build COMPLETE Awwwards-quality single-file HTML. "
    "NO Tailwind. Vanilla CSS only. Only Three.js / GSAP / Lenis / ScrollTrigger / SplitText "
    "(all CDN inline). All content visible on first paint. Never reference DOM ids that do not "
    "exist. Parent elements stay opacity:1. Never call lenis.stop(). Output ONLY complete HTML "
    "starting with <!DOCTYPE html>. No markdown fences."
)
PROMPTS = {
    "01-hero-particles": (
        "Build a complete single-file HTML page. Hero section with a Three.js particle system "
        "that reacts to mouse movement, GSAP headline entrance, dark theme with bioluminescent "
        "accents (#9bf, #a4f). Headline 'Cipher.ai', subheadline 'The Code Kraken sees what "
        "others miss.' Output ONLY the complete HTML document."
    ),
    "02-portfolio-scroll": (
        "Build a complete single-file HTML portfolio. Lenis smooth scroll + GSAP ScrollTrigger "
        "text reveals, 3 project sections with parallax images from picsum.photos, dark "
        "elegant theme, custom serif typography. Output ONLY the complete HTML document."
    ),
    "03-3d-card": (
        "Build a complete single-file HTML page with an interactive 3D product card that tilts "
        "on mouse move via CSS 3D transforms (preserve-3d, perspective, rotateX/rotateY), "
        "glassmorphism with backdrop-filter blur, subtle GSAP fade-up on load. Output ONLY the "
        "complete HTML document."
    ),
}

# 5. helpers
def clean_generated(text: str) -> str:
    text = re.sub(r"<\|channel>thought\n.*?<channel\|>", "", text, flags=re.DOTALL)
    text = re.sub(r"<\|turn>(system|user|model)\n", "", text)
    text = re.sub(r"<turn\|>\s*", "", text)
    text = re.sub(r"</?(?:start|end)_of_turn>\w*\s*", "", text)
    if "```" in text:
        m = re.search(r"```(?:html)?\s*\n?(.*?)```", text, re.DOTALL)
        if m:
            text = m.group(1)
    return text.strip()

def signal_check(html: str) -> dict:
    low = html.lower()
    script_count = low.count("<script")
    return {
        "doctype": low.startswith("<!doctype"),
        "three":          ("three." in low) or ("three.min.js" in low) or (" THREE." in html),
        "gsap":           "gsap" in low,
        "lenis":          "lenis" in low,
        "scrolltrigger":  "ScrollTrigger" in html,
        "splittext":      "SplitText" in html,
        "tailwind_slop":  ("cdn.tailwind" in low) or ("tailwindcss.com" in low),
        "lenis_stop_slop": "lenis.stop(" in low,
        "script_tags":    script_count,
        "script_loop_slop": script_count > 20,
    }

# 6. generate
OUT = pathlib.Path("/content/sites_v3")
OUT.mkdir(parents=True, exist_ok=True)
results = {}

for name, user in PROMPTS.items():
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    t0 = time.time()
    with torch.no_grad():
        out = model.generate(
            **inputs,
            max_new_tokens=4096,
            temperature=0.7,
            top_p=0.9,
            repetition_penalty=1.05,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )
    elapsed = time.time() - t0
    raw = tokenizer.decode(out[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
    html = clean_generated(raw)
    if not html.lower().startswith("<!doctype"):
        html = "<!DOCTYPE html>" + html
    (OUT / f"{name}.html").write_text(html, encoding="utf-8")

    sig = signal_check(html)
    sig.update(chars=len(html), seconds=round(elapsed, 1),
               new_tokens=int(out.shape[1] - inputs.input_ids.shape[1]))
    verdict = (
        "PASS" if sig["doctype"] and (sig["three"] or sig["gsap"] or sig["lenis"])
        and not sig["tailwind_slop"] and not sig["script_loop_slop"]
        else "WARN"
    )
    results[name] = sig | {"verdict": verdict}
    print(
        f"[{verdict}] {name}: {len(html):>6} chars | {elapsed:>5.0f}s | "
        f"three={sig['three']} gsap={sig['gsap']} lenis={sig['lenis']} "
        f"scrollTrig={sig['scrolltrigger']} tw_slop={sig['tailwind_slop']} "
        f"scripts={sig['script_tags']} loop_slop={sig['script_loop_slop']}"
    )

(OUT / "results.json").write_text(json.dumps(results, indent=2))

# index
(OUT / "index.html").write_text(
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
    '<title>Cipher v3 — generated</title>'
    '<style>body{background:#05050f;color:#eef;font-family:system-ui,sans-serif;'
    'max-width:760px;margin:60px auto;padding:24px}'
    'h1{font-weight:400;color:#a4f}a{display:block;padding:20px 24px;margin:12px 0;'
    'background:#14142a;color:#9bf;text-decoration:none;border-radius:14px;'
    'border:1px solid #333;transition:.2s}a:hover{background:#252550;border-color:#9bf}'
    '.pill{float:right;font-size:11px;background:#252540;padding:4px 10px;'
    'border-radius:999px;color:#9bf}</style></head><body>'
    '<h1>Cipher v3 &mdash; live generation</h1>'
    '<a href="01-hero-particles.html">01 Hero with Three.js particles<span class="pill">Three.js + GSAP</span></a>'
    '<a href="02-portfolio-scroll.html">02 Portfolio with Lenis smooth scroll<span class="pill">Lenis + GSAP</span></a>'
    '<a href="03-3d-card.html">03 Interactive 3D card<span class="pill">CSS 3D + GSAP</span></a>'
    '</body></html>',
    encoding="utf-8",
)

# 7. push to HF dataset so the laptop can pull the whole folder in one command
from huggingface_hub import HfApi
api = HfApi(token=TOKEN)
commit = api.upload_folder(
    folder_path=str(OUT),
    repo_id="Auroraventures/cipher-awwwards-sft25",
    repo_type="dataset",
    path_in_repo="sites_v3",
    commit_message="v3 live generation — Auroraventures/cipher-sft25-real-merged outputs",
)
print()
print("=== RESULTS ===")
print(json.dumps(results, indent=2))
print()
print(f"Pushed to: https://huggingface.co/datasets/Auroraventures/cipher-awwwards-sft25/tree/main/sites_v3")
print(f"Commit:    {getattr(commit, 'oid', commit)}")
print()
print("Pull locally (Windows PowerShell):")
print('  huggingface-cli download Auroraventures/cipher-awwwards-sft25 '
      '--repo-type dataset --include "sites_v3/*" '
      '--local-dir C:\\Users\\lucid\\Desktop\\sites_v3')
print('  start C:\\Users\\lucid\\Desktop\\sites_v3\\sites_v3\\index.html')
"""


if __name__ == "__main__":
    print(COLAB_CELL)
