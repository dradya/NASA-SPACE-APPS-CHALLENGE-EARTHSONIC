// Loader tests use a FAKE fetch with fixture text. They prove snapshot/live ordering, retries, error kinds and caching.
// They do NOT prove NASA's servers answer: data-pipeline/scripts/check_data_access.py and the app itself do.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LoadFailure, asLoadError, clearDataCache, datasetFromFile, fetchText, loadPhenomenon, ornlChunks, ornlPath } from '../../src/data/loaders.ts'
import { gistempFixture, gmslFixture, modisJson, nsidcFixture } from './fixtures.ts'
import { VEGETATION_SITES } from '../../src/registry/phenomena.ts'

type Route = (url: string) => { status?: number; body?: string; type?: string } | 'throw'
function fakeFetch(route: Route) {
  const calls: string[] = []
  const f = (async (input: string) => {
    calls.push(String(input))
    const r = route(String(input))
    if (r === 'throw') throw new TypeError('offline')
    return new Response(r.body ?? '', { status: r.status ?? 200, headers: { 'content-type': r.type ?? 'text/plain' } })
  }) as unknown as typeof fetch
  return { f, calls }
}
const fast = { sleep: async () => undefined, now: () => new Date('2026-11-10T00:00:00Z') }
const HTML = { body: '<!doctype html><html></html>', type: 'text/html' }

test('a bundled snapshot is preferred, and its manifest supplies the provenance', async () => {
  clearDataCache()
  const { f, calls } = fakeFetch((u) => {
    if (u.endsWith('manifest.json')) return { body: JSON.stringify({ files: [{ name: 'GLB.Ts+dSST.csv', sourceUrl: 'https://x', accessedUtc: '2026-11-09T10:00:00Z', sha256: 'abc' }] }) }
    if (u === '/data/global-temperature/GLB.Ts+dSST.csv') return { body: gistempFixture() }
    return { status: 404 }
  })
  const ds = await loadPhenomenon('global-temperature', { fetchFn: f, ...fast })
  assert.equal(ds.provenance.origin, 'snapshot')
  assert.equal(ds.provenance.retrievedUtc, '2026-11-09T10:00:00Z')
  assert.equal(ds.provenance.sha256, 'abc')
  assert.ok(!calls.some((c) => c.startsWith('/nasa/giss/GLB')), 'no live request when a snapshot exists')
  assert.equal(ds.steps.length, 99)
})

test('without a snapshot (the host answers with a web page) it falls back to the live NASA proxy', async () => {
  clearDataCache()
  const { f, calls } = fakeFetch((u) => (u.startsWith('/nasa/giss/GLB') ? { body: gistempFixture() } : u.startsWith('/nasa/giss/Zon') ? { status: 404 } : HTML))
  const ds = await loadPhenomenon('global-temperature', { fetchFn: f, ...fast })
  assert.equal(ds.provenance.origin, 'live')
  assert.equal(ds.provenance.retrievedUtc, '2026-11-10T00:00:00.000Z')
  assert.ok(calls.includes('/nasa/giss/GLB.Ts+dSST.csv'))
  assert.ok(ds.notes.some((n) => /latitude-band file was not available/.test(n)))
})

test('when neither a snapshot nor NASA can be reached the error says so and offers a file', async () => {
  clearDataCache()
  const { f } = fakeFetch((u) => (u.includes('/nasa/') ? { status: 404 } : HTML))
  await assert.rejects(loadPhenomenon('sea-ice', { fetchFn: f, ...fast }), (e: unknown) => {
    assert.ok(e instanceof LoadFailure)
    assert.equal(e.info.kind, 'unavailable')
    assert.equal(e.info.needsFile, true)
    return true
  })
})

test('network errors and 5xx are retried (up to 2 retries); 404 and other 4xx are not', async () => {
  let n = 0
  const flaky = fakeFetch(() => (++n < 3 ? 'throw' : { body: 'ok' }))
  assert.equal(await fetchText('/x', { fetchFn: flaky.f, ...fast }), 'ok')
  assert.equal(flaky.calls.length, 3)
  const down = fakeFetch(() => ({ status: 503 }))
  await assert.rejects(fetchText('/x', { fetchFn: down.f, ...fast }), (e: unknown) => e instanceof LoadFailure && e.info.kind === 'http' && e.info.retryable)
  assert.equal(down.calls.length, 3)
  const gone = fakeFetch(() => ({ status: 404 }))
  await assert.rejects(fetchText('/x', { fetchFn: gone.f, ...fast }), (e: unknown) => e instanceof LoadFailure && e.info.kind === 'unavailable')
  assert.equal(gone.calls.length, 1)
  const forbidden = fakeFetch(() => ({ status: 403 }))
  await assert.rejects(fetchText('/x', { fetchFn: forbidden.f, ...fast }), (e: unknown) => e instanceof LoadFailure && e.info.kind === 'http' && !e.info.retryable)
  assert.equal(forbidden.calls.length, 1)
  const offline = fakeFetch(() => 'throw')
  await assert.rejects(fetchText('/x', { fetchFn: offline.f, ...fast }), (e: unknown) => e instanceof LoadFailure && e.info.kind === 'network')
})

test('a file that is not what we expect is a parse error, never guessed at', async () => {
  clearDataCache()
  const { f } = fakeFetch((u) => (u.startsWith('/nasa/giss/GLB') ? { body: '<html>Access denied</html>', type: 'text/plain' } : HTML))
  await assert.rejects(loadPhenomenon('global-temperature', { fetchFn: f, ...fast }), (e: unknown) => {
    const info = asLoadError(e)
    assert.equal(info.kind, 'parse')
    assert.equal(info.retryable, false)
    assert.match(info.message, /GISTEMP global file could not be read/)
    return true
  })
})

