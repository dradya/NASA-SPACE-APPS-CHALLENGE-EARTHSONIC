# src/styles — design tokens and base styles

`index.css`: Tailwind import, `@theme` tokens (colors, fonts), the high-contrast theme (`:root[data-contrast='high']`), focus ring, decorative night-sky background, entrance animation
and the reduced-motion rule. `tests/core/design-tokens.test.ts` parses this file and enforces WCAG contrast, so keep colors as plain `#hex` values in those two blocks.
