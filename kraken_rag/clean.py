"""Strip markdown fences / stray template tags from model output."""

from __future__ import annotations

import re


def clean(text: str) -> str:
    """Return the inner HTML if the model wrapped the document in a fence."""
    if not text:
        return ""
    # Extract from a single fenced block if present.
    if "```" in text:
        m = re.search(r"```(?:html)?\s*\n?(.*?)```", text, re.DOTALL)
        if m:
            text = m.group(1)
    # Strip any leftover chat-template tokens some local models leak.
    text = re.sub(r"</?(?:start|end)_of_turn>\w*\s*", "", text)
    text = re.sub(r"<\|turn>(system|user|model)\n", "", text)
    text = re.sub(r"<turn\|>\s*", "", text)
    return text.strip()


def has_required_structure(html: str) -> dict[str, bool]:
    """Quick structural signal-check (the same one the training harness uses)."""
    low = html.lower()
    return {
        "doctype": low.startswith("<!doctype"),
        "has_nav": "<nav" in low,
        "has_main": "<main" in low,
        "has_footer": "<footer" in low,
        "three_sections": low.count("<section") >= 3,
        "no_tailwind_cdn": "cdn.tailwind" not in low and "tailwindcss.com" not in low,
        "no_lenis_stop": "lenis.stop(" not in low,
    }