test('sea level needs a bundled file (login-only source); with a manifest it loads', async () => {
  clearDataCache()
  const none = fakeFetch(() => HTML)
  await assert.rejects(loadPhenomenon('sea-level', { fetchFn: none.f, ...fast }), (e: unknown) => e instanceof LoadFailure && e.info.needsFile === true)
  clearDataCache()
  const ok = fakeFetch((u) => (u.endsWith('manifest.json') ? { body: JSON.stringify({ files: [{ name: 'gmsl.txt', sourceUrl: 'https://podaac', accessedUtc: '2026-11-01T00:00:00Z', sha256: 'h' }] }) } : u.endsWith('gmsl.txt') ? { body: gmslFixture() } : { status: 404 }))
  const ds = await loadPhenomenon('sea-level', { fetchFn: ok.f, ...fast })
  assert.equal(ds.phenomenonId, 'sea-level')
  assert.equal(ds.provenance.sha256, 'h')
})

test('vegetation: a year is read in three requests (10 composites each at most) and merged in date order', async () => {
  clearDataCache()
  const site = VEGETATION_SITES[0]
  assert.deepEqual(ornlChunks(2020), [{ start: 'A2020001', end: 'A2020145' }, { start: 'A2020161', end: 'A2020305' }, { start: 'A2020321', end: 'A2020353' }])
  assert.match(ornlPath(site, ornlChunks(2020)[0]), /^\/nasa\/ornl\/MOD13Q1\/subset\?latitude=-3\.1&longitude=-60&band=250m_16_days_NDVI&startDate=A2020001&endDate=A2020145&kmAboveBelow=1&kmLeftRight=1$/)
  const all = modisJson(2020) as { scale: string; subset: unknown[] }
  const slices = [all.subset.slice(0, 10), all.subset.slice(10, 20), all.subset.slice(20)]
  const { f, calls } = fakeFetch((u) => {
    if (u.startsWith('/data/')) return HTML
    const i = u.includes('startDate=A2020001') ? 0 : u.includes('startDate=A2020161') ? 1 : 2
    return { body: JSON.stringify({ scale: all.scale, subset: slices[2 - i] }) } // returned out of order on purpose
  })
  const ds = await loadPhenomenon('vegetation', { site, year: 2020, fetchFn: f, ...fast })
  assert.equal(calls.filter((c) => c.startsWith('/nasa/ornl')).length, 3)
  assert.equal(ds.steps.length, 23)
  assert.deepEqual(ds.steps.map((s) => s.label), [...ds.steps.map((s) => s.label)].sort())
  assert.equal(ds.provenance.origin, 'live')
  assert.ok(ds.measures.ndvi.values.every((v) => v !== null && v > 0.3 && v < 0.6))
})

test('vegetation rejects years outside the MODIS record and missing choices', async () => {
  const { f } = fakeFetch(() => HTML)
  const site = VEGETATION_SITES[1]
  for (const year of [1999, 2000, 2027, 2020.5]) {
    await assert.rejects(loadPhenomenon('vegetation', { site, year, fetchFn: f, ...fast, refresh: true }), (e: unknown) => e instanceof LoadFailure && e.info.kind === 'validation', String(year))
  }
  await assert.rejects(loadPhenomenon('vegetation', { fetchFn: f, ...fast, refresh: true }), (e: unknown) => e instanceof LoadFailure && e.info.kind === 'validation')
})

test('results are cached, a refresh fetches again, and failures are not cached', async () => {
  clearDataCache()
  const ok = fakeFetch((u) => (u.startsWith('/nasa/nsidc/N_seaice_extent_daily_v4.0') ? { body: nsidcFixture() } : u.includes('/nasa/') ? { status: 404 } : HTML))
  await loadPhenomenon('sea-ice', { fetchFn: ok.f, ...fast })
  const after = ok.calls.length
  await loadPhenomenon('sea-ice', { fetchFn: ok.f, ...fast })
  assert.equal(ok.calls.length, after)
  await loadPhenomenon('sea-ice', { fetchFn: ok.f, ...fast, refresh: true })
  assert.ok(ok.calls.length > after)
  clearDataCache()
  const bad = fakeFetch(() => ({ status: 404 }))
  await assert.rejects(loadPhenomenon('sea-ice', { fetchFn: bad.f, ...fast }))
  const good = fakeFetch((u) => (u.startsWith('/nasa/nsidc/N_seaice_extent_daily_v4.0') ? { body: nsidcFixture() } : { status: 404 }))
  assert.ok((await loadPhenomenon('sea-ice', { fetchFn: good.f, ...fast })).steps.length > 0) // the earlier failure did not stick
})

test('a file the user chooses is parsed locally and labelled as such', async () => {
  const ds = await datasetFromFile('global-temperature', { name: 'mine.csv', text: async () => gistempFixture() }, () => new Date('2026-11-10T12:00:00Z'))
  assert.equal(ds.provenance.origin, 'file')
  assert.equal(ds.provenance.fileName, 'mine.csv')
  assert.equal(ds.status, 'real')
  await assert.rejects(datasetFromFile('sea-level', { name: 'x', text: async () => 'not a gmsl file' }), (e: unknown) => asLoadError(e).kind === 'parse')
  await assert.rejects(datasetFromFile('vegetation', { name: 'x', text: async () => '' }), (e: unknown) => asLoadError(e).kind === 'validation')
})
