import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PlaybackController, STEPS_PER_SECOND, type AudioBackend, type NoteCommand, type Timers } from '../../src/core/playback.ts'
import type { Score } from '../../src/core/types.ts'

class FakeBackend implements AudioBackend {
  t = 0
  notes: NoteCommand[] = []
  silences = 0
  volume = -1
  started: string[][] = []
  failStart = false
  async start(voices: { id: string }[]) { if (this.failStart) throw new Error('blocked by the browser'); this.started.push(voices.map((v) => v.id)) }
  now() { return this.t }
  note(cmd: NoteCommand) { this.notes.push(cmd) }
  /** A real backend must cancel notes that are scheduled but have not started yet. */
  silence() { this.silences++; this.notes = this.notes.filter((n) => n.atSeconds <= this.t) }
  setVolume(v: number) { this.volume = v }
}
const timers: Timers = { setInterval: () => 1, clearInterval: () => undefined }

function score(steps = 4): Score {
  return {
    phenomenonId: 'global-temperature', mode: 'scientific', intensity: 0.5, track: 'measured', fingerprint: 'testtest', stepCount: steps,
    stepLabels: Array.from({ length: steps }, (_, i) => String(i)), voices: [{ id: 'v', label: 'V', waveform: 'sine' }], gaps: [], legend: [],
    events: Array.from({ length: steps }, (_, i) => ({ step: i, start: i, duration: 0.95, voice: 'v', freqHz: 200 + i * 100, gain: 0.8, pan: 0, brightness: 0.5, basis: { measure: 'm', value: i } })),
  }
}
/** Advance the audio clock in 25 ms slices, ticking the scheduler like the real timer does. */
function run(c: PlaybackController, b: FakeBackend, seconds: number) {
  for (let t = 0; t < seconds - 1e-9; t += 0.025) { b.t += 0.025; c.tick() }
}
const setup = (steps = 4) => { const b = new FakeBackend(); const c = new PlaybackController(b, timers); c.setScore(score(steps)); return { b, c } }

test('loading a score makes the player ready at step 0 and applies the default volume', () => {
  const { b, c } = setup()
  assert.equal(c.getState().status, 'ready')
  assert.equal(c.getState().stepCount, 4)
  assert.equal(b.volume, 0.7)
})

test('play starts the engine with the score voices and schedules notes on the audio clock, in order and on time', async () => {
  const { b, c } = setup()
  await c.play()
  assert.deepEqual(b.started, [['v']])
  assert.equal(c.getState().status, 'playing')
  assert.equal(b.notes.length, 1) // only step 0 is inside the 0.25 s lookahead
  run(c, b, 1.6)
  const times = b.notes.map((n) => n.atSeconds)
  assert.deepEqual(b.notes.map((n) => n.freqHz), [200, 300, 400, 500]) // step 3 is scheduled 0.25 s ahead of when it sounds
  times.forEach((t, i) => assert.ok(Math.abs(t - i / STEPS_PER_SECOND) < 1e-9, `note ${i} at ${t}`))
  assert.ok(Math.abs(b.notes[0].durationSeconds - 0.95 / STEPS_PER_SECOND) < 1e-9)
  assert.equal(c.getState().step, 3)
})

test('speed changes the rate and the note lengths without changing any pitch', async () => {
  const { b, c } = setup(8)
  c.setSpeed(2)
  await c.play()
  run(c, b, 1)
  assert.deepEqual(b.notes.slice(0, 5).map((n) => n.freqHz), [200, 300, 400, 500, 600]) // same pitches as at normal speed, just sooner
  assert.ok(Math.abs(b.notes[1].atSeconds - 1 / (STEPS_PER_SECOND * 2)) < 1e-9)
  assert.ok(Math.abs(b.notes[0].durationSeconds - 0.95 / (STEPS_PER_SECOND * 2)) < 1e-9)
  c.setSpeed(99)
  assert.equal(c.getState().speed, 4)
})

test('changing speed while playing keeps the position and continues from there', async () => {
  const { b, c } = setup(10)
  await c.play()
  run(c, b, 1)
  const before = c.position()
  c.setSpeed(0.5)
  assert.ok(Math.abs(c.position() - before) < 1e-6)
  run(c, b, 1)
  assert.ok(Math.abs(c.position() - (before + 1)) < 0.06) // speed 0.5 = 1 step per second
})

test('pause keeps the position, silences the sound, and resume does not repeat notes', async () => {
  const { b, c } = setup()
  await c.play()
  run(c, b, 0.8)
  const playedBefore = b.notes.length
  const silencesBefore = b.silences
  c.pause()
  assert.equal(c.getState().status, 'paused')
  assert.ok(b.silences > silencesBefore)
  const step = c.getState().step
  b.t += 5 // time passes while paused
  assert.equal(c.getState().step, step)
  await c.play()
  run(c, b, 0.5)
  const freqs = b.notes.map((n) => n.freqHz)
  assert.equal(new Set(freqs).size, freqs.length, `no repeated notes: ${freqs}`)
  assert.ok(b.notes.length > playedBefore)
})

test('seek jumps (also while playing) and the next notes come from the new position', async () => {
  const { b, c } = setup(8)
  c.seek(5)
  assert.equal(c.getState().step, 5)
  await c.play()
  run(c, b, 0.5)
  assert.equal(b.notes[0].freqHz, 700)
  const s = b.silences
  c.seek(1)
  assert.ok(b.silences > s)
  const already = b.notes.length
  run(c, b, 0.3)
  assert.deepEqual(b.notes.slice(already, already + 2).map((n) => n.freqHz), [300, 400]) // continues from step 1, nothing from the old position
  c.seek(999)
  assert.equal(c.getState().step, 7)
})

test('stop returns to the start; reaching the end stops, or wraps when looping', async () => {
  const { b, c } = setup(2)
  await c.play()
  run(c, b, 0.4)
  c.stop()
  assert.deepEqual([c.getState().status, c.getState().step], ['ready', 0])
  await c.play()
  run(c, b, 1.5) // 2 steps at 2 steps/s = 1 s
  assert.equal(c.getState().status, 'ready')
  const loop = setup(2)
  loop.c.setLoop(true)
  await loop.c.play()
  run(loop.c, loop.b, 3)
  assert.equal(loop.c.getState().status, 'playing')
  assert.ok(loop.b.notes.length > 4) // wrapped around at least once
})

test('intensity is applied to every scheduled note but pitch is untouched', async () => {
  const { b, c } = setup()
  c.setIntensity(1)
  await c.play()
  assert.equal(b.notes[0].freqHz, 200)
  assert.ok(Math.abs(b.notes[0].gain - 0.5) > Math.abs(0.8 - 0.5)) // more contrast than the raw 0.8
})

test('a blocked or failed audio start is reported, not swallowed', async () => {
  const { b, c } = setup()
  b.failStart = true
  await c.play()
  assert.equal(c.getState().status, 'error')
  assert.match(c.getState().error ?? '', /blocked by the browser/)
})

test('subscribers are told about changes, and unchanged state keeps the same snapshot object', () => {
  const { c } = setup()
  let calls = 0
  const off = c.subscribe(() => { calls++ })
  const s0 = c.getState()
  c.setSpeed(1)
  assert.equal(c.getState(), s0)
  c.setLoop(true)
  assert.equal(calls, 1)
  off()
  c.setLoop(false)
  assert.equal(calls, 1)
})
