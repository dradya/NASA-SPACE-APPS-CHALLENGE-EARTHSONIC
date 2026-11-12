# Related work reviewed, and what was (not) reused

Before finishing the build, four public repositories were reviewed. Rule applied: copy nothing without a clear license; keep EARTHSONIC's own architecture (React + TypeScript + Vite + Tailwind, Tone.js).

| Repository | License found | Finding | Decision |
|---|---|---|---|
| aritradev/DeltaEcho-Jukebox | No LICENSE file in the repository listing | README-driven plan covering many datasets; live endpoints described as in progress. Its source subpages could not be read (GitHub blocks automated access). | **No code reused.** One documented NASA fact (the Worldview Snapshot API) was independently verified against NASA's own documentation and then implemented from scratch. |
| jaherunhasanrimon/NasaSpaceApp1stPrototype… | No LICENSE file | React/TypeScript/Vite prototype using Web Audio only; GISTEMP annual values hard-coded in source; pentatonic pitch plus filter brightness; milestone jump chips. Source subpages not readable. | **No code or data reused** (and hard-coded values cannot be verified against NASA). Three *ideas* were re-implemented independently: brightness that follows the data, milestone jump buttons computed from the data, and baseline-relative plain-language values. |
| earthaccess-dev/earthaccess | MIT | The Python client for Earthdata login, search and download. | **Used as a dependency** (`data-pipeline/requirements.txt`); no code copied. MIT notice recorded in `ATTRIBUTION.md`. |
| NASA LP DAAC `lpdaac_cloud_data_access` | No LICENSE file | 2022 tutorial notebooks on Earthdata Cloud access; its own README notes the cloud tooling was changing. | **Reference only.** Guidance followed: use HTTPS links from a laptop (`data_links(access="external")`), and `_netrc` on Windows. |

Kept original: the deterministic score engine, the documented fixed-scale mappings, Time Travel comparison, the offline renderer, the playback scheduler, the strict file parsers, the registry, and the tests.
Prior art acknowledged: both prototypes sonify GISTEMP temperature with pentatonic pitch; EARTHSONIC differs by parsing the NASA file itself (never typing values in), adding sea level, sea ice and vegetation, a comparison mode, downloadable audio, and a text description of every sound.
