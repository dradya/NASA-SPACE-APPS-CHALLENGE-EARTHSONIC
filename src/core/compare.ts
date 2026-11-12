// Time Travel: compare two periods of the same phenomenon and build a score for listening to the comparison.
import type { Dataset, MappingSpec, Score, ScoreEvent, ScoreSettings } from './types.ts'
import { clamp, mean, olsSlope, formatNumber, semitoneMap } from './series.ts'
import { buildScore, type StepRange } from './score.ts'
import { SAFE_BAND, quantizeToPentatonic } from './mappings.ts'
import { settingsHash } from './hash.ts'

export type ComparisonMode = 'sequential' | 'together' | 'difference'

export interface Comparison {
  measure: string
  label: string
  units: string
  length: number
  labelsA: string[]
  labelsB: string[]
  a: (number | null)[]
  b: (number | null)[]
  /** b - a at the same position in each period; null if either is missing. */
  diff: (number | null)[]
  stats: { meanA: number | null; meanB: number | null; meanDiff: number | null; trendA: number | null; trendB: number | null }
}

const valuesIn = (ds: Dataset, id: string, r: StepRange) => ds.measures[id].values.slice(r.from, r.to)

function trend(values: (number | null)[]): number | null {
  const xs: number[] = []
  const ys: number[] = []
  values.forEach((v, i) => { if (v !== null) { xs.push(i); ys.push(v) } })
  return olsSlope(xs, ys)
}

const present = (xs: (number | null)[]) => xs.filter((x): x is number => x !== null)

export function comparePeriods(dsA: Dataset, rA: StepRange, dsB: Dataset, rB: StepRange, measureId?: string): Comparison {
  const id = measureId ?? dsA.primary
  if (!dsA.measures[id] || !dsB.measures[id]) throw new RangeError(`Measure "${id}" is not in both datasets.`)
  const va = valuesIn(dsA, id, rA)
  const vb = valuesIn(dsB, id, rB)
  const length = Math.max(va.length, vb.length)
  const a = Array.from({ length }, (_, i) => va[i] ?? null)
  const b = Array.from({ length }, (_, i) => vb[i] ?? null)
  const diff = a.map((x, i) => (x === null || b[i] === null ? null : (b[i] as number) - x))
  const m = dsA.measures[id]
  return {
    measure: id, label: m.label, units: m.units, length,
    labelsA: dsA.steps.slice(rA.from, rA.to).map((s) => s.label), labelsB: dsB.steps.slice(rB.from, rB.to).map((s) => s.label),
    a, b, diff,
    stats: { meanA: mean(present(a)), meanB: mean(present(b)), meanDiff: mean(present(diff)), trendA: trend(a), trendB: trend(b) },
  }
}

export function describeComparison(c: Comparison): string {
  const { meanA, meanB, meanDiff, trendA, trendB } = c.stats
  if (meanA === null || meanB === null || meanDiff === null) return 'There is not enough data in both periods to compare them.'
  const first = (xs: string[]) => xs[0] ?? '?'
  const last = (xs: string[]) => xs[xs.length - 1] ?? '?'
  const dir = meanDiff > 0 ? 'higher' : meanDiff < 0 ? 'lower' : 'the same'
  const u = c.units
  const lines = [
    `${c.label}: period A (${first(c.labelsA)} to ${last(c.labelsA)}) averages ${formatNumber(meanA)} ${u}; period B (${first(c.labelsB)} to ${last(c.labelsB)}) averages ${formatNumber(meanB)} ${u}.`,
    meanDiff === 0 ? 'The two averages are equal.' : `Period B is on average ${formatNumber(Math.abs(meanDiff))} ${u} ${dir} than period A.`,
  ]
  if (trendA !== null && trendB !== null) lines.push(`Within the periods the value changes by ${formatNumber(trendA, 3)} ${u} per step in A and ${formatNumber(trendB, 3)} ${u} per step in B.`)
  return lines.join(' ')
}

function shift(e: ScoreEvent, steps: number, pan?: number): ScoreEvent {
  return { ...e, step: e.step + steps, start: e.start + steps, ...(pan === undefined ? {} : { pan }) }
}

