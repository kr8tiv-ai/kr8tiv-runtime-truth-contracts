"""Tiny FastAPI web UI for Kraken RAG.

Single HTML page with two forms: retrieve (shows top-k refs) and generate
(shows the rendered site in an iframe with links to the raw HTML). Uses htmx
for the form submissions so the page never reloads.

Generated sites are written to `./out/kraken_rag/`.
"""

from __future__ import annotations

import re
from pathlib import Path


OUT_DIR = Path("./out/kraken_rag")


def _slugify(brief: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", brief.lower()).strip("-")
    return slug[:48] or "untitled"


def create_app():
    from fastapi import FastAPI, Form, HTTPException, Query
    from fastapi.responses import HTMLResponse, PlainTextResponse

    # Imports that pull in heavy deps — keep inside the factory.
    from .clean import clean, has_required_structure
    from .data import load_sites
    from .embed import embed_one
    from .generate import Generation, generate as api_generate
    from .prompt import full_messages
    from .store import build

    app = FastAPI(title="Kraken RAG")

    sites = load_sites()
    store = build(sites)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    def _refs_html(results):
        rows = []
        for i, (site, score) in enumerate(results, 1):
            tag_chips = "".join(
                f'<span class="chip">{t}</span>' for t in site.tags[:8]
            )
            rows.append(
                f'<li>'
                f'<div class="score">{score:.3f}</div>'
                f'<div class="body">'
                f'<div class="title"><a href="{site.live_url}" target="_blank" rel="noopener">{site.title}</a></div>'
                f'<div class="meta">{site.agency} · {site.award_date}</div>'
                f'<div class="chips">{tag_chips}</div>'
                f'</div>'
                f'</li>'
            )
        return f'<ol class="results">{"".join(rows)}</ol>'

    @app.get("/", response_class=HTMLResponse)
    def home():
        return _HOME_HTML.format(total=len(sites))

    @app.post("/retrieve", response_class=HTMLResponse)
    def retrieve_endpoint(brief: str = Form(...), k: int = Form(5)):
        if not brief.strip():
            return HTMLResponse('<div class="error">brief is empty</div>', status_code=400)
        results = store.top_k(embed_one(brief, model_name=store.model_name), k=k)
        return _refs_html(results)

    @app.post("/generate", response_class=HTMLResponse)
    def generate_endpoint(
        brief: str = Form(...),
        k: int = Form(3),
        provider: str = Form("auto"),
    ):
        if not brief.strip():
            return HTMLResponse('<div class="error">brief is empty</div>', status_code=400)
        results = store.top_k(embed_one(brief, model_name=store.model_name), k=k)
        msgs = full_messages(brief, results)
        try:
            gen: Generation = api_generate(msgs, provider=provider)
        except Exception as exc:
            return HTMLResponse(
                f'<div class="error">generation failed: {type(exc).__name__}: {exc}</div>',
                status_code=502,
            )
        html = clean(gen.html)
        sig = has_required_structure(html)
        passed = all(sig.values())

        fname = f"{_slugify(brief)}.html"
        (OUT_DIR / fname).write_text(html, encoding="utf-8")

        chips = "".join(
            f'<span class="chip{(" good" if v else " bad")}">{k}</span>'
            for k, v in sig.items()
        )
        refs_line = ", ".join(s.title for s, _ in results)
        verdict_class = "ok" if passed else "warn"
        return HTMLResponse(
            f'<div class="result {verdict_class}">'
            f'<p class="stats">{len(html):,} chars · {gen.provider}/{gen.model} · '
            f'in={gen.input_tokens} out={gen.output_tokens}</p>'
            f'<p class="refs">refs: {refs_line}</p>'
            f'<p class="sig">{chips}</p>'
            f'<p class="links">'
            f'<a href="/preview?path={fname}" target="_blank">open preview</a> · '
            f'<a href="/raw?path={fname}" target="_blank">view raw HTML</a>'
            f'</p>'
            f'<iframe src="/preview?path={fname}" title="generated site"></iframe>'
            f'</div>'
        )

    def _read_out(path: str) -> str:
        # Guard against path traversal.
        safe = Path(path).name
        fp = OUT_DIR / safe
        if not fp.exists():
            raise HTTPException(status_code=404, detail="not found")
        return fp.read_text(encoding="utf-8")

    @app.get("/preview", response_class=HTMLResponse)
    def preview(path: str = Query(...)):
        return _read_out(path)

    @app.get("/raw", response_class=PlainTextResponse)
    def raw(path: str = Query(...)):
        return _read_out(path)

    return app


def run(host: str = "127.0.0.1", port: int = 8787, reload: bool = False) -> None:
    import uvicorn  # type: ignore[import-not-found]

    if reload:
        uvicorn.run(
            "kraken_rag.server:create_app",
            host=host, port=port, factory=True, reload=True,
        )
    else:
        uvicorn.run(create_app(), host=host, port=port)


_HOME_HTML = """<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8">
  <title>Kraken RAG</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    :root {{ color-scheme: dark; --bg: #05050f; --card: #14142a; --line:#242445;
             --muted:#8a8ab0; --fg:#e8e8ff; --accent:#a4f; --link:#9bf; }}
    * {{ box-sizing: border-box; }}
    body {{ background: var(--bg); color: var(--fg);
            font-family: 'Inter', system-ui, sans-serif; line-height: 1.55;
            max-width: 960px; margin: 40px auto; padding: 24px; }}
    h1 {{ font-weight: 400; color: var(--accent); letter-spacing: -0.02em; margin: 0 0 4px; }}
    p.tag {{ color: var(--muted); margin-top: 0; }}
    h2 {{ color: var(--fg); font-weight: 500; margin-top: 40px; font-size: 1.1em;
          letter-spacing: 0.02em; text-transform: uppercase; font-size: 0.85em; color: var(--muted); }}
    form {{ background: var(--card); padding: 18px 20px; border-radius: 14px;
            border: 1px solid var(--line); margin: 12px 0; }}
    textarea, input, select {{ font: inherit; color: inherit; background: #0a0a1a;
            border: 1px solid var(--line); padding: 10px 12px; border-radius: 8px; }}
    textarea {{ width: 100%; min-height: 90px; box-sizing: border-box; resize: vertical; }}
    button {{ background: var(--accent); color: var(--bg); font-weight: 600; cursor: pointer;
              border: none; padding: 11px 22px; border-radius: 8px; font-family: inherit; }}
    button:hover {{ filter: brightness(1.1); }}
    .row {{ display: flex; gap: 14px; align-items: center; margin-top: 12px; flex-wrap: wrap; }}
    .row label {{ color: var(--muted); font-size: 0.92em; }}
    .htmx-indicator {{ display: none; color: var(--muted); }}
    .htmx-request .htmx-indicator {{ display: inline; }}
    .results {{ padding: 0; list-style: none; margin: 14px 0; }}
    .results li {{ background: var(--card); padding: 14px 18px; margin: 8px 0;
                   border-radius: 10px; border: 1px solid var(--line);
                   display: grid; grid-template-columns: 64px 1fr; gap: 14px; align-items: start; }}
    .score {{ color: var(--accent); font-weight: 600; font-variant-numeric: tabular-nums; }}
    .title a {{ color: var(--link); text-decoration: none; font-weight: 500; }}
    .title a:hover {{ text-decoration: underline; }}
    .meta {{ color: var(--muted); font-size: 0.85em; margin-top: 2px; }}
    .chips {{ margin-top: 6px; }}
    .chip {{ display: inline-block; background: #252540; padding: 2px 8px;
             border-radius: 999px; font-size: 0.72em; color: var(--link); margin: 2px 3px 0 0; }}
    .chip.good {{ background: #1c2a1c; color: #8ef08e; }}
    .chip.bad {{ background: #2a1c1c; color: #f88e8e; }}
    .result {{ margin-top: 12px; padding: 16px; border-radius: 12px;
               border: 1px solid var(--line); background: var(--card); }}
    .result iframe {{ width: 100%; height: 76vh; border: 1px solid var(--line);
                      border-radius: 8px; margin-top: 10px; background: white; }}
    .result.ok {{ border-color: #3a5a3a; }}
    .result.warn {{ border-color: #6a4a3a; }}
    .result p {{ margin: 4px 0; }}
    .result .stats {{ color: var(--muted); font-size: 0.9em; }}
    .result .refs {{ font-size: 0.88em; color: var(--muted); }}
    .result .sig {{ margin: 10px 0; }}
    .error {{ color: #f99; background: #2a1818; padding: 12px; border-radius: 8px; }}
    a.link {{ color: var(--link); }}
  </style>
</head><body>
  <h1>Kraken RAG</h1>
  <p class="tag">Awwwards-grounded site generation — {total} SOTD refs · local embeddings · frontier model · no fine-tune.</p>

  <h2>Retrieve references</h2>
  <form hx-post="/retrieve" hx-target="#retrieve-out" hx-swap="innerHTML" hx-indicator="#sp-r">
    <textarea name="brief" placeholder="a minimalist architecture studio portfolio with ink-wash photography"></textarea>
    <div class="row">
      <label>k <input name="k" type="number" value="5" min="1" max="20" style="width:70px"></label>
      <button type="submit">Retrieve</button>
      <span id="sp-r" class="htmx-indicator">thinking…</span>
    </div>
  </form>
  <div id="retrieve-out"></div>

  <h2>Generate a site</h2>
  <form hx-post="/generate" hx-target="#gen-out" hx-swap="innerHTML" hx-indicator="#sp-g">
    <textarea name="brief" placeholder="a brutalist type foundry launching a new variable font family"></textarea>
    <div class="row">
      <label>refs <input name="k" type="number" value="3" min="1" max="5" style="width:70px"></label>
      <label>provider <select name="provider">
        <option value="auto">auto</option>
        <option value="anthropic">anthropic</option>
        <option value="openai">openai</option>
      </select></label>
      <button type="submit">Generate</button>
      <span id="sp-g" class="htmx-indicator">generating… (~30s)</span>
    </div>
  </form>
  <div id="gen-out"></div>

  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
</body></html>"""
