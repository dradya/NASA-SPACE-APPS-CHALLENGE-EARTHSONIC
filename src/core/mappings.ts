// The documented sound mappings. Each MappingSpec is DATA: the same object builds the score, drives the on-screen
// legend, and generates docs/SONIFICATION_MAPPINGS.md (tests fail if the doc drifts).
// Domains are fixed reference ranges chosen for the physical quantity, NOT taken from the selected dates, so two periods
// can be compared by ear. Values outside a domain are clamped (the caption says so).
import type { MappingSpec, PhenomenonId, VoiceSpec } from './types.ts'
import { semitoneMap } from './series.ts'

/** Every pitch stays inside this band, so no mapping can produce a piercing or inaudible tone. */
export const SAFE_BAND: readonly [number, number] = [110, 1760]

const PULSE_HZ = 1046.5 // C6: short, quiet tick whose COUNT per step carries the rate of change
const RECORD_HZ = 1318.5 // E6: bell for a new record

function drone(measure: string, domain: [number, number], freqRange: [number, number], label: string): VoiceSpec {
  return {
    id: 'reference', label: 'Reference tone', role: label, waveform: 'sine', pan: 0, gain: 0.22, brightness: 0.2,
    fixedFreqHz: semitoneMap(0, domain, freqRange),
    explain: [`A steady quiet tone at the pitch where the main voice sits when the value is 0 (${measure}), so you can hear distance from it.`],
  }
}

const TEMPERATURE: MappingSpec = {
  id: 'global-temperature', phenomenonId: 'global-temperature', version: 1,
  voices: [
    drone('anomaly 0 °C', [-0.6, 1.6], [196, 784], 'Baseline: the 1951–1980 average (anomaly = 0).'),
    {
      id: 'global', label: 'Global voice', role: 'Global average temperature anomaly.', waveform: 'triangle', pan: 0, gain: 0.65,
      brightness: { measure: 'global', domain: [-0.6, 1.6], range: [0.15, 0.95] },
      pitch: { measure: 'global', domain: [-0.6, 1.6], freqRange: [196, 784] },
      explain: ['Pitch: −0.6 °C is G3 (196 Hz) and +1.6 °C is G5 (784 Hz). Each step up in pitch is a warmer year; pitch moves in equal musical intervals for equal temperature steps.', 'Brightness: warmer years also sound brighter (more overtones), so temperature is heard twice, in pitch and in tone colour.'],
    },
    {
      id: 'arctic', label: 'Arctic voice', role: 'Anomaly of the Arctic (64°N–90°N), right ear, higher register.', waveform: 'sine', pan: 0.45, gain: 0.35, brightness: 0.4,
      pitch: { measure: 'arctic', domain: [-1.5, 4], freqRange: [392, 1568] },
      explain: ['Pitch: −1.5 °C is G4 (392 Hz) and +4 °C is G6 (1568 Hz). The Arctic warms faster than the globe, so this voice climbs further.', 'Stereo: right ear, only to tell the voices apart.'],
    },
    {
      id: 'tropics', label: 'Tropics voice', role: 'Anomaly of the tropics (24°S–24°N), left ear, lower register.', waveform: 'sine', pan: -0.45, gain: 0.35, brightness: 0.4,
      pitch: { measure: 'tropics', domain: [-0.6, 1.6], freqRange: [130.81, 523.25] },
      explain: ['Pitch: −0.6 °C is C3 (131 Hz) and +1.6 °C is C5 (523 Hz).', 'Stereo: left ear, only to tell the voices apart.'],
    },
    {
      id: 'pulse', label: 'Rate pulses', role: 'How fast the world is warming.', waveform: 'sine', pan: 0, gain: 0.28, brightness: 0.5,
      fixedFreqHz: PULSE_HZ, pulses: { measure: 'rate', domain: [0, 0.4], range: [0, 4] },
      explain: ['Rhythm: 0 °C per decade gives no pulses; 0.4 °C per decade gives 4 quick pulses per year. A busier rhythm means faster warming. (Playback speed is a separate control.)'],
    },
    {
      id: 'record', label: 'Record bell', role: 'A new warmest year on record.', waveform: 'triangle', pan: 0, gain: 0.8, brightness: 0.7,
      fixedFreqHz: RECORD_HZ, explain: ['A bell rings in any year warmer than every year before it.'],
    },
  ],
  accent: { measure: 'global', kind: 'high', voiceId: 'record', explain: 'Record years (warmer than all earlier years) get a bell.' },
  diff: { measure: 'global', domain: [-1, 1], freqRange: [196, 784], explain: 'Difference voice: pitch above the reference tone means period B was warmer than period A at the same position; below means cooler. ±1 °C spans two octaves.' },
}

const SEA_LEVEL: MappingSpec = {
  id: 'sea-level', phenomenonId: 'sea-level', version: 1,
  voices: [
    drone('0 mm rise', [-10, 140], [196, 784], 'Starting level: the first complete year of the record (rise = 0 mm).'),
    {
      id: 'level', label: 'Sea level voice', role: 'Global mean sea level rise since the first year.', waveform: 'triangle', pan: 0, gain: 0.65,
      brightness: { measure: 'rise', domain: [-10, 140], range: [0.15, 0.95] },
      pitch: { measure: 'rise', domain: [-10, 140], freqRange: [196, 784] },
      explain: ['Pitch: −10 mm is G3 (196 Hz) and +140 mm is G5 (784 Hz). Higher pitch means higher global sea level.', 'Brightness: a higher sea level also sounds brighter (more overtones).'],
    },
    {
      id: 'pulse', label: 'Rate pulses', role: 'How fast sea level is rising.', waveform: 'sine', pan: 0, gain: 0.28, brightness: 0.5,
      fixedFreqHz: PULSE_HZ, pulses: { measure: 'rate', domain: [0, 6], range: [0, 4] },
      explain: ['Rhythm: 0 mm per year gives no pulses; 6 mm per year gives 4 quick pulses per year. A busier rhythm means faster rise.'],
    },
  ],
  diff: { measure: 'rise', domain: [-60, 60], freqRange: [196, 784], explain: 'Difference voice: pitch above the reference tone means period B had higher sea level than period A at the same position. ±60 mm spans two octaves.' },
}

