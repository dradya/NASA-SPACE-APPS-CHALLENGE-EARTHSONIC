// FIXTURES: synthetic text written to match the documented NASA file layouts. They prove the parsers read those layouts
// and reject others. They are NOT NASA measurements. Whether the real files match is confirmed by data-pipeline/scripts/check_data_access.py.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gistempFixture, gmslFixture, nsidcFixture } from './fixtures.ts'
import { ParseError, modisDateToIso, parseGistempGlobal, parseGistempZonal, parseGmslAscii, parseModisSubset, parseNsidcDaily } from '../../src/core/parsers.ts'

test('GISTEMP global: years, annual values, *** as null', () => {
  const g = parseGistempGlobal(gistempFixture())
  assert.equal(g.years.length, 100)
  assert.equal(g.years[0], 1900)
  assert.equal(g.annual[1], 0.1)
  assert.equal(g.annual[99], null)
})

test('GISTEMP global: rejects wrong files and implausible units', () => {
  assert.throws(() => parseGistempGlobal('<html>blocked</html>'), ParseError)
  assert.throws(() => parseGistempGlobal(gistempFixture().replace('J-D', 'XX')), /missing column/)
  const hundredths = gistempFixture().replace('0.30,***', '30,***')
  assert.throws(() => parseGistempGlobal(hundredths), /plausible anomaly/)
  assert.throws(() => parseGistempGlobal('Year,J-D\n1900,0.1\n'), /Only 1 yearly rows/)
})

test('GISTEMP zonal: picks the named bands from the header', () => {
  const head = 'Year,Glob,NHem,SHem,24N-90N,24S-24N,90S-24S,64N-90N,44N-64N,24N-44N,EQU-24N,24S-EQU,44S-24S,64S-44S,90S-64S\n'
  let t = head
  for (let y = 1900; y < 1960; y++) t += `${y},0.1,0.2,0.0,0.3,0.05,0.0,1.5,0.4,0.2,0.1,0.0,0.0,-0.1,-0.5\n`
  const z = parseGistempZonal(t)
  assert.equal(z.years.length, 60)
  assert.equal(z.bands.arctic[0], 1.5)
  assert.equal(z.bands.tropics[0], 0.05)
  assert.equal(z.bands.antarctic[0], -0.5)
  assert.equal(z.bands.global[0], 0.1)
  assert.throws(() => parseGistempZonal(head.replace('64N-90N', 'zz') + '1900,1,1,1,1,1,1,1,1,1,1,1,1,1,1\n'), /missing column/)
})

test('NSIDC daily: skips the units row and turns fill values into null', () => {
  const r = parseNsidcDaily(nsidcFixture())
  assert.equal(r.rows.length, 1500)
  assert.equal(r.rows[0].year, 1979)
  assert.equal(r.rows[0].extent, 10.5)
  assert.equal(r.rows[7].extent, null)
  assert.throws(() => parseNsidcDaily('Year, Month\n1,2\n'), ParseError)
})

test('GMSL: chooses the smoothed GIA-applied column from the header, not by position', () => {
  const g = parseGmslAscii(gmslFixture())
  assert.equal(g.times.length, 400)
  assert.equal(g.columnLabel, 'smoothed (60-day Gaussian type filter) GMSL (GIA applied) variation (mm)')
  assert.equal(g.values[5], null) // fill value is invalid, not data
  assert.equal(g.values[10], 1 * 0 + 10 * 0.1 + 111) // column 11 of the fixture row
  assert.ok(Math.abs(g.times[0] - 1993) < 1e-9)
})

test('GMSL: also accepts the long wording "(Global Isostatic Adjustment (GIA) applied)"', () => {
  const long = gmslFixture().replace(
    'HDR Column 11: smoothed (60-day Gaussian type filter) GMSL (GIA applied) variation (mm)',
    'HDR Column 11: smoothed (60-day Gaussian type filter) GMSL (Global Isostatic Adjustment (GIA) applied) variation (mm)',
  )
  assert.match(parseGmslAscii(long).columnLabel, /Global Isostatic Adjustment \(GIA\) applied/)
})

test('GMSL: refuses files whose header does not identify exactly one column', () => {
  assert.throws(() => parseGmslAscii(gmslFixture({ dropGia: true })), /exactly one/)
  assert.throws(() => parseGmslAscii('1 2 3\n4 5 6\n'), /No "HDR/)
})

test('MODIS subset: scales NDVI, drops fill pixels, and nulls composites with too few valid pixels', () => {
  const json = {
    scale: '0.0001',
    subset: [
      { calendar_date: '2020-01-01', modis_date: 'A2020001', data: [5000, 6000, -3000, 7000] },
      { calendar_date: '2020-01-17', modis_date: 'A2020017', data: [-3000, -3000, -3000, 5000] },
      { modis_date: 'A2020033', data: [[8000, 8000]] },
    ],
  }
  const r = parseModisSubset(json)
  assert.equal(r.points.length, 3)
  assert.ok(Math.abs((r.points[0].ndvi as number) - 0.6) < 1e-9) // mean(5000,6000,7000) x 0.0001
  assert.equal(r.points[1].ndvi, null)
  assert.equal(r.points[2].iso, '2020-02-02')
  assert.ok(Math.abs((r.points[2].ndvi as number) - 0.8) < 1e-9)
  assert.throws(() => parseModisSubset({}), ParseError)
  assert.equal(modisDateToIso('A2020001'), '2020-01-01')
  assert.throws(() => modisDateToIso('2020-01-01'), ParseError)
})
