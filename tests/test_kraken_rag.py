"""Offline tests for kraken_rag — no API calls, no heavy deps required."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


from kraken_rag.clean import clean, has_required_structure  # noqa: E402
from kraken_rag.data import Site, _coerce, load_sites  # noqa: E402
from kraken_rag.generate import pick_provider  # noqa: E402
from kraken_rag.prompt import SYSTEM, build_user_prompt, full_messages  # noqa: E402


FIXTURE = {
    "slug": "example-studio",
    "title": "Example Studio",
    "live_url": "https://example.com/",
    "agency": "Demo Agency",
    "award_date": "Apr 18, 2026",
    "submitter_tags": ["Portfolio", "Typography", "GSAP"],
    "tech_stack": ["Next.js"],
    "motion_libs": ["GSAP"],
    "google_fonts": ["Inter"],
    "color_var_examples": ["#000", "#fff"],
    "size_var_examples": ["16px"],
    "css_features_present": ["oklch()", "backdrop-filter", "clamp()"],
    "section_counts": {
        "nav": 1, "main": 1, "section": 4, "footer": 1,
        "header": 0, "article": 0, "aside": 0,
    },
    "canvas_count": 0,
    "has_webgl_ctx": False,
    "html_chars": 85000,
    "snippets": {},
}


class DataTests(unittest.TestCase):
    def test_coerce_shapes(self) -> None:
        site = _coerce(FIXTURE)
        self.assertIsInstance(site, Site)
        self.assertEqual(site.slug, "example-studio")
        self.assertEqual(site.tags, ("Portfolio", "Typography", "GSAP"))
        self.assertEqual(site.motion_libs, ("GSAP",))
        self.assertFalse(site.has_webgl)
        self.assertEqual(site.html_chars, 85000)

    def test_embedding_text_contains_expected_pieces(self) -> None:
        text = _coerce(FIXTURE).to_embedding_text()
        for expected in ("tags:", "Portfolio", "stack: Next.js",
                          "motion: GSAP", "fonts: Inter",
                          "oklch()", "nav×1", "section×4", "85kb"):
            self.assertIn(expected, text, f"{expected!r} not in {text!r}")

    def test_summary_readable(self) -> None:
        s = _coerce(FIXTURE).summary()
        self.assertIn("Example Studio", s)
        self.assertIn("Demo Agency", s)
        self.assertIn("Next.js", s)
        self.assertIn("GSAP", s)

    def test_loads_real_gold_jsonl(self) -> None:
        sites = load_sites()
        self.assertEqual(len(sites), 96, "expected 96 SOTD records")
        for s in sites:
            self.assertTrue(s.slug, "every record needs a slug")
            # Can compose embedding text without error.
            self.assertIsInstance(s.to_embedding_text(), str)


class CleanTests(unittest.TestCase):
    def test_strips_html_fence(self) -> None:
        self.assertEqual(
            clean("```html\n<!DOCTYPE html><html></html>\n```"),
            "<!DOCTYPE html><html></html>",
        )

    def test_strips_plain_fence(self) -> None:
        self.assertEqual(clean("```\n<!DOCTYPE html>\n```"), "<!DOCTYPE html>")

    def test_passthrough_already_clean(self) -> None:
        self.assertEqual(clean("<!DOCTYPE html>  "), "<!DOCTYPE html>")

    def test_strips_chat_template_noise(self) -> None:
        self.assertEqual(
            clean("<|turn>user\n<!DOCTYPE html><turn|>\n"),
            "<!DOCTYPE html>",
        )

    def test_empty_input(self) -> None:
        self.assertEqual(clean(""), "")
        self.assertEqual(clean(None), "")  # type: ignore[arg-type]

    def test_structure_check_pass(self) -> None:
        html = (
            "<!DOCTYPE html><html><body>"
            "<nav></nav><main><section></section><section></section>"
            "<section></section></main><footer></footer>"
            "</body></html>"
        )
        sig = has_required_structure(html)
        self.assertTrue(all(sig.values()), sig)

    def test_structure_check_fails_on_tailwind(self) -> None:
        html = (
            "<!DOCTYPE html><html><head>"
            "<script src='https://cdn.tailwindcss.com/'></script>"
            "</head><nav></nav><main><section></section><section></section>"
            "<section></section></main><footer></footer></html>"
        )
        sig = has_required_structure(html)
        self.assertFalse(sig["no_tailwind_cdn"])


class PromptTests(unittest.TestCase):
    def test_system_prompt_encodes_constraints(self) -> None:
        for must in ("<!DOCTYPE html>", "<nav>", "<footer>",
                      "Tailwind", "lenis.stop()"):
            self.assertIn(must, SYSTEM, f"system prompt missing {must!r}")

    def test_user_prompt_includes_brief_and_refs(self) -> None:
        site = _coerce(FIXTURE)
        prompt = build_user_prompt("a type foundry site", [(site, 0.87)])
        self.assertIn("a type foundry site", prompt)
        self.assertIn("References", prompt)
        self.assertIn("Example Studio", prompt)
        self.assertIn("Demo Agency", prompt)
        self.assertIn("Awwwards tags: Portfolio, Typography, GSAP", prompt)
        self.assertIn("Tech stack: Next.js", prompt)

    def test_full_messages_shape(self) -> None:
        site = _coerce(FIXTURE)
        msgs = full_messages("brief", [(site, 0.9)])
        self.assertEqual(len(msgs), 2)
        self.assertEqual(msgs[0]["role"], "system")
        self.assertEqual(msgs[1]["role"], "user")
        self.assertIn("<!DOCTYPE html>", msgs[0]["content"])
        self.assertIn("brief", msgs[1]["content"])

    def test_no_refs_still_builds(self) -> None:
        prompt = build_user_prompt("nothing to show", [])
        self.assertIn("nothing to show", prompt)
        # Empty reference block is acceptable.


class ProviderSelectionTests(unittest.TestCase):
    def test_no_providers_raises(self) -> None:
        import os

        saved = {k: os.environ.pop(k, None) for k in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY")}
        try:
            with self.assertRaises(RuntimeError):
                pick_provider("auto")
            with self.assertRaises(RuntimeError):
                pick_provider("anthropic")
            with self.assertRaises(RuntimeError):
                pick_provider("openai")
        finally:
            for k, v in saved.items():
                if v is not None:
                    os.environ[k] = v

    def test_anthropic_preferred_when_both_set(self) -> None:
        import os

        saved = {k: os.environ.get(k) for k in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY")}
        try:
            os.environ["ANTHROPIC_API_KEY"] = "sk-ant-fake"
            os.environ["OPENAI_API_KEY"] = "sk-openai-fake"
            self.assertEqual(pick_provider("auto"), "anthropic")
            self.assertEqual(pick_provider("anthropic"), "anthropic")
            self.assertEqual(pick_provider("openai"), "openai")
        finally:
            for k, v in saved.items():
                if v is None:
                    os.environ.pop(k, None)
                else:
                    os.environ[k] = v

    def test_unknown_preference_raises(self) -> None:
        with self.assertRaises(ValueError):
            pick_provider("mistral")  # type: ignore[arg-type]


if __name__ == "__main__":
    unittest.main(verbosity=2)
