# EARTHSONIC — Architecture

Status: DECIDED in Phase 2 (stack, structure, contracts). Code starts in Phase 3.
Anything marked (UNVERIFIED) must be tested before the design relies on it.
If a later phase must change a decision, add a row to the decision log (section 15) instead of silently diverging.

## 1. Purpose

EARTHSONIC is a static web app that pairs real NASA Earth Information Center (EIC) visualization frames with
sound generated in real time from the numbers behind those visualizations. Three design promises drive everything:

1. **Same data and settings produce the same sound.** No randomness in the data-to-sound path.
2. **Nothing is faked.** If real data is unavailable the app says so. It never substitutes invented values.
3. **Everything is inspectable.** Every sound has a plain-language mapping, a text equivalent, and a way to see the numbers.

## 2. Final technology stack

| Layer | Choice | Why | Rejected |
|---|---|---|---|
| UI | React + TypeScript + Vite | Required by brief; fast dev loop; static output | Next.js (server features unused) |
| Styling | Tailwind CSS + CSS variables for design tokens | Required by brief; tokens make high-contrast and reduced-motion modes easy | Component kits (generic look, extra weight) |
| Routing | React Router (package `react-router`) with browser history | Skip links need real `#main` anchors, which clash with hash routing | HashRouter; `react-router-dom` (re-export in v7, removed in v8 per current guides) |
| App state | No state library. A framework-agnostic `PlaybackController` plus React `useSyncExternalStore` | One owner of time; testable without React; zero extra dependencies | Redux, Zustand |
| Charts | `d3-scale`, `d3-shape`, `d3-array` rendering custom SVG in React | Full control of focus order, labels, playhead and data-table fallbacks | Recharts (less control of accessibility and playhead sync), full `d3` |
| Audio | Tone.js on the Web Audio API | Required by brief; scheduling, synths, `Tone.Offline` for WAV export, analysers | Raw Web Audio only (more code, same result) |
| Data build | Python scripts (requests, NumPy, Pandas, OpenCV, Pillow) | Required tools; runs once on the developer's machine | FastAPI backend (nothing needs a server) |
| Core tests | Node built-in test runner on erasable TypeScript | No install needed, so tests run anywhere Node 22 or newer runs (your Node is 24) | Vitest for core (needs installed packages) |
| UI tests | Vitest + Testing Library + axe | Standard for React and accessibility checks | Cypress/Playwright (heavy, later if time) |
| Lint | ESLint + `eslint-plugin-jsx-a11y` + Prettier | Static accessibility checks on every save | none |
| Hosting | Vercel static deployment (Netlify as fallback) | Free, simple, SPA rewrite via `vercel.json` | GitHub Pages (no SPA rewrites) |
| Fonts | Self-hosted open-licensed fonts via `@fontsource` | No external requests, no licensing ambiguity | Google Fonts CDN |
| Icons / globe | Inline SVG icons; CSS-animated globe using a NASA image | No 3D or icon library to install or audit | three.js, lucide |

There is **no runtime backend, no database, no authentication, no API keys and no paid service.**

## 3. System overview

```
BUILD TIME  (developer's Windows machine, Python, run rarely)
-------------------------------------------------------------------------------------------
 NASA SVS (mp4 / frames) ──► fetch + OpenCV extract ──► public/media/<id>/frame-0001.webp ...
                                   │
                                   └──► frame-features.json   (Track 2 only, precomputed)
 NASA PO.DAAC / GISS / NSIDC ──► download ──► validate ──► public/data/<id>/series.json
 provenance + alignment ───────────────────────────────► public/data/<id>/manifest.json
 src/registry/phenomena.json  (single source of truth, read by Python AND TypeScript)

RUNTIME  (browser, static files only)
-------------------------------------------------------------------------------------------
 src/data    fetch JSON/WebP ──► validate (core) ──► typed objects or typed errors
                                   │
 src/core    Timeline ◄── series + frames.json + alignment
             MappingSpec + Series + settings ──► buildScore() ──► Score   (pure, deterministic)
                                   │
        ┌──────────────────────────┼───────────────────────────┬───────────────────────┐
        ▼                          ▼                           ▼                       ▼
 src/audio (Tone.js)      src/state PlaybackController   src/viz                 src/a11y
 Score ──► voices ──►     ONE clock: step index drives   frame viewer, charts,   describe(step) text,
 pan ──► bus ──► limiter  frames, charts, readouts,      spectrum, data table    live-region announcer,
 ──► speakers + analyser  captions and audio together                            keyboard map
```

