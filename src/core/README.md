# src/core — pure, deterministic logic

Decides what the data means and what it sounds like. No browser, React or Tone.js here.

Present now: `types.ts` (data contracts), `hash.ts` (canonical JSON and fingerprints for reproducibility checks), `contrast.ts` (WCAG contrast math used by tests).
Planned (phase): `timeline.ts` (5), `validate.ts` (5), `normalize.ts` (6), `mappings/*.ts` (6, one declarative `MappingSpec` per phenomenon),
`score.ts` (6), `prng.ts` (6, only if a texture needs seeded noise), `describe.ts` (7, text equivalents), `compare.ts` (9).

Rules:
- Imports nothing from outside `core`.
- No DOM, React, Tone.js, `Date.now()` or `Math.random()`. (`tsconfig.core.json` has no DOM library, so the compiler enforces part of this.)
- Erasable TypeScript only (no `enum`, `namespace`, constructor parameter properties). Relative imports end in `.ts`.
- Every exported function has a test in `tests/core`.
