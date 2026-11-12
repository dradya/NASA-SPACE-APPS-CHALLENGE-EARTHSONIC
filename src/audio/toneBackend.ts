// Live playback with Tone.js (on the Web Audio API). Implements the library-independent AudioBackend from core/playback.
// Tone is loaded only when the user first presses Play (browsers require a user gesture to start audio anyway), so the
// rest of the app, and the tests, never load it. Signal path:
//   voice synth -> low-pass filter (brightness) -> panner -> master gain (volume, soft start) -> limiter -> speakers (+ analysers)
import type { AudioBackend, NoteCommand } from '../core/playback.ts'
import type { ScoreVoice } from '../core/types.ts'
import { brightnessToCutoffHz, volumeToGain, type AnalysisSource } from './audioMath.ts'

// The small part of Tone's API used here, described locally so this file does not depend on Tone's type definitions.
interface Param { setValueAtTime(v: number, t: number): unknown; rampTo(v: number, seconds: number): unknown; cancelScheduledValues(t: number): unknown }
interface Node { connect(dest: unknown): unknown; dispose(): unknown }
interface Synth extends Node { triggerAttackRelease(freq: number, dur: number, time: number, velocity: number): unknown; releaseAll(time?: number): unknown }
interface ToneLib {
  start(): Promise<void>
  now(): number
  Synth: unknown
  PolySynth: new (voice: unknown, options?: unknown) => Synth
  Filter: new (freq: number, type: string) => Node & { frequency: Param }
  Panner: new (pan: number) => Node & { pan: Param }
  Gain: new (gain: number) => Node & { gain: Param }
  Limiter: new (thresholdDb: number) => Node
  Analyser: new (type: string, size: number) => Node & { getValue(): Float32Array | Float32Array[] }
  getDestination?: () => unknown
  Destination?: unknown
}
interface VoiceNodes { synth: Synth; filter: Node & { frequency: Param }; panner: Node & { pan: Param } }

export class ToneBackend implements AudioBackend, AnalysisSource {
  private tone: ToneLib | null = null
  private master: (Node & { gain: Param }) | null = null
  private limiter: Node | null = null
  private wave: (Node & { getValue(): Float32Array | Float32Array[] }) | null = null
  private fft: (Node & { getValue(): Float32Array | Float32Array[] }) | null = null
  private voices = new Map<string, VoiceNodes>()
  private spec: ScoreVoice[] = []
  private volume = 0.7

  async start(voices: ScoreVoice[]): Promise<void> {
    if (!this.tone) this.tone = (await import('tone')) as unknown as ToneLib
    await this.tone.start()
    if (!this.master) this.buildChain()
    this.spec = voices
    this.rebuildVoices()
    const t = this.tone.now()
    const master = this.master as Node & { gain: Param }
    master.gain.cancelScheduledValues(t)
    master.gain.setValueAtTime(0, t) // soft start: ramp up instead of a click
    master.gain.rampTo(volumeToGain(this.volume), 0.08)
  }

  now(): number { return this.tone ? this.tone.now() : 0 }

  note(cmd: NoteCommand): void {
    const v = this.voices.get(cmd.voice)
    if (!v) return
    v.filter.frequency.setValueAtTime(brightnessToCutoffHz(cmd.brightness), cmd.atSeconds)
    v.panner.pan.setValueAtTime(cmd.pan, cmd.atSeconds)
    v.synth.triggerAttackRelease(cmd.freqHz, Math.max(0.03, cmd.durationSeconds), cmd.atSeconds, cmd.gain)
  }

  /** Stops what is sounding AND notes already scheduled for the next fraction of a second, by rebuilding the voices. */
  silence(): void {
    if (this.tone && this.master) this.rebuildVoices()
  }

  setVolume(volume: number): void {
    this.volume = volume
    if (this.tone && this.master) this.master.gain.rampTo(volumeToGain(volume), 0.05)
  }

  getWaveform(): Float32Array | null { return this.read(this.wave) }
  getSpectrum(): Float32Array | null { return this.read(this.fft) }

  dispose(): void {
    for (const v of this.voices.values()) this.disposeVoice(v)
    this.voices.clear()
    for (const n of [this.wave, this.fft, this.limiter, this.master]) n?.dispose()
    this.master = this.limiter = this.wave = this.fft = null
  }

  private read(a: { getValue(): Float32Array | Float32Array[] } | null): Float32Array | null {
    const v = a?.getValue()
    return v ? (Array.isArray(v) ? v[0] : v) : null
  }

  private buildChain(): void {
    const T = this.tone as ToneLib
    this.master = new T.Gain(0)
    this.limiter = new T.Limiter(-1)
    this.wave = new T.Analyser('waveform', 1024)
    this.fft = new T.Analyser('fft', 1024)
    this.master.connect(this.limiter)
    this.limiter.connect(T.getDestination ? T.getDestination() : T.Destination)
    this.limiter.connect(this.wave)
    this.limiter.connect(this.fft)
  }

  private disposeVoice(v: VoiceNodes): void {
    v.synth.releaseAll()
    v.synth.dispose()
    v.filter.dispose()
    v.panner.dispose()
  }

  private rebuildVoices(): void {
    const T = this.tone as ToneLib
    for (const v of this.voices.values()) this.disposeVoice(v)
    this.voices.clear()
    for (const spec of this.spec) {
      const synth = new T.PolySynth(T.Synth, { oscillator: { type: spec.waveform }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.2 } })
      const filter = new T.Filter(8000, 'lowpass')
      const panner = new T.Panner(0)
      synth.connect(filter)
      filter.connect(panner)
      panner.connect(this.master)
      this.voices.set(spec.id, { synth, filter, panner })
    }
  }
}
