// Gets real NASA data into the app. Order for every public source:
//   1. a bundled snapshot in /data/<phenomenon>/ (made by data-pipeline/scripts/snapshot_data.py, with provenance),
//   2. a live request to NASA through a same-origin proxy (/nasa/..., see vite.config.ts and vercel.json),
//   3. a file the user chooses (datasetFromFile).
// A failure is reported with a typed reason; it is NEVER replaced with invented data.
import type { DataLoadError, Dataset, DatasetProvenance, PhenomenonId } from '../core/types.ts'
import { ParseError, parseGistempGlobal, parseGistempZonal, parseGmslAscii, parseModisSubset, parseNsidcDaily, type NdviPoint } from '../core/parsers.ts'
import { buildSeaIceDataset, buildSeaLevelDataset, buildTemperatureDataset, buildVegetationDataset } from '../core/datasets.ts'
import type { Site } from '../registry/phenomena.ts'

export class LoadFailure extends Error {
  info: DataLoadError
  constructor(info: DataLoadError) {
    super(info.message)
    this.name = 'LoadFailure'
    this.info = info
  }
}

export interface LoadOptions {
  fetchFn?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  now?: () => Date
  refresh?: boolean
}

interface ManifestFile { name: string; sourceUrl: string; accessedUtc: string; sha256: string }
interface Manifest { files: ManifestFile[] }

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const unavailable = (message: string, needsFile = false): LoadFailure => new LoadFailure({ kind: 'unavailable', retryable: false, message, needsFile })
const dataUrl = (path: string) => `${import.meta.env?.BASE_URL ?? '/'}${path}`

/** GET text with up to 2 retries for network errors and 5xx. A 404, or an HTML page where data was expected (a hosting fallback), means "not available here". */
export async function fetchText(url: string, o: LoadOptions = {}): Promise<string> {
  const f = o.fetchFn ?? fetch
  const sleep = o.sleep ?? realSleep
  let last: LoadFailure | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(attempt === 1 ? 400 : 1200)
    let res: Response
    try {
      res = await f(url)
    } catch {
      last = new LoadFailure({ kind: 'network', retryable: true, message: `Could not reach ${url}. Check your internet connection.` })
      continue
    }
    if (res.status >= 500) {
      last = new LoadFailure({ kind: 'http', retryable: true, message: `The server answered ${res.status} for ${url}.` })
      continue
    }
    if (res.status === 404) throw unavailable(`${url} was not found.`)
    if (!res.ok) throw new LoadFailure({ kind: 'http', retryable: false, message: `The server answered ${res.status} for ${url}.` })
    if ((res.headers.get('content-type') ?? '').includes('text/html')) throw unavailable(`${url} returned a web page instead of data.`)
    return res.text()
  }
  throw last as LoadFailure
}

async function readManifest(id: PhenomenonId, o: LoadOptions): Promise<Manifest | null> {
  try {
    const m = JSON.parse(await fetchText(dataUrl(`data/${id}/manifest.json`), o)) as Manifest
    return Array.isArray(m.files) ? m : null
  } catch {
    return null
  }
}

interface Got { text: string; origin: 'snapshot' | 'live'; file: ManifestFile | null; url: string }

/** Snapshot first, then live. Throws `unavailable` only when neither works. */
async function getPublic(id: PhenomenonId, names: string[], livePath: (name: string) => string, man: Manifest | null, o: LoadOptions): Promise<Got> {
  const failures: string[] = []
  for (const name of names) {
    try {
      return { text: await fetchText(dataUrl(`data/${id}/${name}`), o), origin: 'snapshot', file: man?.files.find((f) => f.name === name) ?? null, url: dataUrl(`data/${id}/${name}`) }
    } catch (e) {
      if (e instanceof LoadFailure && e.info.kind !== 'unavailable') throw e
    }
  }
  for (const name of names) {
    try {
      return { text: await fetchText(livePath(name), o), origin: 'live', file: null, url: livePath(name) }
    } catch (e) {
      if (e instanceof LoadFailure && e.info.kind === 'unavailable') { failures.push(e.message); continue }
      throw e
    }
  }
  throw unavailable(`No NASA data could be loaded: no snapshot is bundled and the live NASA request failed (${failures.join(' ')}). Run the snapshot script (see README) or choose a file you downloaded.`, true)
}

