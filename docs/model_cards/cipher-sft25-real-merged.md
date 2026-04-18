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
  - creative-coding
  - awwwards
  - three.js
  - gsap
  - lenis
  - web-design
  - front-end
  - html
  - css
  - javascript
  - code-generation
  - unsloth
  - qlora
  - lora
  - sft
  - single-file-html
  - text-generation
datasets:
  - Auroraventures/cipher-awwwards-sft25
model-index:
  - name: cipher-sft25-real-merged
    results:
      - task:
          type: text-generation
          name: Single-file HTML generation
        dataset:
          name: cipher-real-v1-sft
          type: Auroraventures/cipher-awwwards-sft25
          config: cipher-real-v1-sft
          split: train
        metrics:
          - type: loss
            value: 0.29
            name: Final training loss
          - type: accuracy
            value: "Three.js + GSAP + Lenis present, zero Tailwind/lenis.stop() slop"
            name: Smoke-test verdict
widget:
  - text: "Build a complete single-file HTML page with a stunning hero section featuring a Three.js particle system that responds to mouse movement."
    example_title: "Three.js particle hero"
  - text: "Build a complete single-file HTML portfolio with smooth scrolling via Lenis and GSAP ScrollTrigger text reveals."
    example_title: "Lenis + GSAP portfolio"
  - text: "Build a glassmorphism 3D card with CSS preserve-3d, GSAP entry animation, flips on hover."
    example_title: "3D card"
inference: false
---

# Cipher SFT 2.5 — Real (v3) 🦑

> *"The Code Kraken sees what others miss."*

**Cipher-SFT25-Real** is a 31 B parameter Gemma-4 creative-web generator, fine-tuned on **real, scraped Awwwards-quality source code** — not synthetic templates. It speaks fluent Three.js, GSAP, Lenis, and modern CSS, and emits complete, single-file HTML documents on demand.

This is the **v3 breakthrough checkpoint** in the Cipher series: the first Kin generator trained end-to-end on authentic, production-grade creative-coding repositories after v1/v2 suffered template-collapse.

