// Scientific transparency: for every phenomenon, exactly where the data come from, what the units mean, what the
// resolution is, how it sounds and what the limitations are. The UI renders this verbatim; nothing here is a measurement.
import type { ImageryPeriod } from '../core/gibs.ts'
import type { PhenomenonId } from '../core/types.ts'

export interface Site { id: string; name: string; lat: number; lon: number }

export interface PhenomenonInfo {
  id: PhenomenonId
  title: string
  short: string
  tagline: string
  /** One sentence: what you will hear. */
  hearing: string
  datasetName: string
  nasaSource: string
  sourceUrl: string
  doi: string | null
  units: string
  coverage: string
  temporalResolution: string
  spatialResolution: string
  access: 'public' | 'earthdata-login'
  accessNote: string
  /** How the user can supply a file themselves (only for sources that need a login). */
  getFile: { accepts: string; steps: string[] } | null
  explanation: string[]
  limitations: string[]
  citation: string
  credit: string
  /** Data-driven picture drawn by the app. */
  visual: { kind: 'stripes' | 'gauge' | 'ice' | 'greenness'; description: string }
  nasaVisualization: { label: string; url: string } | null
  /** Honest statement of how picture, numbers and sound line up in time. */
  alignmentNote: string
  /** NASA Worldview/GIBS imagery layers to try, best first. If one is not served, the next is used and the panel says which one it shows. */
  imagery: { candidates: { layer: string; label: string; period: ImageryPeriod }[]; overlays: string[] } | null
  stepNoun: string
  sites: Site[] | null
}

export const VEGETATION_SITES: Site[] = [
  { id: 'amazon', name: 'Central Amazon rainforest, Brazil', lat: -3.1, lon: -60.0 },
  { id: 'sahel', name: 'Sahel savanna, Niger', lat: 13.5, lon: 2.1 },
  { id: 'corn-belt', name: 'US Corn Belt, Iowa', lat: 42.0, lon: -93.6 },
  { id: 'deccan', name: 'Deccan Plateau croplands, India', lat: 18.5, lon: 76.5 },
  { id: 'boreal', name: 'Boreal forest, central Siberia', lat: 62.0, lon: 104.0 },
]

