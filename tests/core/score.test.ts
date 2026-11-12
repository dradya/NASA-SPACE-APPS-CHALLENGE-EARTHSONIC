// Tests the engine on DEMO datasets and hand-made datasets: the point is that sound follows the data deterministically.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDemoDataset } from '../../src/core/datasets.ts'
import { MAPPINGS, SAFE_BAND } from '../../src/core/mappings.ts'
import { buildScore, shapeEvent } from '../../src/core/score.ts'
import { mapRange, runningRecords, semitoneMap } from '../../src/core/series.ts'
import { quantizeToPentatonic } from '../../src/core/mappings.ts'
import type { Dataset, PhenomenonId } from '../../src/core/types.ts'

const SCI = { mode: 'scientific', intensity: 0.5 } as const
const MUS = { mode: 'musical', intensity: 0.5 } as const
const IDS: PhenomenonId[] = ['global-temperature', 'sea-level', 'sea-ice', 'vegetation']
const temp = () => buildDemoDataset('global-temperature')
const full = (ds: Dataset) => ({ from: 0, to: ds.steps.length })
const voiceEvents = (events: ReturnType<typeof buildScore>['events'], voice: string) => events.filter((e) => e.voice === voice)

test('same data and settings give identical events and fingerprint; any change gives a different fingerprint', () => {
  const ds = temp()
  const spec = MAPPINGS['global-temperature']
  const a = buildScore(ds, spec, full(ds), SCI)
  const b = buildScore(ds, spec, full(ds), SCI)
  assert.deepEqual(a, b)
  assert.equal(a.fingerprint, b.fingerprint)
  assert.match(a.fingerprint, /^[0-9a-f]{8}$/)
  assert.notEqual(a.fingerprint, buildScore(ds, spec, full(ds), MUS).fingerprint)
  assert.notEqual(a.fingerprint, buildScore(ds, spec, { from: 0, to: 30 }, SCI).fingerprint)
  const changed = { ...ds, measures: { ...ds.measures, global: { ...ds.measures.global, values: ds.measures.global.values.map((v, i) => (i === 7 && v !== null ? v + 0.3 : v)) } } }
  assert.notEqual(a.fingerprint, buildScore(changed, spec, full(ds), SCI).fingerprint)
})

test('the global voice rises exactly with the data: higher value, higher pitch, on the documented scale', () => {
  const ds = temp()
  const spec = MAPPINGS['global-temperature']
  const pm = spec.voices.find((v) => v.id === 'global')!.pitch!
  const score = buildScore(ds, spec, full(ds), SCI)
  const ev = voiceEvents(score.events, 'global')
  assert.equal(ev.length, ds.steps.length)
  const values = ds.measures.global.values as number[]
  for (const e of ev) {
    const v = values[e.step]
    assert.ok(Math.abs(e.freqHz - semitoneMap(v, pm.domain, pm.freqRange)) < 1e-9)
    assert.equal(e.basis.value, v)
  }
  for (let i = 0; i < ev.length; i++) for (let j = 0; j < ev.length; j++) {
    if (values[i] < values[j] - 1e-9) assert.ok(ev[i].freqHz < ev[j].freqHz, `${values[i]} vs ${values[j]}`)
  }
})

test('a value sounds the same whichever dates are selected (fixed reference scale)', () => {
  const ds = temp()
  const spec = MAPPINGS['global-temperature']
  const a = voiceEvents(buildScore(ds, spec, { from: 0, to: 20 }, SCI).events, 'global').find((e) => e.step === 10)!
  const b = voiceEvents(buildScore(ds, spec, { from: 10, to: 40 }, SCI).events, 'global').find((e) => e.step === 0)!
  assert.equal(a.freqHz, b.freqHz)
})

test('missing data is silence, recorded as a gap, never interpolated', () => {
  const ds = temp()
  const values = ds.measures.global.values.map((v, i) => (i === 3 ? null : v))
  const gappy: Dataset = { ...ds, measures: { ...ds.measures, global: { ...ds.measures.global, values } } }
  const score = buildScore(gappy, MAPPINGS['global-temperature'], full(gappy), SCI)
  assert.deepEqual(score.gaps, [3])
  assert.equal(voiceEvents(score.events, 'global').filter((e) => e.step === 3).length, 0)
  assert.equal(voiceEvents(score.events, 'reference').filter((e) => e.step === 3).length, 1) // the reference tone keeps sounding
  assert.equal(voiceEvents(score.events, 'global').length, ds.steps.length - 1)
})

test('record bells ring exactly on new records and nowhere else', () => {
  const ds = temp()
  const records = runningRecords(ds.measures.global.values, 'high')
  const bells = buildScore(ds, MAPPINGS['global-temperature'], full(ds), SCI).events.filter((e) => e.accent)
  assert.deepEqual(bells.map((e) => e.step), records.map((r, i) => (r ? i : -1)).filter((i) => i >= 0))
  assert.ok(bells.length > 0)
  assert.ok(bells.every((e) => e.voice === 'record'))
  // a record is judged against the whole history, even when the selected range starts late
  const late = buildScore(ds, MAPPINGS['global-temperature'], { from: 30, to: 60 }, SCI).events.filter((e) => e.accent).map((e) => e.step + 30)
  assert.deepEqual(late, records.map((r, i) => (r ? i : -1)).filter((i) => i >= 30))
})

