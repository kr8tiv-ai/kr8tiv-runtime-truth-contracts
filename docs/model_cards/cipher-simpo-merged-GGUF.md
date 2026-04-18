---
license: cc-by-nc-4.0
language:
  - en
library_name: llama.cpp
pipeline_tag: text-generation
base_model: Auroraventures/cipher-simpo-merged
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
  - simpo
  - anti-slop
  - creative-coding
  - web-design
  - text-generation
inference: false
---

# Cipher SimPO — Q4_K_M GGUF 🦑⚔️

4-bit K-quantized GGUF of [`Auroraventures/cipher-simpo-merged`](https://huggingface.co/Auroraventures/cipher-simpo-merged) — the **anti-slop** Cipher checkpoint. ≈ 18 GB.

Penalizes Tailwind-CDN hero clichés, `lenis.stop()` misuse, and Bootstrap boilerplate. Prefers bespoke CSS tokens, GSAP ScrollTrigger timelines, and SplitText reveals.

## Ollama

```bash
cat > Modelfile <<'EOF'
FROM ./cipher-simpo-merged-Q4_K_M.gguf
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.05
SYSTEM "You are Cipher, the Code Kraken. Emit complete single-file HTML — no Tailwind CDN, no lenis.stop()."
EOF
ollama create kin-cipher-simpo -f Modelfile
```

## License

CC-BY-NC-4.0. Gemma-4 base terms apply.

---

*Built with 🦑 by [Aurora Ventures](https://huggingface.co/Auroraventures).*
