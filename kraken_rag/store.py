"""Tiny in-memory vector store. 96 records — numpy + cosine is plenty.

Holds both the fitted TF-IDF embedder (so queries can be encoded later) and
the vector matrix for the corpus. Cached to `.cache/kraken_rag/` by content
hash so re-runs skip re-fitting / re-encoding.
"""

from __future__ import annotations

import hashlib
import pickle
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np

from .embed import embed, fit_corpus, resolve_model_name
from .tfidf import TfidfEmbedder


if TYPE_CHECKING:
    from .data import Site


ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / ".cache" / "kraken_rag"


@dataclass
class Store:
    sites: list["Site"]
    vectors: np.ndarray  # shape (N, D), L2-normalized
    model_name: str
    tfidf: TfidfEmbedder | None = None

    def top_k(self, query_vec: np.ndarray, k: int = 3) -> list[tuple["Site", float]]:
        if self.vectors.shape[0] == 0:
            return []
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
        h.update(s.to_embedding_text().encode())
    return h.hexdigest()[:12]


def build(
    sites: list["Site"],
    cache: bool = True,
    model_name: str | None = None,
) -> Store:
    """Build or load a vector store for the given sites."""
    resolved = resolve_model_name(model_name)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    key = _cache_key(sites, resolved)
    cache_path = CACHE_DIR / f"store-{key}.pkl"

    if cache and cache_path.exists():
        try:
            with cache_path.open("rb") as fh:
                blob = pickle.load(fh)
            if (
                isinstance(blob, dict)
                and blob.get("model_name") == resolved
                and isinstance(blob.get("vectors"), np.ndarray)
                and blob["vectors"].shape[0] == len(sites)
            ):
                return Store(
                    sites=sites,
                    vectors=blob["vectors"],
                    model_name=blob["model_name"],
                    tfidf=blob.get("tfidf"),
                )
        except Exception:
            pass  # Corrupt — rebuild.

    docs = [s.to_embedding_text() for s in sites]
    actual_name, tfidf = fit_corpus(docs, resolved)
    vectors = embed(docs, model_name=actual_name, tfidf=tfidf)

    if cache:
        with cache_path.open("wb") as fh:
            pickle.dump(
                {"model_name": actual_name, "vectors": vectors, "tfidf": tfidf}, fh
            )
    return Store(sites=sites, vectors=vectors, model_name=actual_name, tfidf=tfidf)