function provenance(g: Got, sourceName: string, sourceUrl: string, o: LoadOptions): DatasetProvenance {
  return {
    sourceName, sourceUrl, origin: g.origin, fileName: g.file?.name ?? g.url.split('/').pop() ?? null,
    retrievedUtc: g.file?.accessedUtc ?? (g.origin === 'live' ? (o.now ?? (() => new Date()))().toISOString() : null), sha256: g.file?.sha256 ?? null,
  }
}

function parsing<T>(what: string, fn: () => T): T {
  try {
    return fn()
  } catch (e) {
    if (e instanceof ParseError) throw new LoadFailure({ kind: 'parse', retryable: false, message: `The ${what} file could not be read: ${e.message}` })
    throw e
  }
}

// --- the phenomena ---------------------------------------------------------------------------------------
const GISS = 'https://data.giss.nasa.gov/gistemp/'
const GLB = 'GLB.Ts+dSST.csv'
const ZON = 'ZonAnn.Ts+dSST.csv'

async function loadTemperature(o: LoadOptions): Promise<Dataset> {
  const man = await readManifest('global-temperature', o)
  const live = (n: string) => `/nasa/giss/${n}`
  const glb = await getPublic('global-temperature', [GLB], live, man, o)
  let zonal = null
  try {
    const z = await getPublic('global-temperature', [ZON], live, man, o)
    zonal = parsing('GISTEMP latitude-band', () => parseGistempZonal(z.text))
  } catch { /* optional: the global voice still plays */ }
  const parsed = parsing('GISTEMP global', () => parseGistempGlobal(glb.text))
  return buildTemperatureDataset(parsed, zonal, provenance(glb, 'NASA GISS GISTEMP v4 (Land-Ocean Temperature Index)', GISS, o))
}

async function loadSeaIce(o: LoadOptions): Promise<Dataset> {
  const man = await readManifest('sea-ice', o)
  const names = [...(man?.files.map((f) => f.name) ?? []), 'N_seaice_extent_daily_v4.0.csv', 'N_seaice_extent_daily_v3.0.csv'].filter((n, i, a) => a.indexOf(n) === i)
  const got = await getPublic('sea-ice', names, (n) => `/nasa/nsidc/${n}`, man, o)
  return buildSeaIceDataset(parsing('NSIDC sea ice', () => parseNsidcDaily(got.text)), provenance(got, 'NSIDC Sea Ice Index v4 (daily Arctic extent)', 'https://noaadata.apps.nsidc.org/NOAA/G02135/', o))
}

async function loadSeaLevel(o: LoadOptions): Promise<Dataset> {
  const man = await readManifest('sea-level', o)
  const file = man?.files[0]
  if (!file) throw unavailable('No sea level file is bundled with this copy of the app. NASA requires a free Earthdata Login to download it: choose the file you downloaded, or run the snapshot script.', true)
  const text = await fetchText(dataUrl(`data/sea-level/${file.name}`), o)
  const got: Got = { text, origin: 'snapshot', file, url: dataUrl(`data/sea-level/${file.name}`) }
  return buildSeaLevelDataset(parsing('sea level', () => parseGmslAscii(text)), provenance(got, 'NASA Sea Level Change Team, GSFC global mean sea level (PO.DAAC)', file.sourceUrl, o))
}

/** The MODIS web service returns at most 10 composites per request, so a year is read in 3 requests. */
export function ornlChunks(year: number): { start: string; end: string }[] {
  return [['001', '145'], ['161', '305'], ['321', '353']].map(([a, b]) => ({ start: `A${year}${a}`, end: `A${year}${b}` }))
}

export function ornlPath(site: Site, chunk: { start: string; end: string }): string {
  return `/nasa/ornl/MOD13Q1/subset?latitude=${site.lat}&longitude=${site.lon}&band=250m_16_days_NDVI&startDate=${chunk.start}&endDate=${chunk.end}&kmAboveBelow=1&kmLeftRight=1`
}

