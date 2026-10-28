"""Serve the GSEM built frontend on port 4173 with React Router fallback.

For internal offline demo only. Serve a prebuilt dist directory; never the repository
root, so .env, source code, wheelhouse and other private files stay inaccessible.
"""
from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


class SpaHandler(SimpleHTTPRequestHandler):
    """Return index.html for React Router paths, not for missing asset files."""

    def __init__(self, *args, directory: str, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def _spa_path(self) -> None:
        pathname = unquote(urlsplit(self.path).path)
        target = Path(self.translate_path(pathname))
        if target.is_file() or target.is_dir():
            return
        # Missing JS/CSS/images should be 404, never return HTML disguised as JS.
        if Path(pathname).suffix or pathname.startswith('/assets/'):
            return
        self.path = '/index.html'

    def do_GET(self) -> None:  # noqa: N802
        self._spa_path()
        super().do_GET()

    def do_HEAD(self) -> None:  # noqa: N802
        self._spa_path()
        super().do_HEAD()


def main() -> None:
    parser = argparse.ArgumentParser(description="GSEM internal demo SPA server")
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--dist", type=Path, default=Path(__file__).resolve().parents[1] / "dist")
    args = parser.parse_args()
    dist = args.dist.resolve()
    if not (dist / "index.html").is_file():
        parser.error(f"dist/index.html not found: {dist} (run npm run build first)")
    handler = partial(SpaHandler, directory=str(dist))
    with ThreadingHTTPServer((args.host, args.port), handler) as server:
        print(f"Serving GSEM dist from {dist} at http://{args.host}:{args.port}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
