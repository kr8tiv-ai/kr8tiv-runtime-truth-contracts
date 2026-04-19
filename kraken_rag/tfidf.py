"""Pure-numpy TF-IDF embedder.

Default embedding backend for Kraken RAG. Works on the 96 structured records
(tags + tech stack + motion libs + CSS features + structural shape) without
pulling torch / transformers / sentence-transformers (~500 MB of wheels).

The corpus is short structured metadata — TF-IDF is a very strong baseline for
this shape of text. Semantic models (all-MiniLM-L6-v2, etc.) can be enabled
later via embed.STEmbedder when disk and time allow.

Design:
  * Tokenizer keeps CSS-ish tokens like `oklch()`, `backdrop-filter`,
    `gsap.timeline`, `next.js` as single tokens.
  * Smoothed IDF: `log((N + 1) / (df + 1)) + 1`
  * Raw TF (no sublinear). L2-normalized so dot-product == cosine.
  * Vocabulary is built from the corpus at fit() time; unknown query tokens
    are silently dropped.
"""

from __future__ import annotations

import re
from typing import Sequence

import numpy as np


_TOKEN_RE = re.compile(r"[a-z0-9#][a-z0-9_\-./:#]*\(?\)?")


def tokenize(text: str) -> list[str]:
    """Lowercase + split. Preserves tokens like `oklch()`, `next.js`, `#fff`."""
    return _TOKEN_RE.findall(text.lower())


class TfidfEmbedder:
    """Minimal TF-IDF embedder. `fit` then `encode` or `encode_one`."""

    name = "tfidf-v1"

    def __init__(self) -> None:
        self.vocab: dict[str, int] = {}
        self.idf: np.ndarray = np.zeros(0, dtype=np.float32)
        self.fitted: bool = False

    @property
    def dim(self) -> int:
        return len(self.vocab)

    def fit(self, docs: Sequence[str]) -> "TfidfEmbedder":
        vocab: dict[str, int] = {}
        tokens_per_doc: list[list[str]] = []
        for doc in docs:
            toks = tokenize(doc)
            tokens_per_doc.append(toks)
            for tok in toks:
                if tok not in vocab:
                    vocab[tok] = len(vocab)

        n_docs = len(docs)
        n_terms = len(vocab)
        df = np.zeros(n_terms, dtype=np.float32)
        for toks in tokens_per_doc:
            for tok in set(toks):
                df[vocab[tok]] += 1.0

        idf = np.log((n_docs + 1.0) / (df + 1.0)).astype(np.float32) + 1.0
        self.vocab = vocab
        self.idf = idf
        self.fitted = True
        return self

    def encode(self, texts: Sequence[str]) -> np.ndarray:
        if not self.fitted:
            raise RuntimeError("TfidfEmbedder.encode called before fit()")
        n = len(texts)
        out = np.zeros((n, self.dim), dtype=np.float32)
        if self.dim == 0:
            return out
        for i, text in enumerate(texts):
            tf = np.zeros(self.dim, dtype=np.float32)
            for tok in tokenize(text):
                idx = self.vocab.get(tok)
                if idx is not None:
                    tf[idx] += 1.0
            vec = tf * self.idf
            norm = float(np.linalg.norm(vec))
            if norm > 0:
                vec /= norm
            out[i] = vec
        return out

    def encode_one(self, text: str) -> np.ndarray:
        return self.encode([text])[0]
