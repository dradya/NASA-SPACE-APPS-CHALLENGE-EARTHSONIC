"""Shared helpers for the EARTHSONIC data pipeline.

Rules: never print or store credentials; never invent values; keep network code injectable so logic can be tested
(but real retrieval is only proven by running check_data_access.py against NASA).
"""
from __future__ import annotations

import hashlib
import os
import re
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PIPELINE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = PIPELINE_DIR / "raw"
USER_AGENT = "EARTHSONIC/0.1 (NASA Space Apps 2026 project; one-off downloads of documented data files)"
SECRET_ENV_NAMES = ("EARTHDATA_TOKEN", "EARTHDATA_PASSWORD")
MEDIA_EXT = (".mp4", ".webm", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_dotenv(path: Path | None = None) -> list[str]:
    """Load KEY=VALUE lines from data-pipeline/.env into os.environ.

    Existing environment variables win. Blank values are ignored. Returns the NAMES that were set, never the values.
    """
    env_path = path or (PIPELINE_DIR / ".env")
    loaded: list[str] = []
    if not env_path.is_file():
        return loaded
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and value and key not in os.environ:
            os.environ[key] = value
            loaded.append(key)
    return loaded


def redact(text: str) -> str:
    """Replace any secret value currently in the environment with ***."""
    out = text
    for name in SECRET_ENV_NAMES:
        value = os.environ.get(name)
        if value and len(value) >= 4:
            out = out.replace(value, "***")
    return out


def strip_html(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", text or "")).strip()


def find_media_urls(obj: Any) -> list[str]:
    """Walk any JSON structure and collect http(s) URLs that look like media files or frame directories (de-duplicated, in order)."""
    found: list[str] = []

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)
        elif isinstance(node, str):
            s = node.strip()
            if s.startswith(("http://", "https://")):
                path = s.lower().split("?")[0]
                if path.endswith(MEDIA_EXT) or "frames" in path:
                    found.append(s)

    walk(obj)
    seen: set[str] = set()
    unique: list[str] = []
    for url in found:
        if url not in seen:
            seen.add(url)
            unique.append(url)
    return unique


def summarize_year_csv(text: str) -> dict[str, Any]:
    """Describe a NASA-style CSV whose header line starts with 'Year' (GISTEMP, NSIDC). Does not interpret values."""
    lines = [ln for ln in text.splitlines() if ln.strip()]
    header_idx = next((i for i, ln in enumerate(lines) if ln.strip().lower().startswith("year")), None)
    if header_idx is None:
        return {"ok": False, "reason": "no header line starting with 'Year'"}
    header = [c.strip() for c in lines[header_idx].split(",")]
    rows = [ln.split(",") for ln in lines[header_idx + 1:]]
    years: list[int] = []
    for row in rows:
        try:
            years.append(int(row[0].strip()))
        except ValueError:
            continue
    return {
        "ok": bool(years),
        "title_lines": lines[:header_idx],
        "header": header,
        "n_rows": len(years),
        "first_year": years[0] if years else None,
        "last_year": years[-1] if years else None,
        "missing_marker_seen": any("***" in cell for row in rows for cell in row),
        "last_row": lines[-1] if lines else None,
    }


@dataclass
class CheckResult:
    name: str
    access: str  # "public" or "earthdata-login"
    status: str  # "PASS", "FAIL" or "SKIP"
    detail: Any = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def http_get(url: str, *, params: dict[str, Any] | None = None, timeout: int = 60, retries: int = 2):
    """GET with a polite User-Agent and small retry/backoff for network errors and 5xx. Returns the response (caller checks status)."""
    import requests  # imported lazily so helpers stay importable without it

    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            response = requests.get(url, params=params, timeout=timeout, headers={"User-Agent": USER_AGENT})
            if response.status_code >= 500 and attempt < retries:
                time.sleep(1.5 * (attempt + 1))
                continue
            return response
        except requests.RequestException as error:
            last_error = error
            if attempt < retries:
                time.sleep(1.5 * (attempt + 1))
    assert last_error is not None
    raise last_error
