import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDemoDataset } from '../../src/core/datasets.ts'
import { MAPPINGS } from '../../src/core/mappings.ts'
import { buildComparisonScore, comparePeriods, describeComparison } from '../../src/core/compare.ts'
import { describeDataset, describeStep, noteName } from '../../src/core/describe.ts'
import type { Dataset } from '../../src/core/types.ts'

const SCI = { mode: 'scientific', intensity: 0.5 } as const
const ds = () => buildDemoDataset('global-temperature') // demo ramp: later steps are higher
const spec = MAPPINGS['global-temperature']

test('comparePeriods aligns by position, computes b - a, and pads unequal lengths with null', () => {
  const d = ds()
  const c = comparePeriods(d, { from: 0, to: 10 }, d, { from: 40, to: 48 })
  assert.equal(c.length, 10)
  assert.equal(c.b[8], null)
  assert.equal(c.diff[8], null)
  const v = d.measures.global.values as number[]
  assert.ok(Math.abs((c.diff[3] as number) - (v[43] - v[3])) < 1e-12)
  assert.ok((c.stats.meanDiff as number) > 0.5) // the demo ramp rises
  assert.ok(Math.abs((c.stats.meanB as number) - (c.stats.meanA as number) - (c.stats.meanDiff as number)) < 0.2)
  assert.throws(() => comparePeriods(d, { from: 0, to: 5 }, d, { from: 0, to: 5 }, 'nope'), RangeError)
})

test('the written comparison says which period is higher and gives both averages', () => {
  const d = ds()
  const text = describeComparison(comparePeriods(d, { from: 0, to: 10 }, d, { from: 40, to: 50 }))
  assert.match(text, /Period B is on average [\d.]+ .* higher than period A/)
  assert.match(text, /Demo year 1 to Demo year 10/)
  const flipped = describeComparison(comparePeriods(d, { from: 40, to: 50 }, d, { from: 0, to: 10 }))
  assert.match(flipped, /lower than period A/)
  const empty: Dataset = { ...d, measures: { ...d.measures, global: { ...d.measures.global, values: d.measures.global.values.map(() => null) } } }
  assert.match(describeComparison(comparePeriods(empty, { from: 0, to: 5 }, empty, { from: 5, to: 10 })), /not enough data/)
})

test('listening modes: sequential is A, a silent step, then B', () => {
  const d = ds()
  const s = buildComparisonScore('sequential', d, { from: 0, to: 6 }, d, { from: 30, to: 36 }, spec, SCI)
  assert.equal(s.stepCount, 13)
  assert.equal(s.stepLabels[6], '—')
  assert.ok(s.stepLabels[0].startsWith('A: ') && s.stepLabels[7].startsWith('B: '))
  assert.equal(s.events.filter((e) => e.step === 6).length, 0)
  assert.ok(s.events.some((e) => e.step === 7) && s.events.every((e) => e.start < 13))
})

test('listening modes: together puts A left and B right, both at once', () => {
  const d = ds()
  const s = buildComparisonScore('together', d, { from: 0, to: 6 }, d, { from: 30, to: 36 }, spec, SCI)
  assert.equal(s.stepCount, 6)
  const g = s.events.filter((e) => e.voice === 'global' && e.step === 2)
  assert.equal(g.length, 2)
  assert.ok(g.some((e) => e.pan < -0.5) && g.some((e) => e.pan > 0.5))
  const [a, b] = [g.find((e) => e.pan < 0)!, g.find((e) => e.pan > 0)!]
  assert.ok(b.freqHz > a.freqHz) // B (later, warmer) sounds higher
})

test('listening modes: difference sits above the reference when B is higher and below when B is lower', () => {
  const d = ds()
  const up = buildComparisonScore('difference', d, { from: 0, to: 8 }, d, { from: 40, to: 48 }, spec, SCI)
  const ref = up.events.find((e) => e.voice === 'reference')!.freqHz
  const diffUp = up.events.filter((e) => e.voice === 'difference')
  assert.equal(diffUp.length, 8)
  assert.ok(diffUp.every((e) => e.freqHz > ref))
  const down = buildComparisonScore('difference', d, { from: 40, to: 48 }, d, { from: 0, to: 8 }, spec, SCI)
  assert.ok(down.events.filter((e) => e.voice === 'difference').every((e) => e.freqHz < ref))
  assert.deepEqual(up.voices.map((v) => v.id), ['reference', 'difference'])
  assert.notEqual(up.fingerprint, down.fingerprint)
})

test('comparison scores are deterministic', () => {
  const d = ds()
  const mk = () => buildComparisonScore('together', d, { from: 0, to: 6 }, d, { from: 30, to: 36 }, spec, SCI)
  assert.deepEqual(mk(), mk())
})

test('note names and step descriptions match what is sounding', () => {
  assert.equal(noteName(440), 'A4')
  assert.equal(noteName(261.63), 'C4')
  assert.equal(noteName(466.16), 'A♯4')
  assert.equal(noteName(196), 'G3')
  const d = ds()
  const out = describeStep(d, spec, 10, SCI)
  assert.match(out.headline, /Demo year 11 \(demo data\)/)
  assert.ok(out.lines.some((l) => l.startsWith('Global voice:') && /Hz\)/.test(l)))
  assert.ok(out.lines.some((l) => l.startsWith('Reference tone:')))
  assert.ok(out.text.startsWith(out.headline))
  const values = d.measures.global.values.map((v, i) => (i === 10 ? null : v))
  const gappy: Dataset = { ...d, measures: { ...d.measures, global: { ...d.measures.global, values } } }
  assert.ok(describeStep(gappy, spec, 10, SCI).lines.some((l) => /no data for this step/.test(l)))
  const hot: Dataset = { ...d, measures: { ...d.measures, global: { ...d.measures.global, values: d.measures.global.values.map((v, i) => (i === 10 ? 50 : v)) } } }
  assert.ok(describeStep(hot, spec, 10, SCI).lines.some((l) => /beyond the mapped range/.test(l)))
  assert.match(describeDataset(d), /^DEMO DATA \(synthetic, not NASA\)\. Global temperature anomaly: 60 steps/)
})

test('momentText describes the position being heard in every listening mode', async () => {
  const { momentText } = await import('../../src/core/compare.ts')
  const d = ds()
  const c = comparePeriods(d, { from: 0, to: 4 }, d, { from: 30, to: 34 })
  assert.match(momentText(c, 'sequential', 1, 4), /^Period A, Demo year 2: /)
  assert.equal(momentText(c, 'sequential', 4, 4), 'A silent step between period A and period B.')
  assert.match(momentText(c, 'sequential', 6, 4), /^Period B, Demo year 32: /)
  const t = momentText(c, 'together', 2, 4)
  assert.match(t, /Period A \(Demo year 3\): .*Period B \(Demo year 33\): .*Difference, B minus A: /)
  const short = comparePeriods(d, { from: 0, to: 4 }, d, { from: 30, to: 32 })
  assert.match(momentText(short, 'difference', 3, 4), /Period B \(—\): no data/)
})
