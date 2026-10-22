"""빌드된 Mock/API 화면을 제공하는 폐쇄망 로컬 검수 서버 (Python 표준 라이브러리)."""

import argparse
import functools
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import ProxyHandler, build_opener


def handler_for(root: Path, api_target: str):
    class Handler(SimpleHTTPRequestHandler):
        def do_GET(self):
            path = urlsplit(self.path).path
            if path.startswith("/api/") or path == "/health":
                try:
                    # 로컬 API 요청에는 외부 프록시와 사용자 인증정보를 사용하지 않는다.
                    with build_opener(ProxyHandler({})).open(api_target + self.path, timeout=30) as response:
                        self.send_response(response.status)
                        for name in ("Content-Type", "Content-Disposition", "X-Request-ID"):
                            if response.headers.get(name):
                                self.send_header(name, response.headers[name])
                        body = response.read()
                except HTTPError as error:
                    self.send_response(error.code)
                    self.send_header("Content-Type", error.headers.get("Content-Type", "application/json"))
                    body = error.read()
                except URLError:
                    self.send_response(502)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    body = json.dumps({"error": "API 서버를 시작하세요."}, ensure_ascii=False).encode()
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
                return
            candidate = Path(self.translate_path(path))
            if not candidate.resolve().is_relative_to(root):
                self.send_error(403)
                return
            if not candidate.is_file() and not Path(path).suffix:
                self.path = "/index.html"
            super().do_GET()

        def end_headers(self):
            self.send_header("X-Content-Type-Options", "nosniff")
            super().end_headers()

    return functools.partial(Handler, directory=str(root))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--api-target", default="http://127.0.0.1:4010")
    args = parser.parse_args()
    root = args.root.resolve()
    if not (root / "index.html").is_file():
        parser.error("빌드된 index.html이 있는 폴더를 지정하세요.")
    target = urlsplit(args.api_target)
    if target.scheme != "http" or target.hostname not in ("127.0.0.1", "localhost") or target.path:
        parser.error("API 대상은 경로 없는 로컬 HTTP 서버여야 합니다.")
    with ThreadingHTTPServer((args.host, args.port), handler_for(root, args.api_target)) as server:
        print(f"GSEM 로컬 검수 서버 포트 {args.port}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
