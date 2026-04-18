"""Push SEO-optimized model cards + dataset card to HuggingFace.

Assumes you are logged in via `huggingface-cli login` (Colab notebooks that already
ran the Cipher training have the token in env from the login step).

Usage:
    python docs/model_cards/push_cards.py
"""
from __future__ import annotations
from pathlib import Path
from huggingface_hub import HfApi

HERE = Path(__file__).resolve().parent

# map card filename -> (repo_id, repo_type)
MAPPING: dict[str, tuple[str, str]] = {
    "cipher-sft-merged.md":             ("Auroraventures/cipher-sft-merged",               "model"),
    "cipher-simpo-merged.md":           ("Auroraventures/cipher-simpo-merged",             "model"),
    "cipher-sft25-merged.md":           ("Auroraventures/cipher-sft25-merged",             "model"),
    "cipher-sft25-real-merged.md":      ("Auroraventures/cipher-sft25-real-merged",        "model"),
    "cipher-sft-merged-GGUF.md":        ("Auroraventures/cipher-sft-merged-Q4_K_M-GGUF",   "model"),
    "cipher-simpo-merged-GGUF.md":      ("Auroraventures/cipher-simpo-merged-Q4_K_M-GGUF", "model"),
    "cipher-sft25-merged-GGUF.md":      ("Auroraventures/cipher-sft25-merged-Q4_K_M-GGUF", "model"),
    "cipher-awwwards-sft25-dataset.md": ("Auroraventures/cipher-awwwards-sft25",           "dataset"),
}


def main() -> None:
    api = HfApi()
    print("whoami:", api.whoami().get("name"))
    for fname, (repo_id, repo_type) in MAPPING.items():
        src = HERE / fname
        if not src.exists():
            print(f"[SKIP] {fname} missing")
            continue
        try:
            api.upload_file(
                path_or_fileobj=str(src),
                path_in_repo="README.md",
                repo_id=repo_id,
                repo_type=repo_type,
                commit_message="docs: SEO-optimized model card + metadata",
            )
            print(f"[OK]   {repo_id}")
        except Exception as exc:
            print(f"[ERR]  {repo_id}: {exc}")


if __name__ == "__main__":
    main()
