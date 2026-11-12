// WCAG 2.x contrast math. Used by tests that check the design tokens in src/styles/index.css.

export type Rgb = readonly [number, number, number]

/** Parse "#rgb" or "#rrggbb" into 0-255 channels. Throws on anything else. */
export function parseHexColor(hex: string): Rgb {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) throw new TypeError(`parseHexColor: not a #rgb or #rrggbb color: "${hex}"`)
  const digits = match[1].length === 3 ? match[1].replace(/./g, (d) => d + d) : match[1]
  return [
    parseInt(digits.slice(0, 2), 16),
    parseInt(digits.slice(2, 4), 16),
    parseInt(digits.slice(4, 6), 16),
  ]
}

/** Relative luminance (0 = black, 1 = white), per the WCAG definition. */
export function relativeLuminance([r, g, b]: Rgb): number {
  const linear = (channel: number): number => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** Contrast ratio between two hex colors, from 1 (identical) to 21 (black on white). */
export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const a = relativeLuminance(parseHexColor(foregroundHex))
  const b = relativeLuminance(parseHexColor(backgroundHex))
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}