export function buildComparisonScore(
  mode: ComparisonMode, dsA: Dataset, rA: StepRange, dsB: Dataset, rB: StepRange, spec: MappingSpec, settings: ScoreSettings,
): Score {
  const sA = buildScore(dsA, spec, rA, settings)
  const sB = buildScore(dsB, spec, rB, settings)
  const voices = [...sA.voices, ...sB.voices.filter((v) => !sA.voices.some((x) => x.id === v.id))]
  const legend = sA.legend
  if (mode === 'sequential') {
    const offset = sA.stepCount + 1 // one silent step between the periods
    return {
      ...sA, voices, legend, fingerprint: settingsHash({ mode, a: sA.fingerprint, b: sB.fingerprint }),
      stepCount: offset + sB.stepCount,
      stepLabels: [...sA.stepLabels.map((l) => `A: ${l}`), '—', ...sB.stepLabels.map((l) => `B: ${l}`)],
      events: [...sA.events, ...sB.events.map((e) => shift(e, offset))],
      gaps: [...sA.gaps, ...sB.gaps.map((g) => g + offset)],
    }
  }
  if (mode === 'together') {
    const n = Math.max(sA.stepCount, sB.stepCount)
    const labels = Array.from({ length: n }, (_, i) => `A ${sA.stepLabels[i] ?? '—'} · B ${sB.stepLabels[i] ?? '—'}`)
    const events = [...sA.events.map((e) => ({ ...e, pan: clamp(e.pan - 0.6, -1, 1) })), ...sB.events.map((e) => ({ ...e, pan: clamp(e.pan + 0.6, -1, 1) }))]
    events.sort((x, y) => x.start - y.start || (x.voice < y.voice ? -1 : x.voice > y.voice ? 1 : 0))
    return { ...sA, voices, legend, fingerprint: settingsHash({ mode, a: sA.fingerprint, b: sB.fingerprint }), stepCount: n, stepLabels: labels, events, gaps: [] }
  }
  // difference
  const c = comparePeriods(dsA, rA, dsB, rB, spec.diff.measure)
  const quant = (f: number) => clamp(settings.mode === 'musical' ? quantizeToPentatonic(f) : f, SAFE_BAND[0], SAFE_BAND[1])
  const events: ScoreEvent[] = []
  const gaps: number[] = []
  const refFreq = quant(semitoneMap(0, spec.diff.domain, spec.diff.freqRange))
  c.diff.forEach((d, i) => {
    events.push({ step: i, start: i, duration: 0.95, voice: 'reference', freqHz: refFreq, gain: 0.22, pan: 0, brightness: 0.2, basis: { measure: spec.diff.measure, value: 0 } })
    if (d === null) { gaps.push(i); return }
    events.push({ step: i, start: i, duration: 0.95, voice: 'difference', freqHz: quant(semitoneMap(d, spec.diff.domain, spec.diff.freqRange)), gain: 0.7, pan: 0, brightness: 0.5, basis: { measure: spec.diff.measure, value: d } })
  })
  return {
    phenomenonId: spec.phenomenonId, mode: settings.mode, intensity: settings.intensity, track: 'measured',
    fingerprint: settingsHash({ mode, a: sA.fingerprint, b: sB.fingerprint, kind: 'difference' }), stepCount: c.length,
    stepLabels: Array.from({ length: c.length }, (_, i) => `${c.labelsA[i] ?? '—'} → ${c.labelsB[i] ?? '—'}`),
    voices: [{ id: 'reference', label: 'Reference tone', waveform: 'sine' }, { id: 'difference', label: 'Difference voice', waveform: 'triangle' }],
    events, gaps,
    legend: [{ voice: 'Reference tone', text: 'A steady quiet tone: where the difference voice sits when the two periods are equal.' }, { voice: 'Difference voice', text: spec.diff.explain }],
  }
}

/** Text for one position while listening to a comparison (the caption and describe-now action use this). */
export function momentText(c: Comparison, mode: ComparisonMode, step: number, lenA: number): string {
  const fmt = (v: number | null) => (v === null ? 'no data' : `${formatNumber(v, Math.abs(v) >= 100 ? 0 : 2)} ${c.units}`)
  if (mode === 'sequential') {
    if (step === lenA) return 'A silent step between period A and period B.'
    const inA = step < lenA
    const i = inA ? step : step - lenA - 1
    return `${inA ? 'Period A' : 'Period B'}, ${(inA ? c.labelsA : c.labelsB)[i] ?? '—'}: ${fmt((inA ? c.a : c.b)[i] ?? null)}.`
  }
  return `Position ${step + 1}. Period A (${c.labelsA[step] ?? '—'}): ${fmt(c.a[step] ?? null)}. Period B (${c.labelsB[step] ?? '—'}): ${fmt(c.b[step] ?? null)}. Difference, B minus A: ${fmt(c.diff[step] ?? null)}.`
}
