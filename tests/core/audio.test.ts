// "Does the sound respond to the data?" These tests render real audio from real pipeline output (dataset -> mapping -> score
// -> samples) and then ANALYSE the samples with a Goertzel detector. Data here are synthetic demo/fixture values.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { buildDemoDataset } from '../../src/core/datasets.ts'
import { MAPPINGS } from '../../src/core/mappings.ts'
import { buildScore } from '../../src/core/score.ts'
import { encodeWav16, renderScore } from '../../src/core/wav.ts'
import { semitoneMap } from '../../src/core/series.ts'
import type { MappingSpec, PhenomenonId } from '../../src/core/types.ts'

function goertzel(x: Float32Array, sr: number, f: number): number {
  const w = (2 * Math.PI * f) / sr
  const c = 2 * Math.cos(w)
  let s1 = 0, s2 = 0
  for (let i = 0; i < x.length; i++) { const s = x[i] + c * s1 - s2; s2 = s1; s1 = s }
  return s1 * s1 + s2 * s2 - c * s1 * s2
}
function dominant(x: Float32Array, sr: number, lo: number, hi: number): number {
  let best = lo, bestP = -1
  for (let f = lo; f <= hi; f *= 1.004) { const p = goertzel(x, sr, f); if (p > bestP) { bestP = p; best = f } }
  return best
}
const single = (spec: MappingSpec, voice: string): MappingSpec => ({ ...spec, voices: spec.voices.filter((v) => v.id === voice) })
const SCI = { mode: 'scientific', intensity: 0.5 } as const

test('the pitch you hear follows the data: rendered audio at the lowest, middle and highest values', () => {
  const ds = buildDemoDataset('global-temperature')
  const spec = MAPPINGS['global-temperature']
  const pm = spec.voices.find((v) => v.id === 'global')!.pitch!
  const values = ds.measures.global.values as number[]
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const picks = [order[0], order[Math.floor(order.length / 2)], order[order.length - 1]]
  const heard: number[] = []
  for (const p of picks) {
    const score = buildScore(ds, single(spec, 'global'), { from: p.i, to: p.i + 1 }, SCI)
    const pcm = renderScore(score, { sampleRate: 22050, secondsPerStep: 0.5, tailSeconds: 0 })
    const f = dominant(pcm.left, pcm.sampleRate, 150, 1200)
    const expected = semitoneMap(p.v, pm.domain, pm.freqRange)
    assert.ok(Math.abs(f - expected) / expected < 0.02, `value ${p.v.toFixed(2)}: heard ${f.toFixed(1)} Hz, expected ${expected.toFixed(1)} Hz`)
    heard.push(f)
  }
  assert.ok(heard[0] < heard[1] && heard[1] < heard[2], `pitches should rise with value: ${heard.join(', ')}`)
})

test('less sea ice is audibly lower (September voice), across the whole demo record', () => {
  const ds = buildDemoDataset('sea-ice')
  const spec = single(MAPPINGS['sea-ice'], 'september')
  const freqAt = (i: number) => {
    const pcm = renderScore(buildScore(ds, spec, { from: i, to: i + 1 }, SCI), { tailSeconds: 0 })
    return dominant(pcm.left, pcm.sampleRate, 110, 700)
  }
  const first = freqAt(0)
  const last = freqAt(ds.steps.length - 1)
  assert.ok(last < first * 0.9, `first ${first.toFixed(1)} Hz, last ${last.toFixed(1)} Hz`)
})

test('richer vegetation sounds brighter: more overtone energy at higher NDVI', () => {
  const ds = buildDemoDataset('vegetation')
  const spec = single(MAPPINGS.vegetation, 'canopy')
  const v = ds.measures.ndvi.values as number[]
  const lowI = v.indexOf(Math.min(...v)), highI = v.indexOf(Math.max(...v))
  const overtoneShare = (i: number) => {
    const score = buildScore(ds, spec, { from: i, to: i + 1 }, SCI)
    const f0 = score.events[0].freqHz
    const pcm = renderScore(score, { tailSeconds: 0 })
    const total = [1, 2, 3, 4, 5, 6].reduce((s, k) => s + goertzel(pcm.left, pcm.sampleRate, f0 * k), 0)
    return 1 - goertzel(pcm.left, pcm.sampleRate, f0) / total
  }
  assert.ok(overtoneShare(highI) > overtoneShare(lowI) + 0.05, `high ${overtoneShare(highI)}, low ${overtoneShare(lowI)}`)
})

test('stereo position: the Arctic voice is in the right ear, the tropics voice in the left', () => {
  const ds = buildDemoDataset('global-temperature')
  const energy = (voice: string) => {
    const pcm = renderScore(buildScore(ds, single(MAPPINGS['global-temperature'], voice), { from: 5, to: 8 }, SCI), { tailSeconds: 0 })
    const sum = (a: Float32Array) => a.reduce((s, x) => s + x * x, 0)
    return { l: sum(pcm.left), r: sum(pcm.right) }
  }
  assert.ok(energy('arctic').r > energy('arctic').l * 3)
  assert.ok(energy('tropics').l > energy('tropics').r * 3)
})

test('rendering is reproducible: same data and settings give byte-identical audio; different data does not', () => {
  const ds = buildDemoDataset('global-temperature')
  const spec = MAPPINGS['global-temperature']
  const wav = (d = ds, mode: 'scientific' | 'musical' = 'scientific') =>
    createHash('sha256').update(encodeWav16(renderScore(buildScore(d, spec, { from: 0, to: 12 }, { mode, intensity: 0.5 })))).digest('hex')
  assert.equal(wav(), wav())
  assert.notEqual(wav(), wav(ds, 'musical'))
  const bumped = { ...ds, measures: { ...ds.measures, global: { ...ds.measures.global, values: ds.measures.global.values.map((v, i) => (i === 3 && v !== null ? v + 0.5 : v)) } } }
  assert.notEqual(wav(), wav(bumped))
})

test('output is a valid, never-clipping, finite stereo WAV for every phenomenon', () => {
  for (const id of ['global-temperature', 'sea-level', 'sea-ice', 'vegetation'] as PhenomenonId[]) {
    const ds = buildDemoDataset(id)
    const pcm = renderScore(buildScore(ds, MAPPINGS[id], { from: 0, to: Math.min(15, ds.steps.length) }, SCI))
    let peak = 0
    for (const ch of [pcm.left, pcm.right]) for (const x of ch) { assert.ok(Number.isFinite(x)); peak = Math.max(peak, Math.abs(x)) }
    assert.ok(peak > 0.05 && peak <= 0.9 + 1e-6, `${id}: peak ${peak}`)
    const bytes = encodeWav16(pcm)
    const dv = new DataView(bytes.buffer)
    const tag = (o: number) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3])
    assert.equal(tag(0), 'RIFF'); assert.equal(tag(8), 'WAVE'); assert.equal(tag(36), 'data')
    assert.equal(dv.getUint16(22, true), 2)
    assert.equal(dv.getUint32(24, true), pcm.sampleRate)
    assert.equal(bytes.length, 44 + pcm.left.length * 4)
    assert.equal(dv.getUint32(40, true), pcm.left.length * 4)
  }
})