## 4. How NASA data, visualization and sound connect

Every phenomenon is a **triple** declared once in `src/registry/phenomena.json`:

1. **A visual**: an EIC/SVS frame set (for example SVS 5235), downloaded at build time and extracted to local WebP files.
2. **Numbers**: the dataset the visual was built from (for example NASA GMSL), converted to `series.json`.
3. **An alignment**: the declared relationship between frame index and date, plus a visible note about any difference in time resolution.

At runtime these meet in one object, the **Timeline**: an ordered list of `TimeStep`s. Each step has a label (such as "2005"),
an ISO date range, the measured value(s) or `null` for missing, and the frame index to show. Everything downstream reads steps:

- `buildScore()` turns steps into timed sound events.
- The frame viewer shows `frameIndex` for the current step.
- Charts draw the series and a playhead at the current step.
- `describe(step)` writes the text equivalent for captions and screen readers.

Because every consumer reads the same step index, the picture, the numbers, the sound and the text cannot drift apart.

**Two sound tracks, always labelled:**

- **Track 1 — Measured.** `Series` ──► score. Used wherever a numeric source exists.
- **Track 2 — Interpreted from frames.** `frame-features.json` ──► an extra artistic layer. Features come from OpenCV/NumPy at build
  time and are an interpretation of a rendered picture, never a measurement. Precomputing (rather than reading pixels in the browser)
  keeps the result reproducible, because different browsers may decode image files with tiny differences (UNVERIFIED, so we avoid
  depending on it).

**Time-resolution honesty.** The registry stores `visual.resolution`, `data.resolution` and `alignment.mismatchNote`. The Studio always
renders that note next to the frame. `alignment.validated` is `false` until we have measured several frames against the numbers; the UI
then says "alignment not yet validated".

## 5. Module map and dependency rules

Dependencies point downward only. A layer may import only from layers listed under "May import".

| Folder | Responsibility | May import |
|---|---|---|
| `src/core` | Pure logic: types, timeline, validation, normalization, mappings, score, comparison, text description | nothing outside `core` |
| `src/registry` | `phenomena.json` + typed accessors | `core` types |
| `src/data` | Browser loaders, retry, typed errors | `core`, `registry` |
| `src/audio` | Tone.js engine, voices, graph, analyser, offline render | `core` |
| `src/state` | `PlaybackController`, hooks | `core`, `audio`, `data`, `registry` |
| `src/a11y` | Announcer, keyboard map, focus manager, reduced-motion helpers | `core`, `state` |
| `src/viz` | Frame viewer, charts, spectrum, data-table fallback | `core`, `state`, `a11y` |
| `src/components` | Shared UI pieces and layout | `viz`, `a11y`, `state`, `core` |
| `src/pages` | Landing, Explorer, Studio, Time Travel, How It Works, Accessibility | everything above |

`src/core` coding rules (so the same files run in the browser and under `node --test`):

- No DOM, React, Tone.js, `Date.now()` or `Math.random()`.
- Erasable TypeScript only: no `enum`, `namespace` or constructor parameter properties.
- Relative imports end in `.ts`.

## 6. Data contracts (TypeScript, implemented from Phase 3/5)

