# Cipher Model Cards 🦑

SEO-optimized model cards and dataset cards for all Auroraventures Cipher checkpoints. These live here so:

1. The cards are version-controlled with the training pipeline.
2. Any machine with HF auth can push them to the Hub in one command: `python docs/model_cards/push_cards.py`.
3. Reviewers can diff card changes against code changes in a single PR.

## Contents

| Card | Repo (on HF Hub) | Type |
|---|---|---|
| `cipher-sft-merged.md` | `Auroraventures/cipher-sft-merged` | model |
| `cipher-simpo-merged.md` | `Auroraventures/cipher-simpo-merged` | model |
| `cipher-sft25-merged.md` | `Auroraventures/cipher-sft25-merged` | model (retired) |
| `cipher-sft25-real-merged.md` ⭐ | `Auroraventures/cipher-sft25-real-merged` | model (v3, recommended) |
| `cipher-sft-merged-GGUF.md` | `Auroraventures/cipher-sft-merged-Q4_K_M-GGUF` | model |
| `cipher-simpo-merged-GGUF.md` | `Auroraventures/cipher-simpo-merged-Q4_K_M-GGUF` | model |
| `cipher-sft25-merged-GGUF.md` | `Auroraventures/cipher-sft25-merged-Q4_K_M-GGUF` | model |
| `cipher-awwwards-sft25-dataset.md` | `Auroraventures/cipher-awwwards-sft25` | dataset |

## Push

```bash
# Log in once (browser device flow)
huggingface-cli login

# Push all 8 cards
python docs/model_cards/push_cards.py
```

Inside a Colab notebook that already ran a Cipher training step, auth is already present:

```python
!git clone https://github.com/kr8tiv-ai/kr8tiv-runtime-truth-contracts.git /content/rtc
!python /content/rtc/docs/model_cards/push_cards.py
```

## Authoring guidelines

- **YAML frontmatter** is mandatory. Include `license`, `language`, `pipeline_tag`, `base_model`, and ≥ 8 searchable `tags`.
- **Intent-first opening.** Lead with the audience and the job-to-be-done, not the tech.
- **Pipeline map.** Every Cipher card ends with the full pipeline diagram so users can find the right checkpoint.
- **Cross-link.** Every card links to the upstream dataset, the base checkpoint, and the downstream runtimes ([Kin](https://github.com/kr8tiv-ai/Kin), this repo).
