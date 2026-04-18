from __future__ import annotations

import re

DEFAULT_LOCAL_MODEL = "kin-cipher-31b:latest"
REAL_HF_MODEL = "Auroraventures/cipher-sft25-real-merged"
BAD_LOCAL_MODELS = {"kin-cipher", "kin-cipher:latest"}


def assert_supported_local_model(model: str) -> None:
    normalized = (model or "").strip()
    if normalized in BAD_LOCAL_MODELS:
        raise SystemExit(
            'Refusing to use stale local model alias '
            f'"{normalized}". Use "kin-cipher-31b:latest" or set CIPHER_MODEL explicitly.'
        )


def build_gemma4_prompt(system: str, user: str) -> str:
    system = system.strip()
    user = user.strip()
    return (
        f"<bos><|turn>system\n{system}<turn|>\n"
        f"<|turn>user\n{user}<turn|>\n"
        f"<|turn>model\n<|channel>thought\n<channel|>"
    )


def clean_generated_text(text: str) -> str:
    text = re.sub(r"<\|channel\>thought\n.*?<channel\|>", "", text, flags=re.DOTALL)
    text = re.sub(r"<\|turn>(system|user|model)\n", "", text)
    text = re.sub(r"<turn\|>\s*", "", text)
    text = re.sub(r"<\|tool(?:_response|_call)?\|>.*?<tool(?:_response|_call)?\|>", "", text, flags=re.DOTALL)
    text = re.sub(r"</?start_of_turn>\w*\s*", "", text)
    text = re.sub(r"</?end_of_turn>\w*\s*", "", text)
    if "```" in text:
        match = re.search(r"```(?:html)?\s*\n?(.*?)```", text, re.DOTALL)
        if match:
            text = match.group(1)
    return text.strip()
