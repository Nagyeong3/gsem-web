"""압축 해제한 반입 패키지의 파일별 SHA-256을 검증한다."""

import argparse
import hashlib
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    root = parser.parse_args().root.resolve()
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    for name, expected in manifest["files"].items():
        path = (root / name).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise SystemExit(f"파일 누락 또는 잘못된 경로: {name}")
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise SystemExit(f"해시 불일치: {name}")
    print(f"GSEM v{manifest['version']}: {len(manifest['files'])}개 파일 무결성 검증 통과")


if __name__ == "__main__":
    main()
