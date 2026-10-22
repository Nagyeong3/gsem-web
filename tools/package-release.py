"""검증된 빌드·소스·오프라인 의존성을 하나의 반입 ZIP으로 묶는다."""

import argparse
import hashlib
import json
import shutil
import subprocess
import zipfile
from pathlib import Path

BASE = "0376c62a4a487b0634c95b286053d97d0aed9b62"


def run(*command):
    return subprocess.check_output(command, text=True).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="wheels/linux, wheels/windows 폴더")
    parser.add_argument("--npm-cache", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    if run("git", "-C", str(repo), "status", "--porcelain"):
        raise SystemExit("변경을 커밋한 뒤 패키징하세요. 소스와 manifest 커밋은 일치해야 합니다.")
    package = json.loads((repo / "package.json").read_text())
    version = package["version"]
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    stage = output / f"GSEM-v{version}"
    if stage.exists():
        raise SystemExit(f"기존 패키지를 덮어쓰지 않습니다: {stage}")
    stage.mkdir()
    files = run("git", "-C", str(repo), "ls-files", "-co", "--exclude-standard").splitlines()
    for name in sorted(set(files)):
        path = Path(name)
        if any(part.startswith(".env") and part != ".env.example" for part in path.parts):
            continue
        origin = repo / path
        if not origin.is_file() or origin.is_symlink():
            continue
        target = stage / "source" / path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(origin, target)
    for mode in ("mock", "api"):
        shutil.copytree(repo / "dist" / mode, stage / "frontend" / mode)
    shutil.copytree(args.input / "wheels", stage / "offline" / "wheels")
    shutil.copytree(args.input / "evidence", stage / "evidence")
    shutil.copytree(args.npm_cache / "_cacache", stage / "offline" / "npm-cache" / "_cacache")
    shutil.copy2(repo / "docs/releases/v0.9.0-apply-restore.md", stage / "적용-복원-가이드.md")
    shutil.copy2(repo / "docs/releases/v0.9.0-validation.md", stage / "검증-결과.md")
    (stage / "recovery").mkdir()
    # 기준 커밋을 포함한 로컬 기록과 작업 패치. 개인 Git 설정·자격 증명은 포함하지 않는다.
    subprocess.run(
        ["git", "-C", str(repo), "bundle", "create", str(stage / "recovery/history.bundle"), "HEAD"], check=True
    )
    with (stage / "recovery/v0.9.0.patch").open("wb") as stream:
        subprocess.run(["git", "-C", str(repo), "diff", "--binary", BASE, "HEAD"], stdout=stream, check=True)
    manifest = {
        "version": version,
        "base": BASE,
        "head": run("git", "-C", str(repo), "rev-parse", "HEAD"),
        "sqlServerLiveValidated": False,
        "files": {},
    }
    for path in sorted(stage.rglob("*")):
        if path.is_file():
            manifest["files"][path.relative_to(stage).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    (stage / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    archive = output / f"GSEM-v{version}-offline.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted(stage.rglob("*")):
            if path.is_file():
                bundle.write(path, path.relative_to(output))
    # 압축 손상과 파일 누락을 즉시 검증한다.
    with zipfile.ZipFile(archive) as bundle:
        if bundle.testzip() is not None:
            raise SystemExit("ZIP 무결성 검증 실패")
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix(".zip.sha256").write_text(f"{digest}  {archive.name}\n")
    print(json.dumps({"archive": str(archive), "bytes": archive.stat().st_size, "sha256": digest}, indent=2))


if __name__ == "__main__":
    main()
