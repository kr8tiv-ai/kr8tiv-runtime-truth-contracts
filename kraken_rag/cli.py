"""Kraken RAG command-line interface.

Usage:
    python -m kraken_rag retrieve "boutique hotel in Tuscany" --k 5
    python -m kraken_rag generate "boutique hotel in Tuscany" --out hotel.html --open
    python -m kraken_rag serve --port 8787
"""

from __future__ import annotations

import argparse
import sys
import time
import webbrowser
from pathlib import Path

from .clean import clean, has_required_structure
from .generate import Generation, generate as api_generate, pick_provider
from .prompt import full_messages
from .retrieve import retrieve


def cmd_retrieve(args: argparse.Namespace) -> int:
    results = retrieve(args.brief, k=args.k)
    for i, (site, score) in enumerate(results, 1):
        print(f"{i:>2}. {score:.3f}  {site.summary()}")
        print(f"     {site.live_url}")
        if site.tags:
            print(f"     tags: {', '.join(site.tags[:8])}")
    return 0


def cmd_generate(args: argparse.Namespace) -> int:
    try:
        provider = pick_provider(args.provider)
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    print(f"▶ brief      {args.brief}", file=sys.stderr)
    results = retrieve(args.brief, k=args.k)
    print(f"▶ refs ({len(results)})", file=sys.stderr)
    for i, (site, score) in enumerate(results, 1):
        print(f"    {i}. {score:.3f}  {site.title} — {site.agency}", file=sys.stderr)

    msgs = full_messages(args.brief, results)
    print(f"▶ calling    {provider}", file=sys.stderr)
    t0 = time.time()
    gen: Generation = api_generate(
        msgs, provider=args.provider, model=args.model, max_tokens=args.max_tokens,
    )
    elapsed = time.time() - t0

    html = clean(gen.html)
    sig = has_required_structure(html)
    passed = all(sig.values())

    print(
        f"▶ result     {len(html):,} chars · {elapsed:.1f}s · "
        f"{gen.provider}/{gen.model} · in={gen.input_tokens} out={gen.output_tokens}",
        file=sys.stderr,
    )
    print(f"▶ structure  {'PASS' if passed else 'WARN'} {sig}", file=sys.stderr)

    if args.out:
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding="utf-8")
        print(f"▶ wrote      {out}", file=sys.stderr)
        if args.open:
            webbrowser.open(out.resolve().as_uri())
    else:
        sys.stdout.write(html)
        sys.stdout.flush()
    return 0 if passed else 1


def cmd_serve(args: argparse.Namespace) -> int:
    from .server import run

    run(host=args.host, port=args.port, reload=args.reload)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="kraken_rag", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p_r = sub.add_parser("retrieve", help="Retrieve top-k SOTD references for a brief")
    p_r.add_argument("brief", help="Free-text creative brief")
    p_r.add_argument("--k", type=int, default=5)
    p_r.set_defaults(fn=cmd_retrieve)

    p_g = sub.add_parser("generate", help="Generate a full HTML site via frontier model")
    p_g.add_argument("brief", help="Free-text creative brief")
    p_g.add_argument("--k", type=int, default=3, help="Number of refs to ground on")
    p_g.add_argument("--out", help="Write HTML to this path (else print to stdout)")
    p_g.add_argument("--open", action="store_true", help="Open result in browser")
    p_g.add_argument("--provider", choices=["anthropic", "openai", "auto"], default="auto")
    p_g.add_argument("--model", default=None, help="Override default model id")
    p_g.add_argument("--max-tokens", type=int, default=16000)
    p_g.set_defaults(fn=cmd_generate)

    p_s = sub.add_parser("serve", help="Run the tiny web UI")
    p_s.add_argument("--host", default="127.0.0.1")
    p_s.add_argument("--port", type=int, default=8787)
    p_s.add_argument("--reload", action="store_true")
    p_s.set_defaults(fn=cmd_serve)

    args = parser.parse_args(argv)
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
