"""배포 검수 서버의 SPA 경로·정적 파일·로컬 API 전달 회귀 검사."""

import importlib.util
import threading
from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location(
    "serve_release", Path(__file__).resolve().parents[2] / "tools/serve-release.py"
)
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


@pytest.fixture
def deployed(tmp_path):
    (tmp_path / "index.html").write_text("<title>GSEM</title>", encoding="utf-8")
    (tmp_path / "app.js").write_text("export const version = '0.9.0';", encoding="utf-8")

    class Api(BaseHTTPRequestHandler):
        def do_GET(self):
            body = self.path.encode()
            self.send_response(503 if "unavailable" in self.path else 200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)

    api = ThreadingHTTPServer(("127.0.0.1", 0), Api)
    server = ThreadingHTTPServer(("127.0.0.1", 0), release.handler_for(tmp_path, f"http://127.0.0.1:{api.server_port}"))
    threads = [threading.Thread(target=item.serve_forever, daemon=True) for item in (api, server)]
    for thread in threads:
        thread.start()
    yield server.server_port
    for item in (server, api):
        item.shutdown()
        item.server_close()
    for thread in threads:
        thread.join()


@pytest.mark.parametrize("path", ["/", "/equipment/1", "/equipment-master?q=A"])
def test_deployed_spa_routes(deployed, path):
    connection = HTTPConnection("127.0.0.1", deployed)
    connection.request("GET", path)
    response = connection.getresponse()
    assert response.status == 200
    assert response.read() == b"<title>GSEM</title>"
    connection.close()


@pytest.mark.parametrize("path,status", [("/app.js", 200), ("/missing.js", 404)])
def test_assets_do_not_fall_back_to_html(deployed, path, status):
    connection = HTTPConnection("127.0.0.1", deployed)
    connection.request("GET", path)
    response = connection.getresponse()
    assert response.status == status
    assert response.read() != b"<title>GSEM</title>"
    connection.close()


@pytest.mark.parametrize("path,status", [("/api/v1/items?q=A%20B", 200), ("/api/unavailable", 503)])
def test_proxy_preserves_query_and_error_status(deployed, path, status):
    connection = HTTPConnection("127.0.0.1", deployed)
    connection.request("GET", path)
    response = connection.getresponse()
    assert response.status == status
    assert response.read() == path.encode()
    assert response.getheader("Content-Type") == "application/json"
    connection.close()
