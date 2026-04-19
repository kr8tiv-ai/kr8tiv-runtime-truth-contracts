"""Frontier-model call — three providers.

Default: **claude-cli**. Shells out to the Claude Code CLI (`claude -p`) and
uses whatever auth the CLI already has. No API key needed. This is the path
Kraken RAG uses in practice — it lets the tool run from any session that's
already logged into Claude Code.

Optional: `anthropic` (SDK, requires ANTHROPIC_API_KEY) and `openai`
(SDK, requires OPENAI_API_KEY). Both are lazy-imported so neither is a
hard dependency.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass


DEFAULT_CLAUDE_CLI_MODEL = "opus"        # resolves to latest Opus via Claude Code
DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-7-20260101"
DEFAULT_OPENAI_MODEL = "gpt-5.4"

CLI_TIMEOUT_SECONDS = 900  # generous — long HTML outputs can take a few minutes


@dataclass
class Generation:
    html: str
    provider: str
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None


# ─────────────────────────────────────────────────────────────────────────
# Availability probes
# ─────────────────────────────────────────────────────────────────────────

def claude_cli_available() -> bool:
    return shutil.which("claude") is not None or shutil.which("claude.exe") is not None


def anthropic_available() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def openai_available() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY"))


# ─────────────────────────────────────────────────────────────────────────
# Provider selection
# ─────────────────────────────────────────────────────────────────────────

def pick_provider(preference: str = "auto") -> str:
    """Resolve a concrete provider string.

    'auto' prefers claude-cli (no auth drama), falls back to Anthropic SDK,
    then OpenAI SDK.
    """
    if preference == "claude-cli":
        if not claude_cli_available():
            raise RuntimeError(
                "The `claude` CLI was not found on PATH. Install Claude Code "
                "or pass --provider anthropic/openai."
            )
        return "claude-cli"
    if preference == "anthropic":
        if not anthropic_available():
            raise RuntimeError("ANTHROPIC_API_KEY is not set.")
        return "anthropic"
    if preference == "openai":
        if not openai_available():
            raise RuntimeError("OPENAI_API_KEY is not set.")
        return "openai"
    if preference == "auto":
        if claude_cli_available():
            return "claude-cli"
        if anthropic_available():
            return "anthropic"
        if openai_available():
            return "openai"
        raise RuntimeError(
            "No provider available. Either install Claude Code (`claude` CLI), "
            "or set ANTHROPIC_API_KEY / OPENAI_API_KEY."
        )
    raise ValueError(f"Unknown provider preference: {preference!r}")


# ─────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────

def generate(
    messages: list[dict],
    provider: str = "auto",
    model: str | None = None,
    max_tokens: int = 16000,
) -> Generation:
    """Run one generation call and return the raw HTML + metadata."""
    resolved = pick_provider(provider)
    if resolved == "claude-cli":
        return _call_claude_cli(messages, model or DEFAULT_CLAUDE_CLI_MODEL)
    if resolved == "anthropic":
        return _call_anthropic(messages, model or DEFAULT_ANTHROPIC_MODEL, max_tokens)
    if resolved == "openai":
        return _call_openai(messages, model or DEFAULT_OPENAI_MODEL, max_tokens)
    raise RuntimeError(f"Unhandled provider {resolved!r}")


# ─────────────────────────────────────────────────────────────────────────
# claude-cli
# ─────────────────────────────────────────────────────────────────────────

def _format_cli_prompt(messages: list[dict]) -> str:
    """Combine chat messages into a single stdin blob for `claude -p`.

    We deliberately do NOT use --append-system-prompt: on Windows, long system
    prompts passed as CLI args caused `claude` to hang (process idle, no CPU)
    for minutes. Piping everything through stdin is universally reliable.
    """
    system = next((m["content"] for m in messages if m["role"] == "system"), "").strip()
    users = [m["content"] for m in messages if m["role"] != "system"]
    user = "\n\n".join(users).strip()
    if system:
        return f"# Instructions\n\n{system}\n\n---\n\n{user}"
    return user


def _call_claude_cli(messages: list[dict], model: str) -> Generation:
    body = _format_cli_prompt(messages)
    cmd: list[str] = ["claude", "-p"]
    if model:
        cmd += ["--model", model]
    try:
        result = subprocess.run(
            cmd,
            input=body,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=CLI_TIMEOUT_SECONDS,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(f"`claude` CLI not on PATH: {exc}") from exc
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f"`claude -p` timed out after {CLI_TIMEOUT_SECONDS}s") from exc

    if result.returncode != 0:
        raise RuntimeError(
            f"`claude -p` exited {result.returncode}:\n"
            f"STDERR: {(result.stderr or '').strip()[:1000]}\n"
            f"STDOUT: {(result.stdout or '').strip()[:500]}"
        )
    return Generation(
        html=(result.stdout or "").strip(),
        provider="claude-cli",
        model=model,
        input_tokens=None,
        output_tokens=None,
    )


# ─────────────────────────────────────────────────────────────────────────
# Anthropic SDK
# ─────────────────────────────────────────────────────────────────────────

def _call_anthropic(messages: list[dict], model: str, max_tokens: int) -> Generation:
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
    text_parts = [getattr(block, "text", "") for block in resp.content]
    usage = getattr(resp, "usage", None)
    return Generation(
        html="".join(text_parts).strip(),
        provider="anthropic",
        model=model,
        input_tokens=getattr(usage, "input_tokens", None) if usage else None,
        output_tokens=getattr(usage, "output_tokens", None) if usage else None,
    )


# ─────────────────────────────────────────────────────────────────────────
# OpenAI SDK
# ─────────────────────────────────────────────────────────────────────────

def _call_openai(messages: list[dict], model: str, max_tokens: int) -> Generation:
    from openai import OpenAI  # type: ignore[import-not-found]

    client = OpenAI()
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
    )
    html = (resp.choices[0].message.content or "").strip()
    usage = getattr(resp, "usage", None)
    return Generation(
        html=html,
        provider="openai",
        model=model,
        input_tokens=getattr(usage, "prompt_tokens", None) if usage else None,
        output_tokens=getattr(usage, "completion_tokens", None) if usage else None,
    )
