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
    """Free-text brief → `k` most stylistically similar SOTD references."""
    if store is None:
        store = build(load_sites())
    qv = embed_one(brief, model_name=store.model_name, tfidf=store.tfidf)
    return store.top_k(qv, k=k)