```ts
// --- registry ---------------------------------------------------------------
type PhenomenonId = 'sea-level' | 'global-temperature' | 'sea-ice';

interface TimeResolution {
  kind: 'daily' | 'weekly' | 'monthly' | 'annual' | 'multi-year-average' | 'irregular';
  detail: string;                       // e.g. "60-day running average of weekly maps"
}

interface TimeAlignment {
  method: 'frame-index-linear' | 'frame-table' | 'year-lookup';
  validated: boolean;                   // false until measured against the numbers
  validation?: { framesChecked: number; maxDeviationSteps: number };
  mismatchNote: string;                 // shown to the user verbatim
}

interface PhenomenonDefinition {
  id: PhenomenonId;
  title: string;
  summary: string;
  visual: { svsId: number; credit: string; resolution: TimeResolution; frameSetDir: string };
  datasets: DatasetRef[];               // numeric sources that drive Track 1
  alignment: TimeAlignment;
  mappingId: string;                    // key into the declarative mapping specs
  caveats: string[];                    // always shown in the Studio
}

interface DatasetRef {
  id: string; name: string; doi?: string; units: string; baseline?: string; citation: string;
  access: 'public' | 'earthdata-login';          // login code runs ONLY for 'earthdata-login'
  retrieval: { method: 'https' | 'earthaccess'; url?: string; shortName?: string };
}

// --- data -------------------------------------------------------------------
interface Provenance { sourceUrl: string; accessedUtc: string; sha256: string; license: string; citation: string }

interface Series {
  datasetId: string;
  variable: string;
  units: string;
  baseline?: { label: string; period: string };
  times: string[];                      // ISO 8601, one per sample
  values: (number | null)[];            // null = missing or invalid; NEVER fabricated
  flags: ('ok' | 'preliminary' | 'missing' | 'suspect')[];
  provenance: Provenance;
}

interface FrameSet {
  svsId: number; width: number; height: number; format: 'webp';
  steps: { index: number; file: string; isoDate: string | null }[];
  extraction: { tool: string; sourceFile: string; everyNthFrame: number };
  credit: string;
}

// --- sonification -----------------------------------------------------------
interface MappingChannel {
  id: string;                           // "pitch", "gain", "brightness", "pan", "rhythm"
  source: string;                       // series variable or derived quantity
  transform: 'linear' | 'log' | 'rank' | 'quantize-scale';
  domain: [number, number];             // data range that maps onto the range below
  range: [number, number];              // sound range (Hz, 0..1, -1..1 ...)
  clamp: boolean;
  explain: string;                      // plain-language sentence for the UI and docs
}

interface MappingSpec { id: string; phenomenonId: PhenomenonId; version: number; voices: VoiceSpec[]; channels: MappingChannel[] }

interface ScoreEvent {
  step: number;                         // data step this event belongs to
  start: number;                        // in step units from the start of the score
  duration: number;                     // in step units
  voice: string;
  freqHz: number; gain: number; pan: number; brightness: number;
  accent?: 'record' | 'gap-end';
  basis: { variable: string; value: number | null };   // what number produced this sound
}

interface Score {
  phenomenonId: PhenomenonId;
  mode: 'scientific' | 'musical';
  track: 'measured' | 'interpreted';
  settingsHash: string;                 // hash of canonical JSON of all inputs; used by golden tests
  stepCount: number;
  events: ScoreEvent[];
  gaps: number[];                       // step indices with no data (silence + caption, never interpolation)
  legend: { channel: string; explain: string }[];
}

// --- playback ---------------------------------------------------------------
interface PlaybackState {
  status: 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';
  step: number; speed: number; loop: { enabled: boolean; from: number; to: number };
  volume: number; intensity: number; mode: 'scientific' | 'musical'; error?: DataLoadError;
}

type DataLoadError = { kind: 'network' | 'http' | 'parse' | 'validation' | 'stale'; retryable: boolean; message: string };
```

Contracts may be refined during implementation. Record any change in the decision log.

## 7. Sonification engine design

`buildScore(series, mappingSpec, settings) -> Score` is a pure function. Rules:

- **Determinism.** No randomness. If a texture ever needs noise it uses a seeded PRNG seeded from the dataset id and `settingsHash`.
- **Fixed reference ranges.** Data domains come from the mapping spec, not from the selected time range. A comparison between 1993
  and 2023 only means something if both use the same pitch scale.
- **Missing and invalid data.** `null` values produce silence and an entry in `gaps`. The UI captions the gap. We never interpolate
  silently across it.
