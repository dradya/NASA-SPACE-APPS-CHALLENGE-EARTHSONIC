# src/audio — Tone.js engine

Plays a `Score`. Knows nothing about NASA datasets.

Planned files (phase): `engine.ts` (6), `voices.ts` (6), `graph.ts` (6, voices, panners, bus, master gain, limiter),
`analyser.ts` (7), `offlineRender.ts` (9, WAV export through `Tone.Offline`).

Rules: imports `core` types only. The audio context starts only from a user gesture. Soft start on every Play.
The limiter is the last node before the output.
