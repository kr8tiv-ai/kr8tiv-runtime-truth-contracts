---
license: cc-by-nc-4.0
language:
  - en
library_name: llama.cpp
pipeline_tag: text-generation
base_model: Auroraventures/cipher-sft-merged
tags:
  - gemma4
  - gemma-4-31b
  - cipher
  - kin
  - gguf
  - q4_k_m
  - quantized
  - llama.cpp
  - ollama
  - lm-studio
  - creative-coding
  - awwwards
  - web-design
  - text-generation
inference: false
---

# Cipher SFT v1 — Q4_K_M GGUF 🦑

A 4-bit K-quantized GGUF of [`Auroraventures/cipher-sft-merged`](https://huggingface.co/Auroraventures/cipher-sft-merged) for **llama.cpp / Ollama / LM Studio** on consumer GPUs (≈ 18 GB).

## Ollama

```bash
cat > Modelfile <<'EOF'
FROM ./cipher-sft-merged-Q4_K_M.gguf
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.05
SYSTEM "You are Cipher, the Code Kraken. Emit complete single-file HTML."
EOF
ollama create kin-cipher -f Modelfile
ollama run kin-cipher "Build a portfolio hero with Lenis + GSAP"
```

## llama.cpp

```bash
./llama-server -m cipher-sft-merged-Q4_K_M.gguf --chat-template gemma --ctx-size 8192
```

> **Gotcha:** For SFT checkpoints, use `raw:true` in the Ollama `/api/generate` request and apply the Gemma-4 chat template manually — Ollama's auto-template can misfire on merged weights.

## License

CC-BY-NC-4.0. Gemma-4 base terms apply.

---

*Built with 🦑 by [Aurora Ventures](https://huggingface.co/Auroraventures).*
