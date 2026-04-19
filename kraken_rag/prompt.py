"""Prompt assembly: brief + top-k references → system/user messages.

System prompt encodes all structural, motion, and quality constraints. User
prompt contains the brief plus the chosen Awwwards references, formatted so
the frontier model can read them as aesthetic grounding (not as something to
copy verbatim).
"""

from __future__ import annotations

from .data import Site


SYSTEM = (
    "You are a senior creative web developer. Build Awwwards-quality single-file HTML "
    "pages in response to creative briefs.\n\n"
    "Output rules:\n"
    "- Emit ONE complete HTML document starting with <!DOCTYPE html> and ending with </html>.\n"
    "- No markdown fences. No prose. HTML only.\n"
    "- Required structure: <nav>, <main> with hero + 3+ <section> elements, <footer>.\n"
    "- Motion stack: Three.js / GSAP / Lenis / ScrollTrigger / SplitText / Locomotive from CDN "
    "inline. No Tailwind CDN. No bundlers. No frameworks.\n"
    "- Never call lenis.stop(). Parents stay opacity:1. Never reference DOM ids that do not exist.\n"
    "- Aim for 25–60 KB of hand-authored design work. Compact component demos are not acceptable.\n"
    "- Use modern CSS: oklch(), color-mix(), clamp(), subgrid, :has(), @keyframes, "
    "backdrop-filter, mask/clip-path, aspect-ratio, custom properties.\n"
    "- Expressive typography via Google Fonts (inline <link>). Custom cursors, scroll-linked "
    "effects, editorial layouts, and asymmetric grids are encouraged.\n\n"
    "You will be shown real Awwwards Site-of-the-Day winners as stylistic references. "
    "Draw aesthetic and structural inspiration from them; do not copy them. "
    "Compose an original site that would fit on awwwards.com's front page alongside them."
)


def _format_reference(i: int, site: Site) -> str:
    lines: list[str] = [
        f"### Reference {i} — {site.title}",
        f"- Agency: {site.agency} · Awarded: {site.award_date}",
        f"- URL: {site.live_url}",
    ]
    if site.tags:
        lines.append(f"- Awwwards tags: {', '.join(site.tags)}")
    if site.tech_stack:
        lines.append(f"- Tech stack: {', '.join(site.tech_stack)}")
    if site.motion_libs:
        lines.append(f"- Motion libraries: {', '.join(site.motion_libs)}")
    if site.google_fonts:
        lines.append(f"- Google Fonts: {', '.join(site.google_fonts)}")
    if site.css_features:
        lines.append(f"- CSS features present: {', '.join(site.css_features)}")

    shape = ", ".join(f"{k}×{v}" for k, v in site.section_counts.items() if v > 0)
    if shape:
        lines.append(f"- Structural shape: {shape}")
    if site.has_webgl:
        lines.append("- Uses WebGL")
    if site.canvas_count:
        lines.append(f"- Canvas elements: {site.canvas_count}")
    lines.append(f"- Actual size: ~{site.html_chars // 1000} KB HTML")

    for label, snippet in list(site.snippets.items())[:2]:
        preview = snippet[:800].strip()
        if not preview:
            continue
        lines.append(f"- Snippet ({label}):")
        lines.append("  ```")
        for line in preview.splitlines():
            lines.append(f"  {line}")
        lines.append("  ```")
    return "\n".join(lines)


def build_user_prompt(brief: str, references: list[tuple[Site, float]]) -> str:
    """Assemble the user-role message body."""
    refs = "\n\n".join(_format_reference(i + 1, s) for i, (s, _score) in enumerate(references))
    return (
        f"## Brief\n{brief}\n\n"
        f"## References\nThe following are real Awwwards Site-of-the-Day winners chosen for "
        f"stylistic fit with this brief. Use them for aesthetic and structural grounding.\n\n"
        f"{refs}\n\n"
        f"## Task\nEmit the complete HTML document for this brief now, drawing inspiration from "
        f"the references but composing something original that stands on its own."
    )


def full_messages(brief: str, references: list[tuple[Site, float]]) -> list[dict]:
    return [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": build_user_prompt(brief, references)},
    ]
