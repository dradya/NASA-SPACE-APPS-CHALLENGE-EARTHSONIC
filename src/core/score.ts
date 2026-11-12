// Deterministic sonification: Dataset + MappingSpec + settings -> Score (a list of timed notes).
// Pure function: no randomness, no clock. Same inputs always give identical events (see fingerprint).
import type { Dataset, MappingSpec, Score, ScoreEvent, ScoreSettings, UnitMap, VoiceSpec } from './types.ts'
import { clamp, mapRange, runningRecords, semitoneMap } from './series.ts'
import { SAFE_BAND, quantizeToPentatonic } from './mappings.ts'
import { settingsHash } from './hash.ts'

export interface StepRange {
  from: number
  /** Exclusive. */
  to: number
}

export interface VoiceFrame {
  voice: VoiceSpec
  /** The value that decided this voice's sound (null when missing). */
  value: number | null
  measure: string | null
  silent: boolean
  freqHz: number | null
  gain: number
  brightness: number
  pulses: number
  /** True when the value was outside the mapped range and held at its end. */
  clamped: boolean
}

function measuresOf(voice: VoiceSpec): string[] {
  const m: string[] = []
  if (voice.pitch) m.push(voice.pitch.measure)
  if (voice.pulses) m.push(voice.pulses.measure)
  if (typeof voice.gain !== 'number') m.push(voice.gain.measure)
  if (typeof voice.brightness !== 'number') m.push(voice.brightness.measure)
  return m
}

/** A voice is available when every measure it needs exists in the dataset (for example the latitude bands may be absent). */
export function voiceAvailable(ds: Dataset, voice: VoiceSpec): boolean {
  return measuresOf(voice).every((id) => ds.measures[id] !== undefined)
}

function unit(ds: Dataset, m: number | UnitMap, g: number): number {
  if (typeof m === 'number') return m
  const v = ds.measures[m.measure].values[g]
  return v === null ? (m.range[0] + m.range[1]) / 2 : mapRange(v, m.domain, m.range)
}

export function evaluateVoice(ds: Dataset, voice: VoiceSpec, g: number, mode: ScoreSettings['mode']): VoiceFrame {
  const basisMeasure = voice.pitch?.measure ?? voice.pulses?.measure ?? null
  const value = basisMeasure ? ds.measures[basisMeasure].values[g] : null
  const frame: VoiceFrame = {
    voice, value, measure: basisMeasure, silent: false, freqHz: null,
    gain: clamp(unit(ds, voice.gain, g), 0, 1), brightness: clamp(unit(ds, voice.brightness, g), 0, 1), pulses: 0, clamped: false,
  }
  if (voice.pulses) {
    const pv = ds.measures[voice.pulses.measure].values[g]
    frame.pulses = pv === null ? 0 : Math.round(mapRange(voice.pulses.abs ? Math.abs(pv) : pv, voice.pulses.domain, voice.pulses.range))
    if (voice.pitch === undefined) frame.value = pv
  }
  if (basisMeasure && value === null) frame.silent = true
  if (voice.pitch) {
    if (value !== null) {
      const [d0, d1] = voice.pitch.domain
      frame.clamped = value < Math.min(d0, d1) || value > Math.max(d0, d1)
      frame.freqHz = semitoneMap(value, voice.pitch.domain, voice.pitch.freqRange)
    }
  } else {
    frame.freqHz = voice.fixedFreqHz ?? null
  }
  if (frame.freqHz !== null) {
    if (mode === 'musical') frame.freqHz = quantizeToPentatonic(frame.freqHz)
    frame.freqHz = clamp(frame.freqHz, SAFE_BAND[0], SAFE_BAND[1])
  }
  if (voice.pulses && frame.pulses === 0) frame.silent = true
  return frame
}

export function recordSteps(ds: Dataset, spec: MappingSpec): boolean[] {
  const a = spec.accent
  if (!a || !ds.measures[a.measure]) return ds.steps.map(() => false)
  return runningRecords(ds.measures[a.measure].values, a.kind)
}

/** Everything that sounds at dataset step g, plus whether it is a record step. Used by buildScore and by the text descriptions. */
export function evaluateStep(ds: Dataset, spec: MappingSpec, g: number, mode: ScoreSettings['mode']) {
  const accentVoice = spec.accent?.voiceId
  const frames = spec.voices
    .filter((v) => v.id !== accentVoice && voiceAvailable(ds, v))
    .map((v) => evaluateVoice(ds, v, g, mode))
  const record = recordSteps(ds, spec)[g] === true
  return { frames, record }
}

