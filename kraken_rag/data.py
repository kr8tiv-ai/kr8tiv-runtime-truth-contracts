"""Load and normalize the 96 Awwwards SOTD reference records."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
GOLD_JSONL = ROOT / "data" / "awwwards-gold.jsonl"
PATTERNS_DIR = ROOT / "data" / "awwwards-patterns"


@dataclass(frozen=True)
class Site:
    slug: str
    title: str
    live_url: str
    agency: str
    award_date: str
    tags: tuple[str, ...]
    tech_stack: tuple[str, ...]
    motion_libs: tuple[str, ...]
    google_fonts: tuple[str, ...]
    css_features: tuple[str, ...]
    section_counts: dict[str, int]
    canvas_count: int
    has_webgl: bool
    html_chars: int
    snippets: dict[str, str] = field(default_factory=dict)

    def summary(self) -> str:
        """Single-line human-readable summary."""
        stack = " + ".join(self.tech_stack) or "(no stack)"
        motion = " + ".join(self.motion_libs) or "no motion lib"
        return f"{self.title} — {self.agency} ({self.award_date}) · {stack} · {motion}"

    def to_embedding_text(self) -> str:
        """Compose the stylistic blob used for embedding / retrieval.

        Awwwards-curated `submitter_tags` come first — they're the most
        discriminative signal (they combine category + technique + material).
        Then tech stack, motion, fonts, CSS features, structural shape, size.
        """
        parts: list[str] = []
        if self.tags:
            parts.append("tags: " + ", ".join(self.tags))
        if self.tech_stack:
            parts.append("stack: " + ", ".join(self.tech_stack))
        if self.motion_libs:
            parts.append("motion: " + ", ".join(self.motion_libs))
        if self.google_fonts:
            parts.append("fonts: " + ", ".join(self.google_fonts))
        if self.css_features:
            parts.append("css: " + ", ".join(self.css_features))

        shape: list[str] = []
        for tag, count in self.section_counts.items():
            if count > 0:
                shape.append(f"{tag}×{count}")
        if self.has_webgl:
            shape.append("webgl")
        if self.canvas_count:
            shape.append(f"canvas×{self.canvas_count}")
        if shape:
            parts.append("structure: " + ", ".join(shape))

        parts.append(f"size: {self.html_chars // 1000}kb")
        return " | ".join(parts)


def _coerce(rec: dict[str, Any]) -> Site:
    return Site(
        slug=rec["slug"],
        title=rec.get("title", rec["slug"]),
        live_url=rec.get("live_url", ""),
        agency=rec.get("agency", ""),
        award_date=rec.get("award_date", ""),
        tags=tuple(rec.get("submitter_tags") or []),
        tech_stack=tuple(rec.get("tech_stack") or []),
        motion_libs=tuple(rec.get("motion_libs") or []),
        google_fonts=tuple(rec.get("google_fonts") or []),
        css_features=tuple(rec.get("css_features_present") or []),
        section_counts=dict(rec.get("section_counts") or {}),
        canvas_count=int(rec.get("canvas_count") or 0),
        has_webgl=bool(rec.get("has_webgl_ctx")),
        html_chars=int(rec.get("html_chars") or 0),
        snippets=dict(rec.get("snippets") or {}),
    )


def load_sites(path: Path | None = None) -> list[Site]:
    """Load all SOTD records from `data/awwwards-gold.jsonl` (96 by default)."""
    p = path or GOLD_JSONL
    if not p.exists():
        raise FileNotFoundError(
            f"awwwards-gold.jsonl not found at {p}. "
            f"This file ships with the repo — check it wasn't gitignored or moved."
        )
    sites: list[Site] = []
    for raw in p.read_text(encoding="utf-8").splitlines():
        raw = raw.strip()
        if not raw:
            continue
        sites.append(_coerce(json.loads(raw)))
    return sites


def load_pattern_examples(libraries: Iterable[str] | None = None) -> dict[str, list[str]]:
    """Load library-specific code snippets extracted from the 96 SOTD sites.

    Each library has a small JSONL in `data/awwwards-patterns/`. Returns a dict
    mapping `gsap` / `lenis` / `scrolltrigger` / ... to a list of short code
    examples. Used to enrich the prompt when the brief needs a specific
    motion library.
    """
    if not PATTERNS_DIR.exists():
        return {}
    out: dict[str, list[str]] = {}
    targets = (
        [lib.lower() for lib in libraries]
        if libraries is not None
        else [p.stem.lower() for p in PATTERNS_DIR.glob("*.jsonl")]
    )
    for stem in targets:
        p = PATTERNS_DIR / f"{stem}.jsonl"
        if not p.exists():
            continue
        examples: list[str] = []
        for raw in p.read_text(encoding="utf-8").splitlines():
            raw = raw.strip()
            if not raw:
                continue
            try:
                rec = json.loads(raw)
            except json.JSONDecodeError:
                continue
            text = rec.get("code") or rec.get("snippet") or rec.get("text")
            if isinstance(text, str) and text.strip():
                examples.append(text.strip())
        if examples:
            out[stem] = examples
    return out
