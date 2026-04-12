#!/usr/bin/env python3
"""
Stage 2: Simple Preference Optimization (SimPO) for Cipher

Aligns Cipher to prefer beautiful, accessible code over ugly alternatives.
Reference-free, length-normalized — prevents verbose code padding.

Works on Google Colab (free T4), Kaggle, or local GPU (16GB+).

Usage:
    python training/stage2-simpo/train.py \
        --base-model training/output/cipher/sft \
        --data-path training/stage2-simpo/data/preference-pairs.jsonl
"""

import argparse
import json
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Cipher SimPO Training — Stage 2")
    parser.add_argument("--base-model", type=str, default="training/output/cipher/sft/lora")
    parser.add_argument("--data-path", type=str, default="training/stage2-simpo/data/preference-pairs.jsonl")
    parser.add_argument("--output-dir", type=str, default="training/output/cipher/simpo")
    parser.add_argument("--beta", type=float, default=2.5)
    parser.add_argument("--gamma", type=float, default=1.0)
    parser.add_argument("--lr", type=float, default=5e-7)
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print("[cipher-simpo] 🐙 Stage 2: Simple Preference Optimization")
    print(f"[cipher-simpo] Base: {args.base_model}")
    print(f"[cipher-simpo] Beta: {args.beta}, Gamma: {args.gamma}")

    # Load preference pairs
    data_path = Path(args.data_path)
    pairs = []
    with open(data_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                pair = json.loads(line)
                # Expected format: {"prompt": "...", "chosen": "...", "rejected": "..."}
                if "chosen" in pair and "rejected" in pair:
                    pairs.append(pair)
            except json.JSONDecodeError:
                continue

    print(f"[cipher-simpo] Loaded {len(pairs)} preference pairs")

    if len(pairs) < 5:
        print("[cipher-simpo] ERROR: Need at least 5 preference pairs")
        sys.exit(1)

    if args.dry_run:
        print("[cipher-simpo] Dry run complete")
        return

    try:
        from unsloth import FastLanguageModel
        from trl import CPOTrainer, CPOConfig
        from datasets import Dataset
    except ImportError:
        print("[cipher-simpo] ERROR: pip install unsloth[gemma] trl")
        sys.exit(1)

    # Load model (from SFT output or base)
    print(f"[cipher-simpo] Loading model from {args.base_model}...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.base_model,
        max_seq_length=4096,
        load_in_4bit=True,
    )

    model = FastLanguageModel.get_peft_model(
        model, r=32, lora_alpha=64, lora_dropout=0,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
        bias="none", use_gradient_checkpointing="unsloth",
    )

    dataset = Dataset.from_list(pairs)

    cpo_config = CPOConfig(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        learning_rate=args.lr,
        loss_type="simpo",
        cpo_alpha=0.0,   # SimPO mode
        bf16=True,
        logging_steps=10,
        save_steps=100,
        report_to="none",
        seed=42,
    )

    trainer = CPOTrainer(
        model=model,
        args=cpo_config,
        train_dataset=dataset,
        tokenizer=tokenizer,
    )

    print("[cipher-simpo] 🐙 Starting SimPO training...")
    trainer.train()
    print("[cipher-simpo] ✅ Stage 2 complete!")

    # Save
    output_dir = Path(args.output_dir)
    model.save_pretrained(str(output_dir / "lora"))
    tokenizer.save_pretrained(str(output_dir / "lora"))

    # Export GGUF
    gguf_dir = output_dir / "gguf"
    gguf_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained_gguf(str(gguf_dir), tokenizer, quantization_method=["q4_k_m"])
    print(f"[cipher-simpo] GGUF exported to {gguf_dir}")
    print("[cipher-simpo] 🐙 Ready for Stage 3 (GRPO).")


if __name__ == "__main__":
    main()
