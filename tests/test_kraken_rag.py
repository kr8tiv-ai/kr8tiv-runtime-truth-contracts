"""Offline tests for kraken_rag — no API calls, no heavy deps required."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


from kraken_rag.clean import clean, has_required_structure  # noqa: E402
from kraken_rag.data import Site, _coerce, load_sites  # noqa: E402
from kraken_rag.embed import fit_corpus, embed, embed_one  # noqa: E402
from kraken_rag.generate import pick_provider  # noqa: E402
from kraken_rag.prompt import SYSTEM, build_user_prompt, full_messages  # noqa: E402
from kraken_rag.retrieve import retrieve  # noqa: E402
from kraken_rag.store import build  # noqa: E402
from kraken_rag.tfidf import TfidfEmbedder, tokenize  # noqa: E402


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

    def test_embedding_text_contains_expected_pieces(self) -> None:
        text = _coerce(FIXTURE).to_embedding_text()
        for expected in ("tags:", "Portfolio", "stack: Next.js",
                          "motion: GSAP", "fonts: Inter",
                          "oklch()", "nav×1", "section×4", "85kb"):
            self.assertIn(expected, text, f"{expected!r} not in {text!r}")

    def test_loads_real_gold_jsonl(self) -> None:
        sites = load_sites()
        self.assertEqual(len(sites), 96, "expected 96 SOTD records")
        for s in sites:
            self.assertTrue(s.slug)
            self.assertIsInstance(s.to_embedding_text(), str)


class CleanTests(unittest.TestCase):
    def test_strips_html_fence(self) -> None:
        self.assertEqual(
            clean("```html\n<!DOCTYPE html><html></html>\n```"),
            "<!DOCTYPE html><html></html>",
        )

    def test_strips_plain_fence(self) -> None:
        self.assertEqual(clean("```\n<!DOCTYPE html>\n```"), "<!DOCTYPE html>")

    def test_passthrough(self) -> None:
        self.assertEqual(clean("<!DOCTYPE html>  "), "<!DOCTYPE html>")

    def test_empty_input(self) -> None:
        self.assertEqual(clean(""), "")

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
            self.assertIn(must, SYSTEM)

    def test_user_prompt_includes_brief_and_refs(self) -> None:
        site = _coerce(FIXTURE)
        prompt = build_user_prompt("a type foundry site", [(site, 0.87)])
        self.assertIn("a type foundry site", prompt)
        self.assertIn("Example Studio", prompt)
        self.assertIn("Awwwards tags: Portfolio, Typography, GSAP", prompt)

    def test_full_messages_shape(self) -> None:
        msgs = full_messages("brief", [(_coerce(FIXTURE), 0.9)])
        self.assertEqual(len(msgs), 2)
        self.assertEqual(msgs[0]["role"], "system")
        self.assertEqual(msgs[1]["role"], "user")


class TfidfTests(unittest.TestCase):
    def test_tokenize_preserves_css_tokens(self) -> None:
        toks = tokenize("oklch() backdrop-filter clamp() next.js #fff")
        self.assertIn("oklch()", toks)
        self.assertIn("backdrop-filter", toks)
        self.assertIn("clamp()", toks)
        self.assertIn("next.js", toks)
        self.assertIn("#fff", toks)

    def test_fit_then_encode_l2_normalized(self) -> None:
        emb = TfidfEmbedder().fit([
            "portfolio typography gsap",
            "saas product dashboard react",
            "architecture firm dark editorial",
        ])
        vecs = emb.encode([
            "portfolio typography gsap",
            "saas product dashboard react",
        ])
        self.assertEqual(vecs.shape[0], 2)
        for v in vecs:
            self.assertAlmostEqual(float(np.linalg.norm(v)), 1.0, places=5)

    def test_cosine_ranks_match(self) -> None:
        emb = TfidfEmbedder().fit([
            "portfolio typography gsap scroll triggered reveal",
            "saas product dashboard react analytics",
            "brutalist type foundry variable font specimen",
        ])
        docs = np.stack([
            emb.encode_one("portfolio typography gsap scroll triggered reveal"),
            emb.encode_one("saas product dashboard react analytics"),
            emb.encode_one("brutalist type foundry variable font specimen"),
        ])
        q = emb.encode_one("type foundry variable font")
        sims = docs @ q
        # record 2 (type foundry) must rank highest.
        self.assertEqual(int(np.argmax(sims)), 2)


class StoreAndRetrieveTests(unittest.TestCase):
    def test_build_uses_tfidf_by_default_and_retrieves(self) -> None:
        sites = load_sites()
        store = build(sites, cache=False)
        self.assertEqual(store.model_name, "tfidf-v1")
        self.assertEqual(store.vectors.shape[0], 96)
        results = retrieve("boutique hotel with slow scroll parallax", k=3, store=store)
        self.assertEqual(len(results), 3)
        for site, score in results:
            self.assertTrue(site.slug)
            self.assertGreaterEqual(score, 0.0)


class ProviderSelectionTests(unittest.TestCase):
    def test_auto_picks_something_when_cli_or_keys_available(self) -> None:
        # This machine has `claude` CLI on PATH, so auto should return "claude-cli".
        from kraken_rag.generate import claude_cli_available
        if claude_cli_available():
            self.assertEqual(pick_provider("auto"), "claude-cli")

    def test_explicit_api_key_provider_raises_without_key(self) -> None:
        import os
        saved = {k: os.environ.pop(k, None) for k in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY")}
        try:
            with self.assertRaises(RuntimeError):
                pick_provider("anthropic")
            with self.assertRaises(RuntimeError):
                pick_provider("openai")
        finally:
            for k, v in saved.items():
                if v is not None:
                    os.environ[k] = v

    def test_unknown_preference_raises(self) -> None:
        with self.assertRaises(ValueError):
            pick_provider("mistral")  # type: ignore[arg-type]


if __name__ == "__main__":
    unittest.main(verbosity=2)