export const PHENOMENA: Record<PhenomenonId, PhenomenonInfo> = {
  'global-temperature': {
    id: 'global-temperature', title: 'Global temperature', short: 'Temperature', tagline: 'Hear 140+ years of a warming planet.',
    hearing: 'A rising pitch for each warmer year, with the Arctic and the tropics as separate voices and a bell for every new record.',
    datasetName: 'GISS Surface Temperature Analysis (GISTEMP) version 4, Land-Ocean Temperature Index',
    nasaSource: 'NASA Goddard Institute for Space Studies (GISS)',
    sourceUrl: 'https://data.giss.nasa.gov/gistemp/', doi: null,
    units: 'Degrees Celsius, as a difference (anomaly) from the 1951–1980 average',
    coverage: 'From 1880 to the most recent complete year in the file',
    temporalResolution: 'Monthly values; this app uses yearly (January–December) averages',
    spatialResolution: 'Global, and three latitude bands (the underlying analysis is a 2° × 2° grid; this app uses the band and global averages)',
    access: 'public', accessNote: 'Public file. No login needed.', getFile: null,
    explanation: [
      'A temperature anomaly is how much warmer or cooler a year was than a reference period, here 1951–1980. An anomaly of 0 means "the same as that average"; +1 means one degree Celsius warmer.',
      'GISTEMP combines land station records (NOAA GHCN version 4) with ocean temperature data (ERSST version 5) into one global analysis, updated monthly by NASA GISS.',
      'The Arctic and the tropics are played as separate voices because places do not warm equally: the Arctic voice climbs further than the tropics voice.',
    ],
    limitations: [
      'Yearly averages hide seasons and short events such as individual heat waves.',
      'The early record rests on far fewer stations and ship measurements, so early years are less certain than recent ones; this app does not display GISTEMP\'s uncertainty ranges.',
      'The latitude-band voices are broad averages of very large areas.',
      'The most recent year is left out until the file contains a full January–December value.',
    ],
    citation: 'GISTEMP Team: GISS Surface Temperature Analysis (GISTEMP), version 4. NASA Goddard Institute for Space Studies. https://data.giss.nasa.gov/gistemp/ (add the date you accessed it). Lenssen, N., et al. (2024), Journal of Geophysical Research: Atmospheres, 129(17), e2023JD040179, doi:10.1029/2023JD040179.',
    credit: 'NASA GISS/GISTEMP',
    visual: { kind: 'stripes', description: 'One vertical bar per year. Bars rise above a centre line for years warmer than the 1951–1980 average and fall below it for cooler years. Bar height and a written value carry the meaning; color is only a second cue.' },
    nasaVisualization: { label: 'NASA Scientific Visualization Studio: Global Temperature Anomalies from 1880 to 2024', url: 'https://svs.gsfc.nasa.gov/5450' },
    alignmentNote: 'Chart, bars, readouts and sound all use the same yearly values, so they always show the same year. NASA\'s own map animation (linked) is a separate product and is not synchronized with the player.',
    imagery: null, stepNoun: 'year', sites: null,
  },
  'sea-level': {
    id: 'sea-level', title: 'Sea level', short: 'Sea level', tagline: 'Hear the ocean rise, and rise faster.',
    hearing: 'A pitch that climbs as global sea level rises, with a pulse rhythm that gets busier as the rise speeds up.',
    datasetName: 'Global Mean Sea Level from satellite altimetry (NASA Sea Level Change Team, GSFC GMSL series; version 5.2 is DOI 10.5067/GMSLM-TJ152, version 5.1 used in NASA\'s visualization is DOI 10.5067/GMSLM-TJ151)',
    nasaSource: 'NASA Sea Level Change Team (Goddard Space Flight Center), distributed by NASA PO.DAAC',
    sourceUrl: 'https://podaac.jpl.nasa.gov/', doi: '10.5067/GMSLM-TJ152',
    units: 'Millimetres of change in global mean sea level (shown as rise since the first complete year)',
    coverage: 'From the early 1990s (the start of the satellite altimeter record) to the most recent complete year in the file',
    temporalResolution: 'One value about every 10 days, smoothed over 60 days; this app averages them into yearly values',
    spatialResolution: 'One global average for the whole ocean (no regional detail)',
    access: 'earthdata-login',
    accessNote: 'Downloading from NASA needs a free Earthdata Login. Choose the file you downloaded below, or run the snapshot script once on your own computer.',
    getFile: {
      accepts: 'The ASCII text file of the GSFC global mean sea level series (a .txt file whose first lines begin with "HDR").',
      steps: [
        'Sign in (free) at https://urs.earthdata.nasa.gov.',
        'Open NASA PO.DAAC and find the dataset with short name MERGED_TP_J1_OSTM_OST_GMSL_ASCII_V52. Download its single ASCII data file.',
        'Come back here and choose that file with the button below. It is read in your browser and not uploaded anywhere.',
        'Or, to keep it with the project: set up your Earthdata credentials as described in docs/DATA_ACCESS.md and run the snapshot script (python data-pipeline/scripts/snapshot_data.py --gmsl).',
      ],
    },
    explanation: [
      'Satellites bounce radar off the ocean surface and time the echo to measure sea surface height. Averaged over the whole globe, this gives a continuous record of global mean sea level since the early 1990s.',
      'Sea level rises because ocean water expands as it warms and because ice on land melts and flows into the sea.',
      'The pulse voice plays the speed of the rise (a 5-year trend). A busier rhythm means the rise is faster, so you can hear it speeding up.',
    ],
    limitations: [
      'Global mean sea level hides large regional differences; local sea level change can be quite different.',
      'The series is smoothed (60 days) and then averaged to years, so short-term variation is not audible.',
      'Different versions of the product handle land-motion corrections (GIA) differently; this app uses the column the file labels as smoothed and GIA-applied, and shows its exact label.',
      'The most recent estimates can be preliminary (NASA\'s visualization notes that later satellite estimates are preliminary) and may change.',
      '"Rise" is measured from the first complete year in the file, so it is not an absolute height.',
    ],
    citation: 'NASA Sea Level Change Team (Goddard Space Flight Center): Global Mean Sea Level from Integrated Multi-Mission Ocean Altimeters, distributed by NASA PO.DAAC, doi:10.5067/GMSLM-TJ152 (version 5.2). Add the date you accessed it.',
    credit: 'NASA Sea Level Change Team / NASA PO.DAAC',
    visual: { kind: 'gauge', description: 'A vertical gauge: the water level in the gauge is the sea level rise since the first year, and a written value gives the number in millimetres.' },
    nasaVisualization: { label: 'NASA Scientific Visualization Studio: Sea Level Through a Porthole', url: 'https://svs.gsfc.nasa.gov/5235' },
    alignmentNote: 'Gauge, chart, readouts and sound all use the same yearly averages. NASA\'s porthole animation (linked) shows the same kind of data with a 60-day running average and is not synchronized with the player.',
    imagery: null, stepNoun: 'year', sites: null,
  },
  'sea-ice': {
    id: 'sea-ice', title: 'Arctic sea ice', short: 'Sea ice', tagline: 'Hear the Arctic ice shrink, summer after summer.',
    hearing: 'Two voices, the March maximum and the September minimum, that sound lower as there is less ice, with a bell for every record-low September.',
    datasetName: 'Sea Ice Index, Version 4 (daily Arctic sea ice extent)',
    nasaSource: 'National Snow and Ice Data Center (NSIDC), one of NASA\'s Earth science data centers; the index is produced from satellite passive microwave data',
    sourceUrl: 'https://noaadata.apps.nsidc.org/NOAA/G02135/', doi: '10.7265/a98x-0f50',
    units: 'Million square kilometres of ocean with at least 15% ice (extent)',
    coverage: 'From the start of the satellite passive-microwave record in the late 1970s to the most recent complete month in the file; this app uses full years that have both a March and a September average',
    temporalResolution: 'Daily (every second day in the earliest years); this app averages them into March and September values',
    spatialResolution: 'One Arctic-wide total (no map)',
    access: 'public', accessNote: 'Public file. No login needed.', getFile: null,
    explanation: [
      'Arctic sea ice grows through winter to a maximum in March and shrinks through summer to a minimum in September. The September minimum is the yearly low point and the number most often quoted.',
      'Extent is the total area of ocean that is at least 15% covered by ice, measured by satellites that see through clouds and polar darkness.',
      'Both voices fall in pitch as there is less ice. The September voice has fallen further, which is the long-term loss you can hear.',
    ],
    limitations: [
      'Extent is not the same as ice volume or thickness; thin ice and thick ice count the same.',
      'The 15% threshold and the satellite sensors have changed over the decades, though NSIDC works to keep the record consistent.',
      'Only the Arctic is shown; the Antarctic behaves differently.',
      'Months need at least 10 valid daily values to produce an average.',
    ],
    citation: 'National Snow and Ice Data Center: Sea Ice Index, Version 4 (G02135), doi:10.7265/a98x-0f50. Add the date you accessed it.',
    credit: 'NSIDC / NASA',
    visual: { kind: 'ice', description: 'A schematic disc whose area is proportional to the September ice extent, inside a faint ring marking the March extent. It is a diagram of the numbers, not a map.' },
    nasaVisualization: { label: 'NASA Scientific Visualization Studio: Global Sea Ice', url: 'https://svs.gsfc.nasa.gov/5480' },
    alignmentNote: 'Disc, chart, readouts and sound all use the same yearly March and September averages. NASA\'s sea ice animation (linked) is a separate product and is not synchronized with the player.',
    imagery: null, stepNoun: 'year', sites: null,
  },
  vegetation: {
    id: 'vegetation', title: 'Vegetation', short: 'Vegetation', tagline: 'Hear a landscape breathe through the seasons.',
    hearing: 'A tone whose pitch and richness grow as land turns greener, with a second voice that moves up when vegetation is greening and down when it is browning.',
    datasetName: 'MODIS/Terra Vegetation Indices 16-Day L3 Global 250 m (MOD13Q1), NDVI band, read through the ORNL DAAC MODIS Land Product Subsets web service',
    nasaSource: 'NASA MODIS Land team; subsets served by the NASA ORNL DAAC',
    sourceUrl: 'https://modis.ornl.gov/', doi: '10.3334/ORNLDAAC/1600',
    units: 'NDVI, a unitless index from about 0 (bare ground) to about 1 (dense green vegetation)',
    coverage: 'February 2000 onward for MODIS on the Terra satellite; this app offers full years from 2001',
    temporalResolution: 'One 16-day composite (about 23 per year)',
    spatialResolution: '250 m pixels; this app averages a box about 3 km × 3 km around the chosen site',
    access: 'public', accessNote: 'Public web service. No login needed.', getFile: null,
    explanation: [
      'NDVI compares how much near-infrared and red light a surface reflects. Healthy green plants reflect lots of near-infrared and absorb red, so greener land has a higher NDVI.',
      'Over a year, NDVI traces the growing season: it rises as plants leaf out and falls as they dry or are harvested. Different places have very different rhythms, which is why this app lets you choose a site.',
      'Greenness controls both the pitch and the richness of the main voice: a pure low tone for bare land, a fuller brighter tone for dense vegetation.',
    ],
    limitations: [
      'Each value is a small box around one chosen site, not a whole region or country.',
      'Only values inside the valid NDVI range are used; the product\'s separate quality flags (clouds, snow, aerosols) are not applied, so some composites may be affected by them.',
      'NDVI levels off over very dense forest, so changes there are small.',
      'The picture (when shown) is an 8-day NASA image product while the numbers are 16-day composites, so they do not cover identical windows.',
    ],
    citation: 'NASA MODIS Land Team: MOD13Q1 MODIS/Terra Vegetation Indices 16-Day L3 Global 250m. Subsets: ORNL DAAC (2018), MODIS and VIIRS Land Products Global Subsetting and Visualization Tool (web service), doi:10.3334/ORNLDAAC/1600. Add the date you accessed it.',
    credit: 'NASA MODIS Land Team / NASA ORNL DAAC',
    visual: { kind: 'greenness', description: 'A vertical greenness meter for the current composite (higher is greener) beside a written NDVI value. Color is only a second cue.' },
    nasaVisualization: null,
    alignmentNote: 'The map (NASA Worldview/GIBS, an 8-day or monthly composite) and the numbers (MOD13Q1, 16-day) are different products: the map shows the composite that contains the selected date, while the chart, meter and sound use the 16-day composite for that date. The panel says which map product is shown.',
    imagery: { candidates: [{ layer: 'MODIS_Terra_NDVI_8Day', label: 'MODIS Terra NDVI, 8-day composite', period: '8-day' }, { layer: 'MODIS_Terra_L3_NDVI_Monthly', label: 'MODIS Terra NDVI, monthly composite', period: 'monthly' }], overlays: ['Coastlines'] },
    stepNoun: 'composite', sites: VEGETATION_SITES,
  },
}

export const PHENOMENON_IDS = Object.keys(PHENOMENA) as PhenomenonId[]

export function isPhenomenonId(x: string | null): x is PhenomenonId {
  return x !== null && Object.prototype.hasOwnProperty.call(PHENOMENA, x)
}
