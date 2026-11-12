# EARTHSONIC — Accessibility

Accessibility is a core requirement of the challenge and of this project. This file holds the commitments and the test plan.
Status: **PLAN (Phase 2).** Implementation is built in from Phase 3 and audited in Phase 10.

## Commitments

- Everything reachable and operable by keyboard alone, with a visible focus indicator.
- Semantic landmarks, a skip link on every page, and focus moved to the page heading after navigation.
- Native controls with accessible names. Time scrubbing uses a real slider with a readable value ("2005, sea level 58 mm").
- A live text caption of what is currently being heard, plus an on-demand "describe now" action.
- Optional periodic announcements, **off by default**, so speech does not talk over the sound.
- Playback state changes announced through a polite live region.
- Every chart has a text summary and a toggleable data table. No meaning is carried by color alone.
- Text equivalents for every frame (not just "image"), generated from the data for the current step.
- High contrast: respects `prefers-contrast` and has a manual toggle. Respects `prefers-reduced-motion`.
- Volume safety: soft start, limiter, conservative default volume.
- Optional haptic feedback where the browser supports it (UNVERIFIED; treated as a bonus, never required).

## Keyboard map (draft, to be validated with a screen reader in Phase 10)

Single-key shortcuts can collide with screen-reader browse mode, so every action also has a visible button and the shortcuts apply
only when the player region has focus.

| Key | Action |
|---|---|
| Space | Play / pause |
| Left / Right | Previous / next step |
| Home / End | First / last step |
| `D` | Describe the current step in text |
| `M` | Toggle Scientific / Musical mode |

## Test plan

1. Automated: ESLint `jsx-a11y` on every change; axe checks in the UI tests.
2. Keyboard-only run through every page and every control, no mouse.
3. NVDA (free, Windows) walkthrough of the landing page, Explorer, Studio and Time Travel.
4. Contrast check of every text and chart color pair, in default and high-contrast themes.
5. Mobile layout and touch-target check on a phone-sized viewport.
6. Reduced-motion check: no essential information depends on animation.

Results are recorded here after Phase 10, including anything that does not yet pass.
