import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clamp, formatNumber, mapRange, mean, olsSlope, runningRecords, semitoneMap, trailingSlope } from '../../src/core/series.ts'
import { extent, linePath, linearScale, niceTicks } from '../../src/core/charts.ts'

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`)

test('olsSlope recovers an exact line and refuses too little data', () => {
  close(olsSlope([0, 1, 2, 3], [1, 3, 5, 7]) as number, 2)
  assert.equal(olsSlope([1, 2], [1, 2]), null)
  assert.equal(olsSlope([5, 5, 5], [1, 2, 3]), null)
})

test('trailingSlope uses only the trailing window and skips missing values', () => {
  const xs = [0, 1, 2, 3, 4, 5, 6, 7]
  const ys = [0, 1, 2, 3, null, 5, 6, 7] // slope 1 everywhere
  const s = trailingSlope(ys, xs, 4)
  assert.equal(s[0], null) // not enough points yet
  close(s[3] as number, 1)
  close(s[7] as number, 1)
  const bent = trailingSlope([0, 0, 0, 0, 2, 4, 6, 8], xs, 4)
  close(bent[3] as number, 0)
  close(bent[7] as number, 2) // only the last four points count
})

test('runningRecords marks only values beyond everything before them', () => {
  assert.deepEqual(runningRecords([1, 3, 2, null, 4, 4, 5], 'high'), [false, true, false, false, true, false, true])
  assert.deepEqual(runningRecords([5, 4, 6, 3], 'low'), [false, true, false, true])
})

test('mapRange and semitoneMap clamp to the domain and hit the end points', () => {
  assert.equal(mapRange(5, [0, 10], [0, 1]), 0.5)
  assert.equal(mapRange(99, [0, 10], [0, 1]), 1)
  assert.equal(mapRange(99, [0, 10], [0, 1], false), 9.9)
  close(semitoneMap(0, [0, 10], [200, 800]), 200)
  close(semitoneMap(10, [0, 10], [200, 800]), 800)
  close(semitoneMap(5, [0, 10], [200, 800]), 400) // halfway = geometric mean = one octave above 200
  close(semitoneMap(-5, [0, 10], [200, 800]), 200)
})

test('small helpers', () => {
  assert.equal(clamp(5, 0, 3), 3)
  assert.equal(mean([]), null)
  assert.equal(mean([1, 2, 3]), 2)
  assert.equal(formatNumber(-0.0001), '0.00')
  assert.equal(formatNumber(1.236, 2), '1.24')
})

test('chart helpers: scale, extent, ticks, and a line that breaks at missing values', () => {
  const s = linearScale([0, 10], [100, 200])
  assert.equal(s(5), 150)
  assert.deepEqual(extent([null, 3, -1, 7]), [-1, 7])
  assert.equal(extent([null]), null)
  assert.deepEqual(niceTicks(0, 10, 5), [0, 2, 4, 6, 8, 10])
  assert.deepEqual(niceTicks(-0.5, 1.5, 4), [-0.5, 0, 0.5, 1, 1.5])
  const p = linePath([0, 1, 2, 3], [1, null, 2, 3], (x) => x * 10, (y) => y * 10)
  assert.equal(p, 'M0.0,10.0M20.0,20.0L30.0,30.0')
})
