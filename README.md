# EARTHSONIC — Hear the changing Earth.

EARTHSONIC pairs NASA Earth Information Center (EIC) visualization frames with sound generated in real time
from the real measurements behind them. It is built for the 2026 NASA Space Apps Challenge,
"The Earth Information Jukebox", with accessibility for blind and low-vision users as a core requirement.

> Status: **Full application built; first local build pending.** Four phenomena (temperature, sea level, sea ice, vegetation) with a deterministic sound engine, Time Travel comparison, Worldview imagery and accessibility features. Claude could not run `npm install` or real NASA requests; see `PROJECT_STATE.md` for exactly what has and has not been tested.

## What it will do

- Pick an environmental phenomenon (sea level, global temperature, sea ice).
- See the actual NASA EIC / SVS visualization frames, step through time, and read the measurements.
- Press Play and hear the data: a deterministic mapping from numbers to pitch, rhythm, timbre and stereo position.
- Compare two dates or years side by side (Time Travel Through Sound).
- Read exactly what each sound means, and use everything by keyboard and screen reader.

Two kinds of sound are always labelled differently:

- **Measured**: driven by the numeric series behind the visualization.
- **Interpreted from the picture**: features computed from rendered frames. An interpretation, never a measurement.

## Where to read next

| File | Purpose |
|---|---|
| `docs/ARCHITECTURE.md` | Final stack, system design, data contracts, decision log |
| `docs/DATA_SOURCES.md` | Every NASA source, what is verified and what is not |
| `docs/DATA_ACCESS.md` | Public vs login-required data, secure credential setup, per-dataset flow |
| `docs/SONIFICATION_MAPPINGS.md` | How numbers become sound (design draft, finalized in Phase 6) |
| `docs/ACCESSIBILITY.md` | Accessibility commitments and test plan |
| `ATTRIBUTION.md` | Credits, citations and licenses |
| `PROJECT_STATE.md` | Current state; paste into a new Claude session to continue |

## Getting started (Windows, PowerShell)

Run these from the project folder (the folder that contains `package.json`), in a normal (non-administrator) PowerShell window.

```
node -v
npm install
npm run dev
```

- `node -v` must print v22.12 or newer. (Verified on the developer's machine: v24.21.0.)
- `npm install` downloads the project's packages into `node_modules` (this folder is git-ignored) and creates `package-lock.json`. Commit that lockfile.
- `npm run dev` starts the local development server and prints a link, normally http://localhost:5173. Open it in your browser. Press Ctrl+C to stop.

Other commands:

| Command | What it does |
|---|---|
| `npm run test:core` | Logic tests with Node's built-in runner (hashing, routes, color-contrast of the design tokens). No browser needed. |
| `npm run test:ui` | Component and automated accessibility (axe) tests in a simulated browser (Vitest). |
| `npm test` | Both of the above. |
| `npm run lint` | Code and accessibility lint (ESLint with the jsx-a11y rules). |
| `npm run typecheck` | TypeScript checks for the app, the config files and the core logic. |
| `npm run build` | Type-check, then build the production site into `dist/`. |
| `npm run preview` | Serve the built site locally to try it. |
| `npm run check` | Everything above in order: typecheck, lint, tests, build. |
| `npm run docs` | Regenerate `docs/SONIFICATION_MAPPINGS.md` from the real mappings (a test fails if it is stale). |
| `npm run format` | Auto-format all code with Prettier. |

The NASA data tools live in `data-pipeline/` and use Python; see `docs/DATA_ACCESS.md`.

## GitHub Pages

The `main` branch deploys automatically to [EARTHSONIC on GitHub Pages](https://dradya.github.io/NASA-SPACE-APPS-CHALLENGE-EARTHSONIC/) through GitHub Actions. The Pages build uses the repository path, and client-side routes are supported when reloaded.

GitHub Pages is static hosting and cannot run the NASA proxy rewrites used by the Vercel deployment. To load data there, publish snapshots under `public/data/` or choose a local data file; proxy-backed live NASA requests require a host that supports rewrites.

## Requirements

Verified on the developer's machine: Node.js v24.21.0, npm 11.19.0, Git 2.55.0 (Windows). Node 22 or newer is required.
Python 3.12 is required for the data pipeline (**not yet verified**; see `docs/DATA_ACCESS.md`, section 3).
All tools and data are free. No paid services or API keys are needed to run the finished app. A free NASA Earthdata Login is needed
only once, by the developer, to download the sea-level dataset; credentials stay on the developer's computer and are never committed.

## License

Original work in this repository is released under the Apache License 2.0 (see `LICENSE`), the Space Apps default.
NASA data and imagery keep their own credit and usage terms (see `ATTRIBUTION.md`).