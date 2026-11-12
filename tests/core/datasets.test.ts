// FIXTURES (synthetic) check the dataset builders' arithmetic. They are not NASA measurements.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDemoDataset, buildSeaIceDataset, buildSeaLevelDataset, buildTemperatureDataset, buildVegetationDataset } from '../../src/core/datasets.ts'
import type { DatasetProvenance } from '../../src/core/types.ts'

const PROV: DatasetProvenance = { sourceName: 'fixture', sourceUrl: '', origin: 'file', retrievedUtc: null, fileName: 'fixture.csv', sha256: null }
const close = (a: number | null, b: number, eps = 1e-9) => assert.ok(a !== null && Math.abs(a - b) < eps, `${a} vs ${b}`)

test('temperature: keeps only complete years, adds bands and a decade rate, and says what it dropped', () => {
  const years = Array.from({ length: 100 }, (_, i) => 1900 + i)
  const annual = years.map((y, i) => (y === 1999 ? null : i * 0.01))
  const zonal = { years, bands: { global: annual, arctic: annual.map((v) => (v === null ? null : v * 3)), tropics: annual, antarctic: annual } }
  const ds = buildTemperatureDataset({ years, annual }, zonal, PROV)
  assert.equal(ds.steps.length, 99)
  assert.equal(ds.steps[0].label, '1900')
  assert.equal(ds.status, 'real')
  assert.equal(ds.primary, 'global')
  close(ds.measures.arctic.values[10], 0.3)
  close(ds.measures.rate.values[50], 0.1) // 0.01 C per year = 0.1 C per decade
  assert.equal(ds.measures.rate.values[1], null)
  assert.ok(ds.notes.some((n) => n.includes('1999')))
  const noZonal = buildTemperatureDataset({ years, annual }, null, PROV)
  assert.equal(noZonal.measures.arctic, undefined)
  assert.ok(noZonal.notes.some((n) => /latitude-band file was not available/.test(n)))
})

test('sea level: yearly means, rise since the first year, rate, and partial years excluded', () => {
  const times: number[] = []
  const values: number[] = []
  for (let y = 1993; y <= 2003; y++) for (let c = 0; c < 36; c++) { times.push(y + c / 36); values.push(50 + (y - 1993) * 3) }
  for (let c = 0; c < 10; c++) { times.push(2004 + c / 36); values.push(999) } // too few cycles: must be left out
  const ds = buildSeaLevelDataset({ times, values, columnLabel: 'fixture column' }, PROV)
  assert.equal(ds.steps.length, 11)
  assert.equal(ds.steps[10].label, '2003')
  close(ds.measures.rise.values[0], 0)
  close(ds.measures.rise.values[10], 30)
  close(ds.measures.rate.values[10], 3)
  assert.ok(ds.notes.some((n) => n.includes('2004')))
  assert.ok(ds.notes[0].includes('fixture column'))
})

test('sea ice: March and September monthly means, record-capable minimum, decade rate', () => {
  const rows = []
  for (let y = 1980; y <= 1999; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= 15; d++) {
    const extent = m === 3 ? 15 - 0.05 * (y - 1980) : m === 9 ? 7 - 0.1 * (y - 1980) : 10
    rows.push({ year: y, month: m, day: d, extent })
  }
  rows.push({ year: 2000, month: 3, day: 1, extent: 14 }) // a lone day: not enough for a monthly mean
  const ds = buildSeaIceDataset({ rows }, PROV)
  assert.equal(ds.steps.length, 20)
  close(ds.measures.march.values[0], 15)
  close(ds.measures.september.values[19], 7 - 0.1 * 19)
  close(ds.measures.rate.values[19], -1.0) // -0.1 million km2 per year = -1.0 per decade
  assert.equal(ds.primary, 'september')
})

test('vegetation: NDVI per composite and change since the previous one', () => {
  const ds = buildVegetationDataset([{ iso: '2020-01-01', ndvi: 0.2 }, { iso: '2020-01-17', ndvi: 0.5 }, { iso: '2020-02-02', ndvi: null }, { iso: '2020-02-18', ndvi: 0.4 }], 'Test site', PROV)
  assert.deepEqual(ds.steps.map((s) => s.label), ['2020-01-01', '2020-01-17', '2020-02-02', '2020-02-18'])
  assert.equal(ds.measures.change.values[0], null)
  close(ds.measures.change.values[1], 0.3)
  assert.equal(ds.measures.change.values[2], null)
  assert.equal(ds.measures.change.values[3], null) // previous composite was missing
})

test('demo datasets are unmistakably labelled and use no real dates', () => {
  for (const id of ['global-temperature', 'sea-level', 'sea-ice', 'vegetation'] as const) {
    const ds = buildDemoDataset(id)
    assert.equal(ds.status, 'demo', id)
    assert.equal(ds.provenance.origin, 'demo')
    assert.match(ds.provenance.sourceName, /NOT NASA/)
    assert.ok(ds.steps.every((s) => s.label.startsWith('Demo ') && s.iso === ''), id)
    assert.ok(ds.notes[0].startsWith('DEMO DATA'), id)
    assert.ok(ds.steps.length >= 20, id)
  }
})
