// Pure helpers shared by the Tone.js backend and tests (no audio library imported here).
import { clamp } from '../core/series.ts'

/** Brightness 0..1 -> low-pass cutoff 400 Hz..8 kHz (exponential, so equal steps sound even). */
export function brightnessToCutoffHz(brightness: number): number {
  return 400 * Math.pow(20, clamp(brightness, 0, 1))
}

/** The volume slider is perceptual: gain follows the square of the slider, so the low end is usable. */
export function volumeToGain(volume: number): number {
  const v = clamp(volume, 0, 1)
  return v * v
}

/** Where the output meters and scopes read from (implemented by the Tone backend). */
export interface AnalysisSource {
  getWaveform(): Float32Array | null
  /** Magnitudes in decibels per frequency bin. */
  getSpectrum(): Float32Array | null
}
