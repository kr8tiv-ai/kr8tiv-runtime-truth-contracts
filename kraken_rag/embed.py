"""Local embeddings via sentence-transformers.

We pick `all-MiniLM-L6-v2` — 384-dim, ~80 MB download, instant inference on
CPU, plenty of headroom for 96 records. First call downloads the model; all
subsequent calls are cached by huggingface_hub in the usual place.

Nothing here hits a paid API.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Sequence

import numpy as np


DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=4)
def _model(name: str = DEFAULT_MODEL):
    # Lazy import so `python -m kraken_rag --help` doesn't pull 400 MB of
    # torch/transformers at every CLI startup.
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(name)


def embed(texts: Sequence[str], model_name: str = DEFAULT_MODEL) -> np.ndarray:
    """Returns an (N, D) L2-normalized float32 array."""
    if not texts:
        return np.zeros((0, 384), dtype=np.float32)
    model = _model(model_name)
    vecs = model.encode(
        list(texts),
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return vecs.astype(np.float32)


def embed_one(text: str, model_name: str = DEFAULT_MODEL) -> np.ndarray:
    """Returns a (D,) L2-normalized float32 vector."""
    return embed([text], model_name=model_name)[0]
