# Technology Stack: Local AI Companion Models

**Project:** kr8tiv-runtime-truth-contracts (Local Model Distribution)
**Researched:** 2026-04-11
**Confidence:** MEDIUM-HIGH (strong ecosystem evidence, some version-specific details need validation)

---

## Recommended Stack

### Fine-Tuning Pipeline

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Unsloth | latest (2026.3+) | QLoRA + GRPO training framework | 2x faster training, 70% less VRAM vs vanilla HF. Native Gemma 4 support. Only serious option for A100 Colab workflows. |
| TRL | v1.0 | SFT + GRPO orchestration | HuggingFace's unified post-training stack. Unsloth wraps it but TRL v1.0 is the stable API layer for reward functions. |
| bitsandbytes | 0.45+ | 4-bit quantization during training | Required by QLoRA. load_in_4bit=True drops Gemma 4 31B from ~62GB to ~18GB VRAM. |
| Transformers | 4.50+ | Model loading backbone | Unsloth patches it. Pin to version Unsloth documents for Gemma 4 compat. |
| PEFT | 0.14+ | LoRA adapter management | Manages adapter merge/export. Use with rank=16, target_modules="all-linear". |

**Training Hardware:** Colab Pro+ with A100 40GB. Gemma 4 31B QLoRA fits in ~24GB with gradient checkpointing. Use bf16=True (A100 supports it natively). Enable Flash Attention 2 (free perf on Ampere).

**Key Training Parameters:**
```python
# QLoRA config for Gemma 4 31B on A100
model = FastLanguageModel.from_pretrained(
    "unsloth/gemma-4-31B-it",
    load_in_4bit=True,
    max_seq_length=4096,  # Start conservative, scale up
)
model = FastLanguageModel.get_peft_model(
    model,
    r=16,                              # LoRA rank
    lora_alpha=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                     "gate_proj", "up_proj", "down_proj"],
    use_gradient_checkpointing="unsloth",  # Critical: 30% VRAM savings
)
# SFT first, then GRPO for personality reinforcement
```

**GRPO for Personality:** Use Unsloth's GRPO pipeline to reinforce personality traits via reward functions. Train personality consistency as a reward signal -- the model gets rewarded for staying in character, using characteristic phrases, and maintaining tone. This is the 2026 way to do personality, not just system prompt stuffing.

**Dataset Requirements:**
- SFT stage: 1,000-5,000 high-quality conversational examples per companion personality
- GRPO stage: 500-2,000 preference pairs (in-character vs out-of-character responses)
- Quality >>> quantity. 1,000 perfect examples beats 50,000 mediocre ones.

### Quantization & Packaging

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| llama.cpp | latest | GGUF quantization + conversion | The standard. Unsloth exports directly to GGUF. |
| Ollama | 0.6+ | Model runtime + API server | Already in the existing stack. Native Gemma 4 support, tool calling, structured output. |

**Quantization Strategy:**

| Quant Level | File Size (31B) | RAM Required | Quality (ppl delta) | Target User |
|-------------|----------------|--------------|---------------------|-------------|
| **Q4_K_M** | ~18 GB | ~20-22 GB | +0.05 ppl | **Default. 32GB RAM users.** |
| Q5_K_M | ~22 GB | ~24-26 GB | +0.02 ppl | Quality-first users with 32GB+ |
| Q3_K_M | ~14 GB | ~16-18 GB | +0.24 ppl | 16GB RAM users (noticeable quality loss) |
| Q8_0 | ~33 GB | ~36 GB | ~0 ppl | Mac Studio / workstation users |

**Recommendation:** Ship Q4_K_M as default. It is the established sweet spot -- 4.5x smaller than fp16 with negligible quality loss. Q3_K has nearly 5x worse perplexity degradation for only 4GB savings. Not worth it for a personality-driven companion where coherence matters.

**Do NOT ship Q3_K as default.** The perplexity penalty (+0.24 vs +0.05) manifests as personality drift, inconsistent tone, and more hallucinations -- exactly what kills a companion experience.

**Context Window Reality:** On consumer hardware (32GB RAM), realistic context is ~8K-20K tokens before memory pressure. The advertised 256K is theoretical. KV cache at 128K adds 10-20GB on top of model weights. Design the companion for short-to-medium conversations with summarized memory, not infinite context.

### Ollama Modelfile Patterns

