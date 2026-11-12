# EARTHSONIC — NASA data sources

Status key: **VERIFIED** = page or official documentation was read in Phase 1. **UNVERIFIED** = must be tested before we rely on it.
Rule: never invent identifiers, endpoints, values or coverage. Anything not listed here as verified is not yet part of the app.
Access classes (public vs Earthdata Login), the credential workflow and the per-dataset retrieval flow are in `DATA_ACCESS.md`.

## Selection rule

Each phenomenon pairs (1) an EIC/SVS visualization, (2) the numbers it was built from, and (3) a declared time alignment.
Rendered imagery is never treated as a measurement. Frame-derived features are labelled "interpreted from the picture".

## 1. Sea level (flagship)

**Visual: SVS 5235, "Sea Level Through a Porthole (2023)"** (EIC-tagged)
- API: `https://svs.gsfc.nasa.gov/api/5235` returns JSON with movie and frame-sequence links, credits and datasets. VERIFIED.
- Media: 2160×2160 MP4 and frame sequence. Covers 1993–2023. The ruler mark shows exact altimeter measurements; the water height uses a
  60-day running average of the same data. VERIFIED.
- Dataset listed by SVS: NASA Sea Level Change Program GMSL, GSFC v5.1, DOI 10.5067/GMSLM-TJ151. Estimates after 2022-03-28 from Sentinel-6 are
  labelled preliminary. VERIFIED.
- Related: SVS 5304 (Science-on-a-Sphere version), SVS 5114 (older), SVS 5516 (GMSL 1993–2024, not read).
- UNVERIFIED: frame index to date mapping. Phase 7 validates it by measuring frames against the numbers.

**Numbers: GSFC Global Mean Sea Level (the series the visual used)**
- v5.2 collection: PO.DAAC `MERGED_TP_J1_OSTM_OST_GMSL_ASCII_V52`, ASCII, released 2024-12-01, DOI 10.5067/GMSLM-TJ152.
- A third-party mirror describes the columns in millimetres with GIA-applied and not-applied variants. UNVERIFIED: read the official README
  and record column meanings here before parsing.
- Alternative for newest data: `NASA_SSH_GMSL_INDICATOR`, DOI 10.5067/NSIND-GMSV1, centimetres, weekly, 1993-01-04 to present, not GIA-adjusted,
  license US Government Works. VERIFIED. Do **not** mix the two products. Label whichever is used.
- Access: **login required.** PO.DAAC states that a free Earthdata Login is needed to download its data (VERIFIED). Retrieval: Python `earthaccess`
  (`search_data` by short name, then `download`), once, on the developer's machine. A script converts the file to `series.json` with provenance and the snapshot is committed.
  The short names above are checked against CMR by `check_data_access.py`.
- Browser access: not needed (bundled snapshot).

## 2. Global temperature

**Visual: SVS 5450, "Global Temperature Anomalies from 1880 to 2024"** (GISTEMP-based; data: R. Schmunk, NASA GISS; visualizer: M. SubbaRao)
- Files: `2024GISTEMP_Map4K.mp4`; frame sequence at 3840×2160. VERIFIED.
- UNVERIFIED: whether frames show 5-year averages or a running 24-month window, and whether it carries the EIC tag.
  Our numeric smoothing must match the frames. The Studio will state the window used.

**Numbers: NASA GISTEMP v4** (`https://data.giss.nasa.gov/gistemp/`)
- Land-ocean temperature index. Anomalies relative to 1951–1980. Built from NOAA GHCN v4 and ERSST v5. Updated about the 10th of each month. VERIFIED.
- Files: `GLB.Ts+dSST.csv`, hemispheric variants and `ZonAnn.Ts+dSST.csv` under `/gistemp/tabledata_v4/`; 2°×2° netCDF at
  `https://data.giss.nasa.gov/pub/gistemp/gistemp1200_GHCNv4_ERSSTv5.nc.gz`. Links VERIFIED.
- UNVERIFIED: CSV column layout (robots.txt blocked automated fetch in Phase 1; the developer's browser download will reveal it).
- No login. Browser access not needed (bundled snapshot).
- Credit: "NASA GISS/GISTEMP". Citation in `ATTRIBUTION.md`.

## 3. Sea ice (Track 2 demonstration; candidate)

**Visual: SVS 5480, Global Sea Ice** (EIC-tagged). Equirectangular 4096×2048 MP4 and frame directory. VERIFIED to exist.
UNVERIFIED: its source dataset and time range (not yet read). The experience stays a candidate until they are confirmed.

**Numbers: NSIDC Sea Ice Index v4 (G02135)**, `https://noaadata.apps.nsidc.org/NOAA/G02135/`, daily CSV, DOI 10.7265/a98x-0f50, public, no login.
UNVERIFIED: exact northern-hemisphere filename.
Purpose: the frame-derived ice estimate is checked against the numeric extent and the agreement is reported, not assumed.

## 4. Optional or not used

- **GIBS** (`https://gibs.earthdata.nasa.gov`): WMTS REST tiles with a time dimension. Rendered visualizations only, not measurements.
  GetCapabilities lists only the latest 100 time periods; use DescribeDomains for full ranges. Used only if we add a live imagery layer.
  Layer ids seen in third-party listings (`MODIS_Terra_NDVI_8Day`, `GHRSST_L4_MUR_Sea_Surface_Temperature`) must be confirmed first.
- **VEDA** STAC (`https://openveda.cloud/api/stac`) and raster (`https://openveda.cloud/api/raster`) APIs exist. Collections not enumerated.
- **SVS 5687 / 5688** (El Niño 2026, automated daily EIC displays): not read; possible "live" stretch.
- **Vegetation (MODIS NDVI via ORNL DAAC web service)**: dropped to optional. No verified EIC frame set, and the service is per-location.
- **OSCAR ocean currents, numeric SST**: rejected for now (large daily gridded files; PO.DAAC cloud access).

## 5. Provenance recorded for every dataset

`sourceUrl`, `accessedUtc`, `sha256` of the original file, `license`, `citation`, units, baseline. Missing or invalid values are stored as
`null` with a flag. They are never filled in.

## Imagery: NASA Worldview Snapshots (added in the full build)

- Endpoint: `https://wvs.earthdata.nasa.gov/api/v1/snapshot` with `REQUEST=GetSnapshot`, `TIME=YYYY-MM-DD`, `BBOX=south,west,north,east` (EPSG:4326), `LAYERS=a,b`, `FORMAT`, `WIDTH`, `HEIGHT`. VERIFIED against NASA Earthdata's announcement of the service (the example request is a unit test). `Coastlines` and `MODIS_Terra_CorrectedReflectance_TrueColor` appear in NASA's own examples.
- Layers the app tries for vegetation: `MODIS_Terra_NDVI_8Day`, then `MODIS_Terra_L3_NDVI_Monthly` (the monthly layer appears in a third-party Worldview-snapshot example; the 8-day id comes from third-party catalogs). UNVERIFIED that both are currently served: the panel falls back automatically and says which one it shows. Check with `data-pipeline/scripts/check_data_access.py`.
- The imagery is a visual aid. It is never used as a measurement.

## Live access through proxies

`/nasa/giss`, `/nasa/nsidc`, `/nasa/ornl` forward to the public NASA servers (see `vite.config.ts`, `vercel.json`). UNVERIFIED until run: whether each server answers these forwarded requests (GISS may restrict automated access). If one does not, the app reports it and offers a snapshot or your own file.
