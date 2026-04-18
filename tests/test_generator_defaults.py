from __future__ import annotations

import importlib
import json
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.cipher_prompting import (  # type: ignore
    DEFAULT_LOCAL_MODEL,
    REAL_HF_MODEL,
    build_gemma4_prompt,
    clean_generated_text,
)


class GeneratorDefaultsTests(unittest.TestCase):
    def test_local_generators_use_real_local_default_and_gemma4_wrapper(self) -> None:
        original = os.environ.pop("CIPHER_MODEL", None)
        try:
            via_endpoint = importlib.reload(importlib.import_module("scripts.generate_via_endpoint"))
            full_sites = importlib.reload(importlib.import_module("scripts.generate_full_sites"))

            self.assertEqual(via_endpoint.MODEL, DEFAULT_LOCAL_MODEL)
            self.assertEqual(full_sites.MODEL, DEFAULT_LOCAL_MODEL)
            self.assertEqual(via_endpoint.build_prompt("sys", "user"), build_gemma4_prompt("sys", "user"))
            self.assertEqual(full_sites.build_prompt("sys", "user"), build_gemma4_prompt("sys", "user"))
            self.assertEqual(
                via_endpoint.clean("<|channel>thought\nx\n<channel|>```html\n<!DOCTYPE html>\n```"),
                clean_generated_text("<|channel>thought\nx\n<channel|>```html\n<!DOCTYPE html>\n```"),
            )
        finally:
            if original is not None:
                os.environ["CIPHER_MODEL"] = original

    def test_hf_endpoint_example_targets_real_model(self) -> None:
        cfg = json.loads(
            (ROOT / "scripts" / "endpoint_config.example.json").read_text(encoding="utf-8")
        )
        self.assertEqual(cfg["model"], REAL_HF_MODEL)


if __name__ == "__main__":
    unittest.main()