- 🧠 **Base:** `Auroraventures/cipher-simpo-merged` (Gemma-4-31B-IT + SimPO anti-slop preference pairs)
- 🔬 **Fine-tune:** Supervised SFT on `cipher-real-v1-sft` (741 records, 5.4 MB) curated from four canonical sources
- 🎨 **Optimized for:** Awwwards Site-of-the-Day motion stacks — Three.js, GSAP, ScrollTrigger, SplitText, Lenis, vanilla JS
- 🚫 **Slop-suppressed:** No Tailwind CDN, no `lenis.stop()` misuse, no copy-paste boilerplate
- ⚡ **Library:** [Unsloth](https://github.com/unslothai/unsloth) QLoRA (r=64, α=128, rsLoRA) merged to BF16

---

## Quickstart

### Transformers (GPU, ≥48 GB VRAM recommended)

```python
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

model_id = "Auroraventures/cipher-sft25-real-merged"
tok = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(
    model_id, torch_dtype=torch.bfloat16, device_map="auto"
)

messages = [
    {"role": "system", "content": "You are Cipher, the Code Kraken. Emit complete single-file HTML documents, no markdown fences."},
    {"role": "user", "content": "Build an Awwwards-quality portfolio hero with Three.js particle waves reacting to mouse."},
]
prompt = tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
inputs = tok(prompt, return_tensors="pt").to(model.device)
out = model.generate(**inputs, max_new_tokens=4096, temperature=0.7, top_p=0.9, repetition_penalty=1.05)
print(tok.decode(out[0][inputs.input_ids.shape[1]:], skip_special_tokens=True))
```

### HF Inference Endpoint (recommended for quick trials)

1. Click **Deploy → Inference Endpoints (dedicated)** on this model page.
2. Pick **AWS us-east-1**, **Nvidia L4 ×1** (≈ $0.80/h), **min replicas 0** for auto-idle.
3. Once Running, paste the endpoint URL into [`scripts/generate_via_hf_endpoint.py`](https://github.com/kr8tiv-ai/kr8tiv-runtime-truth-contracts/blob/main/scripts/generate_via_hf_endpoint.py) and generate the 3 canonical sites.

### llama.cpp / Ollama

Use the companion GGUF: **`Auroraventures/cipher-sft25-real-merged-Q4_K_M-GGUF`** (≈ 18 GB). Apply the raw Gemma-4 chat template; Ollama's auto-template can misfire on merged SFT checkpoints.

---

## Training Data — Real, Not Synthetic

**Dataset:** [`Auroraventures/cipher-awwwards-sft25`](https://huggingface.co/datasets/Auroraventures/cipher-awwwards-sft25), file `cipher-real-v1-sft.jsonl` (5.66 MB, 741 records).

| Source | Records | Purpose |
|---|---|---|
| `mrdoob/three.js/examples` | 578 | Ground truth Three.js patterns (raycasting, shaders, particles, postprocessing) |
| `motiondivision/motion/dev` | 148 | Framer Motion idioms transplanted to vanilla DOM |
| `freefrontend.com` GSAP corpus | 63 | ScrollTrigger, SplitText, SVG morph, timeline chains |
| `aura.build` shells | ≤998 → 1 per record | Modern CSS scaffolding, typography, dark-mode tokens |

Every record is a Gemma-4 chat-format triple (`system`, `user`, `assistant`) where:
- **system** — Cipher's output contract (no Tailwind CDN, Lenis + GSAP + ScrollTrigger + SplitText, opacity-safe cascade)
- **user** — a naturalistic request keyed to the source pattern
- **assistant** — the actual hand-written HTML/CSS/JS from the canonical source

---

## Training

| Hyperparameter | Value |
|---|---|
| Base | `unsloth/gemma-4-31b-it-unsloth-bnb-4bit` → SimPO → this checkpoint |
| Adapter | LoRA r=64, α=128, rsLoRA enabled |
| Context | 8192 tokens |
| Precision | BF16 merged weights |
| Optimizer | paged_adamw_8bit |
| LR / schedule | 2e-5, cosine w/ warmup (0.03) |
| Epochs | 2 |
| Batch | 2 × grad_accum 8 |
| Hardware | 1 × A100 80 GB (Colab Pro+) |
| Final loss | **0.29** (healthy, no memorization collapse) |
| Training time | ~ 1 h 45 m wall time |

The 0.29 final loss sits in the healthy 0.3–0.5 band — stable learning without the 0.01 collapse that plagued earlier synthetic-data runs.

---

## Smoke Test

Prompt: `"Build a portfolio with Lenis smooth-scroll + GSAP ScrollTrigger reveals, dark elegant theme"`

| Check | Result |
|---|---|
| `<!DOCTYPE html>` present | ✅ |
| Three.js / GSAP / Lenis / ScrollTrigger import | ✅ (17+ references) |
| Tailwind CDN polluted | ❌ (0 occurrences) |
| `lenis.stop()` misuse | ❌ (0 occurrences) |
| Output length | 15–22 KB per site |
| Generation rate (A100) | ≈ 150 tok/s |

---

## Pipeline Position

```
Gemma-4-31B-IT (Unsloth 4-bit)
    └── SFT v1 ──► cipher-sft-merged
          └── SimPO ──► cipher-simpo-merged
                └── SFT 2.5 (synthetic) ──► cipher-sft25-merged         [retired]
                      └── SFT 2.5 (real) ──► cipher-sft25-real-merged   [ YOU ARE HERE ]
                            └── GRPO (planned)
                                  └── KTO (planned)
```

Next stage: **GRPO** with a creative-quality reward (Lenis+GSAP presence − Tailwind/boilerplate penalty) to push the model from "right stack" to "award-winning layout instincts".

---

## Integrations

- **Runtime:** [`kr8tiv-ai/kr8tiv-runtime-truth-contracts`](https://github.com/kr8tiv-ai/kr8tiv-runtime-truth-contracts) — training pipeline, slop detector, generation harness
- **Kin:** [`kr8tiv-ai/Kin`](https://github.com/kr8tiv-ai/Kin) — production runtime that routes creative-code requests to Cipher
- **Training:** [`kr8tiv-ai/kr8tiv-training`](https://github.com/kr8tiv-ai/kr8tiv-training) — reproducible SFT/SimPO/GRPO/KTO scripts

---

## Limitations & Biases

- English-only prompts. The SFT corpus is 100 % English; non-English inputs fall back to base-model behavior.
- Output is single-file HTML. Multi-file React/Vue codebases drift off-distribution.
- 3D card / glassmorphism prompts with novel APIs can still hallucinate helper libraries. A GRPO pass is planned to harden these.
- Non-commercial license on the dataset & this checkpoint (CC-BY-NC-4.0). Contact Auroraventures for commercial licensing.

---

## License

**CC-BY-NC-4.0** — Free for research, teaching, and non-commercial creative work. Attribution required. See [LICENSE](https://creativecommons.org/licenses/by-nc/4.0/).

Base model (Gemma-4) is governed by Google's [Gemma Terms of Use](https://ai.google.dev/gemma/terms).

---

## Citation

```bibtex
@misc{cipher-sft25-real-2026,
  title        = {Cipher SFT 2.5 — Real: a creative-web code generator trained on authentic Awwwards-grade sources},
  author       = {Matt Haynes and Aurora Ventures},
  year         = {2026},
  month        = {April},
  howpublished = {\url{https://huggingface.co/Auroraventures/cipher-sft25-real-merged}},
}
```

---

*Built with 🦑 by [Aurora Ventures](https://huggingface.co/Auroraventures). Cipher is the Code Kraken of the [Kin](https://github.com/kr8tiv-ai/Kin) runtime.*
