# tests/ui

Vitest + Testing Library + axe-core tests: `npm run test:ui`. Present: `App.test.tsx` (skip link, landmarks, navigation, focus after navigation, titles, high-contrast toggle,
axe audit of every page) and `contrast-preference.test.ts`. `setup.ts` loads the jest-dom matchers and resets state between tests.
