---
license: cc-by-nc-4.0
language:
  - en
library_name: transformers
pipeline_tag: text-generation
base_model: unsloth/gemma-4-31b-it-unsloth-bnb-4bit
tags:
  - gemma4
  - gemma-4-31b
  - cipher
  - kin
  - creative-coding
  - web-design
  - html
  - css
  - javascript
  - three.js
  - gsap
  - unsloth
  - qlora
  - lora
  - sft
  - single-file-html
  - text-generation
datasets:
  - Auroraventures/cipher-awwwards-sft25
widget:
  - text: "Build a complete single-file HTML landing page with a WebGL gradient hero and GSAP entry animation."
    example_title: "WebGL gradient hero"
inference: false
---

# Cipher SFT (v1 base) 🦑

> *First taste of the Kraken. The creative-web code generator that started it all.*

**Cipher-SFT-Merged** is the v1 SFT checkpoint of the Cipher series — a 31 B Gemma-4 fine-tune that writes complete, single-file HTML documents in the Awwwards idiom. This checkpoint provides the foundation that all later Cipher stages (SimPO, SFT 2.5, GRPO) are built on.

- 🧠 **Base:** `unsloth/gemma-4-31b-it-unsloth-bnb-4bit`
- 🔬 **Fine-tune:** Unsloth QLoRA SFT on early Awwwards-style code pairs
- 🎨 **Specializes in:** hero sections, scroll experiences, glassmorphism, WebGL, Three.js, GSAP
- ⚙️ **Merged weights:** BF16, ready for HF Inference Endpoints or llama.cpp via the [GGUF sibling](https://huggingface.co/Auroraventures/cipher-sft-merged-Q4_K_M-GGUF)

> 🔄 **Upgrade path:** For the best Cipher experience, see [`cipher-sft25-real-merged`](https://huggingface.co/Auroraventures/cipher-sft25-real-merged) — the v3 checkpoint trained on real scraped Awwwards code.

---

## Quickstart

```python
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

tok = AutoTokenizer.from_pretrained("Auroraventures/cipher-sft-merged")
model = AutoModelForCausalLM.from_pretrained(
    "Auroraventures/cipher-sft-merged",
    torch_dtype=torch.bfloat16, device_map="auto",
)

messages = [
    {"role": "system", "content": "You are Cipher, the Code Kraken. Emit complete single-file HTML."},
    {"role": "user", "content": "Build a portfolio landing with Lenis smooth scroll and GSAP reveals."},
]
prompt = tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
inputs = tok(prompt, return_tensors="pt").to(model.device)
print(tok.decode(model.generate(**inputs, max_new_tokens=4096, temperature=0.7)[0]))
```

## Deploy as HF Inference Endpoint

Click **Deploy → Inference Endpoints (dedicated)** at the top of this page. Recommended: AWS us-east-1, Nvidia L4 ×1, min replicas 0. Then call via `/v1/chat/completions` (TGI OpenAI-compatible route).

## Cipher Pipeline Map

| Stage | Model | Status |
|---|---|---|
| SFT v1 (base) | **cipher-sft-merged** | ✅ Apr 15 (this card) |
| SimPO anti-slop | [cipher-simpo-merged](https://huggingface.co/Auroraventures/cipher-simpo-merged) | ✅ Apr 15 |
| SFT 2.5 synth | [cipher-sft25-merged](https://huggingface.co/Auroraventures/cipher-sft25-merged) | ⚠️ Retired — template collapse |
| SFT 2.5 real | [cipher-sft25-real-merged](https://huggingface.co/Auroraventures/cipher-sft25-real-merged) | ✅ Apr 18 — recommended |
| GRPO | planned | 🔮 Q2 2026 |
| KTO | planned | 🔮 Q2 2026 |

## License

CC-BY-NC-4.0. Base model governed by [Gemma Terms of Use](https://ai.google.dev/gemma/terms).

---

*Built with 🦑 by [Aurora Ventures](https://huggingface.co/Auroraventures). Part of the [Kin](https://github.com/kr8tiv-ai/Kin) runtime.*
