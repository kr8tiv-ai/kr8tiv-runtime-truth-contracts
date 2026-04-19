"""Frontier-model call: Anthropic (primary) or OpenAI (fallback).

Reads API keys from ANTHROPIC_API_KEY / OPENAI_API_KEY. Does nothing clever
beyond packaging the messages and parsing the response — retries, streaming,
tool use, etc. are explicitly out of scope for v0.1.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-7-20260101"
DEFAULT_OPENAI_MODEL = "gpt-5.4"


@dataclass
class Generation:
    html: str
    provider: str
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None


def anthropic_available() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def openai_available() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY"))


def pick_provider(preference: str = "auto") -> str:
    """Resolve a concrete provider string from 'auto' / 'anthropic' / 'openai'.

    Raises RuntimeError if no provider can satisfy the preference.
    """
    if preference == "anthropic":
        if not anthropic_available():
            raise RuntimeError("ANTHROPIC_API_KEY is not set.")
        return "anthropic"
    if preference == "openai":
        if not openai_available():
            raise RuntimeError("OPENAI_API_KEY is not set.")
        return "openai"
    if preference == "auto":
        if anthropic_available():
            return "anthropic"
        if openai_available():
            return "openai"
        raise RuntimeError(
            "No provider available. Set ANTHROPIC_API_KEY or OPENAI_API_KEY, "
            "or pass --provider explicitly."
        )
    raise ValueError(f"Unknown provider preference: {preference!r}")


def generate(
    messages: list[dict],
    provider: str = "auto",
    model: str | None = None,
    max_tokens: int = 16000,
) -> Generation:
    """Run one API call and return the raw HTML plus usage metadata."""
    resolved = pick_provider(provider)
    if resolved == "anthropic":
        return _call_anthropic(messages, model or DEFAULT_ANTHROPIC_MODEL, max_tokens)
    if resolved == "openai":
        return _call_openai(messages, model or DEFAULT_OPENAI_MODEL, max_tokens)
    raise RuntimeError(f"Unhandled provider {resolved!r}")


def _call_anthropic(messages: list[dict], model: str, max_tokens: int) -> Generation:
    # Lazy import so users without anthropic installed can still use the retrieve/openai paths.
    import anthropic  # type: ignore[import-not-found]

    client = anthropic.Anthropic()
    system_msg = next((m["content"] for m in messages if m["role"] == "system"), "")
    user_msgs = [m for m in messages if m["role"] != "system"]
    resp = client.messages.create(
        model=model,
        system=system_msg,
        max_tokens=max_tokens,
        messages=user_msgs,
    )
    html_chunks: list[str] = []
    for block in resp.content:
        text = getattr(block, "text", None)
        if text:
            html_chunks.append(text)
    usage = getattr(resp, "usage", None)
    return Generation(
        html="".join(html_chunks).strip(),
        provider="anthropic",
        model=model,
        input_tokens=getattr(usage, "input_tokens", None) if usage else None,
        output_tokens=getattr(usage, "output_tokens", None) if usage else None,
    )


def _call_openai(messages: list[dict], model: str, max_tokens: int) -> Generation:
    from openai import OpenAI  # type: ignore[import-not-found]

    client = OpenAI()
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
    )
    choice = resp.choices[0]
    html = (choice.message.content or "").strip()
    usage = getattr(resp, "usage", None)
    return Generation(
        html=html,
        provider="openai",
        model=model,
        input_tokens=getattr(usage, "prompt_tokens", None) if usage else None,
        output_tokens=getattr(usage, "completion_tokens", None) if usage else None,
    )
