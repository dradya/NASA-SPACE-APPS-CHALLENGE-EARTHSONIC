import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PHENOMENA, PHENOMENON_IDS, VEGETATION_SITES, isPhenomenonId } from '../../src/registry/phenomena.ts'
import { MAPPINGS } from '../../src/core/mappings.ts'
import { renderMappingDocs } from '../../src/registry/mappingDocs.ts'
import { brightnessToCutoffHz, volumeToGain } from '../../src/audio/audioMath.ts'

test('every phenomenon states its source, units, resolution, access, explanation and limitations', () => {
  assert.deepEqual([...PHENOMENON_IDS].sort(), Object.keys(MAPPINGS).sort())
  for (const id of PHENOMENON_IDS) {
    const p = PHENOMENA[id]
    assert.equal(p.id, id)
    for (const field of ['title', 'short', 'tagline', 'hearing', 'datasetName', 'nasaSource', 'sourceUrl', 'units', 'coverage', 'temporalResolution', 'spatialResolution', 'accessNote', 'citation', 'credit', 'alignmentNote'] as const) {
      assert.ok(String(p[field]).trim().length > 5, `${id}.${field}`)
    }
    assert.ok(p.stepNoun.length >= 3, `${id}.stepNoun`)
    assert.ok(p.explanation.length >= 2 && p.limitations.length >= 3, id)
    assert.ok(p.visual.description.length > 30, id)
    assert.match(p.sourceUrl, /^https:\/\//)
    assert.ok(p.doi === null || /^10\.\d{4,}\//.test(p.doi), id)
    assert.equal(p.access === 'earthdata-login', p.getFile !== null, `${id}: login-only sources must explain how to supply a file`)
    if (p.nasaVisualization) assert.match(p.nasaVisualization.url, /^https:\/\/svs\.gsfc\.nasa\.gov\/\d+$/)
  }
})

test('only sea level needs a login; the others are public', () => {
  assert.deepEqual(PHENOMENON_IDS.filter((i) => PHENOMENA[i].access === 'earthdata-login'), ['sea-level'])
})

test('vegetation sites match data-pipeline/sites.json (single source for the Python snapshot script)', () => {
  const file = JSON.parse(readFileSync(new URL('../../data-pipeline/sites.json', import.meta.url), 'utf8')) as { sites: typeof VEGETATION_SITES }
  assert.deepEqual(file.sites, VEGETATION_SITES)
  assert.deepEqual(PHENOMENA.vegetation.sites, VEGETATION_SITES)
  for (const s of VEGETATION_SITES) assert.ok(Math.abs(s.lat) <= 90 && Math.abs(s.lon) <= 180)
})

test('imagery candidates are well-formed', () => {
  const img = PHENOMENA.vegetation.imagery
  assert.ok(img && img.candidates.length >= 1)
  for (const c of img.candidates) assert.match(c.layer, /^[A-Za-z0-9_]+$/)
  assert.ok(PHENOMENA['global-temperature'].imagery === null)
})

test('isPhenomenonId guards unknown values (also Object.prototype names)', () => {
  assert.equal(isPhenomenonId('sea-level'), true)
  assert.equal(isPhenomenonId('nope'), false)
  assert.equal(isPhenomenonId('toString'), false)
  assert.equal(isPhenomenonId(null), false)
})

test('docs/SONIFICATION_MAPPINGS.md is up to date with the real mappings (run `npm run docs` if this fails)', () => {
  const onDisk = readFileSync(new URL('../../docs/SONIFICATION_MAPPINGS.md', import.meta.url), 'utf8')
  assert.equal(onDisk, renderMappingDocs())
})

test('audio helper math: brightness spans 400 Hz to 8 kHz; the volume slider is perceptual', () => {
  assert.ok(Math.abs(brightnessToCutoffHz(0) - 400) < 1e-9)
  assert.ok(Math.abs(brightnessToCutoffHz(1) - 8000) < 1e-6)
  assert.ok(brightnessToCutoffHz(0.5) > brightnessToCutoffHz(0.4))
  assert.equal(volumeToGain(0), 0)
  assert.equal(volumeToGain(1), 1)
  assert.ok(Math.abs(volumeToGain(0.5) - 0.25) < 1e-12)
})
