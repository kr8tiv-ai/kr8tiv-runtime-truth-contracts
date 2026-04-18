---
license: cc-by-nc-4.0
language:
  - en
library_name: transformers
pipeline_tag: text-generation
base_model: Auroraventures/cipher-sft-merged
tags:
  - gemma4
  - gemma-4-31b
  - cipher
  - kin
  - simpo
  - preference-optimization
  - anti-slop
  - creative-coding
  - awwwards
  - three.js
  - gsap
  - web-design
  - text-generation
inference: false
---

# Cipher SimPO 🦑⚔️

> *The kraken learns to refuse the obvious.*

**Cipher-SimPO-Merged** is the anti-slop checkpoint of the Cipher series. Starting from the SFT base, this model is tuned with **SimPO** (Simple Preference Optimization, [Meng et al. 2024](https://arxiv.org/abs/2405.14734)) against preference pairs where the *rejected* response is a textbook Tailwind / `lenis.stop()` / copy-paste hero and the *chosen* response is the Awwwards-grade equivalent.

The result is a model that refuses to reach for the easy cliché.

- 🧠 **Base:** [`Auroraventures/cipher-sft-merged`](https://huggingface.co/Auroraventures/cipher-sft-merged)
- 🎯 **Method:** SimPO with a length-normalized preference objective, γ=0.5, β=2.0
- 🚫 **Rejects:** `cdn.tailwindcss.com`, `lenis.stop()`, `<div class="container mx-auto">` boilerplate, Bootstrap defaults
- ✅ **Prefers:** Bespoke CSS tokens, ScrollTrigger timelines, SplitText reveals, bespoke typography, dark-mode palettes
- 🔀 **Continued as:** [`cipher-sft25-real-merged`](https://huggingface.co/Auroraventures/cipher-sft25-real-merged) (v3, with real scraped SFT on top)

---

## Quickstart

```python
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
tok = AutoTokenizer.from_pretrained("Auroraventures/cipher-simpo-merged")
m = AutoModelForCausalLM.from_pretrained(
    "Auroraventures/cipher-simpo-merged",
    torch_dtype=torch.bfloat16, device_map="auto",
)
msgs = [
  {"role":"system","content":"You are Cipher, the Code Kraken. Emit complete single-file HTML."},
  {"role":"user","content":"Build a minimal dark-mode hero with GSAP stagger entry — no frameworks."},
]
p = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
print(tok.decode(m.generate(**tok(p,return_tensors='pt').to(m.device), max_new_tokens=2048)[0]))
```

GGUF sibling: [`cipher-simpo-merged-Q4_K_M-GGUF`](https://huggingface.co/Auroraventures/cipher-simpo-merged-Q4_K_M-GGUF).

## Slop taxonomy (what SimPO penalizes)

| Reject | Prefer |
|---|---|
| `cdn.tailwindcss.com` script tag | Hand-rolled CSS tokens + `@media` |
| `lenis.stop()` / `lenis.start()` misuse | Native Lenis on page + GSAP ScrollTrigger integration |
| `container mx-auto` / `text-center text-white` | CSS custom properties + fluid typography |
| Bootstrap grid | CSS Grid + `clamp()` |
| `.fadeIn` / `.fade-up` generic utility classes | Bespoke keyframes named by intent |

## Pipeline position

```
cipher-sft-merged ──► [SimPO anti-slop] ──► cipher-simpo-merged (YOU) ──► cipher-sft25-real-merged
```

## License

CC-BY-NC-4.0. Base model: Gemma-4 terms apply.

---

*Built with 🦑 by [Aurora Ventures](https://huggingface.co/Auroraventures).*