test('rate pulses: the number of pulses per step follows the rate of change', () => {
  const ds = temp()
  const spec = MAPPINGS['global-temperature']
  const pulse = spec.voices.find((v) => v.id === 'pulse')!.pulses!
  const score = buildScore(ds, spec, full(ds), SCI)
  const rate = ds.measures.rate.values
  for (let i = 0; i < ds.steps.length; i++) {
    const want = rate[i] === null ? 0 : Math.round(mapRange(rate[i] as number, pulse.domain, pulse.range))
    const got = voiceEvents(score.events, 'pulse').filter((e) => e.step === i)
    assert.equal(got.length, want, `step ${i}`)
    got.forEach((e, k) => assert.ok(Math.abs(e.start - (i + k / want)) < 1e-9))
  }
})

test('musical mode snaps to the pentatonic scale; scientific mode does not', () => {
  const ds = temp()
  const spec = MAPPINGS['global-temperature']
  const mus = buildScore(ds, spec, full(ds), MUS).events
  assert.ok(mus.every((e) => Math.abs(quantizeToPentatonic(e.freqHz) - e.freqHz) < 1e-6))
  const sci = buildScore(ds, spec, full(ds), SCI).events
  assert.ok(sci.some((e) => Math.abs(quantizeToPentatonic(e.freqHz) - e.freqHz) > 1e-3))
})

test('every pitch of every phenomenon, in both modes, stays in the safe band', () => {
  for (const id of IDS) {
    const ds = buildDemoDataset(id)
    for (const s of [SCI, MUS]) {
      for (const e of buildScore(ds, MAPPINGS[id], full(ds), s).events) {
        assert.ok(e.freqHz >= SAFE_BAND[0] && e.freqHz <= SAFE_BAND[1], `${id}: ${e.freqHz}`)
        assert.ok(e.gain >= 0 && e.gain <= 1 && e.brightness >= 0 && e.brightness <= 1 && e.pan >= -1 && e.pan <= 1)
      }
    }
  }
})

test('values beyond the mapped range are held at the end of the scale, not pushed out of range', () => {
  const ds = temp()
  const values = ds.measures.global.values.map((v, i) => (i === 5 ? 100 : v))
  const hot: Dataset = { ...ds, measures: { ...ds.measures, global: { ...ds.measures.global, values } } }
  const e = voiceEvents(buildScore(hot, MAPPINGS['global-temperature'], full(hot), SCI).events, 'global').find((x) => x.step === 5)!
  assert.ok(Math.abs(e.freqHz - 784) < 1e-9)
})

test('intensity changes loudness and brightness contrast but never pitch; 0.5 changes nothing', () => {
  const ev = buildScore(temp(), MAPPINGS['global-temperature'], { from: 0, to: 5 }, SCI).events.find((e) => e.voice === 'global')!
  assert.deepEqual(shapeEvent(ev, 0.5), ev)
  const lo = shapeEvent(ev, 0)
  const hi = shapeEvent(ev, 1)
  assert.equal(lo.freqHz, ev.freqHz); assert.equal(hi.freqHz, ev.freqHz)
  assert.ok(Math.abs(hi.gain - 0.5) >= Math.abs(ev.gain - 0.5) && Math.abs(lo.gain - 0.5) <= Math.abs(ev.gain - 0.5))
})

test('a dataset without latitude bands simply drops those voices', () => {
  const ds = temp()
  const { arctic: _a, tropics: _t, ...rest } = ds.measures
  const slim: Dataset = { ...ds, measures: rest }
  const score = buildScore(slim, MAPPINGS['global-temperature'], full(slim), SCI)
  assert.ok(!score.voices.some((v) => v.id === 'arctic' || v.id === 'tropics'))
  assert.ok(score.voices.some((v) => v.id === 'global'))
})

test('range handling: labels follow the selected range; bad ranges are rejected', () => {
  const ds = temp()
  const s = buildScore(ds, MAPPINGS['global-temperature'], { from: 4, to: 9 }, SCI)
  assert.equal(s.stepCount, 5)
  assert.deepEqual(s.stepLabels, ds.steps.slice(4, 9).map((x) => x.label))
  assert.ok(s.events.every((e) => e.step >= 0 && e.step < 5 && e.start >= 0 && e.start < 5))
  assert.throws(() => buildScore(ds, MAPPINGS['global-temperature'], { from: 5, to: 5 }, SCI), RangeError)
  assert.throws(() => buildScore(ds, MAPPINGS['global-temperature'], { from: 0, to: 9999 }, SCI), RangeError)
})

test('sea ice: less ice sounds lower, and a legend explains every voice', () => {
  const ds = buildDemoDataset('sea-ice')
  const score = buildScore(ds, MAPPINGS['sea-ice'], full(ds), SCI)
  const sept = voiceEvents(score.events, 'september')
  assert.ok(sept[sept.length - 1].freqHz < sept[0].freqHz) // the demo pattern loses ice over time
  assert.ok(score.legend.length >= 3 && score.legend.every((l) => l.text.length > 20))
})
