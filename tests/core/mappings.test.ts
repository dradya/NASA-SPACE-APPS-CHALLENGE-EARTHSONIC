import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAPPINGS, SAFE_BAND, quantizeToPentatonic } from '../../src/core/mappings.ts'
import { buildDemoDataset } from '../../src/core/datasets.ts'
import { semitoneMap } from '../../src/core/series.ts'
import { voiceAvailable } from '../../src/core/score.ts'
import type { PhenomenonId } from '../../src/core/types.ts'

const IDS = Object.keys(MAPPINGS) as PhenomenonId[]

test('every mapping is internally consistent', () => {
  for (const id of IDS) {
    const spec = MAPPINGS[id]
    assert.equal(spec.phenomenonId, id)
    const voiceIds = spec.voices.map((v) => v.id)
    assert.equal(new Set(voiceIds).size, voiceIds.length, `${id}: duplicate voice ids`)
    for (const v of spec.voices) {
      assert.ok(v.pitch || v.fixedFreqHz !== undefined, `${id}/${v.id}: needs a pitch map or a fixed frequency`)
      assert.ok(v.explain.length > 0 && v.role.length > 0 && v.label.length > 0, `${id}/${v.id}: needs plain-language text`)
      assert.ok(v.pan >= -1 && v.pan <= 1)
    }
    if (spec.accent) {
      const bell = spec.voices.find((v) => v.id === spec.accent?.voiceId)
      assert.ok(bell && bell.fixedFreqHz !== undefined, `${id}: accent voice must exist and have a fixed pitch`)
    }
  }
})

test('every pitch stays inside the safe band and every range is ascending', () => {
  const [lo, hi] = SAFE_BAND
  for (const id of IDS) {
    const spec = MAPPINGS[id]
    const check = (f: number, what: string) => assert.ok(f >= lo && f <= hi, `${id}/${what}: ${f} Hz outside ${lo}-${hi}`)
    for (const v of spec.voices) {
      if (v.fixedFreqHz !== undefined) check(v.fixedFreqHz, `${v.id} fixed`)
      if (v.pitch) {
        const [f0, f1] = v.pitch.freqRange
        check(f0, `${v.id} low`); check(f1, `${v.id} high`)
        assert.ok(f1 > f0 && v.pitch.domain[1] > v.pitch.domain[0], `${id}/${v.id}: ranges must ascend`)
      }
    }
    check(spec.diff.freqRange[0], 'diff low'); check(spec.diff.freqRange[1], 'diff high')
  }
})

test('every measure a mapping asks for is produced by its dataset builder (checked on demo datasets)', () => {
  for (const id of IDS) {
    const ds = buildDemoDataset(id)
    const spec = MAPPINGS[id]
    assert.ok(ds.measures[spec.diff.measure], `${id}: diff measure missing`)
    if (spec.accent) assert.ok(ds.measures[spec.accent.measure], `${id}: accent measure missing`)
    for (const v of spec.voices) assert.ok(voiceAvailable(ds, v), `${id}/${v.id}: measure missing in dataset`)
  }
})

test('the reference tone sits exactly where the main voice sounds at zero', () => {
  const t = MAPPINGS['global-temperature']
  const ref = t.voices.find((v) => v.id === 'reference')!
  const main = t.voices.find((v) => v.id === 'global')!.pitch!
  assert.ok(Math.abs((ref.fixedFreqHz as number) - semitoneMap(0, main.domain, main.freqRange)) < 1e-9)
})

test('pentatonic quantizing lands on C D E G A and is idempotent', () => {
  const allowed = new Set([0, 2, 4, 7, 9])
  for (let f = 120; f < 1700; f *= 1.037) {
    const q = quantizeToPentatonic(f)
    const midi = Math.round(69 + 12 * Math.log2(q / 440))
    assert.ok(allowed.has(((midi % 12) + 12) % 12), `${f} -> ${q}`)
    assert.ok(Math.abs(quantizeToPentatonic(q) - q) < 1e-6)
  }
  assert.ok(Math.abs(quantizeToPentatonic(440) - 440) < 1e-9)
  assert.ok(Math.abs(quantizeToPentatonic(466.16) - 440) < 1e-9)
})