```dockerfile
# Companion Modelfile pattern
FROM ./companion-gemma4-31b-q4_k_m.gguf

# Personality injection via SYSTEM
SYSTEM """You are [CompanionName], a [personality description].

Core traits:
- [Trait 1]: [how it manifests]
- [Trait 2]: [how it manifests]

Voice: [speaking style, vocabulary, cadence]
Boundaries: [what you will/won't do]

You have access to tools. Use them decisively without asking permission.
When a user asks you to do something, act first and report results.
"""

# Temperature controls personality consistency
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1

# Tool calling format (Gemma 4 has native support)
TEMPLATE """{{ if .System }}<start_of_turn>system
{{ .System }}<end_of_turn>
{{ end }}{{ range .Messages }}{{ if eq .Role "user" }}<start_of_turn>user
{{ .Content }}<end_of_turn>
{{ else if eq .Role "assistant" }}<start_of_turn>model
{{ .Content }}<end_of_turn>
{{ end }}{{ end }}<start_of_turn>model
"""
```

**Key Insight:** Gemma 4 was specifically trained for function calling, structured JSON output, and system instruction following. This makes it a strong choice for tool-use companions. The Modelfile SYSTEM prompt is a personality layer; the deep personality comes from GRPO fine-tuning baked into the weights.

### Text-to-Speech

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Kokoro** | v1.0 | Primary TTS engine | Best quality (MOS 4.2) at smallest size (82M params). CPU-friendly. ONNX runtime. |
| kokoro-onnx | latest | ONNX inference wrapper | Fast local inference, no GPU required. RTF 0.03 on GPU, usable on CPU. |
| KokoClone | latest | Voice cloning for custom companion voices | Reference-audio-to-embedding pipeline. No model retraining needed. |

**Why Kokoro over alternatives:**

| Engine | MOS Score | Model Size | CPU RTF | GPU RTF | Voice Cloning |
|--------|-----------|------------|---------|---------|---------------|
| **Kokoro** | **4.2** | **82M** | **~0.2** | **0.03** | **Yes (KokoClone)** |
| Piper | 3.5 | Varies | 0.2 (Pi4!) | N/A | Requires training |
| Parler-TTS | 3.8 | ~900M | Slow | ~0.1 | Text-controllable |
| F5-TTS | 4.1 | ~330M | Slow | ~0.08 | Yes |
| XTTS v2 | 4.0 | ~1.6GB | Very slow | ~0.15 | Yes |

**Kokoro wins on every axis that matters for a downloadable companion:**
- Highest quality at smallest size (82M vs 900M+ for competitors)
- Runs on CPU without painful latency
- Voice cloning via embedding, not model retraining
- ONNX runtime -- universal deployment, no PyTorch dependency in production

**Piper as fallback only.** Use Piper for ultra-low-resource environments (Raspberry Pi, ancient laptops). Quality gap (3.5 vs 4.2 MOS) is audible and meaningful for companion "presence."

**Do NOT use Parler-TTS or XTTS v2.** Too large for bundled distribution. XTTS v2 at 1.6GB is unreasonable for a one-click installer alongside a 18GB model.

**Voice Pipeline:**
1. Record 30-60s reference audio per companion personality
2. KokoClone generates voice embedding from reference
3. Bundle embedding file (~few KB) with Modelfile
4. Kokoro-ONNX synthesizes speech at runtime using embedding
5. No GPU needed. Works on any machine that can run the LLM.

### One-Click Installer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Tauri** | v2 | Desktop app shell + installer builder | 96% smaller than Electron. Native NSIS/MSI on Windows, DMG on Mac. Sidecar binary support for Ollama. |
| Tauri Sidecar | v2 | Bundle Ollama binary | externalBin config bundles Ollama as managed subprocess. |
| SvelteKit | latest | Installer UI | Lightweight frontend. Already web-native for the existing Fastify stack. |

**Why Tauri, not Electron:**

| Factor | Tauri v2 | Electron |
|--------|----------|----------|
| Installer size (app only) | ~2-8 MB | ~80-150 MB |
| RAM usage | ~28 MB | ~250 MB |
| Startup time | ~0.4s | ~1.5s |
| Sidecar support | Native (externalBin) | Manual, fragile |
| Native installers | NSIS, MSI, DMG, AppImage | electron-builder |

**When the user is already downloading an 18GB model, the installer itself must be tiny and fast.** Electron adding 85MB of Chromium on top is disrespectful to bandwidth. Tauri uses the OS webview (WebView2 on Windows, WebKit on Mac).

