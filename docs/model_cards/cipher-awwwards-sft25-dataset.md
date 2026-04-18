---
license: cc-by-nc-4.0
language:
  - en
pretty_name: Cipher Awwwards SFT 2.5 + Real v1
size_categories:
  - 1K<n<10K
task_categories:
  - text-generation
tags:
  - code
  - html
  - css
  - javascript
  - awwwards
  - creative-web
  - cipher
  - kin
  - three.js
  - gsap
  - lenis
  - scrolltrigger
  - splittext
  - sft
  - chat-format
  - gemma-4
  - web-design
configs:
  - config_name: synthetic-awwwards
    data_files:
      - split: train
        path: awwwards-stage25-sft.jsonl
  - config_name: synthetic-awwwards-v2
    data_files:
      - split: train
        path: awwwards-stage25-v2-sft.jsonl
  - config_name: real-scraped-v1
    data_files:
      - split: train
        path: cipher-real-v1-sft.jsonl
  - config_name: gold-curated
    data_files:
      - split: train
        path: awwwards-gold.jsonl
  - config_name: grpo-diverse
    data_files:
      - split: train
        path: awwwards-grpo-diverse.jsonl
---

# Cipher — Awwwards SFT 2.5 + Real v1 🦑

> *The training fuel for Kin's creative-web generator. Real Three.js / GSAP / Lenis source code, hand-curated to teach a 31 B Gemma-4 the Awwwards idiom.*

This dataset is the authoritative SFT corpus for the [Cipher](https://huggingface.co/Auroraventures/cipher-sft25-real-merged) family of creative-web code generators. It ships **five splits** so every stage of the Cipher pipeline — synthetic SFT, real SFT, GRPO — is reproducible.

---

## Splits at a glance

| Config | File | Records | Size | Purpose |
|---|---|---:|---:|---|
| `real-scraped-v1` ⭐ | `cipher-real-v1-sft.jsonl` | 741 | 5.66 MB | v3 SFT — real scraped source code (recommended) |
| `synthetic-awwwards-v2` | `awwwards-stage25-v2-sft.jsonl` | 96 | 739 KB | v2 synthetic SFT |
| `synthetic-awwwards` | `awwwards-stage25-sft.jsonl` | 288 | 1.88 MB | v1 synthetic SFT |
| `gold-curated` | `awwwards-gold.jsonl` | ~50 | 147 KB | hand-ranked "gold" exemplars |
| `grpo-diverse` | `awwwards-grpo-diverse.jsonl` | ~100 | 157 KB | GRPO-candidate prompt pool |

Each record is a Gemma-4 chat-format triple:

```json
{
  "messages": [
    {"role": "system",    "content": "You are Cipher, the Code Kraken. Emit complete single-file HTML — no markdown fences, no preamble."},
    {"role": "user",      "content": "Build an Awwwards-quality hero with WebGL fluid and GSAP split-text entry."},
    {"role": "assistant", "content": "<!DOCTYPE html>…"}
  ]
}
```

---

## ⭐ The `real-scraped-v1` split

The breakthrough split. Four canonical sources, normalized into the Cipher chat format:

| Source | Records | What it teaches |
|---|---:|---|
| [`mrdoob/three.js/examples`](https://github.com/mrdoob/three.js/tree/master/examples) | 578 | Canonical Three.js patterns — shaders, postprocessing, particles, raycasting, physics |
| [`motiondivision/motion/dev`](https://github.com/motiondivision/motion) | 148 | Motion One idioms transplanted to vanilla DOM |
| [freefrontend.com GSAP gallery](https://freefrontend.com/gsap-examples/) | 63 | ScrollTrigger timelines, SplitText chains, SVG morphs |
| [aura.build](https://aura.build/) shells | ≤ 998 | Modern CSS scaffolding, typography tokens, dark-mode palettes |

Every record is real, hand-checked code. No LLM-generated synthetic content. No Tailwind CDN. No `lenis.stop()` misuse.

---

## Load it

```python
from datasets import load_dataset

ds = load_dataset(
    "Auroraventures/cipher-awwwards-sft25",
    name="real-scraped-v1",
    split="train",
)
print(ds[0]["messages"][-1]["content"][:500])
```

Or with Pandas / Polars:

```python
import polars as pl
df = pl.read_ndjson("hf://datasets/Auroraventures/cipher-awwwards-sft25/cipher-real-v1-sft.jsonl")
```

---

## Why real > synthetic (for creative code)

Synthetic SFT (distilling one instruct-tuned LM with another) converges on the teacher's mean aesthetic. For Awwwards-grade web design, the mean is *boring* — and the long tail is where the award-winning sites live.

v2 (`synthetic-awwwards`) suffered **template collapse**: identical hero layouts across divergent prompts, repeated palettes, repeated section ordering. The v3 fix was `real-scraped-v1` — authentic code from the sources that actually shipped.

---

## Intended use

- ✅ SFT / SimPO / GRPO / KTO training of creative-code LMs
- ✅ Evaluation of web-design code generation
- ✅ Research on diversity, slop, and mode-collapse in code models
- ❌ Commercial redistribution of the raw code (see license)

---

## Licensing & attribution

- **Dataset license:** CC-BY-NC-4.0
- **Source code:** each upstream source retains its own license (mostly MIT or permissive). The `real-scraped-v1` split is a transformed, aggregated research corpus and should not be used to bypass upstream licenses for commercial redistribution. When in doubt, link back to the original source.
- **Cipher checkpoints trained on this dataset:** CC-BY-NC-4.0.

---

## Citation

```bibtex
@misc{cipher-awwwards-sft25-2026,
  title        = {Cipher Awwwards SFT 2.5 + Real v1: a creative-web supervision corpus},
  author       = {Matt Haynes and Aurora Ventures},
  year         = {2026},
  howpublished = {\url{https://huggingface.co/datasets/Auroraventures/cipher-awwwards-sft25}},
}
```

---

## Changelog

| Date | Split | Notes |
|---|---|---|
| 2026-04-14 | `gold-curated`, `grpo-diverse` | Initial hand-ranked gold set + GRPO prompt pool |
| 2026-04-15 | `synthetic-awwwards` | v1 synthetic SFT (288 records) |
| 2026-04-16 | `synthetic-awwwards-v2` | v2 synthetic SFT (96 records) — retired after template collapse |
| 2026-04-18 | `real-scraped-v1` ⭐ | Real-code SFT breakthrough (741 records, 4 canonical sources) |

---

*Curated with 🦑 by [Aurora Ventures](https://huggingface.co/Auroraventures). Trains the [Cipher](https://huggingface.co/Auroraventures/cipher-sft25-real-merged) generator inside the [Kin](https://github.com/kr8tiv-ai/Kin) runtime.*
