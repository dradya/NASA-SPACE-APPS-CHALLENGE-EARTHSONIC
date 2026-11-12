// Text equivalents of the sound: what is playing, why, and in plain words. Used for the live caption, the describe-now
// action and screen readers. Built from the same evaluateStep() as the sound, so the words always match what you hear.
import type { Dataset, MappingSpec, ScoreSettings } from './types.ts'
import { formatNumber } from './series.ts'
import { evaluateStep } from './score.ts'

const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

export function noteName(freqHz: number): string {
  const midi = Math.round(69 + 12 * Math.log2(freqHz / 440))
  return `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`
}

export function formatValue(v: number, units: string): string {
  return `${formatNumber(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2)} ${units}`
}

/** "0.45 °C warmer than the 1951–1980 average" for baseline-relative values; plain "value units" otherwise. */
export function plainValue(units: string, v: number): string {
  const m = /^°C vs (\d{4}–\d{4})$/.exec(units)
  if (!m) return formatValue(v, units)
  if (Math.abs(v) < 0.005) return `the same as the ${m[1]} average`
  return `${formatNumber(Math.abs(v), 2)} °C ${v > 0 ? 'warmer' : 'cooler'} than the ${m[1]} average`
}

export interface StepDescription {
  headline: string
  lines: string[]
  /** Headline and lines as one text, for a live region. */
  text: string
}

export function describeStep(ds: Dataset, spec: MappingSpec, g: number, settings: ScoreSettings): StepDescription {
  const label = ds.steps[g]?.label ?? ''
  const { frames, record } = evaluateStep(ds, spec, g, settings.mode)
  const lines: string[] = []
  for (const f of frames) {
    const m = f.measure ? ds.measures[f.measure] : null
    if (f.voice.fixedFreqHz !== undefined && !f.voice.pulses && f.voice.pitch === undefined) {
      lines.push(`${f.voice.label}: steady tone at ${noteName(f.freqHz ?? 0)}.`)
      continue
    }
    if (m && f.value === null) { lines.push(`${f.voice.label}: no data for this step, so it is silent.`); continue }
    if (f.voice.pulses && f.voice.pitch === undefined) {
      lines.push(f.pulses === 0 ? `${f.voice.label}: no pulses (${m ? m.label : ''} ${m && f.value !== null ? formatValue(f.value, m.units) : ''}).`.replace(/\s+\)/, ')') : `${f.voice.label}: ${f.pulses} pulse${f.pulses === 1 ? '' : 's'} this step (${m?.label} ${formatValue(f.value as number, m?.units ?? '')}).`)
      continue
    }
    if (m && f.value !== null && f.freqHz !== null) {
      const pulses = f.voice.pulses ? `, ${f.pulses} pulse${f.pulses === 1 ? '' : 's'}` : ''
      lines.push(`${f.voice.label}: ${m.label} ${m.units.startsWith('°C vs') ? `(${plainValue(m.units, f.value)})` : formatValue(f.value, m.units)}, sounding ${noteName(f.freqHz)} (${Math.round(f.freqHz)} Hz)${pulses}${f.clamped ? '; beyond the mapped range, so held at the end of the scale' : ''}.`)
    }
  }
  if (record && spec.accent) lines.push(`Record bell: ${spec.accent.explain.replace(/\.$/, '')}.`)
  const headline = ds.status === 'demo' ? `${label} (demo data)` : label
  return { headline, lines, text: `${headline}. ${lines.join(' ')}` }
}

export function describeDataset(ds: Dataset): string {
  const m = ds.measures[ds.primary]
  const pts = m.values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null)
  if (pts.length === 0) return `${m.label}: no values.`
  const lo = pts.reduce((a, b) => (b.v < a.v ? b : a))
  const hi = pts.reduce((a, b) => (b.v > a.v ? b : a))
  const first = ds.steps[0].label
  const last = ds.steps[ds.steps.length - 1].label
  const prefix = ds.status === 'demo' ? 'DEMO DATA (synthetic, not NASA). ' : ''
  return `${prefix}${m.label}: ${ds.steps.length} steps (${ds.stepUnit}) from ${first} to ${last}. Lowest ${formatValue(lo.v, m.units)} at ${ds.steps[lo.i].label}; highest ${formatValue(hi.v, m.units)} at ${ds.steps[hi.i].label}; latest ${formatValue(pts[pts.length - 1].v, m.units)} at ${ds.steps[pts[pts.length - 1].i].label}.`
}
