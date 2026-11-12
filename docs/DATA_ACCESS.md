# EARTHSONIC — Data access, credentials and per-dataset flow

Status: DESIGN + TOOLS (added after Phase 2). The retrieval tools exist and are logic-tested; **real retrieval has not yet been run by Claude**
(Claude's sandbox has no internet). It is proven when you run `check_data_access.py` (section 4) and the report shows PASS.

## 1. Public versus login-required

Rule: **no Earthdata Login is requested for anything that is public.** Login code is only ever called for sources marked `earthdata-login`.

| Source | Used for | Login? | Retrieval method | Basis |
|---|---|---|---|---|
| NASA SVS (`svs.gsfc.nasa.gov/api/{id}` and movie files) | EIC visualization frames (5235, 5450, 5480) | No (public website; smoke test confirms) | HTTPS GET | Read in Phase 1 |
| GISTEMP v4 CSV files (GISS) | Global temperature numbers | No | HTTPS GET, one-time, cached in `raw/` | Verified Phase 1; if the server blocks scripts, save from your browser |
| NSIDC Sea Ice Index v4 (G02135) | Sea ice extent numbers | No | HTTPS GET | Public HTTPS location seen in Phase 1; north filename checked by the smoke test |
| CMR collection/granule **search** | Finding datasets and file names | No | HTTPS GET (`cmr.earthdata.nasa.gov/search`) | EOSDIS: login is for downloading data, not for browsing metadata |
| GIBS tiles, VEDA STAC (optional) | Extra imagery / catalog | No | HTTPS | Documented as public |
| **PO.DAAC GMSL sea level** (`MERGED_TP_J1_OSTM_OST_GMSL_ASCII_V52`; alt. `NASA_SSH_GMSL_INDICATOR`) | Sea level numbers | **Yes (free Earthdata Login)** | Python `earthaccess` (`search_data`, `download`) | PO.DAAC states a free login is required to download its data |

The browser app itself never logs in and never sees credentials. All authenticated downloads happen once, on your computer, in `data-pipeline/`.
The app ships dated snapshots built from those downloads.

## 2. Credential workflow (Windows, local only)

Hard rules:
- Never type or paste your password or token into the Claude chat, GitHub, issues, screenshots or frontend code.
- Credentials live only in (a) `data-pipeline/.env` (git-ignored) or (b) your user folder `_netrc` created by `earthaccess`, or (c) a session variable.
- Run the normal PowerShell as yourself (not "Administrator", and not from `C:\Windows\system32`) so the user folder is yours.

`earthaccess` (official docs) tries, in order: environment variables (`EARTHDATA_TOKEN` takes precedence, else `EARTHDATA_USERNAME` + `EARTHDATA_PASSWORD`),
then a `~/_netrc` file (Windows), then an interactive prompt. Its docs warn not to use the `_netrc` route on untrusted machines or shared accounts.

**Option A, recommended: token in `data-pipeline/.env`.** A token can be revoked and expires, and it does not expose your password.
1. Sign in at https://urs.earthdata.nasa.gov in your browser and generate a user token (follow the on-screen token page; note its expiry date).
2. In PowerShell, from the project folder: `Copy-Item data-pipeline\.env.example data-pipeline\.env`
3. Run `notepad data-pipeline\.env`, paste the token after `EARTHDATA_TOKEN=`, save and close. Do not share the file.
4. Confirm git will ignore it: after `git init`, run `git check-ignore -v data-pipeline/.env` (it should print the matching rule).

**Option B: hidden prompt, saved by `earthaccess` outside the repo.**
Run `data-pipeline\.venv\Scripts\python.exe data-pipeline\scripts\earthdata_auth.py --setup-interactive`. Type the password into the prompt in your own window.
If the characters are visible as you type, stop (Ctrl+C) and use Option A.

**Check which route works (never prints secrets):**
`data-pipeline\.venv\Scripts\python.exe data-pipeline\scripts\earthdata_auth.py --status`

**Before every commit or push:** `data-pipeline\.venv\Scripts\python.exe data-pipeline\scripts\check_no_secrets.py`. It scans everything that could be committed and
reports file names and pattern names only. If a real credential is ever exposed, revoke it at https://urs.earthdata.nasa.gov first, then clean up.

## 3. One-time Python setup (PowerShell, in the project folder)

```
py --version
py -3.12 -m venv data-pipeline\.venv
data-pipeline\.venv\Scripts\python.exe -m pip install --upgrade pip
data-pipeline\.venv\Scripts\python.exe -m pip install -r data-pipeline\requirements.txt
```

- `py --version` checks that the Python launcher exists. If it fails, install Python 3.12 from python.org and tick "Add python.exe to PATH".
- The `venv` command creates an isolated Python environment inside `data-pipeline\.venv` (git-ignored).
- Calling the venv's `python.exe` directly means you never need to "activate" it, so PowerShell script-execution policy cannot get in the way.
- The last command installs `earthaccess` and `requests`.

## 4. The real retrieval test (run this; paste the output back, no secrets in it)

```
data-pipeline\.venv\Scripts\python.exe data-pipeline\scripts\check_data_access.py --public-only
data-pipeline\.venv\Scripts\python.exe data-pipeline\scripts\check_data_access.py --auth-only
```

- `--public-only` makes real requests to SVS, GISTEMP, NSIDC and CMR and needs no login. It saves the files into `data-pipeline/raw/` (git-ignored).
- `--auth-only` logs in non-interactively, searches PO.DAAC through `earthaccess`, and downloads one real GMSL file.
- Each check prints PASS, FAIL (with the reason) or SKIP, plus the facts we still need: SVS media URLs and description text, GISTEMP column headers,
  NSIDC header and last row, GMSL file head and file name. A full copy is written to `data-pipeline/raw/access_check_report.json`.

What is tested how: `data-pipeline/tests/test_pipeline_logic.py` (19 tests, `python -m unittest discover -s data-pipeline/tests`) uses **fake** responses and
proves parsing, redaction, secret scanning and failure handling. Only `check_data_access.py` proves actual NASA retrieval.

## 5. Per-dataset flow: retrieve, process, visualize, sonify

All three follow the same pipeline. Phase 5 adds the scripts that turn the raw downloads into `public/data/<id>/` snapshots.

### 5.1 Sea level (flagship; login required for the numbers)

- **Retrieve.** Visual: SVS 5235 movie, public HTTPS. Numbers: `earthaccess.search_data(short_name="MERGED_TP_J1_OSTM_OST_GMSL_ASCII_V52")` then
  `earthaccess.download(...)` into `raw/gmsl/`. Alternative newer product `NASA_SSH_GMSL_INDICATOR`. Never mix them.
- **Process.** Parse the ASCII file using the column definitions in the product's own README (the smoke test prints the file head so we read the real layout first).
  Keep the units the file uses and label them. Fill or fill-flag values become `null`. Later values flagged preliminary (SVS 5235 says Sentinel-6 estimates after
  2022-03-28 are preliminary; confirm against the file's documentation). Use the series the visualization used (its water height follows a 60-day running average).
  Write `series.json` with source, DOI, access time, SHA-256, license, citation. Extract frames from the movie with OpenCV, resize to WebP, and write `frames.json`.
  Validate the frame-to-date mapping by measuring several frames against the numbers.
- **Visualize.** The SVS frame for the current step, a time-series chart with a playhead, a readout, a data table, and an always-visible note on time resolution and
  whether alignment has been validated.
- **Sonify (Track 1, measured).** Level maps to pitch; the rate of rise, computed from the series over a stated window, maps to pulse density; preliminary data is marked.
- **Still unknown.** File column meanings, which GIA variant the visualization used, and the exact frame-to-date mapping.

### 5.2 Global temperature (public)

- **Retrieve.** `GLB.Ts+dSST.csv` and `ZonAnn.Ts+dSST.csv` from the GISTEMP table-data folder by HTTPS, once, cached in `raw/`. If the server blocks scripts, save from your browser to the path
  the error message prints. Visual: SVS 5450 movie.
- **Process.** Read the header the smoke test reports; `***` becomes `null`; keep the 1951–1980 baseline label; compute smoothing to match what SVS 5450 shows (5-year average or running
  24-month window, to be confirmed from its description, which the smoke test prints); zonal bands from the zonal file. Frames extracted as above.
- **Visualize.** SVS 5450 frame plus anomaly chart with playhead, zonal chart, readouts, data table.
- **Sonify.** Anomaly to pitch above a baseline drone, zonal bands as separate voices, accents for record years. See `SONIFICATION_MAPPINGS.md`.
- **Still unknown.** CSV layout (printed by the smoke test), smoothing window, and zonal file columns.

### 5.3 Sea ice (public; candidate Track 2 demonstration)

- **Retrieve.** NSIDC Sea Ice Index daily extent CSV by HTTPS (the smoke test checks the filename); visual: SVS 5480 movie.
- **Process.** Parse the daily extent and missing-data columns; keep missing as `null`. Extract frames. For Track 2, compute features per frame with NumPy/OpenCV
  (for example the fraction of ice-coloured pixels, after masking land and legends) and store them in `frame-features.json`.
  Compare the frame-derived estimate with the numeric extent for the same dates and publish the agreement.
- **Visualize.** SVS 5480 frame, extent chart, feature overlay clearly labelled "interpreted from the picture".
- **Sonify.** A measured layer from extent (seasonal breathing and decline) and an interpreted layer from frame features, labelled differently.
- **Still unknown.** SVS 5480's source dataset and time range (the smoke test prints its description), and the NSIDC north filename.

## 6. Failure behaviour

A failed download is reported with its reason and never replaced with invented data. The app keeps showing the last committed snapshot with its date.
Demo or fixture data exists only under `tests/fixtures/` and in test files, never in `public/data/`.

## 7. How the running app gets data (added in the full build)

For each phenomenon the app tries, in order: (1) a bundled snapshot in `public/data/<phenomenon>/` with a `manifest.json` (`{"files":[{"name","sourceUrl","accessedUtc","sha256"}]}`), (2) a live request to NASA through the `/nasa/...` proxies, (3) a file you choose in the page (temperature, sea ice and sea level). Sea level (login-only) has no live path: use a snapshot or choose the file you downloaded. Every dataset records where it came from (snapshot, live, file, or demo) and shows it. Demo data is a synthetic pattern, labelled DEMO everywhere.
The snapshot script (`data-pipeline/scripts/snapshot_data.py`) that writes these folders is NOT written yet; see PROJECT_STATE.md.