- **Preliminary data.** Values flagged `preliminary` are voiced with a visible marker in captions and charts.
- **Safe band.** Pitch is clamped to a conservative band (proposed 110–1760 Hz, tuned by ear in Phase 6) and brightness is capped,
  so no mapping can produce a piercing tone.
- **Speed vs data.** Playback speed changes how fast steps pass. It never changes any pitch or value.
- **Intensity.** The intensity control scales dynamic range (gain and brightness contrast). It never changes the pitch mapping.
- **Scientific mode vs Musical mode.** Scientific uses continuous log pitch. Musical quantizes pitch to a scale and uses harmonic
  voicing. Both are deterministic and both show the same legend of what each sound means.
- **Mappings are data.** Each phenomenon has a declarative `MappingSpec`. The same object builds the score, renders the on-screen
  "what you are hearing" legend, and is printed in `docs/SONIFICATION_MAPPINGS.md`, so documentation cannot drift from behaviour.

## 8. Audio graph and safety

```
voice synths ──► per-voice Panner ──► voice bus ──► master Gain ──► Limiter ──► destination
                                                                 └──► Analyser (waveform + FFT, post-master)
```

- The `AudioContext` starts only from a user gesture (the Play button calls `Tone.start()`), as browsers require.
- Soft start: the master gain ramps up over a short fade each time playback begins.
- Default volume is conservative, and the limiter sits last in the chain.
- `Tone.Offline` renders the same score through the same graph to produce WAV files for the "playlist" deliverable.
- Stereo pan is used only where the mapping spec gives it a meaning (for example, a Time Travel comparison). It is never decoration.

## 9. Synchronization

- While playing, the audio transport clock is the master. Each animation frame, the controller reads the transport position and
  derives the current step. The UI follows the audio, so picture and sound cannot drift apart.
- Seeking and scrubbing set the transport position, and the step follows.
- Frames are preloaded for the next few steps around the playhead, and image decoding must not block rendering.
- If a frame is not ready, the previous frame stays visible and a small status text says so. It never shows a wrong frame as if correct.

## 10. Time Travel Through Sound

- A `ComparisonSession` holds two time selections (A and B) on the same phenomenon and the same mapping.
- Listening modes: **sequential** (A then B), **simultaneous** (A left, B right, with an on-screen and spoken legend),
  and **difference** (a voice that sonifies B minus A).
- A pure `compare(seriesA, seriesB)` produces the numbers for side-by-side readouts and the difference chart.
- Plain-language summary is generated from the numbers by `describe`, never hand-written per case.

## 11. Accessibility architecture

- Semantic landmarks and a skip link on every page. Focus moves to the page heading on route change.
- Every control is a native element with an accessible name. Keyboard map is documented in `docs/ACCESSIBILITY.md`.
- Each chart is a labelled graphic with a text summary plus a toggleable data table.
- `describe(step)` (pure, in `core`) produces the text for the live caption, the on-demand "describe now" key, and the optional
  periodic announcements. Announcements are off by default so they do not talk over the sonification.
- Playback status changes (playing, paused, error) are announced through a polite live region.
- Meaning is never carried by color alone. Charts add shape, pattern or text.
- `prefers-reduced-motion` and `prefers-contrast` are respected, and a manual high-contrast toggle is provided.

## 12. Errors, loading and empty states

- Loaders return typed errors (`network`, `http`, `parse`, `validation`, `stale`). Network and 5xx errors retry twice with backoff.
  Parse and validation errors never retry.
- Every data view has four visible states: loading, empty (no data for this range), error (with a retry control and a plain
  explanation), and ready.
- Data shipped in `public/data` is a dated snapshot. The Studio shows the snapshot date and the source, and says newer data may exist.
- **Demo data is never mixed in.** Synthetic arrays exist only under `tests/fixtures/`. If demo data is ever shown in the UI it is
  labelled DEMO prominently and kept out of `public/data`.

## 13. Testing strategy