**Sidecar Architecture:**
```
tauri.conf.json:
{
  "bundle": {
    "externalBin": [
      "binaries/ollama"      // Ollama server binary
    ]
  }
}
```

The installer:
1. Installs Tauri app (~5MB)
2. Bundles Ollama binary as sidecar (~50MB)
3. On first launch: downloads model GGUF from CDN/IPFS (18GB)
4. Creates Modelfile with companion personality
5. Starts Ollama server as managed subprocess
6. Connects companion UI to localhost:11434

**Do NOT bundle the model in the installer.** 18GB+ download via app store / direct download is a terrible UX. Stream it post-install with progress bar and resume support.

**Do NOT use pkg or nexe.** They bundle Node.js runtime -- adds 50MB+ for no reason when Tauri handles the app shell. The existing Fastify backend runs as a separate service, not inside the desktop app.

**macOS Quarantine Fix:** When bundling Ollama binary, strip quarantine attribute in post-install script: `xattr -d com.apple.quarantine binaries/ollama`

### Mesh Networking

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Tailscale CLI** | latest | Peer-to-peer mesh between companion instances | WireGuard-based, zero-config, NAT traversal. No SDK needed -- CLI + API is sufficient. |
| Tailscale MagicDNS | built-in | Service discovery | Companions find each other by stable DNS names, not IPs. |

**Integration Pattern:** There is no Node.js SDK for Tailscale. Use the CLI approach:
1. Installer includes Tailscale install prompt (or detects existing)
2. Node.js backend spawns `tailscale` CLI commands via child_process
3. Companion registers as a Tailscale Service with MagicDNS name
4. Other companions on the same tailnet discover via DNS
5. All traffic is end-to-end encrypted WireGuard tunnels

**The ts.net Go library is for Go services.** For a Node.js/TypeScript stack, CLI wrapping is the correct approach. Don't fight the language boundary.

**Tailscale Services** (2026 feature): Publish companion as a named service. Other devices connect to `companion.tailnet.ts.net` rather than device IPs. This survives device changes and IP rotation.

### Colab Training Workflow

| Technology | Purpose | Notes |
|------------|---------|-------|
| Colab Pro+ | A100 40GB GPU access | Required for 31B QLoRA. Free tier T4 is insufficient. |
| Unsloth + TRL | Training framework | See fine-tuning section above |
| W&B (Weights & Biases) | Experiment tracking | Free tier sufficient. Track loss curves, personality eval metrics. |
| HuggingFace Hub | Model storage + distribution | Push adapters to private repo. Merge + quantize in separate step. |

**A100-Specific Optimizations:**
- `bf16=True` (not fp16 -- A100 has native bf16 support)
- Flash Attention 2 enabled (free speedup on Ampere)
- `use_gradient_checkpointing="unsloth"` (critical for 31B)
- `per_device_train_batch_size=1` with `gradient_accumulation_steps=4`
- `max_seq_length=4096` to start; increase only if VRAM allows

**Workflow:**
1. Prepare dataset in conversational format (user/model turns)
2. SFT stage: ~2-4 hours on A100 for 2,000 examples
3. GRPO stage: ~4-8 hours for personality reinforcement
4. Export: Unsloth -> merged model -> llama.cpp GGUF conversion
5. Test locally with Ollama before distribution
6. Push GGUF to HuggingFace / CDN for distribution

**Watch for overfitting:** If training loss drops below 0.1 in first epoch, you're memorizing. Reduce epochs to 1-2 or add more diverse examples.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Training | Unsloth + QLoRA | Axolotl | Axolotl is heavier, more config. Unsloth is faster and purpose-built for consumer GPU / Colab. |
| Training | Unsloth + QLoRA | Full fine-tuning | 31B full fine-tune needs 8xA100. Insane cost for personality tuning. QLoRA trains 0.2% of params. |
| Model | Gemma 4 31B | Llama 3.3 70B | 70B doesn't fit consumer hardware even at Q3. 31B at Q4 is the sweet spot. |
| Model | Gemma 4 31B | Qwen3-30B | Strong contender but Gemma 4 has superior native tool calling and is purpose-trained for instruction following. |
| TTS | Kokoro | Coqui XTTS v2 | 20x larger model. Requires GPU for acceptable latency. Dead project (Coqui shut down). |
| TTS | Kokoro | Bark | Lower quality (MOS 3.7), dramatically slower, 10x larger. |
| Installer | Tauri v2 | Electron | 85MB overhead for Chromium. Insulting when user downloads 18GB model. |
| Installer | Tauri v2 | NSIS standalone | No cross-platform. Mac users exist. Tauri generates NSIS on Windows natively. |
| Mesh | Tailscale CLI | ZeroTier | Tailscale has better DX, MagicDNS, and is more widely deployed. |
| Mesh | Tailscale CLI | Nebula | More ops overhead. Tailscale is zero-config for end users. |
| Quantization | Q4_K_M | GPTQ / AWQ | GGUF is the standard for Ollama/llama.cpp. GPTQ/AWQ are for vLLM/GPU-only serving. |

