#!/usr/bin/env python3
"""Scan every file that COULD be committed for Earthdata credentials. Prints file names and pattern names only, never the secret.

  python data-pipeline/scripts/check_no_secrets.py     # run before every commit / push; exit code 1 means "do not commit"

Uses `git ls-files --cached --others --exclude-standard`, so git-ignored files (like your real .env) are correctly not scanned.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

PATTERNS: dict[str, re.Pattern[str]] = {
    "netrc-style Earthdata login/password": re.compile(r"machine\s+urs\.earthdata\.nasa\.gov\s+login\s+\S+\s+password\s+\S+", re.I),
    "EARTHDATA password assigned a value": re.compile(r"EARTHDATA_PASSWORD[ \t]*=[ \t]*['\"]?[^\s'\"#<]+"),
    "EARTHDATA token assigned a value": re.compile(r"EARTHDATA_TOKEN[ \t]*=[ \t]*['\"]?[A-Za-z0-9._\-]{20,}"),
    "JWT-style token": re.compile(r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"),
}
MAX_BYTES = 2_000_000
SKIP_DIRS = {".git", "node_modules", ".venv", "dist", "__pycache__", "raw"}


def scan_text(text: str) -> list[str]:
    return [name for name, rx in PATTERNS.items() if rx.search(text)]


def candidate_files(root: Path) -> list[Path]:
    try:
        out = subprocess.run(["git", "-C", str(root), "ls-files", "--cached", "--others", "--exclude-standard"],
                             capture_output=True, text=True, check=True).stdout
        return [root / line for line in out.splitlines() if line.strip()]
    except Exception:  # noqa: BLE001 - not a git repo yet, or git missing: fall back to a directory walk
        return [p for p in root.rglob("*")
                if p.is_file() and not (set(p.relative_to(root).parts) & SKIP_DIRS) and p.name != ".env"]


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    findings: list[tuple[Path, list[str]]] = []
    checked = 0
    for path in candidate_files(root):
        if not path.is_file():
            continue
        data = path.read_bytes()
        if len(data) > MAX_BYTES or b"\0" in data:
            continue
        checked += 1
        hits = scan_text(data.decode("utf-8", errors="ignore"))
        if hits:
            findings.append((path, hits))
    print(f"Scanned {checked} files that could be committed.")
    if findings:
        print("POSSIBLE SECRETS FOUND. Do NOT commit or push until these are removed:")
        for path, hits in findings:
            print(f"  {path.relative_to(root)}: {', '.join(hits)}")
        print("If a real credential was ever committed or shared, revoke/rotate it at https://urs.earthdata.nasa.gov first.")
        return 1
    print("OK: no credential patterns found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
