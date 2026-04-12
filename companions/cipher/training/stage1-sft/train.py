#!/usr/bin/env python3
"""
Stage 1: Supervised Fine-Tuning (SFT) for Cipher — Code Kraken

Trains Gemma 4 E4B on curated frontend, persona, tool-use, and design data
using Unsloth QLoRA for 60% less VRAM.

Works on:
- Google Colab (free T4 — 15GB VRAM) ✅ RECOMMENDED
- Kaggle Notebooks (free T4/P100) ✅
- Local GPU (16GB+ VRAM — RTX 3090/4090/A100)

Usage (Colab):
    !pip install unsloth[gemma]
    !python training/stage1-sft/train.py --data-dir training/stage1-sft/data

Usage (local):
    python training/stage1-sft/train.py \
        --data-dir training/stage1-sft/data \
        --output-dir training/output/cipher/sft \
        --epochs 2

Environment:
    HF_TOKEN — optional, Gemma 4 uses Apache 2.0 (no gating)
"""

import argparse
import json
import sys
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Cipher SFT Training — Stage 1")
    parser.add_argument("--data-dir", type=str, default="training/stage1-sft/data")
    parser.add_argument("--output-dir", type=str, default="training/output/cipher/sft")
    parser.add_argument("--base-model", type=str, default="unsloth/gemma-4-E4B-it-bnb-4bit")
    parser.add_argument("--epochs", type=int, default=2)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--grad-accum", type=int, default=8)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--max-seq-length", type=int, default=4096)
    parser.add_argument("--lora-rank", type=int, default=32)
    parser.add_argument("--lora-alpha", type=int, default=64)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--push-to-hub", type=str, default=None, help="HuggingFace repo to push to")
    args = parser.parse_args()

    print("[cipher-sft] 🐙 Stage 1: Supervised Fine-Tuning")
    print(f"[cipher-sft] Base model: {args.base_model}")
    print(f"[cipher-sft] Data dir: {args.data_dir}")
    print(f"[cipher-sft] Output: {args.output_dir}")

    # ── Load and combine training data ──────────────────────────────────
    data_dir = Path(args.data_dir)
    all_examples = []

    for jsonl_file in sorted(data_dir.glob("*.jsonl")):
        count = 0
        with open(jsonl_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    example = json.loads(line)
                    all_examples.append(example)
                    count += 1
                except json.JSONDecodeError:
                    continue
        print(f"[cipher-sft] Loaded {count} examples from {jsonl_file.name}")

    total = len(all_examples)
    print(f"[cipher-sft] Total training examples: {total}")

    if total < 5:
        print("[cipher-sft] ERROR: Need at least 5 training examples")
        sys.exit(1)

    if args.dry_run:
        print("[cipher-sft] Dry run — would train on", total, "examples")
        print("[cipher-sft] Sample:", json.dumps(all_examples[0], indent=2)[:500])
        return

    # ── Import Unsloth (deferred to allow dry-run without GPU) ──────────
    try:
        from unsloth import FastLanguageModel
        from trl import SFTTrainer
        from transformers import TrainingArguments
        from datasets import Dataset
    except ImportError:
        print("[cipher-sft] ERROR: Install Unsloth first:")
        print("  pip install unsloth[gemma]")
        print("  # Or for Colab: !pip install unsloth[colab-new]")
        sys.exit(1)

    # ── Load model with Unsloth ─────────────────────────────────────────
    print(f"[cipher-sft] Loading {args.base_model}...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.base_model,
        max_seq_length=args.max_seq_length,
        load_in_4bit=True,
        dtype=None,  # Auto-detect
    )

    # ── Add LoRA adapters ───────────────────────────────────────────────
    print(f"[cipher-sft] Adding LoRA: rank={args.lora_rank}, alpha={args.lora_alpha}")
    model = FastLanguageModel.get_peft_model(
        model,
        r=args.lora_rank,
        lora_alpha=args.lora_alpha,
        lora_dropout=0,
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )

    # ── Format training data ────────────────────────────────────────────
    def format_example(example):
        """Convert training example to ChatML format for Gemma 4."""
        messages = example.get("messages", [])
        if not messages:
            # Legacy format: {instruction, response}
            messages = [
                {"role": "user", "content": example.get("instruction", "")},
                {"role": "assistant", "content": example.get("response", "")},
            ]

        # Build Gemma 4 ChatML format
        text = ""
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                text += f"<start_of_turn>system\n{content}<end_of_turn>\n"
            elif role == "user":
                text += f"<start_of_turn>user\n{content}<end_of_turn>\n"
            elif role == "assistant":
                text += f"<start_of_turn>model\n{content}<end_of_turn>\n"

        return {"text": text}

    formatted = [format_example(ex) for ex in all_examples]
    dataset = Dataset.from_list(formatted)

    print(f"[cipher-sft] Dataset size: {len(dataset)} examples")
    print(f"[cipher-sft] Sample (first 300 chars): {formatted[0]['text'][:300]}")

    # ── Training ────────────────────────────────────────────────────────
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        lr_scheduler_type="cosine",
        warmup_ratio=0.03,
        weight_decay=0.01,
        max_grad_norm=1.0,
        logging_steps=10,
        save_steps=200,
        save_total_limit=2,
        bf16=True,
        optim="adamw_8bit",
        seed=42,
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=training_args,
        dataset_text_field="text",
        max_seq_length=args.max_seq_length,
        packing=True,  # Pack short examples together for efficiency
    )

    print("[cipher-sft] 🐙 Starting training...")
    trainer.train()
    print("[cipher-sft] ✅ Training complete!")

    # ── Save LoRA adapter ───────────────────────────────────────────────
    lora_dir = output_dir / "lora"
    model.save_pretrained(str(lora_dir))
    tokenizer.save_pretrained(str(lora_dir))
    print(f"[cipher-sft] LoRA adapter saved to {lora_dir}")

    # ── Merge and export GGUF ───────────────────────────────────────────
    print("[cipher-sft] Merging LoRA and exporting GGUF...")
    gguf_dir = output_dir / "gguf"
    gguf_dir.mkdir(parents=True, exist_ok=True)

    model.save_pretrained_gguf(
        str(gguf_dir),
        tokenizer,
        quantization_method=["q4_k_m", "q5_k_m"],
    )
    print(f"[cipher-sft] GGUF exported to {gguf_dir}")

    # ── Push to HuggingFace Hub (optional) ──────────────────────────────
    if args.push_to_hub:
        print(f"[cipher-sft] Pushing to {args.push_to_hub}...")
        model.push_to_hub_gguf(
            args.push_to_hub,
            tokenizer,
            quantization_method=["q4_k_m", "q5_k_m"],
        )
        print(f"[cipher-sft] ✅ Pushed to {args.push_to_hub}")

    print("[cipher-sft] 🐙 Stage 1 complete! Ready for Stage 2 (SimPO).")


if __name__ == "__main__":
    main()
