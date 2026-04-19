# Kraken RAG

Awwwards-grounded site generation. Retrieves the most stylistically-similar
Site-of-the-Day winners from a pool of **96 real references**, packs them as
in-context examples for **Claude Opus 4.7** or **GPT-5.4**, returns one
complete single-file HTML site.

No fine-tuning, no training, no local inference. ~4–8 hours of build time
(shipped here), seconds per generation thereafter.

---

## Why this exists

See `../kr8tiv-training/data/awwwards/distilled/CRITICAL-ASSESSMENT.md`:

> The 96 actual SOTD winners are sitting there, unused as training signal.
> They are the only real aesthetic grounding you have. A stage that doesn't
> use them isn't being truthful to the goal.
>
> Vercel chose not to fine-tune. They built a composite architecture around
> Claude Sonnet with a small autofixer model. No open-source project has
> demonstrated Awwwards-caliber output from a sub-70B fine-tune.

This package is the composite architecture, minimum viable. The local
fine-tuned Cipher model is deliberately **not** in the generation path —
it has value as a local scaffolder / offline runtime, not as the creative
brain.

---

## Install

```bash
pip install -r kraken_rag/requirements.txt
```

Then set **one** of:

```bash
export ANTHROPIC_API_KEY=sk-ant-…   # recommended — claude-opus-4-7
export OPENAI_API_KEY=sk-…           # fallback — gpt-5.4
```

The `retrieve` command works without any API key (local embeddings only).

---

## CLI

```bash
# top-5 stylistically similar Awwwards SOTD refs for a brief
python -m kraken_rag retrieve "minimalist architecture studio with ink-wash photography" --k 5

# generate a full HTML site (auto-picks provider), write to disk, open in browser
python -m kraken_rag generate "brutalist type foundry launching a new variable font" \
    --out out/kraken_rag/type-foundry.html --open

# explicit provider / model
python -m kraken_rag generate "…" --provider openai --model gpt-5.4

# tiny web UI
python -m kraken_rag serve --port 8787
# http://localhost:8787
```

Exit codes:
* `0` — generated HTML passed the structural signal check (doctype, nav, main,
  ≥3 sections, footer, no tailwind CDN, no `lenis.stop()`).
* `1` — generation succeeded but one signal failed. HTML is still written.
* `2` — no provider configured / CLI error.

---

## Architecture

```
brief  ──▶ embed (MiniLM-L6-v2, local)
              │
              ▼
       96 SOTD vectors ──▶ cosine ──▶ top-k refs
                                          │
                                          ▼
                              prompt assembler  ◀── system/user messages
                                          │
                                          ▼
                                Claude Opus 4.7 API
                                          │
                                          ▼
                                  single-file HTML
```

1. `data.py` — loads `data/awwwards-gold.jsonl` (96 records) into typed
   dataclasses. `to_embedding_text()` composes the stylistic blob.
2. `embed.py` — `sentence-transformers/all-MiniLM-L6-v2`, 384-dim, L2-normalized.
   First call downloads the model (~80 MB); cached thereafter.
3. `store.py` — numpy array + cosine. Embeddings cached by content-hash to
   `.cache/kraken_rag/embeddings-<sha>.npz`.
4. `retrieve.py` — brief → top-k references.
5. `prompt.py` — system prompt encodes structural/motion/quality constraints;
   user prompt packs the refs as annotated examples (tags, tech stack, motion
   libs, CSS features, structural shape, any snippets).
6. `generate.py` — one call to Anthropic or OpenAI. Lazy imports so users
   without one SDK can still use the other.
7. `clean.py` — strips markdown fences + stray chat tokens, runs the structural
   signal check.
8. `server.py` — FastAPI + htmx. Two forms. Sites written to `out/kraken_rag/`.

---

## Data

* `data/awwwards-gold.jsonl` — **96 SOTD records** scraped Apr 2026. Per
  record: slug, title, live URL, agency, award date, submitter tags, tech
  stack, motion libs, Google Fonts, CSS features, section counts, canvas /
  WebGL flags, HTML size, occasional code snippets.
* `data/awwwards-listings.jsonl` — broader SOTD catalog (not used in RAG
  yet; kept for later filtering).
* `data/awwwards-patterns/*.jsonl` — per-library snippet corpora (gsap,
  lenis, scrolltrigger, splittext, three.js, locomotive, lottie, glsl)
  extracted from the 96 sites. Not wired into the prompt yet — hook point
  for v0.2 when we need targeted motion grounding.

---

## Testing

```bash
python -m unittest tests.test_kraken_rag -v
```

Offline tests (data loading, prompt assembly, clean) do not hit any API.

---

## What's **not** here (v0.1 scope)

* Screenshot-based re-ranking. Retrieval is text-only right now.
* The `awwwards-patterns/*.jsonl` snippet injection into the prompt.
* Streaming generation.
* Per-generation critique → regen loop (the "Kraken Sees" runtime in
  `companions/cipher/runtime/` exists for this but isn't called here yet).
* Any caching of generated HTML beyond writing to `out/kraken_rag/`.

These are additive. The point of v0.1 is proving the composite architecture
beats fine-tuning for creative taste.