async function loadVegetation(site: Site, year: number, o: LoadOptions): Promise<Dataset> {
  const maxYear = (o.now ?? (() => new Date()))().getFullYear() - 1
  if (!Number.isInteger(year) || year < 2001 || year > maxYear) throw new LoadFailure({ kind: 'validation', retryable: false, message: `Choose a year from 2001 to ${maxYear}.` })
  const parts: { points: NdviPoint[]; notes: string[] }[] = []
  let origin: 'snapshot' | 'live' = 'snapshot'
  let snap: string | null = null
  try {
    snap = await fetchText(dataUrl(`data/vegetation/${site.id}-${year}.json`), o)
  } catch (e) {
    if (e instanceof LoadFailure && e.info.kind !== 'unavailable') throw e
  }
  const texts = snap !== null ? [snap] : (origin = 'live', await Promise.all(ornlChunks(year).map((c) => fetchText(ornlPath(site, c), o))))
  for (const t of texts) parts.push(parsing('MODIS NDVI', () => { try { return parseModisSubset(JSON.parse(t)) } catch (e) { if (e instanceof SyntaxError) throw new ParseError('The response was not valid JSON.'); throw e } }))
  const points = parts.flatMap((p) => p.points).sort((a, b) => (a.iso < b.iso ? -1 : 1))
  if (points.length === 0) throw unavailable(`The MODIS service returned no composites for ${site.name} in ${year}.`)
  const got: Got = { text: '', origin, file: null, url: origin === 'live' ? ornlPath(site, ornlChunks(year)[0]) : dataUrl(`data/vegetation/${site.id}-${year}.json`) }
  return buildVegetationDataset(points, site.name, provenance(got, 'MODIS/Terra MOD13Q1 NDVI via NASA ORNL DAAC web service', 'https://modis.ornl.gov/', o), parts.flatMap((p) => p.notes))
}

// --- public entry points ----------------------------------------------------------------------------------
const cache = new Map<string, Promise<Dataset>>()

export function loadPhenomenon(id: PhenomenonId, opts: LoadOptions & { site?: Site; year?: number } = {}): Promise<Dataset> {
  const key = `${id}|${opts.site?.id ?? ''}|${opts.year ?? ''}`
  if (!opts.refresh && cache.has(key)) return cache.get(key) as Promise<Dataset>
  const run = async (): Promise<Dataset> => {
    if (id === 'global-temperature') return loadTemperature(opts)
    if (id === 'sea-ice') return loadSeaIce(opts)
    if (id === 'sea-level') return loadSeaLevel(opts)
    if (!opts.site || opts.year === undefined) throw new LoadFailure({ kind: 'validation', retryable: false, message: 'Choose a site and a year.' })
    return loadVegetation(opts.site, opts.year, opts)
  }
  const p = run()
  cache.set(key, p)
  p.catch(() => cache.delete(key)) // failures are never cached
  return p
}

export function clearDataCache(): void {
  cache.clear()
}

/** Read a NASA file the user chose. It stays in the browser; nothing is uploaded. */
export async function datasetFromFile(id: PhenomenonId, file: { name: string; text(): Promise<string> }, now: () => Date = () => new Date()): Promise<Dataset> {
  const prov = (sourceName: string, sourceUrl: string): DatasetProvenance => ({ sourceName, sourceUrl, origin: 'file', retrievedUtc: now().toISOString(), fileName: file.name, sha256: null })
  const text = await file.text()
  if (id === 'global-temperature') return buildTemperatureDataset(parsing('GISTEMP', () => parseGistempGlobal(text)), null, prov('NASA GISS GISTEMP v4 (file chosen by the user)', GISS))
  if (id === 'sea-ice') return buildSeaIceDataset(parsing('NSIDC sea ice', () => parseNsidcDaily(text)), prov('NSIDC Sea Ice Index v4 (file chosen by the user)', 'https://noaadata.apps.nsidc.org/NOAA/G02135/'))
  if (id === 'sea-level') return buildSeaLevelDataset(parsing('sea level', () => parseGmslAscii(text)), prov('NASA GSFC global mean sea level (file chosen by the user)', 'https://podaac.jpl.nasa.gov/'))
  throw new LoadFailure({ kind: 'validation', retryable: false, message: 'Loading your own file is not offered for vegetation; it is fetched from NASA by site and year.' })
}

export function asLoadError(e: unknown): DataLoadError {
  if (e instanceof LoadFailure) return e.info
  if (e instanceof ParseError) return { kind: 'parse', retryable: false, message: e.message }
  return { kind: 'network', retryable: true, message: e instanceof Error ? e.message : 'Something went wrong while loading the data.' }
}
