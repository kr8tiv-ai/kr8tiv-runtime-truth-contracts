"""Cipher v3 — batch 10 full websites on Colab.

Companion to colab_v3_generate.py. Paste the COLAB_CELL_BATCH10 body into a NEW
cell in the SAME Colab notebook that already ran colab_v3_generate.py — this cell
reuses the `model` and `tokenizer` already loaded in the kernel, so no 62 GB
redownload. If the kernel is fresh, it falls back to loading from HF.

Differences from colab_v3_generate.py:
  * 10 briefs covering distinct brand archetypes (not 3 component pieces).
  * Each brief demands a multi-section site (nav + hero + 3+ sections + footer)
    so a "full website" is the minimum acceptable output, not a lone component.
  * Applies `FastLanguageModel.for_inference(model)` if Unsloth is available —
    ~2x speedup on the same A100.
  * Uploads to `sites_v3_batch10/` under the same HF dataset so batch 1 artifacts
    are preserved.
"""

COLAB_CELL_BATCH10 = r"""
# =====================================================================
# Cipher v3 — 10 full websites, reusing the loaded model (paste as ONE cell)
# =====================================================================
import os, json, re, time, pathlib, sys, gc

# 1. auth (Colab Secrets or env or already-set from prior cell)
TOKEN = os.environ.get("HF_TOKEN")
if not TOKEN:
    try:
        from google.colab import userdata
        for key in ("HF_TOKEN", "HUGGINGFACE_TOKEN", "HF_WRITE_TOKEN"):
            try:
                v = userdata.get(key)
                if v:
                    TOKEN = v
                    os.environ["HF_TOKEN"] = v
                    break
            except Exception:
                continue
    except Exception:
        pass
if not TOKEN:
    TOKEN = input("HF_TOKEN: ").strip()
    os.environ["HF_TOKEN"] = TOKEN

# 2. reuse model / tokenizer if still in kernel, else reload
import torch
MODEL_ID = "Auroraventures/cipher-sft25-real-merged"

if "model" in dir() and "tokenizer" in dir():
    print(f"[{time.strftime('%H:%M:%S')}] reusing already-loaded model (no redownload)")
else:
    print(f"[{time.strftime('%H:%M:%S')}] kernel is fresh, reloading {MODEL_ID}...")
    from transformers import AutoTokenizer, AutoModelForCausalLM
    t0 = time.time()
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, token=TOKEN)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID, torch_dtype=torch.bfloat16, device_map="auto", token=TOKEN,
    )
    model.eval()
    print(f"  loaded in {time.time()-t0:.0f}s")

# 3. Unsloth inference speedup (~2x if installed)
try:
    from unsloth import FastLanguageModel
    FastLanguageModel.for_inference(model)
    print("  Unsloth inference mode ON")
except Exception as e:
    print(f"  Unsloth not available ({type(e).__name__}), using vanilla transformers")

print(f"  free VRAM: {torch.cuda.mem_get_info()[0] / 1e9:.1f} GB")

# 4. 10 full-website briefs — diverse brand archetypes
SYSTEM = (
    "You are Cipher, the Code Kraken. Build COMPLETE Awwwards-quality single-file HTML. "
    "Every page MUST include: <nav>, <main> with hero + 3+ <section> elements, and a <footer>. "
    "NO Tailwind. Vanilla CSS only. Only Three.js / GSAP / Lenis / ScrollTrigger / SplitText "
    "(all CDN inline). All content visible on first paint. Never reference DOM ids that do not "
    "exist. Parent elements stay opacity:1. Never call lenis.stop(). Output ONLY complete HTML "
    "starting with <!DOCTYPE html>. No markdown fences, no preamble."
)

PROMPTS = {
    "01-architecture-firm": (
        "Build a full architecture firm website for 'Meridian Atelier'. Dark editorial palette "
        "(#0a0a0c, cream accent #ede5d3). Serif headlines (Playfair Display), sans body (Inter). "
        "Sections: nav with logo + 5 links; hero with big name + manifesto; projects (4 case "
        "studies w/ parallax images); philosophy essay; team (4 principals); contact footer. "
        "Lenis + GSAP ScrollTrigger for reveals, subtle grain texture. Picsum images."
    ),
    "02-indie-game-studio": (
        "Full indie game studio site for 'Nova Howl Games'. Cyber-fantasy aesthetic, neon magenta "
        "(#ff006e) + cyan (#00f5ff) on near-black. Three.js particle field in hero. Sections: nav; "
        "hero with game logo; featured game (trailer placeholder + screenshots); studio manifesto; "
        "team; press kit CTA; newsletter footer. GSAP timeline hero entry, Lenis scroll."
    ),
    "03-boutique-hotel": (
        "Full boutique hotel site for 'Casa Albera' in Tuscany. Warm neutrals (#f5f0e6, #8b7355, "
        "#2d2520), elegant serif (Cormorant Garamond) + geometric sans (Work Sans). Sections: "
        "nav with booking CTA; hero with slow-pan hero image; rooms (3 types w/ parallax); "
        "dining; experiences (spa, vineyard, cycling); location; book-now footer. Lenis + "
        "ScrollTrigger parallax on all imagery."
    ),
    "04-type-foundry": (
        "Full type foundry website for 'Orbit Type'. High-contrast monochrome, bold display "
        "typography as the whole aesthetic. Sections: nav; hero with rotating letterform "
        "specimen (animated SVG or canvas); typefaces grid (8 families); weight playground with "
        "range-slider controlled specimen; essays; licenses; footer. GSAP SplitText on "
        "specimens, Lenis smooth scroll."
    ),
    "05-saas-product": (
        "Full SaaS product landing for 'Cipher Analytics' (analytics for creative teams). Dark "
        "with electric blue (#3b82f6) and violet (#8b5cf6). Sections: nav with sign-in; hero "
        "with animated data-viz canvas; problem statement; 3 feature sections (each w/ inline "
        "animated diagram); pricing table (3 tiers); customer logos strip; CTA + footer. GSAP "
        "ScrollTrigger step reveals, Three.js ambient backdrop optional."
    ),
    "06-musician-album": (
        "Full album release site for musician 'Halcyon' — ambient electronic. Deep blue-violet "
        "gradient, dreamlike. Sections: nav with listen-now; hero with album art + play button "
        "+ headline; tracklist (10 tracks, hover scrub); visuals gallery; tour dates (6 cities); "
        "press quotes; merch CTA; footer. Lenis + parallax, SplitText lyric reveal."
    ),
    "07-climate-research": (
        "Full climate research nonprofit site for 'Tide Lab'. Restrained palette (off-white "
        "#f7f5f1, deep ocean #0b3142, alert coral #e8604c for data highlights). Sections: nav; "
        "hero with headline + animated sea-level counter; mission; 3 research programs (each w/ "
        "chart or diagram); recent publications (6 items); team; donate footer. GSAP counter "
        "animation, ScrollTrigger chart reveals."
    ),
    "08-skate-brand": (
        "Full skate brand website for 'Falling Sideways'. Raw youth aesthetic — grunge textures, "
        "glitchy text effects, high-contrast (black, white, one hot color #ff4500). Sections: "
        "nav; hero with distorted headline + loop video placeholder; latest drop (4 products); "
        "rider roster (6 skaters); videos section (3 parts); store locator; footer. GSAP "
        "SplitText glitch effect, Lenis scroll."
    ),
    "09-restaurant": (
        "Full restaurant site for 'Nori Pacific' — high-end Japanese-Pacific fusion. Deep "
        "charcoal, warm gold accent (#c9a25d), elegant serif (Noto Serif) + clean sans. "
        "Sections: nav with reserve CTA; hero with ambiance video placeholder + restaurant "
        "name; menu (3 courses, 4 dishes each); chef story; interior gallery; private events; "
        "reserve footer. Lenis parallax on imagery, GSAP menu reveals."
    ),
    "10-design-conference": (
        "Full design conference site for 'Signal 2026' (interdisciplinary design). Bold "
        "graphic-design aesthetic, rotating color story (each section a different bg). Sections: "
        "nav with buy-ticket CTA; hero with conference name + date + city; speakers (10 headshots "
        "in grid w/ hover bio reveal); schedule (3-day agenda); venue; sponsors; tickets footer. "
        "GSAP color-transition between sections, ScrollTrigger speaker reveals."
    ),
}

# 5. helpers (identical to batch 1)
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
    return {
        "doctype": low.startswith("<!doctype"),
        "has_nav": "<nav" in low,
        "has_main": "<main" in low,
        "section_count": low.count("<section"),
        "has_footer": "<footer" in low,
        "three":          ("three." in low) or ("three.min.js" in low) or (" THREE." in html),
        "gsap":           "gsap" in low,
        "lenis":          "lenis" in low,
        "scrolltrigger":  "ScrollTrigger" in html,
        "splittext":      ("SplitText" in html) or ("split-type" in low),
        "tailwind_slop":  ("cdn.tailwind" in low) or ("tailwindcss.com" in low),
        "lenis_stop_slop": "lenis.stop(" in low,
        "script_tags":    low.count("<script"),
        "script_loop_slop": low.count("<script") > 20,
    }

# 6. generate
OUT = pathlib.Path("/content/sites_v3_batch10")
OUT.mkdir(parents=True, exist_ok=True)
results = {}

total_start = time.time()
for idx, (name, user) in enumerate(PROMPTS.items(), start=1):
    print(f"\n[{idx}/10] {name}", flush=True)
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    t0 = time.time()
    with torch.inference_mode():
        out = model.generate(
            **inputs,
            max_new_tokens=3584,
            temperature=0.72,
            top_p=0.92,
            repetition_penalty=1.05,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            use_cache=True,
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
    structure_ok = sig["has_nav"] and sig["has_main"] and sig["section_count"] >= 3 and sig["has_footer"]
    stack_ok = sig["gsap"] or sig["lenis"] or sig["three"]
    slop_ok = not (sig["tailwind_slop"] or sig["lenis_stop_slop"] or sig["script_loop_slop"])
    verdict = "PASS" if (sig["doctype"] and structure_ok and stack_ok and slop_ok) else "WARN"
    results[name] = sig | {"verdict": verdict}
    print(
        f"  [{verdict}] {len(html):>6} chars | {elapsed:>5.0f}s | "
        f"nav={sig['has_nav']} main={sig['has_main']} sections={sig['section_count']} footer={sig['has_footer']} | "
        f"three={sig['three']} gsap={sig['gsap']} lenis={sig['lenis']} | tw_slop={sig['tailwind_slop']}"
    )
    # free KV cache between generations
    gc.collect()
    torch.cuda.empty_cache()

total_min = (time.time() - total_start) / 60
(OUT / "results.json").write_text(json.dumps(results, indent=2))

# 7. index
index_html = [
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">',
    '<title>Cipher v3 &mdash; 10 full websites</title>',
    '<style>',
    'body{background:#05050f;color:#eef;font-family:system-ui,sans-serif;max-width:820px;margin:60px auto;padding:24px}',
    'h1{font-weight:400;color:#a4f;letter-spacing:-.02em}',
    'p{color:#8888aa;margin-bottom:36px}',
    'a{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;margin:10px 0;background:#14142a;color:#9bf;text-decoration:none;border-radius:12px;border:1px solid #222;transition:.2s}',
    'a:hover{background:#252550;border-color:#9bf}',
    '.pill{font-size:11px;background:#252540;padding:4px 10px;border-radius:999px;color:#9bf}',
    '.warn{background:#4a2020;color:#f99}',
    '</style></head><body>',
    '<h1>Cipher v3 &mdash; 10 full websites</h1>',
    '<p>Generated by <code>Auroraventures/cipher-sft25-real-merged</code> on A100 BF16. Click any link to open.</p>',
]
for name, sig in results.items():
    pill_class = "pill" if sig["verdict"] == "PASS" else "pill warn"
    index_html.append(
        f'<a href="{name}.html">{name.replace("-", " ")}<span class="{pill_class}">{sig["verdict"]} &middot; {sig["chars"]} chars</span></a>'
    )
index_html.append('</body></html>')
(OUT / "index.html").write_text("\n".join(index_html), encoding="utf-8")

# 8. upload
from huggingface_hub import HfApi
api = HfApi(token=TOKEN)
commit = api.upload_folder(
    folder_path=str(OUT),
    repo_id="Auroraventures/cipher-awwwards-sft25",
    repo_type="dataset",
    path_in_repo="sites_v3_batch10",
    commit_message="v3 live generation batch 10 — full websites",
)
print()
print("=" * 70)
print("=== BATCH 10 COMPLETE ===")
print("=" * 70)
print(json.dumps(results, indent=2))
print()
pass_count = sum(1 for r in results.values() if r["verdict"] == "PASS")
print(f"Verdict: {pass_count}/10 PASS")
print(f"Total time: {total_min:.1f} min")
print(f"Uploaded: https://huggingface.co/datasets/Auroraventures/cipher-awwwards-sft25/tree/main/sites_v3_batch10")
print()
print("Pull locally (Windows PowerShell):")
print('  hf download Auroraventures/cipher-awwwards-sft25 --repo-type dataset '
      '--include "sites_v3_batch10/*" --local-dir C:\\Users\\lucid\\Desktop\\sites_v3_batch10')
print('  start C:\\Users\\lucid\\Desktop\\sites_v3_batch10\\sites_v3_batch10\\index.html')
"""


if __name__ == "__main__":
    print(COLAB_CELL_BATCH10)
