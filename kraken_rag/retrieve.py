"""Brief → top-k Awwwards SOTD references."""

from __future__ import annotations

from .data import Site, load_sites
from .embed import embed_one
from .store import Store, build


def retrieve(
    brief: str,
    k: int = 3,
    store: Store | None = None,
) -> list[tuple[Site, float]]:
    """Given a free-text brief, return `k` most similar SOTD references.

    Lazy-loads data + builds (or loads cached) embeddings on first call.
    Pass `store` to reuse a pre-built store across many queries.
    """
    if store is None:
        store = build(load_sites())
    qv = embed_one(brief, model_name=store.model_name)
    return store.top_k(qv, k=k)
