# EARTHSONIC — Attribution, citations and licenses

The Space Apps terms require every source to be cited, including open-source ones. Keep this file current whenever something is added.
Status: **STARTER (Phase 2).** Entries marked "to confirm" are checked in Phase 12.

## NASA data and visualizations

| Item | Credit / citation | Notes |
|---|---|---|
| SVS 5235, Sea Level Through a Porthole (2023) | NASA's Scientific Visualization Studio. Visualizer: AJ Christensen (SSAI). | Frames extracted at build time. Check the SVS page credit line and NASA media guidelines before bundling. |
| SVS 5450, Global Temperature Anomalies from 1880 to 2024 | NASA's Scientific Visualization Studio. Data: Robert B. Schmunk (NASA/GSFC GISS). Visualizer: Mark SubbaRao (NASA/GSFC). | Same checks as above. |
| SVS 5480, Global Sea Ice | NASA's Scientific Visualization Studio. | Candidate. Read credits before use. |
| GSFC Global Mean Sea Level | NASA Sea Level Change Program, GSFC. Version 5.1 per SVS 5235; DOI 10.5067/GMSLM-TJ151. v5.2: DOI 10.5067/GMSLM-TJ152. Distributed by PO.DAAC. | Add access date when downloaded. |
| NASA-SSH GMSL Indicator (if used) | DOI 10.5067/NSIND-GMSV1, PO.DAAC. License: US Government Works. | Add access date. |
| GISTEMP v4 | GISTEMP Team, 2026: GISS Surface Temperature Analysis (GISTEMP), version 4. NASA Goddard Institute for Space Studies. https://data.giss.nasa.gov/gistemp/ (add access date). Lenssen, N., et al., 2024: A NASA GISTEMP version 4 uncertainty model. J. Geophys. Res. Atmos., 129(17), e2023JD040179, doi:10.1029/2023JD040179. Credit line: "NASA GISS/GISTEMP". | Both references are required by GISTEMP. |
| NSIDC Sea Ice Index v4 (if used) | NSIDC, G02135, DOI 10.7265/a98x-0f50. | Add access date. |
| GIBS (only if used) | Include the acknowledgment wording given on the GIBS documentation page. | Copy the exact text from https://nasa-gibs.github.io/gibs-api-docs/ at the time of use. |

## Software (licenses to confirm from package metadata in Phase 12)

React, React Router, Vite, Tailwind CSS, Tone.js, Vitest, Testing Library, Prettier, NumPy, Pandas, Requests: permissive open-source licenses
(MIT or BSD family, to confirm). d3 modules: ISC. TypeScript: Apache-2.0. OpenCV and Pillow: permissive open-source licenses (to confirm).
Fonts (self-hosted through `@fontsource-variable`, SIL Open Font License 1.1): **Inter** (Copyright 2016 The Inter Project Authors, https://github.com/rsms/inter) and **Fraunces** (designed by Undercase Type: Phaedra Charles and Flavia Zimbardi).

## Software dependencies (additions in the full build)

- **earthaccess** (MIT License, NASA Earthdata client for Python): used by the data pipeline as a dependency; no code copied.
- **Tone.js** (MIT License): live audio playback in the browser.
- Imagery shown in the app is requested from NASA Worldview / GIBS (NASA ESDIS). Include the acknowledgment wording from https://nasa-gibs.github.io/gibs-api-docs/ in the final submission.
- Related public repositories were reviewed and nothing was copied from them; see `docs/RELATED_WORK.md`.

## Our work

Original code and documentation: Apache License 2.0 (`LICENSE`).
