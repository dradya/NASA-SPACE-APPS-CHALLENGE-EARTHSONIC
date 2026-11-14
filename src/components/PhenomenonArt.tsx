import type { PhenomenonId } from '../core/types.ts'

interface Props {
  id: PhenomenonId
}

const ART_LABELS: Record<PhenomenonId, string> = {
  'global-temperature': 'Atmosphere · GISTEMP',
  'sea-level': 'Ocean · satellite altimetry',
  'sea-ice': 'Cryosphere · Sea Ice Index',
  vegetation: 'Biosphere · MODIS NDVI',
}

const ART_INDEX: Record<PhenomenonId, string> = {
  'global-temperature': '01',
  'sea-level': '02',
  'sea-ice': '03',
  vegetation: '04',
}

export function PhenomenonArt({ id }: Props) {
  return (
    <div className={`phenomenon-art phenomenon-art--${id}`} aria-hidden="true">
      <svg viewBox="0 0 160 140" fill="none">
        {id === 'global-temperature' && (
          <>
            <ellipse className="art-orbit" cx="80" cy="68" rx="57" ry="25" />
            <g className="art-orbiting">
              <circle className="art-satellite" cx="135" cy="68" r="4" />
            </g>
            <circle className="art-sun" cx="80" cy="68" r="25" />
            <circle className="art-sun-core" cx="80" cy="68" r="13" />
            <path className="art-ray" d="M80 27v-8M80 117v-8M39 68h-8M129 68h-8M51 39l-6-6M115 103l-6-6M109 39l6-6M45 103l6-6" />
          </>
        )}
        {id === 'sea-level' && (
          <>
            <circle className="art-ocean" cx="80" cy="69" r="43" />
            <path className="art-waterline art-waterline--back" d="M43 69c9-8 17-8 26 0s17 8 26 0 17-8 26 0" />
            <path className="art-waterline art-waterline--front" d="M39 83c10-8 18-8 28 0s18 8 28 0 18-8 28 0" />
            <path className="art-rise-arrow" d="M118 43V26m0 0-6 7m6-7 6 7" />
            <circle className="art-horizon" cx="80" cy="69" r="51" />
          </>
        )}
        {id === 'sea-ice' && (
          <>
            <circle className="art-ice-orbit" cx="80" cy="68" r="43" />
            <path className="art-snowflake" d="M80 31v74m-32-37h64M57 45l46 46m0-46L57 91m23-60-6 8m6-8 6 8m-6 66-6-8m6 8 6-8M48 68l8-6m-8 6 8 6m56-6-8-6m8 6-8 6M57 45l9 1m-9-1 1 9m45 37-9-1m9 1-1-9m-45 0 1-9m-1 9 9-1m45-45-1 9m1-9-9 1" />
            <circle className="art-ice-dot art-ice-dot--one" cx="35" cy="41" r="3" />
            <circle className="art-ice-dot art-ice-dot--two" cx="125" cy="92" r="2" />
          </>
        )}
        {id === 'vegetation' && (
          <>
            <path className="art-ground" d="M34 106c19-8 73-8 92 0" />
            <path className="art-stem" d="M80 105c0-16-2-29-1-45" />
            <path className="art-leaf art-leaf--left" d="M78 80C59 79 53 68 54 56c15 1 25 8 24 24Z" />
            <path className="art-leaf art-leaf--right" d="M80 68c1-17 12-25 26-24 0 14-9 24-26 24Z" />
            <path className="art-leaf-vein" d="M78 78 61 61m20 5 17-15" />
            <circle className="art-firefly art-firefly--one" cx="42" cy="55" r="2.5" />
            <circle className="art-firefly art-firefly--two" cx="119" cy="44" r="2" />
          </>
        )}
      </svg>
      <span className="phenomenon-art__label">{ART_LABELS[id]}</span>
      <span className="phenomenon-art__index">{ART_INDEX[id]}</span>
    </div>
  )
}
