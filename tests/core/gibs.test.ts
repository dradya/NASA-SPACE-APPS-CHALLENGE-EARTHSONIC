import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WORLD_BBOX, bboxAround, imageryDate, snapToModis8Day, snapToMonthStart, snapshotUrl } from '../../src/core/gibs.ts'

test('snapshotUrl reproduces the example request published by NASA Earthdata (BBOX is south,west,north,east)', () => {
  // From NASA Earthdata, "Replacement of Worldview's Image Download Service".
  const url = snapshotUrl({
    layers: ['MODIS_Terra_CorrectedReflectance_TrueColor', 'Coastlines', 'MODIS_Terra_Thermal_Anomalies_All'], date: '2018-08-17',
    bbox: { south: 50.0986, west: -127.6736, north: 56.6041, east: -119.3484 }, width: 947, height: 740,
  })
  assert.equal(url, 'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2018-08-17&BBOX=50.0986,-127.6736,56.6041,-119.3484&CRS=EPSG:4326&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor,Coastlines,MODIS_Terra_Thermal_Anomalies_All&FORMAT=image/jpeg&WIDTH=947&HEIGHT=740')
})

test('snapshotUrl rejects a bad date or no layers; the world box spans the globe', () => {
  assert.throws(() => snapshotUrl({ layers: ['x'], date: '17/08/2018', bbox: WORLD_BBOX, width: 1, height: 1 }), TypeError)
  assert.throws(() => snapshotUrl({ layers: [], date: '2018-08-17', bbox: WORLD_BBOX, width: 1, height: 1 }), TypeError)
  assert.match(snapshotUrl({ layers: ['L'], date: '2020-01-01', bbox: WORLD_BBOX, width: 8, height: 4, format: 'image/png' }), /BBOX=-90,-180,90,180&.*FORMAT=image\/png/)
})

test('bboxAround clamps to the globe', () => {
  assert.deepEqual(bboxAround(10, 20, 2), { south: 8, west: 18, north: 12, east: 22 })
  assert.deepEqual(bboxAround(89, 179, 5), { south: 84, west: 174, north: 90, east: 180 })
})

test('MODIS 8-day composites start on day 1, 9, 17, ... and restart each January', () => {
  assert.equal(snapToModis8Day('2020-01-01'), '2020-01-01')
  assert.equal(snapToModis8Day('2020-01-08'), '2020-01-01')
  assert.equal(snapToModis8Day('2020-01-09'), '2020-01-09')
  assert.equal(snapToModis8Day('2020-02-18'), '2020-02-18') // day 49 = 1 + 6 x 8 (the first Terra composite)
  assert.equal(snapToModis8Day('2021-12-31'), '2021-12-27') // day 365 -> composite starting day 361
  assert.throws(() => snapToModis8Day('nope'), TypeError)
})

test('monthly and daily imagery dates', () => {
  assert.equal(snapToMonthStart('2020-05-17'), '2020-05-01')
  assert.equal(imageryDate('monthly', '2020-05-17'), '2020-05-01')
  assert.equal(imageryDate('8-day', '2020-01-12'), '2020-01-09')
  assert.equal(imageryDate('daily', '2020-05-17'), '2020-05-17')
})