---

## Installation (Training Environment)

```bash
# Colab Pro+ cell
!pip install unsloth
!pip install --upgrade trl transformers datasets peft bitsandbytes wandb

# Verify A100
import torch
print(f"GPU: {torch.cuda.get_device_name()}")
print(f"VRAM: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB")
assert "A100" in torch.cuda.get_device_name()
```

```bash
# Local development (installer build)
npm create tauri-app@latest companion-installer -- --template sveltekit
cd companion-installer
cargo tauri dev

# Kokoro TTS
pip install kokoro-onnx
# Or via npm for Node.js integration:
# Use kokoro-onnx Python server with FastAPI, call from Node.js
```

```bash
# Ollama (already in existing stack)
ollama pull gemma4:31b  # For testing
ollama create companion -f Modelfile  # Custom companion
```

---

## Version Pinning Notes

| Package | Pin Strategy | Reason |
|---------|-------------|--------|
| Unsloth | `unsloth[colab-new]` latest | Moves fast, Gemma 4 support is recent. Pin after confirming working version. |
| TRL | `>=1.0,<2.0` | v1.0 just released. API should be stable within major version. |
| Ollama | `>=0.6` | Tool calling and Gemma 4 support. |
| Tauri | `v2.x` | v2 is the stable release with sidecar support. Do not use v1. |
| Kokoro | Pin ONNX model hash | Model weights must be reproducible across installs. |
| llama.cpp | Pin to release tag | Quantization output varies between versions. Pin for reproducible GGUFs. |

---

## Sources

- [Unsloth Gemma 4 Fine-tuning Guide](https://unsloth.ai/docs/models/gemma-4/train)
- [Unsloth GRPO Long Context](https://unsloth.ai/docs/new/grpo-long-context)
- [Unsloth RL Guide](https://unsloth.ai/docs/get-started/reinforcement-learning-rl-guide)
- [HuggingFace TRL v1.0 Release](https://www.marktechpost.com/2026/04/01/hugging-face-releases-trl-v1-0-a-unified-post-training-stack-for-sft-reward-modeling-dpo-and-grpo-workflows/)
- [GGUF Quantization Unified Evaluation (arxiv)](https://arxiv.org/html/2601.14277v1)
- [llama.cpp Quantization Methods Discussion](https://github.com/ggml-org/llama.cpp/discussions/2094)
- [Gemma 4 31B VRAM Requirements](https://gemma4guide.com/guides/gemma4-vram-requirements)
- [Gemma 4 on Ollama](https://ollama.com/library/gemma4:31b)
- [Ollama Tool Calling Docs](https://docs.ollama.com/capabilities/tool-calling)
- [Ollama Modelfile Reference](https://docs.ollama.com/modelfile)
- [Kokoro TTS (hexgrad)](https://huggingface.co/spaces/hexgrad/Kokoro-TTS)
- [Kokoro ONNX](https://github.com/thewh1teagle/kokoro-onnx)
- [KokoClone Voice Cloning](https://github.com/Ashish-Patnaik/kokoclone)
- [Best Open-Source TTS Comparison 2026](https://www.codesota.com/guides/tts-models)
- [Tauri v2 Sidecar Docs](https://v2.tauri.app/develop/sidecar/)
- [Tauri vs Electron 2026](https://tech-insider.org/tauri-vs-electron-2026/)
- [Tailscale Services Docs](https://tailscale.com/docs/features/tailscale-services)
- [Tailscale Developer Guide](https://blog.starmorph.com/blog/tailscale-complete-developer-reference-guide)
- [Unsloth Gemma 4 31B GGUF](https://huggingface.co/unsloth/gemma-4-31B-it-GGUF)
