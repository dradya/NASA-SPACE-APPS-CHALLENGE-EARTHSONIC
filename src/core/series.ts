// Small, well-tested numeric helpers. No randomness, no clock, no DOM.

export function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x))
}

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null
  let sum = 0
  for (const v of values) sum += v
  return sum / values.length
}

/** Ordinary least squares slope of y against x (units of y per unit of x). Needs at least 3 points and some spread in x. */
export function olsSlope(xs: readonly number[], ys: readonly number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return null
  const mx = mean(xs.slice(0, n)) as number
  const my = mean(ys.slice(0, n)) as number
  let sxy = 0
  let sxx = 0
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my)
    sxx += (xs[i] - mx) * (xs[i] - mx)
  }
  return sxx === 0 ? null : sxy / sxx
}

/**
 * Slope over a trailing window ending at each index (inclusive). A slope is reported only when at least
 * half of the window has data (and never fewer than 3 points); otherwise null.
 */
export function trailingSlope(
  values: readonly (number | null)[],
  xs: readonly number[],
  window: number,
): (number | null)[] {
  const need = Math.max(3, Math.ceil(window / 2))
  return values.map((_, i) => {
    const px: number[] = []
    const py: number[] = []
    for (let j = Math.max(0, i - window + 1); j <= i; j++) {
      const v = values[j]
      if (v !== null && Number.isFinite(v)) {
        px.push(xs[j])
        py.push(v)
      }
    }
    return px.length >= need ? olsSlope(px, py) : null
  })
}

/** True where a value is strictly beyond every earlier non-null value (the very first value is not a record). */
export function runningRecords(values: readonly (number | null)[], kind: 'high' | 'low'): boolean[] {
  let best: number | null = null
  return values.map((v) => {
    if (v === null) return false
    if (best === null) {
      best = v
      return false
    }
    const isRecord = kind === 'high' ? v > best : v < best
    if (isRecord) best = v
    return isRecord
  })
}

/** Map x from `domain` to `range` linearly, optionally clamped to the domain. */
export function mapRange(
  x: number,
  domain: readonly [number, number],
  range: readonly [number, number],
  clampToDomain = true,
): number {
  const [d0, d1] = domain
  let t = d1 === d0 ? 0 : (x - d0) / (d1 - d0)
  if (clampToDomain) t = clamp(t, 0, 1)
  return range[0] + t * (range[1] - range[0])
}

/** Frequency that is linear in semitones between f0 and f1 as x moves across the domain. */
export function semitoneMap(
  x: number,
  domain: readonly [number, number],
  freqRange: readonly [number, number],
): number {
  const [d0, d1] = domain
  const t = clamp(d1 === d0 ? 0 : (x - d0) / (d1 - d0), 0, 1)
  return freqRange[0] * Math.pow(freqRange[1] / freqRange[0], t)
}

export function formatNumber(x: number, digits = 2): string {
  const fixed = x.toFixed(digits)
  return Number(fixed) === 0 ? (0).toFixed(digits) : fixed // avoid "-0.00"
}
