# data-pipeline — build-time data and frame preparation (Python)

Runs on the developer's machine. The web app has no runtime backend and never authenticates to NASA.

Present now (scripts/):
- `check_data_access.py`: REAL retrieval smoke test (public checks, then Earthdata-login checks). Writes `raw/access_check_report.json` (no credentials).
- `earthdata_auth.py`: secure local login helper (`--status`, `--setup-interactive`). Never prints credentials.
- `check_no_secrets.py`: scans everything that could be committed for credentials. Run before every commit.
- `pipeline_common.py`: shared helpers (hashing, `.env` loading, redaction, CSV summary, HTTP with retry).

Planned (Phase 5 onward): `fetch_svs_frames.py` (SVS movie -> OpenCV frames -> WebP + `frames.json`), `extract_frame_features.py` (Track 2),
`build_series_gmsl.py`, `build_series_gistemp.py`, `build_series_nsidc.py`, `validate_outputs.py`.

Rules:
- Deterministic outputs. Record source URL, UTC access time, SHA-256, license and citation for every file.
- Never invent or fill in values. Missing becomes `null` with a flag. Fail loudly on unexpected formats.
- `raw/` holds original downloads and the access report; it is git-ignored.
- No secrets in the repository. Copy `.env.example` to `.env` (git-ignored) only if you use the token route. See `../docs/DATA_ACCESS.md`.
- Dependencies are in `requirements.txt` (`earthaccess`, `requests` now; numpy, pandas, opencv-python-headless, pillow added in Phase 5).
- Tests: `python -m unittest discover -s data-pipeline/tests` (fake network; they do not prove real retrieval).
