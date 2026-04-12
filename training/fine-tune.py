#!/usr/bin/env python3
"""
Unsloth QLoRA Fine-Tuning Script for Companion Models

Reads curated JSONL (SFTLine format), fine-tunes models via Unsloth QLoRA
4-bit quantization, and exports merged GGUF for Ollama.

Supports multiple model families: Llama 3.2, Gemma 4, Qwen 2.5
Supports multiple alignment stages: SFT, SimPO, GRPO, KTO

Usage:
    python training/fine-tune.py \
        --companion-id cipher \
        --data-path data/training/cipher/training.jsonl \
        --dry-run

    python training/fine-tune.py \
        --companion-id cipher \
        --data-path data/training/cipher/training.jsonl \
        --base-model unsloth/gemma-4-E4B-it-bnb-4bit \
        --model-family gemma \
        --epochs 2

    python training/fine-tune.py \
        --companion-id cipher \
        --data-path data/training/cipher/training.jsonl \
        --alignment-stage simpo \
        --base-model training/output/cipher

Environment:
    HF_TOKEN — HuggingFace token for gated model access (Llama 3.2 requires
               Meta license acceptance at https://huggingface.co/meta-llama).
               Not required for Gemma or Qwen models.

Observability:
    All progress messages use [fine-tune] prefix for grep-ability.
    Exits non-zero with specific error messages for: insufficient VRAM,
    no CUDA, empty dataset (<5 entries), malformed JSONL.
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

# ============================================================================
# Constants
# ============================================================================

MIN_VALID_ENTRIES = 5
MAX_SAFE_EPOCHS = 3

# Llama VRAM requirements
VRAM_MIN_1B_MB = 3500
VRAM_MIN_3B_MB = 7000

# Gemma VRAM requirements
VRAM_MIN_GEMMA_2B_MB = 2500
VRAM_MIN_GEMMA_5B_MB = 4000
VRAM_MIN_GEMMA_E4B_MB = 5500

# Qwen VRAM requirements
VRAM_MIN_QWEN_4B_MB = 3000
VRAM_MIN_QWEN_9B_MB = 6000

# Model family constants
FAMILY_LLAMA = "llama"
FAMILY_GEMMA = "gemma"
FAMILY_QWEN = "qwen"

VALID_FAMILIES = {FAMILY_LLAMA, FAMILY_GEMMA, FAMILY_QWEN}
VALID_ALIGNMENT_STAGES = {"sft", "simpo", "grpo", "kto"}

# ============================================================================
# Logging
# ============================================================================

def log(msg: str) -> None:
    """Print a structured log message with [fine-tune] prefix."""
    print(f"[fine-tune] {msg}", flush=True)


def warn(msg: str) -> None:
    """Print a warning to stderr with [fine-tune] prefix."""
    print(f"[fine-tune] WARNING: {msg}", file=sys.stderr, flush=True)


def fatal(msg: str) -> None:
    """Print an error and exit non-zero."""
    print(f"[fine-tune] ERROR: {msg}", file=sys.stderr, flush=True)
    sys.exit(1)

# ============================================================================
# CLI
# ============================================================================

def detect_model_family(model_name: str) -> str:
    """Auto-detect model family from model name string."""
    name_lower = model_name.lower()
    if "gemma" in name_lower:
        return FAMILY_GEMMA
    if "qwen" in name_lower:
        return FAMILY_QWEN
    return FAMILY_LLAMA


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fine-tune models via Unsloth QLoRA for companion models",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--companion-id",
        required=True,
        help="Companion identifier (e.g., cipher, vex, nova)",
    )
    parser.add_argument(
        "--data-path",
        required=True,
        help="Path to curated JSONL file (SFTLine format)",
    )
    parser.add_argument(
        "--base-model",
        default="unsloth/Llama-3.2-1B-Instruct-bnb-4bit",
        help="Unsloth model identifier (default: %(default)s)",
    )
    parser.add_argument(
        "--model-family",
        default=None,
        choices=sorted(VALID_FAMILIES),
        help="Model family: gemma, llama, qwen (auto-detected from model name if not specified)",
    )
    parser.add_argument(
        "--alignment-stage",
        default="sft",
        choices=sorted(VALID_ALIGNMENT_STAGES),
        help="Alignment stage: sft (default), simpo, grpo, kto",
    )
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Output directory for GGUF (default: training/output/{companion_id})",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=2,
        help="Number of training epochs (default: %(default)s, max recommended: 3)",
    )
    parser.add_argument(
        "--max-seq-length",
        type=int,
        default=2048,
        help="Maximum sequence length for training (default: %(default)s). "
        "Use 2048 for code-heavy tasks on Gemma 4 E4B with 6-10GB VRAM.",
    )
    parser.add_argument(
        "--learning-rate",
        type=float,
        default=None,
        help="Learning rate. Defaults vary by stage: SFT=2e-4, SimPO=5e-7, "
        "GRPO=8e-6, KTO=5e-7. Override only if you know what you're doing.",
    )
    parser.add_argument(
        "--lora-rank",
        type=int,
        default=64,
        help="LoRA rank (default: %(default)s). Higher ranks capture richer "
        "features for code generation. Use 16-32 for small datasets, "
        "64 for production quality.",
    )
    parser.add_argument(
        "--lora-alpha",
        type=int,
        default=128,
        help="LoRA alpha scaling (default: %(default)s). Recommended: 2x rank.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate data and print stats without loading ML libraries or GPU",
    )

    args = parser.parse_args()

    # Auto-detect model family if not specified
    if args.model_family is None:
        args.model_family = detect_model_family(args.base_model)
        log(f"Auto-detected model family: {args.model_family}")

    return args

# ============================================================================
# JSONL Loading
# ============================================================================

REQUIRED_ROLES = {"system", "user", "assistant"}


def load_jsonl(data_path: str) -> list[dict]:
    """
    Load and validate curated JSONL training data.

    Each line must be a JSON object with a 'messages' array containing
    system, user, and assistant messages. The 'metadata' field is stripped.

    Returns a list of dicts, each with a 'messages' key containing the
    validated message array.

    Exits non-zero if:
    - File does not exist or is empty
    - Fewer than MIN_VALID_ENTRIES valid entries after filtering
    """
    path = Path(data_path)

    if not path.exists():
        fatal(f"Data file not found: {data_path}")

    if path.stat().st_size == 0:
        fatal(f"Data file is empty: {data_path}")

    log("Loading data...")

    entries: list[dict] = []
    skipped = 0

    with open(path, "r", encoding="utf-8") as f:
        for line_num, raw_line in enumerate(f, start=1):
            raw_line = raw_line.strip()
            if not raw_line:
                continue

            # Parse JSON
            try:
                parsed = json.loads(raw_line)
            except json.JSONDecodeError as e:
                warn(f"Invalid JSON at line {line_num}: {e}")
                skipped += 1
                continue

            # Validate messages array exists
            messages = parsed.get("messages")
            if not isinstance(messages, list):
                warn(f"Missing or invalid 'messages' array at line {line_num}")
                skipped += 1
                continue

            # Validate required roles are present
            roles_present = {msg.get("role") for msg in messages if isinstance(msg, dict)}
            missing_roles = REQUIRED_ROLES - roles_present
            if missing_roles:
                warn(f"Missing roles {missing_roles} at line {line_num}")
                skipped += 1
                continue

            # Validate all messages have content
            valid = True
            for msg in messages:
                if not isinstance(msg, dict):
                    valid = False
                    break
                if not msg.get("content"):
                    valid = False
                    break
                if msg.get("role") not in ("system", "user", "assistant"):
                    valid = False
                    break
            if not valid:
                warn(f"Malformed message structure at line {line_num}")
                skipped += 1
                continue

            # Strip metadata — keep only messages for training
            entries.append({"messages": messages})

    if skipped > 0:
        warn(f"Skipped {skipped} malformed line(s)")

    if len(entries) < MIN_VALID_ENTRIES:
        fatal(
            f"Insufficient valid entries: {len(entries)} "
            f"(minimum {MIN_VALID_ENTRIES} required). "
            f"Curate more training data before fine-tuning."
        )

    log(f"{len(entries)} entries loaded")
    return entries

# ============================================================================
# Data Stats (dry-run)
# ============================================================================

def print_data_stats(entries: list[dict]) -> None:
    """Print dataset statistics for dry-run validation."""
    total_chars = 0
    max_chars = 0
    total_messages = 0

    for entry in entries:
        entry_chars = 0
        for msg in entry["messages"]:
            char_count = len(msg["content"])
            entry_chars += char_count
            total_messages += 1
        total_chars += entry_chars
        max_chars = max(max_chars, entry_chars)

    avg_chars = total_chars // len(entries) if entries else 0

    log(f"Dataset stats:")
    log(f"  Total entries:       {len(entries)}")
    log(f"  Total messages:      {total_messages}")
    log(f"  Avg chars/entry:     {avg_chars}")
    log(f"  Max chars/entry:     {max_chars}")
    log(f"  Total chars:         {total_chars}")

# ============================================================================
# VRAM Check
# ============================================================================

def _get_vram_requirement(base_model: str, model_family: str) -> tuple[int, str]:
    """
    Determine minimum VRAM and label based on model family and size.

    Returns (min_vram_mb, model_label) tuple.
    """
    name_lower = base_model.lower()

    if model_family == FAMILY_GEMMA:
        if "e4b" in name_lower:
            return VRAM_MIN_GEMMA_E4B_MB, "Gemma-4-E4B"
        if "5b" in name_lower:
            return VRAM_MIN_GEMMA_5B_MB, "Gemma-5B"
        return VRAM_MIN_GEMMA_2B_MB, "Gemma-2B"

    if model_family == FAMILY_QWEN:
        if "9b" in name_lower:
            return VRAM_MIN_QWEN_9B_MB, "Qwen-9B"
        return VRAM_MIN_QWEN_4B_MB, "Qwen-4B"

    # Llama (default)
    is_3b = "3b" in name_lower
    if is_3b:
        return VRAM_MIN_3B_MB, "Llama-3B"
    return VRAM_MIN_1B_MB, "Llama-1B"


def check_vram(base_model: str, model_family: str = FAMILY_LLAMA) -> int:
    """
    Check available GPU VRAM via nvidia-smi.

    Returns total VRAM in MB.
    Exits non-zero if VRAM is insufficient for the selected model size.
    """
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except FileNotFoundError:
        fatal(
            "nvidia-smi not found. CUDA toolkit may not be installed. "
            "Install NVIDIA drivers and CUDA toolkit, or use --dry-run to validate data without GPU."
        )
    except subprocess.TimeoutExpired:
        fatal("nvidia-smi timed out — GPU may be in a bad state.")

    if result.returncode != 0:
        fatal(f"nvidia-smi failed (exit {result.returncode}): {result.stderr.strip()}")

    # Parse first GPU's total memory
    lines = result.stdout.strip().split("\n")
    if not lines or not lines[0].strip():
        fatal("nvidia-smi returned no GPU information")

    try:
        vram_mb = int(lines[0].strip())
    except ValueError:
        fatal(f"Could not parse VRAM from nvidia-smi output: '{lines[0].strip()}'")

    log(f"VRAM check: {vram_mb} MB available")

    # Determine minimum VRAM based on model family and size
    min_vram, model_label = _get_vram_requirement(base_model, model_family)

    if vram_mb < min_vram:
        fatal(
            f"Insufficient VRAM for {model_label} model: {vram_mb} MB available, "
            f"{min_vram} MB required. Use a smaller model or upgrade GPU."
        )

    return vram_mb

# ============================================================================
# HuggingFace Auth Check
# ============================================================================

def check_hf_auth(model_family: str = FAMILY_LLAMA) -> None:
    """
    Check if HuggingFace authentication is available.
    Only required for Llama models (Meta license). Gemma and Qwen are open.
    """
    # Gemma and Qwen don't require HF Meta license
    if model_family != FAMILY_LLAMA:
        log(f"HuggingFace auth: not required for {model_family} models")
        return

    # Check env var first
    if os.environ.get("HF_TOKEN"):
        log("HuggingFace auth: HF_TOKEN environment variable set")
        return

    # Check huggingface-cli login state
    try:
        result = subprocess.run(
            ["huggingface-cli", "whoami"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            username = result.stdout.strip().split("\n")[0]
            log(f"HuggingFace auth: logged in as {username}")
            return
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    warn(
        "No HuggingFace authentication detected. "
        "Llama 3.2 requires Meta license acceptance at "
        "https://huggingface.co/meta-llama. "
        "Set HF_TOKEN env var or run: huggingface-cli login"
    )

# ============================================================================
# Training
# ============================================================================

def _get_chat_template(model_family: str) -> str:
    """Return the appropriate chat template name for the model family."""
    if model_family == FAMILY_GEMMA:
        return "gemma"
    if model_family == FAMILY_QWEN:
        return "qwen-2.5"
    return "llama-3.1"


def _get_lora_target_modules(model_family: str) -> list[str] | str:
    """Return LoRA target modules appropriate for the model family."""
    if model_family == FAMILY_GEMMA:
        # Gemma 4 benefits from "all-linear" shorthand for broader coverage
        return "all-linear"
    # Llama and Qwen use explicit module names
    return [
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ]


def run_training(
    entries: list[dict],
    base_model: str,
    output_dir: str,
    epochs: int,
    max_seq_length: int,
    learning_rate: float | None,
    model_family: str = FAMILY_LLAMA,
    alignment_stage: str = "sft",
    lora_rank: int = 64,
    lora_alpha: int = 128,
) -> None:
    """
    Run QLoRA fine-tuning via Unsloth and export merged GGUF.

    This function imports ML libraries only when called (not at module level)
    so that --dry-run works without GPU or ML dependencies.

    Supports alignment stages:
      - sft: Standard supervised fine-tuning (default)
      - simpo: SimPO — no reference model, uses beta + gamma_beta_ratio
      - grpo: GRPO — 2-GRPO variant with 2 rollouts per prompt
      - kto: KTO — binary thumbs-up/down, no paired preferences needed
    """
    # Lazy imports — only load heavy ML libraries when actually training
    try:
        from unsloth import FastLanguageModel
        from unsloth.chat_templates import get_chat_template
    except ImportError:
        fatal(
            "Unsloth is not installed. "
            "Install dependencies: pip install -r training/requirements.txt"
        )

    try:
        from trl import SFTTrainer, SFTConfig
    except ImportError:
        fatal(
            "TRL is not installed. "
            "Install dependencies: pip install -r training/requirements.txt"
        )

    try:
        from datasets import Dataset
    except ImportError:
        fatal(
            "datasets library is not installed. "
            "Install dependencies: pip install -r training/requirements.txt"
        )

    # Warn on high epoch count
    if epochs > MAX_SAFE_EPOCHS:
        warn(
            f"Epoch count {epochs} exceeds recommended maximum of {MAX_SAFE_EPOCHS}. "
            f"High epoch counts risk catastrophic forgetting. Consider reducing."
        )

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # ── Load model ──────────────────────────────────────────────────────
    log(f"Loading base model: {base_model}")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=base_model,
        max_seq_length=max_seq_length,
        load_in_4bit=True,
    )

    # ── Configure LoRA ──────────────────────────────────────────────────
    # Training doc research: r=64, alpha=128 (2x ratio) for code generation.
    # All-linear targets for Gemma 4 maximize adaptation coverage.
    # Zero dropout when training data is abundant (per Unsloth/QLoRA studies).
    log(f"Configuring LoRA adapters (family={model_family}, r={lora_rank}, alpha={lora_alpha})...")
    target_modules = _get_lora_target_modules(model_family)
    model = FastLanguageModel.get_peft_model(
        model,
        r=lora_rank,
        target_modules=target_modules,
        lora_alpha=lora_alpha,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=3407,
    )

    # ── Apply chat template ─────────────────────────────────────────────
    chat_template = _get_chat_template(model_family)
    log(f"Applying chat template: {chat_template}")
    tokenizer = get_chat_template(
        tokenizer,
        chat_template=chat_template,
    )

    # ── Prepare dataset ─────────────────────────────────────────────────
    log("Preparing dataset...")

    def format_conversation(example: dict) -> dict:
        """Apply chat template to format messages into a single text string."""
        text = tokenizer.apply_chat_template(
            example["messages"],
            tokenize=False,
            add_generation_prompt=False,
        )
        return {"text": text}

    dataset = Dataset.from_list(entries)
    dataset = dataset.map(format_conversation)

    # ── Resolve per-stage learning rate defaults ─────────────────────────
    # Research-backed defaults from training doc:
    # SFT: 2e-4 (standard QLoRA), SimPO: 5e-7 (much lower — prevents collapse),
    # GRPO: 8e-6 (2-GRPO variant), KTO: 5e-7 (never exceed 1e-6)
    STAGE_LR_DEFAULTS = {
        "sft": 2e-4,
        "simpo": 5e-7,
        "grpo": 8e-6,
        "kto": 5e-7,
    }
    effective_lr = learning_rate if learning_rate is not None else STAGE_LR_DEFAULTS[alignment_stage]
    log(f"Learning rate: {effective_lr} (stage={alignment_stage})")

    # ── Run the appropriate alignment stage ──────────────────────────────
    if alignment_stage == "sft":
        _run_sft(model, tokenizer, dataset, output_dir, epochs, max_seq_length, effective_lr)
    elif alignment_stage == "simpo":
        _run_simpo(model, tokenizer, dataset, output_dir, epochs, effective_lr)
    elif alignment_stage == "grpo":
        _run_grpo(model, tokenizer, dataset, output_dir, epochs, effective_lr)
    elif alignment_stage == "kto":
        _run_kto(model, tokenizer, dataset, output_dir, epochs, effective_lr)
    else:
        fatal(f"Unknown alignment stage: {alignment_stage}")

    # ── Export GGUF (Unsloth Dynamic 2.0 quantization) ──────────────────
    log(f"Exporting GGUF to {output_dir}")
    # quantization_method="q4_k_m" uses Unsloth Dynamic 2.0 for optimal
    # quality-to-size ratio on consumer GPUs (RTX 4050 6GB etc.)
    model.save_pretrained_gguf(
        output_dir,
        tokenizer,
        quantization_method="q4_k_m",
    )
    log(f"GGUF exported to {output_dir}")


def _run_sft(model, tokenizer, dataset, output_dir, epochs, max_seq_length, learning_rate):
    """Run standard supervised fine-tuning."""
    from trl import SFTTrainer, SFTConfig

    log("Running SFT alignment stage...")
    # Training doc: cosine annealing outperforms linear for code generation;
    # effective batch 16 (batch=2 x grad_accum=8) balances stability/speed;
    # warmup_ratio=0.03 scales with dataset size better than fixed steps.
    training_args = SFTConfig(
        output_dir=output_dir,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=8,
        warmup_ratio=0.03,
        learning_rate=learning_rate,
        num_train_epochs=epochs,
        max_seq_length=max_seq_length,
        dataset_text_field="text",
        logging_steps=1,
        save_steps=0,
        weight_decay=0.01,
        lr_scheduler_type="cosine",
        optim="adamw_8bit",
        seed=3407,
        bf16=True,
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=training_args,
    )

    trainer.train()
    log("SFT training complete")


def _run_simpo(model, tokenizer, dataset, output_dir, epochs, learning_rate):
    """
    Run SimPO alignment — no reference model needed.
    Uses beta (implicit reward margin) and gamma_beta_ratio hyperparameters.
    Loads from previous SFT checkpoint.
    """
    try:
        from trl import SimPOConfig, SimPOTrainer
    except ImportError:
        fatal("SimPO requires trl>=0.14.0. Update: pip install trl>=0.14.0")

    log("Running SimPO alignment stage...")
    # Training doc (arXiv:2405.14734): β=2.0-2.5 (much larger than DPO's 0.1),
    # γ=0.5-1.5 (target reward margin). SimPO's length normalization prevents
    # verbose code padding — critical for clean frontend output.
    # gamma_beta_ratio = γ/β ≈ 0.3-0.6 for code tasks.
    training_args = SimPOConfig(
        output_dir=output_dir,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=8,
        learning_rate=learning_rate,
        num_train_epochs=epochs,
        beta=2.5,
        gamma_beta_ratio=0.4,
        logging_steps=1,
        optim="adamw_8bit",
        seed=3407,
        bf16=True,
    )

    trainer = SimPOTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=training_args,
    )

    trainer.train()
    log("SimPO training complete")


def _run_grpo(model, tokenizer, dataset, output_dir, epochs, learning_rate):
    """
    Run GRPO alignment — 2-GRPO variant with 2 rollouts per prompt.
    Uses group normalization for reward computation.
    Loads from previous SFT checkpoint.
    """
    try:
        from trl import GRPOConfig, GRPOTrainer
    except ImportError:
        fatal("GRPO requires trl>=0.14.0. Update: pip install trl>=0.14.0")

    log("Running GRPO alignment stage (2-GRPO, 2 rollouts)...")
    # Training doc (arXiv:2510.00977): 2-GRPO retains 98.1% of full GRPO
    # performance while cutting training time 73-84%. Use batch 256 prompts
    # x 2 rollouts = 512 total for stable group statistics.
    # KL coeff 0.001, clip 0.2 (DAPO-style 0.2/0.28 for exploration optional).
    training_args = GRPOConfig(
        output_dir=output_dir,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=8,
        learning_rate=learning_rate,
        num_train_epochs=epochs,
        num_generations=2,  # 2-GRPO: 2 rollouts per prompt
        logging_steps=1,
        optim="adamw_8bit",
        seed=3407,
        bf16=True,
    )

    trainer = GRPOTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=training_args,
    )

    trainer.train()
    log("GRPO training complete")


def _run_kto(model, tokenizer, dataset, output_dir, epochs, learning_rate):
    """
    Run KTO alignment — binary thumbs-up/down signal.
    No paired preferences needed — works with unpaired feedback data.
    Loads from previous SFT checkpoint.
    """
    try:
        from trl import KTOConfig, KTOTrainer
    except ImportError:
        fatal("KTO requires trl>=0.14.0. Update: pip install trl>=0.14.0")

    log("Running KTO alignment stage...")
    training_args = KTOConfig(
        output_dir=output_dir,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        learning_rate=learning_rate,
        num_train_epochs=epochs,
        logging_steps=1,
        optim="adamw_8bit",
        seed=3407,
        bf16=True,
    )

    trainer = KTOTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=training_args,
    )

    trainer.train()
    log("KTO training complete")

# ============================================================================
# Main
# ============================================================================

def main() -> None:
    args = parse_args()

    # Resolve output directory
    output_dir = args.output_dir or os.path.join("training", "output", args.companion_id)

    # ── Load and validate data ──────────────────────────────────────────
    entries = load_jsonl(args.data_path)

    # ── Dry-run: print stats and exit ───────────────────────────────────
    if args.dry_run:
        print_data_stats(entries)
        log("Dry run complete — data is valid")
        sys.exit(0)

    # ── VRAM check ──────────────────────────────────────────────────────
    check_vram(args.base_model, args.model_family)

    # ── HuggingFace auth check ──────────────────────────────────────────
    check_hf_auth(args.model_family)

    # ── Run training ────────────────────────────────────────────────────
    log(f"Model family: {args.model_family}, Alignment stage: {args.alignment_stage}")
    run_training(
        entries=entries,
        base_model=args.base_model,
        output_dir=output_dir,
        epochs=args.epochs,
        max_seq_length=args.max_seq_length,
        learning_rate=args.learning_rate,
        model_family=args.model_family,
        alignment_stage=args.alignment_stage,
        lora_rank=args.lora_rank,
        lora_alpha=args.lora_alpha,
    )

    log("Done.")


if __name__ == "__main__":
    main()
