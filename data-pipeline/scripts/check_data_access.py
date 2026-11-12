#!/usr/bin/env python3
"""EARTHSONIC: REAL NASA data-access smoke test (no mocks). Run it on your own computer.

  python data-pipeline/scripts/check_data_access.py                 # public checks, then login-required checks
  python data-pipeline/scripts/check_data_access.py --public-only   # needs NO Earthdata login
  python data-pipeline/scripts/check_data_access.py --auth-only     # only the Earthdata-login dataset(s)
  python data-pipeline/scripts/check_data_access.py --refresh       # re-download files already in data-pipeline/raw/

What it proves, with real network calls:
  PUBLIC          NASA SVS metadata (items 5235, 5450, 5480), GISTEMP CSV files, NSIDC Sea Ice Index CSV, CMR collection search.
  LOGIN REQUIRED  Earthdata Login works non-interactively, and one real PO.DAAC sea-level granule can be searched and downloaded.

It prints a summary and writes data-pipeline/raw/access_check_report.json (git-ignored, contains no credentials).
"""
from __future__ import annotations

import argparse
import json
import platform
import re
import sys
from pathlib import Path
from typing import Any, Callable

from pipeline_common import (RAW_DIR, CheckResult, find_media_urls, http_get, load_dotenv, redact, sha256_file,
                             strip_html, summarize_year_csv, utc_now_iso)

SVS_ITEMS = (5235, 5450, 5480)
GISTEMP_BASE = "https://data.giss.nasa.gov/gistemp/tabledata_v4/"
GISTEMP_FILES = ("GLB.Ts+dSST.csv", "ZonAnn.Ts+dSST.csv")
NSIDC_BASE = "https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/"
NSIDC_CANDIDATES = ("N_seaice_extent_daily_v4.0.csv", "N_seaice_extent_daily_v3.0.csv")
CMR_COLLECTIONS = "https://cmr.earthdata.nasa.gov/search/collections.json"
CMR_GRANULES = "https://cmr.earthdata.nasa.gov/search/granules.json"
GMSL_PRIMARY = "MERGED_TP_J1_OSTM_OST_GMSL_ASCII_V52"
GMSL_INDICATOR = "NASA_SSH_GMSL_INDICATOR"

Getter = Callable[..., Any]


