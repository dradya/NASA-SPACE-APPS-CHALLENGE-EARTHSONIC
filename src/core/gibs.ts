// NASA Worldview Snapshots (GIBS imagery) address building. The Snapshots service returns ONE image for a bounding box,
// date and list of layers, so the app needs no tile arithmetic. Request format as documented by NASA Earthdata
// ("Replacement of Worldview's Image Download Service") and the Worldview/GIBS forum; for EPSG:4326 the BBOX order is
// south,west,north,east. Layer ids are checked on the user's machine by data-pipeline/scripts/check_data_access.py.

export const SNAPSHOT_BASE = 'https://wvs.earthdata.nasa.gov/api/v1/snapshot'

export interface Bbox {
  south: number
  west: number
  north: number
  east: number
}

export const WORLD_BBOX: Bbox = { south: -90, west: -180, north: 90, east: 180 }

export interface SnapshotRequest {
  layers: string[]
  /** YYYY-MM-DD */
  date: string
  bbox: Bbox
  width: number
  height: number
  format?: 'image/jpeg' | 'image/png'
}

export function snapshotUrl(r: SnapshotRequest): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) throw new TypeError(`snapshotUrl: date must be YYYY-MM-DD, got "${r.date}"`)
  if (r.layers.length === 0) throw new TypeError('snapshotUrl: at least one layer is required')
  const b = r.bbox
  return `${SNAPSHOT_BASE}?REQUEST=GetSnapshot&TIME=${r.date}&BBOX=${b.south},${b.west},${b.north},${b.east}&CRS=EPSG:4326&LAYERS=${r.layers.join(',')}&FORMAT=${r.format ?? 'image/jpeg'}&WIDTH=${r.width}&HEIGHT=${r.height}`
}

/** A square-ish box of +/- `halfDegrees` around a point, clamped to the globe. */
export function bboxAround(lat: number, lon: number, halfDegrees: number): Bbox {
  const c = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  return { south: c(lat - halfDegrees, -90, 90), west: c(lon - halfDegrees, -180, 180), north: c(lat + halfDegrees, -90, 90), east: c(lon + halfDegrees, -180, 180) }
}

function parse(iso: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) throw new TypeError(`expected a YYYY-MM-DD date, got "${iso}"`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** MODIS 8-day composites start on day-of-year 1, 9, 17, ... and restart every January 1. */
export function snapToModis8Day(iso: string): string {
  const [y, m, d] = parse(iso)
  const doy = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1
  return new Date(Date.UTC(y, 0, 1 + Math.floor((doy - 1) / 8) * 8)).toISOString().slice(0, 10)
}

/** Monthly composites are addressed by the first day of the month. */
export function snapToMonthStart(iso: string): string {
  const [y, m] = parse(iso)
  return `${y}-${String(m).padStart(2, '0')}-01`
}

export type ImageryPeriod = 'daily' | '8-day' | 'monthly'

export function imageryDate(period: ImageryPeriod, iso: string): string {
  return period === '8-day' ? snapToModis8Day(iso) : period === 'monthly' ? snapToMonthStart(iso) : parse(iso) && iso.slice(0, 10)
}
