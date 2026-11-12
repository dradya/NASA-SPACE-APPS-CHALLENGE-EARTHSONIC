// Shared contracts for EARTHSONIC. Type-only: no runtime code, no imports.
// Changes are logged in docs/ARCHITECTURE.md (decision D31 replaced the Phase-2 draft contracts with these concrete ones).

export type PhenomenonId = 'global-temperature' | 'sea-level' | 'sea-ice' | 'vegetation'

// --- data ------------------------------------------------------------------------------------
/** 'real' = parsed from a NASA file. 'demo' = synthetic pattern, never NASA measurements. */
export type DataStatus = 'real' | 'demo'
export type DataOrigin = 'snapshot' | 'live' | 'file' | 'demo'

export interface DatasetStep {
  /** What the listener and screen reader see, e.g. "1993" or "2020-02-18". */
  label: string
  /** ISO date of the start of the step; empty string for demo data. */
  iso: string
}

export interface Measure {
  id: string
  label: string
  units: string
  /** null = missing or invalid. Never invented, never silently interpolated. */
  values: (number | null)[]
  /** Plain-language recipe when this measure is computed from another one. */
  derived?: string
}

export interface DatasetProvenance {
  sourceName: string
  sourceUrl: string
  origin: DataOrigin
  /** UTC time the file was retrieved or loaded; null for demo data. */
  retrievedUtc: string | null
  fileName: string | null
  sha256: string | null
}

export interface Dataset {
  phenomenonId: PhenomenonId
  status: DataStatus
  /** One step means this, for example "one calendar year". */
  stepUnit: string
  steps: DatasetStep[]
  measures: Record<string, Measure>
  /** Id of the measure shown first in charts and used for records and comparisons. */
  primary: string
  provenance: DatasetProvenance
  /** Caveats discovered while building the dataset (excluded years, thresholds, ...). */
  notes: string[]
}

export interface DataLoadError {
  kind: 'network' | 'http' | 'parse' | 'validation' | 'unavailable'
  retryable: boolean
  message: string
  /** True when the user can fix this by choosing a NASA file they downloaded. */
  needsFile?: boolean
}

// --- sonification ----------------------------------------------------------------------------
export type Waveform = 'sine' | 'triangle' | 'sawtooth' | 'square'

/** Pitch is linear in semitones between the two frequencies, so equal data steps sound like equal musical intervals. */
export interface PitchMap {
  measure: string
  domain: [number, number]
  freqRange: [number, number]
}

export interface UnitMap {
  measure: string
  domain: [number, number]
  range: [number, number]
}

export interface PulseMap {
  measure: string
  domain: [number, number]
  /** Pulses per data step at the two ends of the domain (rounded to whole pulses). */
  range: [number, number]
  /** Use the size of the value and ignore its sign. */
  abs?: boolean
}

export interface VoiceSpec {
  id: string
  label: string
  /** What this voice stands for, in plain language. */
  role: string
  waveform: Waveform
  /** Stereo position, -1 (left) to 1 (right). Only separates voices; it carries no data. */
  pan: number
  gain: number | UnitMap
  brightness: number | UnitMap
  pitch?: PitchMap
  fixedFreqHz?: number
  pulses?: PulseMap
  /** One plain-language sentence per mapped sound dimension. */
  explain: string[]
}

export interface AccentSpec {
  measure: string
  /** 'high' = a value above every earlier value; 'low' = below every earlier value. */
  kind: 'high' | 'low'
  voiceId: string
  explain: string
}

export interface DiffSpec {
  measure: string
  domain: [number, number]
  freqRange: [number, number]
  explain: string
}

export interface MappingSpec {
  id: string
  phenomenonId: PhenomenonId
  version: number
  voices: VoiceSpec[]
  accent?: AccentSpec
  diff: DiffSpec
}

export type ListeningMode = 'scientific' | 'musical'

export interface ScoreSettings {
  mode: ListeningMode
  /** 0..1. Scales loudness and brightness contrast; never changes pitch. 0.5 leaves events unchanged. */
  intensity: number
}

export interface ScoreEvent {
  /** Step (relative to the start of the score) this event belongs to. */
  step: number
  /** In steps from the start of the score. */
  start: number
  /** In steps. */
  duration: number
  voice: string
  freqHz: number
  gain: number
  pan: number
  brightness: number
  accent?: boolean
  /** The number that produced this sound. */
  basis: { measure: string; value: number | null }
}

export interface ScoreVoice {
  id: string
  label: string
  waveform: Waveform
}

export interface Score {
  phenomenonId: PhenomenonId
  mode: ListeningMode
  intensity: number
  track: 'measured'
  /** Fingerprint of data + mapping + settings. Same fingerprint means identical events. */
  fingerprint: string
  stepCount: number
  stepLabels: string[]
  voices: ScoreVoice[]
  events: ScoreEvent[]
  /** Steps with no data: silence, never interpolation. */
  gaps: number[]
  legend: { voice: string; text: string }[]
}

// --- playback --------------------------------------------------------------------------------
export type PlaybackStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'error'

export interface PlaybackState {
  status: PlaybackStatus
  /** Index of the step currently sounding (floored position). */
  step: number
  stepCount: number
  speed: number
  loop: boolean
  volume: number
  intensity: number
  mode: ListeningMode
  error: string | null
}
