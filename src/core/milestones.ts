// "Jump to" points computed from the data itself (first and latest value, extremes, record years, the end of a baseline period).
// Nothing is hard-coded: every milestone says which step it is and why.
import type { Dataset, MappingSpec } from './types.ts'
import { runningRecords } from './series.ts'

export interface Milestone {
  step: number
  label: string
  reason: string
}

export function milestonesFor(ds: Dataset, spec: MappingSpec): Milestone[] {
  const found = new Map<number, string[]>()
  const add = (step: number, reason: string) => found.set(step, [...(found.get(step) ?? []), reason])
  const prim = ds.measures[ds.primary].values
  const valid = prim.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null)
  if (valid.length === 0) return []
  add(valid[0].i, 'start of the record')
  add(valid[valid.length - 1].i, 'latest value')
  const lo = valid.reduce((a, b) => (b.v < a.v ? b : a))
  const hi = valid.reduce((a, b) => (b.v > a.v ? b : a))
  if (lo.i !== hi.i) {
    add(lo.i, `lowest ${ds.measures[ds.primary].label.toLowerCase()}`)
    add(hi.i, `highest ${ds.measures[ds.primary].label.toLowerCase()}`)
  }
  if (spec.accent && ds.measures[spec.accent.measure]) {
    const recs = runningRecords(ds.measures[spec.accent.measure].values, spec.accent.kind).map((r, i) => (r ? i : -1)).filter((i) => i >= 0)
    if (recs.length > 0) add(recs[recs.length - 1], spec.accent.kind === 'high' ? 'most recent record high' : 'most recent record low')
  }
  if (ds.phenomenonId === 'global-temperature' && ds.status === 'real') {
    const base = ds.steps.findIndex((s) => s.label === '1980')
    if (base >= 0) add(base, 'end of the 1951–1980 baseline period')
  }
  if (ds.measures.rate) {
    const rates = ds.measures.rate.values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null)
    if (rates.length > 0 && ds.phenomenonId === 'sea-level') add(rates.reduce((a, b) => (b.v > a.v ? b : a)).i, 'fastest rise (5-year trend)')
  }
  return [...found.entries()].sort((a, b) => a[0] - b[0]).map(([step, reasons]) => ({ step, label: ds.steps[step].label, reason: reasons.join('; ') }))
}
