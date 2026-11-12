// Tiny chart helpers (scales, ticks, line paths). Replaces a charting library so every chart stays accessible,
// dependency-free and testable.

export interface Scale {
  (x: number): number
  domain: readonly [number, number]
  range: readonly [number, number]
}

export function linearScale(domain: readonly [number, number], range: readonly [number, number]): Scale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const fn = ((x: number) => (d1 === d0 ? (r0 + r1) / 2 : r0 + ((x - d0) / (d1 - d0)) * (r1 - r0))) as Scale
  return Object.assign(fn, { domain, range })
}

/** [min, max] of the finite numbers, or null if there are none. */
export function extent(values: readonly (number | null)[]): [number, number] | null {
  let lo = Infinity
  let hi = -Infinity
  for (const v of values) {
    if (v === null || !Number.isFinite(v)) continue
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  return lo === Infinity ? null : [lo, hi]
}

/** "Nice" tick values covering [min, max] with roughly `count` ticks (1, 2, 5 x 10^n steps). */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!(max > min)) return [min]
  const span = max - min
  const rough = span / Math.max(1, count)
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const frac = rough / pow
  const step = (frac >= 5 ? 5 : frac >= 2 ? 2 : 1) * pow
  const first = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let v = first; v <= max + step * 1e-9; v += step) ticks.push(Number(v.toPrecision(12)))
  return ticks
}

/** SVG path for a line; a null value breaks the line, so gaps are shown as gaps. */
export function linePath(
  xs: readonly number[],
  ys: readonly (number | null)[],
  x: (v: number) => number,
  y: (v: number) => number,
): string {
  let d = ''
  let pen = false
  for (let i = 0; i < xs.length; i++) {
    const v = ys[i]
    if (v === null || !Number.isFinite(v)) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${x(xs[i]).toFixed(1)},${y(v).toFixed(1)}`
    pen = true
  }
  return d
}