| Tier | Tool | What it proves | Who can run it |
|---|---|---|---|
| Core | `node --test` on `tests/core/**` | parsing, unit handling, normalization, missing data, score determinism (golden files), comparison math, text descriptions | Claude's sandbox and you |
| Pipeline | `pytest` on `data-pipeline/tests` | parsers, provenance, frame-to-date tables | you |
| UI + a11y | Vitest + Testing Library + axe | roles, labels, keyboard behaviour, announcements | you |
| Manual | checklist in `docs/ACCESSIBILITY.md` | keyboard-only run, NVDA (free, Windows), contrast, mobile layout | you |

Reproducibility test: build the same score twice (and in two separate processes) and require identical `settingsHash` and events.
Alignment test (Phase 7): measure several frames against the numbers and record the result in `alignment.validation`.

Claude's sandbox has no network, so it can run the core tier but not `npm install`, the Vite build, React or Tone.js.
Anything involving those is tested on your machine and reported honestly in each milestone.

## 14. Deployment and budgets

- Static build (`vite build`) deployed to Vercel. `vercel.json` rewrites unknown paths to `index.html` so deep links work.
- Design budgets (our targets, not platform limits): under about 30 MB of frames in total, individual frames sized for the screen
  (not the 2160-pixel originals), and lazy loading for everything not on screen.
- Secrets: the browser app has none and never authenticates. NASA Earthdata credentials, needed only for login-required datasets, exist only on the
  developer's computer (git-ignored `data-pipeline/.env` or the `earthaccess`-managed `_netrc` in the user folder) and are used only by the pipeline scripts.
  See `docs/DATA_ACCESS.md`. No analytics or trackers.

## 15. Decision log