function usedMeasures(ds: Dataset, spec: MappingSpec): string[] {
  const ids = new Set<string>()
  for (const v of spec.voices) for (const m of measuresOf(v)) ids.add(m)
  if (spec.accent) ids.add(spec.accent.measure)
  return [...ids].filter((id) => ds.measures[id]).sort()
}

export function buildScore(ds: Dataset, spec: MappingSpec, range: StepRange, settings: ScoreSettings): Score {
  if (!(range.from >= 0 && range.to > range.from && range.to <= ds.steps.length)) {
    throw new RangeError(`Step range ${range.from}..${range.to} is outside the dataset (${ds.steps.length} steps).`)
  }
  const n = range.to - range.from
  const activeVoices = spec.voices.filter((v) => voiceAvailable(ds, v))
  const accentVoice = spec.accent ? activeVoices.find((v) => v.id === spec.accent?.voiceId) : undefined
  const records = recordSteps(ds, spec)
  const events: ScoreEvent[] = []
  const gaps: number[] = []
  const primary = ds.measures[ds.primary].values

  for (let i = 0; i < n; i++) {
    const g = range.from + i
    if (primary[g] === null) gaps.push(i)
    for (const frame of evaluateStep(ds, spec, g, settings.mode).frames) {
      if (frame.silent || frame.freqHz === null) continue
      const base = { voice: frame.voice.id, freqHz: frame.freqHz, gain: frame.gain, pan: frame.voice.pan, brightness: frame.brightness, basis: { measure: frame.measure ?? '', value: frame.value } }
      if (frame.voice.pulses) {
        const count = frame.pulses
        for (let k = 0; k < count; k++) events.push({ step: i, start: i + k / count, duration: Math.min(0.4, 0.8 / count), ...base })
      } else {
        events.push({ step: i, start: i, duration: 0.95, ...base })
      }
    }
    if (accentVoice && records[g] && accentVoice.fixedFreqHz !== undefined) {
      const f = mapFreq(accentVoice.fixedFreqHz, settings.mode)
      events.push({ step: i, start: i, duration: 0.6, voice: accentVoice.id, freqHz: f, gain: accentVoice.gain as number, pan: accentVoice.pan, brightness: accentVoice.brightness as number, accent: true, basis: { measure: spec.accent?.measure ?? '', value: ds.measures[spec.accent?.measure ?? ''].values[g] } })
    }
  }
  events.sort((a, b) => a.start - b.start || (a.voice < b.voice ? -1 : a.voice > b.voice ? 1 : 0))

  const data: Record<string, (number | null)[]> = {}
  for (const id of usedMeasures(ds, spec)) data[id] = ds.measures[id].values.slice(range.from, range.to)
  const legend = activeVoices.map((v) => ({ voice: v.label, text: `${v.role} ${v.explain.join(' ')}` }))
  if (spec.accent && accentVoice) legend.push({ voice: accentVoice.label, text: spec.accent.explain })
  return {
    phenomenonId: spec.phenomenonId, mode: settings.mode, intensity: settings.intensity, track: 'measured',
    fingerprint: settingsHash({ spec, mode: settings.mode, labels: ds.steps.slice(range.from, range.to).map((s) => s.label), data }),
    stepCount: n, stepLabels: ds.steps.slice(range.from, range.to).map((s) => s.label),
    voices: activeVoices.map((v) => ({ id: v.id, label: v.label, waveform: v.waveform })), events, gaps, legend,
  }
}

function mapFreq(f: number, mode: ScoreSettings['mode']): number {
  return clamp(mode === 'musical' ? quantizeToPentatonic(f) : f, SAFE_BAND[0], SAFE_BAND[1])
}

/**
 * Intensity changes loudness and brightness contrast around a neutral middle, never pitch.
 * k = 0.25 + 1.5 * intensity, so intensity 0.5 (k = 1) leaves events unchanged.
 */
export function shapeEvent(ev: ScoreEvent, intensity: number): ScoreEvent {
  const k = 0.25 + 1.5 * clamp(intensity, 0, 1)
  if (Math.abs(k - 1) < 1e-12) return ev // neutral: return the event exactly, with no floating-point drift
  return { ...ev, gain: clamp(0.5 + (ev.gain - 0.5) * k, 0, 1), brightness: clamp(0.5 + (ev.brightness - 0.5) * k, 0, 1) }
}
