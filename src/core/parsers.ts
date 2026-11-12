// Parsers for the NASA file formats EARTHSONIC reads. Strict on purpose: a file that is not what we expect raises a
// ParseError that says what is wrong, instead of guessing and quietly producing wrong data.
// Formats follow NASA's documentation for each product; where a layout is only partly verified (see docs/DATA_SOURCES.md)
// the parser checks the header and refuses to continue when it does not match.

export class ParseError extends Error {
  code: string
  constructor(message: string, code = 'parse') {
    super(message)
    this.name = 'ParseError'
    this.code = code
  }
}

function lines(text: string): string[] {
  return text.replace(/^\uFEFF/, '').split(/\r?\n/)
}

function cell(raw: string | undefined): number | null {
  const s = (raw ?? '').trim()
  if (s === '' || s.includes('*')) return null // GISTEMP marks missing values with ***
  const n = Number(s)
  if (!Number.isFinite(n)) throw new ParseError(`Unreadable number "${s}"`)
  return n
}

// --- GISTEMP -------------------------------------------------------------------------------------
export interface GistempGlobal {
  years: number[]
  /** January-December mean anomaly in degrees C relative to 1951-1980; null when the file has no value. */
  annual: (number | null)[]
}

function gistempTable(text: string, needed: string[]): { cols: string[]; rows: string[][] } {
  const all = lines(text)
  const h = all.findIndex((l) => /^\s*Year\s*,/i.test(l))
  if (h < 0) throw new ParseError('This does not look like a GISTEMP CSV file (no header line starting with "Year,").')
  const cols = all[h].split(',').map((c) => c.trim())
  const missing = needed.filter((n) => !cols.includes(n))
  if (missing.length > 0) {
    throw new ParseError(`GISTEMP header is missing column(s) ${missing.join(', ')}. Header found: ${cols.join(', ')}`)
  }
  const rows = all
    .slice(h + 1)
    .map((l) => l.split(','))
    .filter((r) => /^\s*\d{4}\s*$/.test(r[0] ?? ''))
  return { cols, rows }
}

function checkAnomalies(values: (number | null)[], what: string): void {
  for (const v of values) {
    if (v !== null && Math.abs(v) > 15) {
      throw new ParseError(`${what} contains ${v}, which is not a plausible anomaly in degrees C. The file may be in hundredths of a degree (the TXT format); use the CSV file.`)
    }
  }
}

export function parseGistempGlobal(text: string): GistempGlobal {
  const { cols, rows } = gistempTable(text, ['Year', 'J-D'])
  const jd = cols.indexOf('J-D')
  const years = rows.map((r) => Number(r[0]))
  const annual = rows.map((r) => cell(r[jd]))
  checkAnomalies(annual, 'J-D column')
  if (years.length < 50) throw new ParseError(`Only ${years.length} yearly rows found; expected the full record (1880 onward).`)
  return { years, annual }
}

export interface GistempZonal {
  years: number[]
  /** Annual mean anomalies per latitude band, in degrees C. */
  bands: { arctic: (number | null)[]; tropics: (number | null)[]; antarctic: (number | null)[]; global: (number | null)[] }
}

export function parseGistempZonal(text: string): GistempZonal {
  const names = ['Year', 'Glob', '64N-90N', '24S-24N', '90S-64S']
  const { cols, rows } = gistempTable(text, names)
  const col = (name: string) => cols.indexOf(name)
  const pick = (name: string) => rows.map((r) => cell(r[col(name)]))
  const bands = { global: pick('Glob'), arctic: pick('64N-90N'), tropics: pick('24S-24N'), antarctic: pick('90S-64S') }
  for (const [k, v] of Object.entries(bands)) checkAnomalies(v, `zonal band ${k}`)
  return { years: rows.map((r) => Number(r[0])), bands }
}

// --- NSIDC Sea Ice Index (daily extent) ---------------------------------------------------------------
export interface SeaIceDaily {
  rows: { year: number; month: number; day: number; extent: number | null }[]
}

export function parseNsidcDaily(text: string): SeaIceDaily {
  const all = lines(text)
  const h = all.findIndex((l) => /^\s*Year\s*,/i.test(l))
  if (h < 0) throw new ParseError('This does not look like an NSIDC Sea Ice Index CSV (no header line starting with "Year,").')
  const cols = all[h].split(',').map((c) => c.trim().toLowerCase())
  const ext = cols.indexOf('extent')
  if (ext < 0) throw new ParseError(`NSIDC header has no "Extent" column. Header found: ${cols.join(', ')}`)
  const rows: SeaIceDaily['rows'] = []
  for (const l of all.slice(h + 1)) {
    const t = l.split(',')
    if (!/^\s*\d{4}\s*$/.test(t[0] ?? '')) continue // skips the units row and blank lines
    const extent = Number(t[ext])
    rows.push({
      year: Number(t[0]),
      month: Number(t[1]),
      day: Number(t[2]),
      extent: Number.isFinite(extent) && extent > 0 && extent < 40 ? extent : null, // 10^6 km2; fill values become null
    })
  }
  if (rows.length < 1000) throw new ParseError(`Only ${rows.length} daily rows found; expected the full satellite record.`)
  return { rows }
}

