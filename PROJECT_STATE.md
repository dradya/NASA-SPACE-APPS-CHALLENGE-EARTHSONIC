# EARTHSONIC — PROJECT_STATE.md

Last updated: 2026-11-08. STATUS: FULL APPLICATION BUILT (user authorized the whole build). NOT yet built or run on the user's machine. Resume with: **CONTINUE EARTHSONIC**.
Do not restart, repeat completed work, or change the architecture without a logged reason (docs/ARCHITECTURE.md decision log D1-D37).
Related docs: docs/ARCHITECTURE.md, DATA_ACCESS.md, DATA_SOURCES.md, SONIFICATION_MAPPINGS.md (generated), ACCESSIBILITY.md, RELATED_WORK.md, ATTRIBUTION.md.

## 1. What EARTHSONIC is
Web app (React 19 + TypeScript + Vite 8 + Tailwind 4, Tone.js) that turns real NASA Earth data into deterministic, documented sound, with pictures, charts, text descriptions and a Time Travel comparison. For NASA Space Apps 2026 "The Earth Information Jukebox" (event Nov 14-15, 2026; submission guide releases Nov 13, not yet read; T&Cs: open license (Apache 2.0), cite EVERY source).

## 2. Environment
- User: Windows, Node v24.21.0, npm 11.19.0, git 2.55.0. **Python still NOT verified** (`python --version` printed nothing). Earthdata account created (user statement). User has NOT yet run npm install, the data smoke test, or reported results.
- Claude sandbox: NO network. It cannot run npm install, Vite, Vitest, ESLint, Prettier, real NASA requests, or make package-lock.json. It has Node 22 (native TS), Python 3.12, TypeScript 6.0.3, esbuild, react 19.2.8 + react-dom, tailwindcss 4.3.3 (local verification only).

## 3. What is built (all in EARTHSONIC.zip)
Pages: Landing (Worldview hero, steps, phenomena), Earth Explorer (4 cards with dataset/source/units/coverage/resolution/access), Sonification Studio, Time Travel Through Sound, How it works (rendered from the real mappings), Accessibility, Not found. Shell from Phase 3 (skip link, landmarks, focus-on-h1, titles, high contrast, reduced motion) preserved.
Phenomena: global-temperature (GISTEMP, public), sea-level (GSFC GMSL, Earthdata login to download), sea-ice (NSIDC Sea Ice Index, public), vegetation (MODIS MOD13Q1 NDVI via ORNL DAAC web service, public, per site and year; 5 sites).
Core engine (src/core, pure TS, node-tested): types, series math, charts helpers, parsers (GISTEMP global+zonal, NSIDC daily, GMSL ASCII with header-driven column choice, MODIS JSON; strict, reject unexpected files), datasets (derived measures: warming rate, rise since first year, rate of rise, September/March means, NDVI change; DEMO datasets labelled), mappings (documented fixed scales, safe band 110-1760 Hz, pentatonic Musical mode), score builder (deterministic, fingerprint, gaps=silence, record bells, pulse rhythm, intensity), compare (two periods, difference, 3 listening modes, moment text), describe (plain-language captions, note names), milestones (computed jump points), wav (offline renderer + WAV encoder), playback (audio-clock scheduler, library independent), gibs (Worldview Snapshot URLs).
Data layer (src/data/loaders.ts): snapshot -> live NASA via /nasa/... proxies -> user file; retries; typed errors; failures not cached; datasetFromFile.
Audio: src/audio/toneBackend.ts (Tone loaded only on first Play; voices -> filter -> panner -> master -> limiter -> out; analysers), audioMath.ts.
UI: StudioView/TimeTravelView (+ pages), TimeSeriesChart (text summary + data table, line styles), DiffBars, PhenomenonVisual (stripes/gauge/ice disc/greenness; value text), ImageryPanel (Worldview, candidate layers with fallback), ScienceCard (dataset, NASA source, units, date range, resolution, access, alignment, explanation, what each sound means, limitations, citation), TransportControls (play/pause/stop/loop/speed/volume/intensity/mode/timeline slider), CaptionPanel (describe now, optional live announcements), AudioScope (waveform + spectrum), DataStatus (loading/error/empty, REAL vs DEMO banner, file picker), Announcer, shortcuts (Space, arrows, D, M).
Plumbing: vite.config.ts and vercel.json proxies (/nasa/giss, /nasa/nsidc, /nasa/ornl); package.json (tone added; no d3); tsconfig app/node/core; eslint (jsx-a11y); scripts/generate-docs.ts (npm run docs).
Data pipeline (Python): check_data_access.py (real retrieval smoke test, public + login), earthdata_auth.py (token in git-ignored .env, or hidden prompt via earthaccess), check_no_secrets.py, pipeline_common.py, sites.json, .env.example, requirements.txt (earthaccess, requests).

