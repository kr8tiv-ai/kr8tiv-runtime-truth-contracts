"""Tiny in-memory vector store. 96 records — numpy + cosine is plenty.

Persists embeddings to `.cache/kraken_rag/embeddings-<sha>.npz` so re-runs
don't pay the sentence-transformers cost.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np

from .embed import DEFAULT_MODEL, embed


if TYPE_CHECKING:
    from .data import Site


ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / ".cache" / "kraken_rag"


@dataclass
class Store:
    sites: list["Site"]
    vectors: np.ndarray  # shape (N, D), L2-normalized
    model_name: str = DEFAULT_MODEL

    def top_k(self, query_vec: np.ndarray, k: int = 3) -> list[tuple["Site", float]]:
        """Return the k highest-cosine-similarity sites."""
        if self.vectors.shape[0] == 0:
            return []
        # Both vectors and query are L2-normalized, so inner product == cosine.
        sims = self.vectors @ query_vec
        k = min(k, sims.shape[0])
        idx = np.argsort(-sims)[:k]
        return [(self.sites[i], float(sims[i])) for i in idx]


def _cache_key(sites: list["Site"], model_name: str) -> str:
    h = hashlib.sha1()
    h.update(model_name.encode())
    for s in sites:
        h.update(b"\n")
        h.update(s.slug.encode())
    return h.hexdigest()[:12]


def build(sites: list["Site"], cache: bool = True, model_name: str = DEFAULT_MODEL) -> Store:
    """Build or load a vector store for the given sites."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    key = _cache_key(sites, model_name)
    cache_path = CACHE_DIR / f"embeddings-{key}.npz"

    if cache and cache_path.exists():
        try:
            data = np.load(cache_path, allow_pickle=False)
            vectors = data["vectors"]
            if vectors.shape[0] == len(sites):
                return Store(sites=sites, vectors=vectors, model_name=model_name)
        except Exception:
            # Corrupt cache — rebuild.
            pass

    texts = [s.to_embedding_text() for s in sites]
    vectors = embed(texts, model_name=model_name)
    if cache:
        np.savez_compressed(
            cache_path,
            vectors=vectors,
            slugs=np.array([s.slug for s in sites], dtype=object),
        )
    return Store(sites=sites, vectors=vectors, model_name=model_name)
