"""Embedding facade.

Default: the pure-numpy TF-IDF embedder (`tfidf.TfidfEmbedder`). No heavy deps.
Optional: `sentence-transformers/all-MiniLM-L6-v2` — only used if the library
is installed AND `KRAKEN_RAG_MODEL=miniLM` (or a full HF model id) is set.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Sequence

import numpy as np

from .tfidf import TfidfEmbedder


DEFAULT_MODEL = "tfidf-v1"


def resolve_model_name(requested: str | None = None) -> str:
    """Decide which embedding backend to use.

    Precedence: explicit arg > KRAKEN_RAG_MODEL env > DEFAULT_MODEL.
    Values:
      * "tfidf-v1"                       — pure numpy (no extra deps)
      * "miniLM" / any HF id like
        "sentence-transformers/..."      — uses sentence-transformers if installed
    """
    if requested:
        return requested
    env = os.environ.get("KRAKEN_RAG_MODEL")
    if env:
        return env
    return DEFAULT_MODEL


def _is_tfidf(name: str) -> bool:
    return name.startswith("tfidf")


def _st_available() -> bool:
    try:
        import sentence_transformers  # noqa: F401
        return True
    except Exception:
        return False


@lru_cache(maxsize=4)
def _st_model(name: str):
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(name)


def fit_corpus(docs: Sequence[str], model_name: str | None = None) -> tuple[str, TfidfEmbedder | None]:
    """Prepare the embedder for a given corpus.

    TF-IDF needs a `fit(docs)` call so it knows the vocabulary; sentence-
    transformers doesn't. This returns (resolved_model_name, fitted_tfidf_or_None).
    The fitted TfidfEmbedder (if any) should be passed through to `embed` /
    `embed_one` so we don't refit on every query.
    """
    name = resolve_model_name(model_name)
    if _is_tfidf(name):
        emb = TfidfEmbedder().fit(list(docs))
        return name, emb
    if name.startswith("miniLM"):
        name = "sentence-transformers/all-MiniLM-L6-v2"
    if not _st_available():
        # Soft fallback: explicit model requested but library missing.
        fallback = TfidfEmbedder().fit(list(docs))
        return "tfidf-v1", fallback
    return name, None


def embed(
    texts: Sequence[str],
    model_name: str,
    tfidf: TfidfEmbedder | None = None,
) -> np.ndarray:
    """Embed a batch. Returns (N, D) L2-normalized float32."""
    if not texts:
        return np.zeros((0, 1), dtype=np.float32)
    if _is_tfidf(model_name):
        if tfidf is None:
            raise RuntimeError(
                "TF-IDF backend requires a fitted TfidfEmbedder. Call "
                "fit_corpus(docs) first and pass the returned embedder."
            )
        return tfidf.encode(list(texts))
    model = _st_model(model_name)
    vecs = model.encode(
        list(texts),
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return vecs.astype(np.float32)


def embed_one(
    text: str,
    model_name: str,
    tfidf: TfidfEmbedder | None = None,
) -> np.ndarray:
    return embed([text], model_name=model_name, tfidf=tfidf)[0]