## 4. What was actually tested in Claude's sandbox
- 106 core tests PASS (node --test): parsers, datasets, mappings, score determinism, pitch-follows-data, gaps, records, pulses, musical mode, safe band, compare, describe, milestones, WAV audio analysis (Goertzel: rendered pitch follows data at low/mid/high values; less ice = lower; richer NDVI = more overtones; stereo; byte-identical reproducibility; valid WAV), playback scheduler (fake backend), loaders (fake fetch), registry completeness, docs-drift, gibs (NASA's published example URL), design-token contrast (both themes).
- Strict tsc (TypeScript 6.0.3) of src/core, src/data, src/registry, audioMath, scripts, tests/core: clean.
- esbuild syntax check of every TS/TSX file: clean.
- Strict tsc of all src/ against stand-in React/router/Tone types (57 files): clean; negative control caught a planted error.
- Server-render with real React 19.2.8 of all 7 pages + StudioView and TimeTravelView for all 4 phenomena (demo data): 18 renders, HTML audit (labels, headings, ids, alt, captions, no undefined text): 0 problems; auditor negative control caught broken HTML.
- Tailwind 4.3.3 compile of the real stylesheet: OK. 19 Python tests PASS (fake network). Secret scan OK.
## NOT tested (needs the user's machine; do not claim these work)
npm install (peer resolution), npm run dev/build/lint, Vitest UI tests (tests/ui, incl. axe on every page), any real NASA request (GISTEMP/NSIDC/ORNL via proxies, Worldview imagery, PO.DAAC download), real Tone.js audio in a browser, how it looks, real screen-reader testing. The Tone adapter uses a local minimal interface (unverified against Tone 15's real types/behaviour).

## 5. Known issues / unverified
- GISTEMP/NSIDC/ORNL servers may refuse the forwarded requests (robots/403); MODIS ORNL response shape and layer ids (`MODIS_Terra_NDVI_8Day`, `MODIS_Terra_L3_NDVI_Monthly`) unverified; GISTEMP CSV and zonal column layouts and NSIDC north filename unverified (parsers check headers and fail loudly); GMSL file columns unverified (parser picks "smoothed, GIA applied" by header text).
- No package-lock.json (created by first npm install; commit it). Python not installed/verified on the user's PC.
- Pre-event rule about prior work unknown (read Project Submission Guide, Nov 13).
- Reviewed repos: no code reused (docs/RELATED_WORK.md).

## 6. Commands (Windows PowerShell, normal window, project folder)
npm install; npm run dev (http://localhost:5173); npm run test:core; npm run test:ui; npm run lint; npm run build; npm run check; npm run docs.
Data: see docs/DATA_ACCESS.md sections 3-4 (py -3.12 -m venv data-pipeline\.venv; pip install -r data-pipeline\requirements.txt; check_data_access.py --public-only / --auth-only; check_no_secrets.py before commits).

## 7. NEXT TASKS (resume here)
User: (1) extract ZIP, npm install, npm run dev, test:core, test:ui, lint, build; paste errors. (2) Get Python 3.12 working; run check_data_access.py; paste output (no secrets). (3) Open Studio for each phenomenon and report what loads.
Claude (in order):
 1. Fix whatever the user's first build/test/lint run reports (real errors first).
 2. Write data-pipeline/scripts/snapshot_data.py (+ unittest): --public (GISTEMP GLB + ZonAnn, NSIDC north daily, ORNL per site/year from sites.json) and --gmsl (earthaccess search_data(short_name="MERGED_TP_J1_OSTM_OST_GMSL_ASCII_V52"), download newest, data_links(access="external")) into public/data/<id>/ with manifest.json {files:[{name,sourceUrl,accessedUtc,sha256}]} exactly as src/data/loaders.ts reads it.
 3. Extend check_data_access.py to probe Worldview Snapshot layers and the ORNL endpoint (print JSON keys); use results to resolve section 5 unverified items and update DATA_SOURCES.md.
 4. Add tests/ui for StudioView, TimeTravelView, DataStatus, TransportControls (user-run), and an ESLint/axe pass.
 5. Docs: DEMO_SCRIPT.md, DEPLOYMENT.md (Vercel; rewrites already in vercel.json), final README polish, full ATTRIBUTION (GIBS acknowledgment wording, all source access dates).
 6. Optional: haptics toggle, larger site list, Space Apps submission text.
