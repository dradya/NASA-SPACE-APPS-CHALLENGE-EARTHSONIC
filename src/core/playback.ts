// Playback scheduling, independent of any audio library. The audio clock is the master: position is derived from
// backend.now(), so what you see (playhead, frame, chart) can never drift from what you hear.
import type { PlaybackState, Score, ScoreEvent, ScoreVoice } from './types.ts'
import { clamp } from './series.ts'
import { shapeEvent } from './score.ts'

export interface NoteCommand {
  voice: string
  atSeconds: number
  durationSeconds: number
  freqHz: number
  gain: number
  pan: number
  brightness: number
  accent: boolean
}

export interface AudioBackend {
  /** Must be called from a user gesture (browsers refuse to start audio otherwise). */
  start(voices: ScoreVoice[]): Promise<void>
  /** Audio clock in seconds. */
  now(): number
  note(cmd: NoteCommand): void
  /** Stop everything that is sounding or scheduled. */
  silence(): void
  setVolume(volume: number): void
}

export interface Timers {
  setInterval(fn: () => void, ms: number): unknown
  clearInterval(handle: unknown): void
}

export const STEPS_PER_SECOND = 2
export const LOOKAHEAD_SECONDS = 0.25
export const SPEEDS: readonly number[] = [0.25, 0.5, 1, 1.5, 2, 4]

type Listener = () => void

export class PlaybackController {
  private backend: AudioBackend
  private timers: Timers
  private score: Score | null = null
  private events: ScoreEvent[] = []
  private nextIndex = 0
  private anchorPos = 0
  private anchorTime = 0
  private handle: unknown = null
  private listeners = new Set<Listener>()
  private state: PlaybackState = {
    status: 'idle', step: 0, stepCount: 0, speed: 1, loop: false, volume: 0.7, intensity: 0.5, mode: 'scientific', error: null,
  }

  constructor(backend: AudioBackend, timers: Timers) {
    this.backend = backend
    this.timers = timers
    backend.setVolume(this.state.volume)
  }

  // --- observable state (for React's useSyncExternalStore) ---
  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  getState = (): PlaybackState => this.state
  private set(patch: Partial<PlaybackState>): void {
    const next = { ...this.state, ...patch }
    if ((Object.keys(patch) as (keyof PlaybackState)[]).every((k) => next[k] === this.state[k])) return
    this.state = next
    this.listeners.forEach((fn) => fn())
  }

  private rate(): number { return STEPS_PER_SECOND * this.state.speed }

  /** Fractional step position (for the playhead). */
  position(): number {
    if (this.state.status !== 'playing') return this.anchorPos
    return Math.min(this.anchorPos + (this.backend.now() - this.anchorTime) * this.rate(), this.state.stepCount)
  }

  private indexAt(pos: number): number {
    let i = 0
    while (i < this.events.length && this.events[i].start < pos - 1e-9) i++
    return i
  }

  private reanchor(pos: number): void {
    this.anchorPos = pos
    this.anchorTime = this.backend.now()
    this.nextIndex = this.indexAt(pos)
  }

  setScore(score: Score): void {
    this.halt()
    this.score = score
    this.events = [...score.events].sort((a, b) => a.start - b.start)
    this.anchorPos = 0
    this.nextIndex = 0
    this.set({ status: score.stepCount > 0 ? 'ready' : 'idle', step: 0, stepCount: score.stepCount, error: null })
  }

  async play(): Promise<void> {
    if (!this.score || this.state.status === 'playing') return
    try {
      await this.backend.start(this.score.voices)
    } catch (e) {
      this.set({ status: 'error', error: e instanceof Error ? e.message : 'The audio engine could not start.' })
      return
    }
    if (this.anchorPos >= this.state.stepCount) this.anchorPos = 0
    this.reanchor(this.anchorPos)
    this.set({ status: 'playing', error: null })
    this.handle = this.timers.setInterval(() => this.tick(), 25)
    this.tick()
  }

  pause(): void {
    if (this.state.status !== 'playing') return
    this.anchorPos = this.position()
    this.halt()
    this.set({ status: 'paused', step: this.stepOf(this.anchorPos) })
  }

  stop(): void {
    if (!this.score) return
    this.halt()
    this.anchorPos = 0
    this.nextIndex = 0
    this.set({ status: 'ready', step: 0 })
  }

  seek(step: number): void {
    if (!this.score) return
    const pos = clamp(step, 0, Math.max(0, this.state.stepCount - 1))
    if (this.state.status === 'playing') {
      this.backend.silence()
      this.reanchor(pos)
    } else {
      this.anchorPos = pos
      this.nextIndex = this.indexAt(pos)
    }
    this.set({ step: this.stepOf(pos) })
  }

  setSpeed(speed: number): void {
    const s = clamp(speed, 0.25, 4)
    if (this.state.status === 'playing') this.reanchor(this.position())
    this.set({ speed: s })
    if (this.state.status === 'playing') this.reanchor(this.position())
  }

  setLoop(loop: boolean): void { this.set({ loop }) }
  setVolume(volume: number): void { const v = clamp(volume, 0, 1); this.backend.setVolume(v); this.set({ volume: v }) }
  setIntensity(intensity: number): void { this.set({ intensity: clamp(intensity, 0, 1) }) }
  setMode(mode: PlaybackState['mode']): void { this.set({ mode }) }
  /** Pauses and releases timers. The controller stays usable (React StrictMode unmounts and remounts components in development). */
  dispose(): void { this.pause() }

  private stepOf(pos: number): number {
    return clamp(Math.floor(pos + 1e-9), 0, Math.max(0, this.state.stepCount - 1))
  }

  private halt(): void {
    if (this.handle !== null) { this.timers.clearInterval(this.handle); this.handle = null }
    this.backend.silence()
  }

  /** One scheduler pass (runs every 25 ms while playing; exposed for tests). */
  tick(): void {
    if (this.state.status !== 'playing') return
    const rate = this.rate()
    const pos = this.position()
    if (pos >= this.state.stepCount) {
      if (this.state.loop) {
        this.backend.silence()
        this.reanchor(0)
      } else {
        this.halt()
        this.anchorPos = 0
        this.nextIndex = 0
        this.set({ status: 'ready', step: 0 })
        return
      }
    }
    const horizon = this.position() + LOOKAHEAD_SECONDS * rate
    const now = this.backend.now()
    while (this.nextIndex < this.events.length && this.events[this.nextIndex].start < horizon) {
      const ev = shapeEvent(this.events[this.nextIndex], this.state.intensity)
      this.nextIndex++
      const at = this.anchorTime + (ev.start - this.anchorPos) / rate
      if (at < now - 0.05) continue // too late to be on time; skip rather than play out of sync
      this.backend.note({ voice: ev.voice, atSeconds: at, durationSeconds: ev.duration / rate, freqHz: ev.freqHz, gain: ev.gain, pan: ev.pan, brightness: ev.brightness, accent: ev.accent === true })
    }
    this.set({ step: this.stepOf(this.position()) })
  }
}