// --- GSFC Global Mean Sea Level (ASCII with "HDR" header lines) ---------------------------------------
export interface GmslSeries {
  /** Decimal year of each altimeter cycle (for example 1993.0123). */
  times: number[]
  /** Millimetres, relative to the product's own reference; null for invalid. */
  values: (number | null)[]
  /** Header text of the column that was used, so the app can show exactly what the numbers are. */
  columnLabel: string
}

export function parseGmslAscii(text: string): GmslSeries {
  const all = lines(text)
  const descriptions = new Map<number, string>()
  for (const l of all) {
    if (!/^\s*HDR/i.test(l)) continue
    const m = /Column\s+(\d+)\s*:\s*(.*)$/i.exec(l)
    if (m) descriptions.set(Number(m[1]), m[2].trim())
  }
  if (descriptions.size === 0) {
    throw new ParseError('No "HDR ... Column N:" description lines found, so the columns cannot be identified. This does not look like the GSFC GMSL ASCII file.')
  }
  const timeCol = [...descriptions].find(([, d]) => /year\s*\+\s*fraction/i.test(d))?.[0]
  const candidates = [...descriptions].filter(
    ([, d]) => /smoothed/i.test(d) && /GIA\)?\s+applied/i.test(d) && !/GIA\)?\s+not\s+applied/i.test(d) && !/annual and semi-annual/i.test(d),
  )
  if (timeCol === undefined || candidates.length !== 1) {
    throw new ParseError(
      `Could not pick exactly one "smoothed, GIA applied" column. Time column: ${timeCol ?? 'not found'}. Candidates: ${candidates.map(([n, d]) => `${n}=${d}`).join(' | ') || 'none'}. Paste the first 20 lines of the file to Claude.`,
    )
  }
  const valueCol = candidates[0][0]
  const times: number[] = []
  const values: (number | null)[] = []
  for (const l of all) {
    if (/^\s*HDR/i.test(l) || l.trim() === '') continue
    const t = l.trim().split(/\s+/).map(Number)
    if (t.length < valueCol || t.some((x) => Number.isNaN(x))) continue
    const year = t[timeCol - 1]
    const v = t[valueCol - 1]
    if (!(year > 1990 && year < 2200)) continue
    times.push(year)
    values.push(Math.abs(v) < 1000 ? v : null) // fill values (very large numbers) are invalid, not data
  }
  if (times.length < 100) throw new ParseError(`Only ${times.length} data rows parsed; expected hundreds of altimeter cycles.`)
  return { times, values, columnLabel: candidates[0][1] }
}

// --- ORNL DAAC MODIS web service (NDVI subset, JSON) ----------------------------------------------------
export interface NdviPoint {
  iso: string
  /** Mean NDVI of the valid pixels in the subset box; null when too few pixels are valid. */
  ndvi: number | null
}

export function modisDateToIso(modisDate: string): string {
  const m = /^A(\d{4})(\d{3})$/.exec(modisDate)
  if (!m) throw new ParseError(`Unexpected MODIS date "${modisDate}"`)
  return new Date(Date.UTC(Number(m[1]), 0, Number(m[2]))).toISOString().slice(0, 10)
}

export function parseModisSubset(json: unknown): { points: NdviPoint[]; notes: string[] } {
  const root = json as { subset?: unknown; scale?: unknown } | null
  if (!root || typeof root !== 'object' || !Array.isArray(root.subset)) {
    throw new ParseError('The MODIS web service response has no "subset" list.')
  }
  const notes: string[] = []
  let scale = Number(root.scale)
  if (!Number.isFinite(scale) || scale <= 0) {
    scale = 0.0001
    notes.push('The response gave no scale factor; the documented MOD13Q1 NDVI scale 0.0001 was applied.')
  }
  const points: NdviPoint[] = []
  for (const item of root.subset as Record<string, unknown>[]) {
    const iso =
      typeof item.calendar_date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(item.calendar_date)
        ? item.calendar_date.slice(0, 10)
        : modisDateToIso(String(item.modis_date))
    const raw = (Array.isArray(item.data) ? (item.data as unknown[]).flat() : []) as number[]
    const valid = raw.filter((x) => typeof x === 'number' && x >= -2000 && x <= 10000) // fill value -3000 and anything outside the NDVI range is dropped
    points.push({ iso, ndvi: raw.length > 0 && valid.length >= raw.length / 2 ? (valid.reduce((a, b) => a + b, 0) / valid.length) * scale : null })
  }
  return { points, notes }
}
