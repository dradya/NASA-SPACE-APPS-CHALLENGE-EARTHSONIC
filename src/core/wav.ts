// Offline sound renderer: Score -> stereo PCM -> 16-bit WAV bytes. Pure TypeScript, deterministic.
// Used for (1) downloadable audio files (the "playlist" form of the challenge), and (2) tests that listen to the output
// and check that the pitch really follows the data. Live playback uses Tone.js synths for the same notes.
import type { Score, Waveform } from './types.ts'
import { clamp } from './series.ts'
import { shapeEvent } from './score.ts'

export interface RenderOptions {
  sampleRate?: number
  secondsPerStep?: number
  intensity?: number
  tailSeconds?: number
}

export interface Pcm {
  sampleRate: number
  left: Float32Array
  right: Float32Array
}

/** Relative amplitude of harmonic k for each waveform (k starts at 1). */
function harmonic(wave: Waveform, k: number): number {
  switch (wave) {
    case 'sine': return k === 1 ? 1 : 0
    case 'triangle': return k % 2 === 1 ? 1 / (k * k) : 0
    case 'square': return k % 2 === 1 ? 1 / k : 0
    case 'sawtooth': return 1 / k
  }
}

export function renderScore(score: Score, opts: RenderOptions = {}): Pcm {
  const sr = opts.sampleRate ?? 22050
  const sps = opts.secondsPerStep ?? 0.5
  const intensity = opts.intensity ?? score.intensity
  const total = Math.ceil((score.stepCount * sps + (opts.tailSeconds ?? 0.6)) * sr)
  const left = new Float32Array(total)
  const right = new Float32Array(total)
  const wave = new Map(score.voices.map((v) => [v.id, v.waveform]))
  const attack = Math.round(0.015 * sr)
  const release = Math.round(0.12 * sr)

  for (const raw of score.events) {
    const ev = shapeEvent(raw, intensity)
    const w = wave.get(ev.voice) ?? 'sine'
    const start = Math.round(ev.start * sps * sr)
    const body = Math.max(1, Math.round(ev.duration * sps * sr))
    const len = Math.min(body + release, total - start)
    if (len <= 0) continue
    // Brightness decides how many overtones are present: 1 (pure) to 8 (rich). Overtones above 8 kHz are skipped.
    const partials: { k: number; a: number }[] = []
    const count = 1 + Math.round(ev.brightness * 7)
    for (let k = 1; k <= count * 2 && partials.length < count; k++) {
      const a = harmonic(w, k)
      if (a > 0 && ev.freqHz * k < Math.min(8000, sr * 0.45)) partials.push({ k, a })
    }
    const norm = partials.reduce((s, p) => s + p.a, 0) || 1
    const amp = (ev.gain * 0.3) / norm
    const theta = ((clamp(ev.pan, -1, 1) + 1) * Math.PI) / 4
    const gl = Math.cos(theta)
    const gr = Math.sin(theta)
    const w0 = (2 * Math.PI * ev.freqHz) / sr
    for (let i = 0; i < len; i++) {
      let env = 1
      if (i < attack) env = i / attack
      if (i > body) env *= Math.max(0, 1 - (i - body) / release)
      let s = 0
      for (const p of partials) s += p.a * Math.sin(w0 * p.k * i)
      s *= amp * env
      left[start + i] += s * gl
      right[start + i] += s * gr
    }
  }
  // Gentle soft clipping, then scale so the loudest sample sits at 0.9 (never clips, never harsh).
  let peak = 0
  for (let i = 0; i < total; i++) {
    left[i] = Math.tanh(left[i] * 1.5)
    right[i] = Math.tanh(right[i] * 1.5)
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]))
  }
  if (peak > 0) {
    const g = 0.9 / peak
    for (let i = 0; i < total; i++) { left[i] *= g; right[i] *= g }
  }
  return { sampleRate: sr, left, right }
}

/** 16-bit stereo PCM WAV file bytes. */
export function encodeWav16(pcm: Pcm): Uint8Array {
  const n = pcm.left.length
  const dataBytes = n * 4
  const buf = new ArrayBuffer(44 + dataBytes)
  const v = new DataView(buf)
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + dataBytes, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true)
  v.setUint32(24, pcm.sampleRate, true); v.setUint32(28, pcm.sampleRate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, dataBytes, true)
  for (let i = 0; i < n; i++) {
    v.setInt16(44 + i * 4, Math.round(clamp(pcm.left[i], -1, 1) * 32767), true)
    v.setInt16(46 + i * 4, Math.round(clamp(pcm.right[i], -1, 1) * 32767), true)
  }
  return new Uint8Array(buf)
}
