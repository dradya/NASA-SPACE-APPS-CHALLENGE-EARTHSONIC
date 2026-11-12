import { useState } from 'react'
import { WORLD_BBOX, snapshotUrl } from '../core/gibs.ts'

// A recent true-colour view of Earth from NASA Worldview. Computed once when the app loads; if Worldview cannot serve
// it, the image simply does not appear and the page keeps its night-sky background.
const HERO_DATE = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)

export function HeroEarth() {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <figure className="relative m-0 overflow-hidden rounded-2xl border border-edge">
      <img
        src={snapshotUrl({ layers: ['MODIS_Terra_CorrectedReflectance_TrueColor', 'Coastlines'], date: HERO_DATE, bbox: WORLD_BBOX, width: 1280, height: 640 })}
        alt="" aria-hidden="true" width={1280} height={640} onError={() => setFailed(true)} className="h-64 w-full object-cover opacity-80 sm:h-80"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-space-950 via-transparent to-transparent" />
      <figcaption className="absolute bottom-2 right-3 text-xs text-ink-300">Earth on {HERO_DATE}: NASA Worldview / GIBS, MODIS Terra</figcaption>
    </figure>
  )
}
