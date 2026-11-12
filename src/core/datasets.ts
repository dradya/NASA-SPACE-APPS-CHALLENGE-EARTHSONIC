// Turns parsed NASA files into Datasets (aligned steps + measures, including documented derived measures).
// Also builds the clearly-labelled DEMO datasets. Nothing here invents NASA values.
import type { Dataset, DatasetProvenance, Measure } from './types.ts'
import { mean, trailingSlope } from './series.ts'
import type { GistempGlobal, GistempZonal, GmslSeries, NdviPoint, SeaIceDaily } from './parsers.ts'

function measure(id: string, label: string, units: string, values: (number | null)[], derived?: string): Measure {
  return derived ? { id, label, units, values, derived } : { id, label, units, values }
}

// --- global temperature -------------------------------------------------------------------------------
export function buildTemperatureDataset(glb: GistempGlobal, zonal: GistempZonal | null, provenance: DatasetProvenance): Dataset {
  const keep = glb.years.map((_, i) => (glb.annual[i] === null ? -1 : i)).filter((i) => i >= 0)
  const years = keep.map((i) => glb.years[i])
  const global = keep.map((i) => glb.annual[i])
  const notes = ['Anomalies are differences from the 1951–1980 average, in degrees Celsius. One step is one calendar year (January–December mean).']
  const dropped = glb.years.filter((_, i) => glb.annual[i] === null)
  if (dropped.length > 0) notes.push(`Years without a complete January–December value in the file are left out: ${dropped.join(', ')}.`)
  const measures: Record<string, Measure> = {
    global: measure('global', 'Global temperature anomaly', '°C vs 1951–1980', global),
  }
  if (zonal) {
    const at = (band: (number | null)[]) => years.map((y) => {
      const j = zonal.years.indexOf(y)
      return j < 0 ? null : band[j]
    })
    measures.arctic = measure('arctic', 'Arctic anomaly (64°N–90°N)', '°C vs 1951–1980', at(zonal.bands.arctic))
    measures.tropics = measure('tropics', 'Tropics anomaly (24°S–24°N)', '°C vs 1951–1980', at(zonal.bands.tropics))
  } else {
    notes.push('The latitude-band file was not available, so only the global voice is played.')
  }
  measures.rate = measure('rate', 'Warming rate', '°C per decade', trailingSlope(global, years, 10).map((s) => (s === null ? null : s * 10)),
    'Least-squares slope of the global anomaly over the trailing 10 years, times 10.')
  return {
    phenomenonId: 'global-temperature', status: 'real', stepUnit: 'one calendar year',
    steps: years.map((y) => ({ label: String(y), iso: `${y}-01-01` })), measures, primary: 'global', provenance, notes,
  }
}

// --- sea level ---------------------------------------------------------------------------------------------
export function buildSeaLevelDataset(g: GmslSeries, provenance: DatasetProvenance): Dataset {
  const byYear = new Map<number, number[]>()
  for (let i = 0; i < g.times.length; i++) {
    const v = g.values[i]
    if (v === null) continue
    const y = Math.floor(g.times[i])
    byYear.set(y, [...(byYear.get(y) ?? []), v])
  }
  const MIN_CYCLES = 25 // altimeter cycles are about 10 days apart, so a full year has about 36
  const years = [...byYear.keys()].sort((a, b) => a - b).filter((y) => (byYear.get(y) as number[]).length >= MIN_CYCLES)
  const excluded = [...byYear.keys()].filter((y) => !years.includes(y)).sort((a, b) => a - b)
  const annual = years.map((y) => mean(byYear.get(y) as number[]))
  const first = annual[0] as number
  const notes = [
    `Each step is one calendar year: the average of the file's 60-day-smoothed global mean sea level values (${g.columnLabel}).`,
    `"Rise" is measured from the first complete year (${years[0]}), so differences between products' reference levels do not matter.`,
    `Years with fewer than ${MIN_CYCLES} valid altimeter cycles are left out${excluded.length ? `: ${excluded.join(', ')}` : ' (none)'}.`,
  ]
  return {
    phenomenonId: 'sea-level', status: 'real', stepUnit: 'one calendar year',
    steps: years.map((y) => ({ label: String(y), iso: `${y}-01-01` })),
    measures: {
      rise: measure('rise', `Sea level rise since ${years[0]}`, 'mm', annual.map((a) => (a === null ? null : a - first)),
        `Yearly average minus the ${years[0]} yearly average.`),
      annual_mean: measure('annual_mean', 'Yearly average (product reference)', 'mm', annual),
      rate: measure('rate', 'Rate of rise', 'mm per year', trailingSlope(annual, years, 5),
        'Least-squares slope of the yearly averages over the trailing 5 years.'),
    },
    primary: 'rise', provenance, notes,
  }
}