| ID | Decision | Reason |
|---|---|---|
| D1 | Static SPA, no backend | Nothing requires a server; fewer failure points |
| D2 | React Router with browser history + `vercel.json` rewrite | Skip links need real `#` anchors |
| D3 | No state library; `PlaybackController` + `useSyncExternalStore` | Single owner of time; testable without React |
| D4 | d3 scale/shape/array + custom SVG, no Recharts | Control of focus, labels, playhead |
| D5 | Score builder independent of Tone.js | Determinism is testable without audio hardware |
| D6 | Audio clock is master for sync | Prevents visual/audio drift |
| D7 | Declarative `MappingSpec` drives score, legend and docs | Docs cannot drift from behaviour |
| D8 | Track 2 features precomputed in Python | Reproducible regardless of browser image decoding |
| D9 | Frames bundled locally as WebP, not hotlinked | No CORS or availability dependence; frame-accurate seeking |
| D10 | One JSON registry shared by Python and TypeScript | Single source of truth for ids, paths and metadata |
| D11 | `src/core` is erasable TS tested with `node --test` | Lets tests run without installing packages |
| D12 | No icon, UI-kit or 3D libraries | Smaller attack surface, nothing extra to audit |
| D13 | Self-hosted open-licensed fonts, no CDN | Privacy, reliability, license clarity |
| D14 | Apache-2.0 for our work | Space Apps default; explicit `LICENSE` |
| D15 | Time Travel is built before extra phenomena (from Phase 1) | It is the differentiator; ship it on one dataset first |
| D16 | Phase 2 creates docs and structure only; tool configs come in Phase 3 | Follows the phase plan |
| D17 | Each dataset declares `access: public \| earthdata-login`; login code runs only for the latter | Never require a login unnecessarily |
| D18 | NASA downloads use Python (`earthaccess`, `requests`) in `data-pipeline/` at build time; the browser never authenticates | Credentials never reach frontend code or GitHub |
| D19 | Credentials: token in git-ignored `data-pipeline/.env` (preferred) or `earthaccess`-managed user-folder `_netrc`; never entered in chat | Revocable and outside the repository |
| D20 | `check_data_access.py` is the proof of real retrieval; tests with fake responses are labelled as not retrieval tests | Honest testing |
| D21 | `check_no_secrets.py` runs before commits | Guardrail against leaking credentials |
| D22 | Pipeline Python tests use standard-library `unittest` | No extra install; runnable in Claude's sandbox |
| D23 | Router package is `react-router` (not `react-router-dom`) | Current docs install and import from `react-router`; works for v7 and v8 |
| D24 | Tooling versions follow the official create-vite template and compatibility notes: Vite 8, @vitejs/plugin-react 6, ESLint 9, TypeScript ~5.9, Tailwind >= 4.2.2, Vitest >= 4.1 | Tailwind and Vitest only support Vite 8 from those versions; lockfile created by the first `npm install` |
| D25 | Three TypeScript projects: `tsconfig.app.json` (browser), `tsconfig.node.json` (config files), `tsconfig.core.json` (core + routes + core tests; no DOM library, erasable syntax only) | Enforces that core logic cannot touch the DOM |
| D26 | Design tokens live in CSS (`@theme` plus a `data-contrast='high'` block); tests parse the real stylesheet and enforce WCAG contrast (default >= 4.5:1, high contrast >= 7:1) | Accessibility of the palette is tested, not assumed |
| D27 | `src/routes.ts` is the single source for navigation, router paths in tests and document titles; focus moves to the page `h1` after navigation; skip link on every page | Keeps single-page navigation accessible |
| D28 | UI accessibility tests call `axe-core` directly (color-contrast rule off in jsdom) | No wrapper package; contrast is covered by the token tests |
| D29 | Fonts: Inter Variable (UI) and Fraunces Variable (display), self-hosted via `@fontsource-variable`, both OFL-1.1 | No external requests; license clear |
| D30 | The live-region Announcer is deferred to Phase 6 | It is only needed for playback status; avoids unused code |
| D31 | Replaced the Phase-2 draft contracts with concrete ones in `src/core/types.ts` (Dataset with measures, VoiceSpec/MappingSpec with pitch/pulse/brightness maps, Score) | The engine needed real shapes; unused draft types removed |
| D32 | Deterministic score builder + pure-TS offline renderer (`core/wav.ts`) used for WAV export and for tests that analyse the audio's frequencies | Proves "sound responds to data" without a browser; delivers the challenge's audio-file form |
| D33 | Live NASA data through same-origin proxies (`/nasa/...` in `vite.config.ts` and `vercel.json`); loader order snapshot, live, user file; typed errors; failures never cached | Browsers cannot read NASA servers directly; no backend needed; no data is ever invented |
| D34 | Imagery via the NASA Worldview Snapshot API (one image per request), with candidate layers tried in turn | Replaces the tile arithmetic; request format verified against NASA Earthdata documentation |
| D35 | Own tiny chart helpers (`core/charts.ts`) instead of d3 (supersedes D4) | No dependency; every chart has a text summary and data table and is node-testable |
| D36 | Playback scheduler is audio-library independent (`core/playback.ts`); `ToneBackend` loads Tone.js only on first Play | Testable without audio hardware; Tone never loads in tests |
| D37 | No code copied from the reviewed Space Apps repositories (no license files); three ideas re-implemented independently (brightness encoding, milestone jumps, plain-language values); `earthaccess` (MIT) is a dependency only | See `docs/RELATED_WORK.md` |

## 16. Carried-forward open items

- Frame-to-date mapping for SVS 5235 is not validated.
- SVS 5450 averaging window (5-year versus running 24-month) is not confirmed.
- SVS 5480 source dataset and time range have not been read.
- Browser CORS is untested for every source (we do not depend on it, because data is bundled).
- Whether the GMSL download needs an Earthdata Login is unconfirmed.
- Whether pre-event work must be disclosed is unknown. Read the Project Submission Guide on 13 November.

## 17. Data access and credentials (added after Phase 2)

Full detail in `docs/DATA_ACCESS.md`.

- Sources are classed `public` (SVS, GISTEMP, NSIDC, CMR search, GIBS, VEDA) or `earthdata-login` (PO.DAAC sea-level GMSL). Public sources never touch login code.
- Retrieval happens at build time on the developer's machine: `requests` for public files, `earthaccess` for login-required granules. Results become dated snapshots in `public/data/`.
- `earthaccess` login order (official docs): environment variables (`EARTHDATA_TOKEN` first), then `_netrc`, then an interactive prompt. The pipeline only ever uses the first two non-interactively.
- Proof of real retrieval: `data-pipeline/scripts/check_data_access.py` (public checks, then login-required checks), which writes a credential-free report.
- Pipeline tests with fake responses prove parsing and failure handling only.
