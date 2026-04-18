from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.cipher_prompting import (  # type: ignore
    DEFAULT_LOCAL_MODEL,
    REAL_HF_MODEL,
    assert_supported_local_model,
    build_gemma4_prompt,
    clean_generated_text,
)


class CipherPromptingTests(unittest.TestCase):
    def test_build_gemma4_prompt_uses_turn_tokens_and_empty_thought_channel(self) -> None:
        prompt = build_gemma4_prompt("system text", "user text")

        self.assertTrue(prompt.startswith("<bos><|turn>system\nsystem text"))
        self.assertIn("<turn|>\n<|turn>user\nuser text<turn|>\n", prompt)
        self.assertTrue(prompt.endswith("<|turn>model\n<|channel>thought\n<channel|>"))

    def test_clean_generated_text_strips_thought_channel_turn_tokens_and_fences(self) -> None:
        raw = (
            "<|channel>thought\ninternal reasoning\n<channel|>"
            "```html\n<!DOCTYPE html><html><body>Hello</body></html>\n```<turn|>\n"
        )

        cleaned = clean_generated_text(raw)

        self.assertEqual(cleaned, "<!DOCTYPE html><html><body>Hello</body></html>")

    def test_assert_supported_local_model_rejects_stale_1b_alias(self) -> None:
        with self.assertRaises(SystemExit) as ctx:
            assert_supported_local_model("kin-cipher")

        self.assertIn("kin-cipher-31b:latest", str(ctx.exception))

    def test_exposes_expected_default_model_constants(self) -> None:
        self.assertEqual(DEFAULT_LOCAL_MODEL, "kin-cipher-31b:latest")
        self.assertEqual(REAL_HF_MODEL, "Auroraventures/cipher-sft25-real-merged")


if __name__ == "__main__":
    unittest.main()