// --- sea ice ------------------------------------------------------------------------------------------------
export function buildSeaIceDataset(d: SeaIceDaily, provenance: DatasetProvenance): Dataset {
  const sums = new Map<string, number[]>()
  for (const r of d.rows) {
    if (r.extent === null) continue
    const k = `${r.year}-${r.month}`
    sums.set(k, [...(sums.get(k) ?? []), r.extent])
  }
  const MIN_DAYS = 10 // early satellite years have a value only every second day, so a month has about 15
  const monthly = (y: number, m: number) => {
    const v = sums.get(`${y}-${m}`)
    return v && v.length >= MIN_DAYS ? mean(v) : null
  }
  const allYears = [...new Set(d.rows.map((r) => r.year))].sort((a, b) => a - b)
  const years = allYears.filter((y) => monthly(y, 3) !== null && monthly(y, 9) !== null)
  const sept = years.map((y) => monthly(y, 9))
  return {
    phenomenonId: 'sea-ice', status: 'real', stepUnit: 'one calendar year',
    steps: years.map((y) => ({ label: String(y), iso: `${y}-01-01` })),
    measures: {
      september: measure('september', 'Arctic sea ice extent, September average (yearly minimum)', 'million km²', sept,
        `Average of the daily extents in September (at least ${MIN_DAYS} valid days).`),
      march: measure('march', 'Arctic sea ice extent, March average (yearly maximum)', 'million km²', years.map((y) => monthly(y, 3)),
        `Average of the daily extents in March (at least ${MIN_DAYS} valid days).`),
      rate: measure('rate', 'Change in September extent', 'million km² per decade', trailingSlope(sept, years, 10).map((s) => (s === null ? null : s * 10)),
        'Least-squares slope of the September extent over the trailing 10 years, times 10.'),
    },
    primary: 'september', provenance,
    notes: [
      'Extent is the area of ocean with at least 15% ice concentration, from satellite passive microwave data. One step is one calendar year; only years with both a March and a September average are used.',
      `Months need at least ${MIN_DAYS} valid daily values (the earliest years have a value only every second day).`,
    ],
  }
}

// --- vegetation -----------------------------------------------------------------------------------------------
export function buildVegetationDataset(points: NdviPoint[], siteName: string, provenance: DatasetProvenance, extraNotes: string[] = []): Dataset {
  const ndvi = points.map((p) => p.ndvi)
  return {
    phenomenonId: 'vegetation', status: 'real', stepUnit: 'one 16-day MODIS composite',
    steps: points.map((p) => ({ label: p.iso, iso: p.iso })),
    measures: {
      ndvi: measure('ndvi', `Vegetation greenness (NDVI) at ${siteName}`, 'NDVI (unitless, about 0 to 1)', ndvi),
      change: measure('change', 'Change since the previous composite', 'NDVI per composite', ndvi.map((v, i) => (i === 0 || v === null || ndvi[i - 1] === null ? null : v - (ndvi[i - 1] as number))),
        'NDVI of this composite minus the previous composite.'),
    },
    primary: 'ndvi', provenance,
    notes: [`The value is the average of valid pixels in a small box (about 3 km × 3 km) around ${siteName}. Each step is a 16-day composite.`, ...extraNotes],
  }
}

// --- DEMO data (synthetic; never NASA measurements) ---------------------------------------------------------
const DEMO_PROVENANCE: DatasetProvenance = {
  sourceName: 'Synthetic demo pattern (NOT NASA data)', sourceUrl: '', origin: 'demo', retrievedUtc: null, fileName: null, sha256: null,
}

function asDemo(ds: Dataset, noun: string): Dataset {
  return {
    ...ds, status: 'demo', provenance: DEMO_PROVENANCE,
    steps: ds.steps.map((_, i) => ({ label: `Demo ${noun} ${i + 1}`, iso: '' })),
    notes: ['DEMO DATA: a synthetic ramp-and-wave pattern for trying the controls and the sound. It is not a NASA measurement and says nothing about the real Earth.'],
  }
}

export function buildDemoDataset(id: Dataset['phenomenonId']): Dataset {
  const n = 60
  const idx = Array.from({ length: n }, (_, i) => i)
  if (id === 'global-temperature') {
    const g = idx.map((i) => -0.4 + (1.6 * i) / (n - 1) + 0.2 * Math.sin(i * 0.7))
    const z: GistempZonal = { years: idx, bands: { global: g, arctic: g.map((v) => 2 * v), tropics: g.map((v) => 0.8 * v), antarctic: g } }
    return asDemo(buildTemperatureDataset({ years: idx, annual: g }, z, DEMO_PROVENANCE), 'year')
  }
  if (id === 'sea-level') {
    const times: number[] = []
    const values: number[] = []
    for (let y = 0; y < 30; y++) for (let c = 0; c < 36; c++) { times.push(2000 + y + c / 36); values.push(y * 4 + c * 0.05 + 3 * Math.sin(y * 0.6)) }
    return asDemo(buildSeaLevelDataset({ times, values, columnLabel: 'synthetic demo values' }, DEMO_PROVENANCE), 'year')
  }
  if (id === 'sea-ice') {
    const rows: SeaIceDaily['rows'] = []
    for (let y = 0; y < 30; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= 28; d++) {
      rows.push({ year: 2000 + y, month: m, day: d, extent: 10.5 + 4 * Math.cos((2 * Math.PI * (m - 3)) / 12) - 0.06 * y })
    }
    return asDemo(buildSeaIceDataset({ rows }, DEMO_PROVENANCE), 'year')
  }
  const pts: NdviPoint[] = Array.from({ length: 23 }, (_, i) => ({ iso: '', ndvi: 0.45 + 0.35 * Math.sin(2 * Math.PI * (i / 23 - 0.25)) }))
  return asDemo(buildVegetationDataset(pts, 'a synthetic site', DEMO_PROVENANCE), 'composite')
}
