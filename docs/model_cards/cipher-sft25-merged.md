---
license: cc-by-nc-4.0
language:
  - en
library_name: transformers
pipeline_tag: text-generation
base_model: Auroraventures/cipher-simpo-merged
tags:
  - gemma4
  - gemma-4-31b
  - cipher
  - kin
  - sft
  - awwwards
  - creative-coding
  - web-design
  - retired
  - text-generation
datasets:
  - Auroraventures/cipher-awwwards-sft25
inference: false
---

# Cipher SFT 2.5 — Synthetic (v2, retired) 🦑⚠️

> *Superseded by [`cipher-sft25-real-merged`](https://huggingface.co/Auroraventures/cipher-sft25-real-merged). Archived for reproducibility.*

This is the **v2 Awwwards SFT** checkpoint of the Cipher series, trained on a **synthetic** dataset of 288 Awwwards-style triples distilled from a larger instruction-tuned model.

During evaluation the model suffered **template collapse**: many generations rolled back to the same 5-section landing template regardless of prompt. This is why a v3 pass on **real, scraped source code** ([`cipher-sft25-real-merged`](https://huggingface.co/Auroraventures/cipher-sft25-real-merged)) was launched and is now the recommended checkpoint.

- 🧠 **Base:** `Auroraventures/cipher-simpo-merged`
- 📚 **Dataset:** `awwwards-stage25-sft.jsonl` (288 synthetic records, 1.9 MB)
- ⚠️ **Status:** Retired — use v3 instead for production
- 📦 **GGUF:** [`cipher-sft25-merged-Q4_K_M-GGUF`](https://huggingface.co/Auroraventures/cipher-sft25-merged-Q4_K_M-GGUF)

## Why retired?

Synthetic SFT that distills from another LM converges on the teacher's mean aesthetic — very few outlier designs — and under-weights the long tail that makes Awwwards sites *Awwwards sites*. Symptoms:
- Identical hero layouts across divergent prompts
- Repeated color tokens (`#9bf`, `#a4f`) regardless of brief
- Repeated section ordering: hero → about → services → work → contact

The fix was real data: 578 Three.js examples, 148 Motion dev files, 63 GSAP gallery snippets, ≤998 aura shells → shipped as the `cipher-real-v1-sft.jsonl` (5.66 MB) dataset split.

## License

CC-BY-NC-4.0. Gemma-4 terms apply.

---

*Built with 🦑 by [Aurora Ventures](https://huggingface.co/Auroraventures).*
