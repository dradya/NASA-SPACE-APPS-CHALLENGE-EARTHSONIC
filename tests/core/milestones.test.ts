import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDemoDataset, buildSeaLevelDataset, buildTemperatureDataset } from '../../src/core/datasets.ts'
import { MAPPINGS } from '../../src/core/mappings.ts'
import { milestonesFor } from '../../src/core/milestones.ts'
import { describeStep, plainValue } from '../../src/core/describe.ts'
import { buildScore } from '../../src/core/score.ts'
import type { DatasetProvenance } from '../../src/core/types.ts'

const PROV: DatasetProvenance = { sourceName: 'fixture', sourceUrl: '', origin: 'file', retrievedUtc: null, fileName: null, sha256: null }

test('milestones are computed from the data: start, latest, extremes, latest record, sorted and de-duplicated', () => {
  const ds = buildDemoDataset('global-temperature')
  const ms = milestonesFor(ds, MAPPINGS['global-temperature'])
  assert.equal(ms[0].step, 0)
  assert.equal(ms[ms.length - 1].step, ds.steps.length - 1)
  assert.deepEqual(ms.map((m) => m.step), [...new Set(ms.map((m) => m.step))].sort((a, b) => a - b))
  const v = ds.measures.global.values as number[]
  assert.ok(ms.some((m) => m.step === v.indexOf(Math.max(...v)) && /highest/.test(m.reason)))
  assert.ok(ms.some((m) => m.step === v.indexOf(Math.min(...v)) && /lowest/.test(m.reason)))
  assert.ok(ms.some((m) => /most recent record high/.test(m.reason)))
  assert.ok(ms.every((m) => m.label === ds.steps[m.step].label && m.reason.length > 0))
})

test('the baseline milestone appears only for real temperature data that contains 1980', () => {
  const years = Array.from({ length: 100 }, (_, i) => 1920 + i)
  const real = buildTemperatureDataset({ years, annual: years.map((y) => (y - 1920) * 0.01) }, null, PROV)
  assert.ok(milestonesFor(real, MAPPINGS['global-temperature']).some((m) => m.label === '1980' && /baseline/.test(m.reason)))
  assert.ok(!milestonesFor(buildDemoDataset('global-temperature'), MAPPINGS['global-temperature']).some((m) => /baseline/.test(m.reason)))
})

test('sea level gets a fastest-rise milestone', () => {
  const times: number[] = []
  const values: number[] = []
  for (let y = 1993; y <= 2012; y++) for (let c = 0; c < 36; c++) { times.push(y + c / 36); values.push(y < 2005 ? (y - 1993) * 2 : 24 + (y - 2005) * 6) }
  const ds = buildSeaLevelDataset({ times, values, columnLabel: 'fixture' }, PROV)
  assert.ok(milestonesFor(ds, MAPPINGS['sea-level']).some((m) => /fastest rise/.test(m.reason)))
})

test('temperature and sea level voices are brighter for higher values (redundant encoding), within 0..1', () => {
  for (const [id, voice] of [['global-temperature', 'global'], ['sea-level', 'level']] as const) {
    const ds = buildDemoDataset(id)
    const ev = buildScore(ds, MAPPINGS[id], { from: 0, to: ds.steps.length }, { mode: 'scientific', intensity: 0.5 }).events.filter((e) => e.voice === voice)
    for (let i = 0; i < ev.length; i++) for (let j = 0; j < ev.length; j++) {
      if ((ev[i].basis.value as number) < (ev[j].basis.value as number) - 1e-9) assert.ok(ev[i].brightness <= ev[j].brightness + 1e-12, `${id}: ${i} vs ${j}`)
    }
    assert.ok(Math.max(...ev.map((e) => e.brightness)) > Math.min(...ev.map((e) => e.brightness)) + 0.3)
    assert.ok(ev.every((e) => e.brightness >= 0 && e.brightness <= 1))
  }
})

test('plain-language wording for baseline-relative temperature values', () => {
  assert.equal(plainValue('°C vs 1951–1980', 0.45), '0.45 °C warmer than the 1951–1980 average')
  assert.equal(plainValue('°C vs 1951–1980', -0.2), '0.20 °C cooler than the 1951–1980 average')
  assert.equal(plainValue('°C vs 1951–1980', 0), 'the same as the 1951–1980 average')
  assert.equal(plainValue('mm', 42), '42.0 mm')
  const ds = buildDemoDataset('global-temperature')
  const line = describeStep(ds, MAPPINGS['global-temperature'], 40, { mode: 'scientific', intensity: 0.5 }).lines.find((l) => l.startsWith('Global voice'))
  assert.match(line ?? '', /warmer than the 1951–1980 average\)|cooler than the 1951–1980 average\)/)
})