const SEA_ICE: MappingSpec = {
  id: 'sea-ice', phenomenonId: 'sea-ice', version: 1,
  voices: [
    {
      id: 'march', label: 'March maximum', role: 'Arctic sea ice extent in March, the yearly maximum, left of centre.', waveform: 'triangle', pan: -0.3, gain: 0.5, brightness: 0.45,
      pitch: { measure: 'march', domain: [13, 16.8], freqRange: [261.63, 1046.5] },
      explain: ['Pitch: 13 million km² is C4 (262 Hz) and 16.8 million km² is C6 (1047 Hz). Less ice sounds lower.', 'Stereo: left of centre, only to tell the voices apart.'],
    },
    {
      id: 'september', label: 'September minimum', role: 'Arctic sea ice extent in September, the yearly minimum, right of centre.', waveform: 'sine', pan: 0.3, gain: 0.6, brightness: 0.4,
      pitch: { measure: 'september', domain: [3, 8], freqRange: [130.81, 523.25] },
      explain: ['Pitch: 3 million km² is C3 (131 Hz) and 8 million km² is C5 (523 Hz). Less ice sounds lower.', 'Stereo: right of centre, only to tell the voices apart.'],
    },
    {
      id: 'pulse', label: 'Rate pulses', role: 'How fast the September ice extent is changing (size of the change, losing or gaining).', waveform: 'sine', pan: 0, gain: 0.28, brightness: 0.5,
      fixedFreqHz: PULSE_HZ, pulses: { measure: 'rate', domain: [0, 1.2], range: [0, 4], abs: true },
      explain: ['Rhythm: no change gives no pulses; a change of 1.2 million km² per decade (up or down) gives 4 quick pulses per year.'],
    },
    {
      id: 'record', label: 'Record-low bell', role: 'A new lowest September extent on record.', waveform: 'triangle', pan: 0, gain: 0.8, brightness: 0.7,
      fixedFreqHz: RECORD_HZ, explain: ['A bell rings in any year with less September ice than every year before it.'],
    },
  ],
  accent: { measure: 'september', kind: 'low', voiceId: 'record', explain: 'New record-low Septembers get a bell.' },
  diff: { measure: 'september', domain: [-3, 3], freqRange: [196, 784], explain: 'Difference voice: pitch above the reference tone means period B had MORE September ice than period A at the same position; below means less. ±3 million km² spans two octaves.' },
}

const VEGETATION: MappingSpec = {
  id: 'vegetation', phenomenonId: 'vegetation', version: 1,
  voices: [
    {
      id: 'canopy', label: 'Greenness voice', role: 'Vegetation greenness (NDVI) of each 16-day composite.', waveform: 'sawtooth', pan: 0, gain: 0.55,
      brightness: { measure: 'ndvi', domain: [0.1, 0.9], range: [0.1, 1] },
      pitch: { measure: 'ndvi', domain: [0, 0.9], freqRange: [110, 440] },
      explain: ['Pitch: NDVI 0 is A2 (110 Hz) and 0.9 is A4 (440 Hz).', 'Harmonic richness: greener land sounds richer. The tone starts nearly pure at NDVI 0.1 and gains more overtones (a brighter, fuller sound) as NDVI rises to 0.9.'],
    },
    {
      id: 'change', label: 'Change voice', role: 'Greening or browning since the previous composite, right ear.', waveform: 'sine', pan: 0.4, gain: 0.3, brightness: 0.4,
      pitch: { measure: 'change', domain: [-0.1, 0.1], freqRange: [329.63, 659.25] },
      pulses: { measure: 'change', domain: [0, 0.08], range: [0, 3], abs: true },
      explain: ['Pitch: falling NDVI sounds lower (E4, 330 Hz at −0.1) and rising NDVI higher (E5, 659 Hz at +0.1).', 'Rhythm: the bigger the change, the more pulses (up to 3 per composite).', 'Stereo: right ear, only to tell the voices apart.'],
    },
  ],
  diff: { measure: 'ndvi', domain: [-0.5, 0.5], freqRange: [146.83, 587.33], explain: 'Difference voice: pitch above the reference tone means the later period was greener than the earlier one at the same position; below means less green. ±0.5 NDVI spans two octaves.' },
}

export const MAPPINGS: Record<PhenomenonId, MappingSpec> = {
  'global-temperature': TEMPERATURE,
  'sea-level': SEA_LEVEL,
  'sea-ice': SEA_ICE,
  vegetation: VEGETATION,
}

export function mappingFor(id: PhenomenonId): MappingSpec {
  return MAPPINGS[id]
}

/** Nearest note of the C major pentatonic scale (C D E G A), in any octave. Used by the Musical listening mode. */
export function quantizeToPentatonic(freqHz: number): number {
  const midi = 69 + 12 * Math.log2(freqHz / 440)
  const allowed = new Set([0, 2, 4, 7, 9])
  let best = Math.round(midi)
  let bestDist = Infinity
  for (let m = Math.floor(midi) - 3; m <= Math.ceil(midi) + 3; m++) {
    if (!allowed.has(((m % 12) + 12) % 12)) continue
    const d = Math.abs(m - midi)
    if (d < bestDist - 1e-9) { best = m; bestDist = d }
  }
  return 440 * Math.pow(2, (best - 69) / 12)
}
