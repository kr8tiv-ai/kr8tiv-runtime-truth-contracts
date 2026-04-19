"""Kraken RAG — Awwwards-grounded site generation.

Retrieves the most stylistically-similar Awwwards Site-of-the-Day winners for
a free-text brief, packs them as in-context examples for a frontier model, and
returns a complete single-file HTML site.

No fine-tuning, no local inference. Uses the 96 SOTD records at
`data/awwwards-gold.jsonl`.

See `kraken_rag/README.md` or `python -m kraken_rag --help`.
"""

__version__ = "0.1.0"