def _download_text(url: str, dest: Path, refresh: bool, get: Getter) -> tuple[str, str]:
    if dest.is_file() and not refresh:
        return dest.read_text(encoding="utf-8", errors="replace"), "cached (already in raw/)"
    response = get(url)
    if response.status_code != 200:
        raise RuntimeError(f"HTTP {response.status_code} from {url}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(response.content)
    return response.content.decode("utf-8", errors="replace"), "downloaded"


# ---------------------------------------------------------------- PUBLIC checks (no login) ----
def check_svs(item_id: int, get: Getter = http_get) -> CheckResult:
    name = f"SVS {item_id}: API metadata"
    url = f"https://svs.gsfc.nasa.gov/api/{item_id}"
    try:
        response = get(url)
        if response.status_code != 200:
            return CheckResult(name, "public", "FAIL", f"HTTP {response.status_code} from {url}")
        data = response.json()
    except Exception as error:  # noqa: BLE001
        return CheckResult(name, "public", "FAIL", f"{type(error).__name__} while fetching {url}: {redact(str(error))[:200]}")
    if not isinstance(data, dict):
        return CheckResult(name, "public", "FAIL", "unexpected JSON shape (not an object)")
    media = find_media_urls(data)

    def path_of(u: str) -> str:
        return u.lower().split("?")[0]

    mp4s = [u for u in media if path_of(u).endswith(".mp4")]
    frame_dirs = [u for u in media if "frames" in path_of(u) and not path_of(u).endswith(".mp4")]
    detail = {
        "url": url,
        "title": data.get("title"),
        "top_level_keys": sorted(data.keys())[:30],
        "description_start": strip_html(str(data.get("description", "")))[:600],
        "media_url_count": len(media),
        "mp4_urls": mp4s[:12],
        "frame_like_urls": frame_dirs[:6],
    }
    return CheckResult(name, "public", "PASS" if (data.get("title") or media) else "FAIL", detail)


def check_gistemp(filename: str, refresh: bool = False, get: Getter = http_get, raw_dir: Path | None = None) -> CheckResult:
    name = f"GISTEMP {filename}"
    url = GISTEMP_BASE + filename
    dest = (raw_dir or RAW_DIR) / "gistemp" / filename
    try:
        text, how = _download_text(url, dest, refresh, get)
    except Exception as error:  # noqa: BLE001
        hint = (f"{redact(str(error))[:200]} | If the server blocks scripts, open {url} in your browser, save it as {dest}, then re-run.")
        return CheckResult(name, "public", "FAIL", hint)
    summary = summarize_year_csv(text)
    ok = bool(summary.get("ok")) and summary.get("n_rows", 0) >= 100
    detail = {"url": url, "how": how, "bytes": dest.stat().st_size, "sha256": sha256_file(dest), **summary}
    return CheckResult(name, "public", "PASS" if ok else "FAIL", detail)


def check_nsidc(refresh: bool = False, get: Getter = http_get, raw_dir: Path | None = None) -> CheckResult:
    name = "NSIDC Sea Ice Index (north, daily extent)"
    raw = raw_dir or RAW_DIR
    tried: list[str] = []
    for filename in NSIDC_CANDIDATES:
        url = NSIDC_BASE + filename
        dest = raw / "nsidc" / filename
        try:
            text, how = _download_text(url, dest, refresh, get)
        except Exception as error:  # noqa: BLE001
            tried.append(f"{filename}: {redact(str(error))[:150]}")
            continue
        summary = summarize_year_csv(text)
        ok = bool(summary.get("ok")) and summary.get("n_rows", 0) > 1000
        detail = {"url": url, "how": how, "bytes": dest.stat().st_size, "sha256": sha256_file(dest), **summary}
        return CheckResult(name, "public", "PASS" if ok else "FAIL", detail)
    listing: list[str] = []
    try:
        response = get(NSIDC_BASE)
        if response.status_code == 200:
            listing = sorted(set(re.findall(r"[A-Za-z_]*seaice_extent_daily[^\"'<>\s]*\.csv", response.text)))
    except Exception:  # noqa: BLE001
        pass
    return CheckResult(name, "public", "FAIL", {"tried": tried, "csv_files_seen_in_directory_listing": listing})


def check_cmr(short_name: str, get: Getter = http_get) -> CheckResult:
    name = f"CMR search (public): {short_name}"
    try:
        response = get(CMR_COLLECTIONS, params={"short_name": short_name, "page_size": 5})
        if response.status_code != 200:
            return CheckResult(name, "public", "FAIL", f"HTTP {response.status_code}")
        entries = response.json().get("feed", {}).get("entry", [])
        granules = get(CMR_GRANULES, params={"short_name": short_name, "page_size": 1})
        hits = granules.headers.get("CMR-Hits") if granules.status_code == 200 else None
    except Exception as error:  # noqa: BLE001
        return CheckResult(name, "public", "FAIL", f"{type(error).__name__}: {redact(str(error))[:200]}")
    if not entries:
        return CheckResult(name, "public", "FAIL", "CMR returned no collection with this short_name")
    keys = ("id", "short_name", "version_id", "title", "time_start", "time_end", "data_center")
    brief = [{k: entry.get(k) for k in keys} for entry in entries]
    return CheckResult(name, "public", "PASS", {"collections": brief, "granule_count_reported_by_cmr": hits})


# ------------------------------------------------------- LOGIN-REQUIRED checks (Earthdata) ----
def check_login() -> CheckResult:
    name = "Earthdata Login (non-interactive)"
    from earthdata_auth import try_login

    load_dotenv()
    auth, how = try_login()
    if auth is None:
        return CheckResult(name, "earthdata-login", "FAIL", how)
    return CheckResult(name, "earthdata-login", "PASS", f"authenticated via: {how}")


def check_gmsl_download(short_name: str, raw_dir: Path | None = None) -> CheckResult:
    name = f"PO.DAAC download via earthaccess: {short_name}"
    raw = raw_dir or RAW_DIR
    try:
        import earthaccess

        results = earthaccess.search_data(short_name=short_name, count=5)
    except Exception as error:  # noqa: BLE001
        return CheckResult(name, "earthdata-login", "FAIL", f"search failed: {type(error).__name__}: {redact(str(error))[:250]}")
    if not results:
        return CheckResult(name, "earthdata-login", "FAIL",
                           "no granules found for this short_name. Look the dataset up at https://search.earthdata.nasa.gov and tell Claude the short name it shows.")
    listing: list[Any] = []
    for granule in results:
        try:
            try:
                links = granule.data_links(access="external")  # HTTPS links; direct S3 only works inside AWS us-west-2
            except TypeError:
                links = granule.data_links()
            listing.append([link.rsplit("/", 1)[-1] for link in links][:3])
        except Exception:  # noqa: BLE001
            listing.append("could not list links")
    dest = raw / "gmsl" / short_name
    dest.mkdir(parents=True, exist_ok=True)
    try:
        paths = earthaccess.download(results[:1], str(dest))
    except Exception as error:  # noqa: BLE001
        return CheckResult(name, "earthdata-login", "FAIL", f"download failed: {type(error).__name__}: {redact(str(error))[:250]}")
    files = [Path(str(p)) for p in (paths or [])]
    if not files or not files[0].is_file():
        return CheckResult(name, "earthdata-login", "FAIL", {"granules_found": len(results), "files_listed": listing, "note": "download returned no file"})
    first = files[0]
    head: list[str] = []
    if first.stat().st_size <= 5_000_000:
        head = first.read_text(encoding="utf-8", errors="replace").splitlines()[:15]
    detail = {"granules_found": len(results), "granule_files_listed": listing, "downloaded": first.name,
              "bytes": first.stat().st_size, "sha256": sha256_file(first), "first_lines": head}
    return CheckResult(name, "earthdata-login", "PASS", detail)


# ---------------------------------------------------------------------------------- driver ----
def _print_result(result: CheckResult) -> None:
    print(f"[{result.status}] {result.name}  ({result.access})")
    if result.detail is None:
        return
    text = result.detail if isinstance(result.detail, str) else json.dumps(result.detail, indent=2, ensure_ascii=False)
    text = redact(text)
    if len(text) > 2500:
        text = text[:2500] + "\n... (truncated; full detail is in raw/access_check_report.json)"
    print("    " + text.replace("\n", "\n    "))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Real NASA data-access smoke test for EARTHSONIC.")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--public-only", action="store_true", help="skip everything that needs an Earthdata Login")
    group.add_argument("--auth-only", action="store_true", help="only run the Earthdata-login checks")
    parser.add_argument("--refresh", action="store_true", help="re-download files already present in data-pipeline/raw/")
    parser.add_argument("--also-indicator", action="store_true", help=f"also download {GMSL_INDICATOR} (the newer NASA-SSH product)")
    args = parser.parse_args(argv)

    results: list[CheckResult] = []
    if not args.auth_only:
        print("== PUBLIC sources (no Earthdata Login needed) ==")
        for item in SVS_ITEMS:
            results.append(check_svs(item))
        for filename in GISTEMP_FILES:
            results.append(check_gistemp(filename, refresh=args.refresh))
        results.append(check_nsidc(refresh=args.refresh))
        for short_name in (GMSL_PRIMARY, GMSL_INDICATOR):
            results.append(check_cmr(short_name))
        for result in results:
            _print_result(result)

    if not args.public_only:
        print("\n== LOGIN-REQUIRED sources (Earthdata Login) ==")
        login = check_login()
        auth_results = [login]
        if login.status == "PASS":
            auth_results.append(check_gmsl_download(GMSL_PRIMARY))
            if args.also_indicator:
                auth_results.append(check_gmsl_download(GMSL_INDICATOR))
        else:
            auth_results.append(CheckResult(f"PO.DAAC download via earthaccess: {GMSL_PRIMARY}", "earthdata-login", "SKIP", "login did not succeed"))
        for result in auth_results:
            _print_result(result)
        results.extend(auth_results)

    failed = [r for r in results if r.status == "FAIL"]
    print("\n== SUMMARY ==")
    for result in results:
        print(f"  {result.status:4}  {result.name}")
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    report = {"generated_utc": utc_now_iso(), "python": platform.python_version(), "platform": platform.platform(),
              "results": [r.to_dict() for r in results]}
    (RAW_DIR / "access_check_report.json").write_text(redact(json.dumps(report, indent=2, ensure_ascii=False)), encoding="utf-8")
    print(f"\nFull report: {RAW_DIR / 'access_check_report.json'}  (contains no credentials)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
