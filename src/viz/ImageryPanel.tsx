import { useState } from 'react'
import { WORLD_BBOX, bboxAround, imageryDate, snapshotUrl, type Bbox } from '../core/gibs.ts'
import type { PhenomenonInfo, Site } from '../registry/phenomena.ts'

interface Props {
  imagery: NonNullable<PhenomenonInfo['imagery']>
  /** YYYY-MM-DD of the step being shown. */
  iso: string
  site: Site | null
}

/** NASA Worldview imagery for the selected date. Tries each layer in turn and says which one it shows; if none can be served it says so. */
export function ImageryPanel({ imagery, iso, site }: Props) {
  const [idx, setIdx] = useState(0)
  const cand = imagery.candidates[idx]
  const bbox: Bbox = site ? bboxAround(site.lat, site.lon, 3) : WORLD_BBOX
  if (!cand) {
    return <p className="rounded-md border border-edge p-4 text-sm text-ink-300" role="status">NASA Worldview imagery could not be loaded for this date and place. The chart and sound are not affected.</p>
  }
  const date = imageryDate(cand.period, iso)
  const src = snapshotUrl({ layers: [cand.layer, ...imagery.overlays], date, bbox, width: 640, height: 360 })
  return (
    <figure className="m-0">
      <img
        src={src}
        alt={`${cand.label} for ${date}${site ? ` around ${site.name}` : ''}, from NASA Worldview. The chart and readout give the same information as numbers.`}
        width={640}
        height={360}
        loading="lazy"
        onError={() => setIdx((i) => i + 1)}
        className="h-auto w-full rounded-lg border border-edge bg-space-950"
      />
      <figcaption className="mt-2 text-xs text-ink-300">
        {cand.label} · map date {date} · imagery from NASA Worldview / GIBS
      </figcaption>
    </figure>
  )
}
