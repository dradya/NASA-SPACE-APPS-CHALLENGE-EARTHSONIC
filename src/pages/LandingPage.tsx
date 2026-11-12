import { Link } from 'react-router'
import { HeroEarth } from '../components/HeroEarth'
import { PageHeader } from '../components/PageHeader'
import { btnPrimary, btn, h2, panel } from '../components/ui'
import { PHENOMENA, PHENOMENON_IDS } from '../registry/phenomena.ts'

const STEPS = [
  ['See', 'NASA data drawn as a picture and a chart you can read as numbers.'],
  ['Hear', 'The same numbers become pitch, brightness and rhythm, by a documented rule.'],
  ['Compare', 'Pick two moments and hear exactly how the Earth changed between them.'],
]

export function LandingPage() {
  return (
    <>
      <PageHeader
        eyebrow="NASA Space Apps 2026 · The Earth Information Jukebox"
        title={<>Hear the <em className="not-italic text-ember">changing</em> Earth.</>}
        lead="EARTHSONIC turns real NASA Earth science measurements into sound, so you can hear how our planet is changing, whether or not you can see it."
      />
      <div className="mt-8 flex flex-wrap gap-4">
        <Link to="/studio" className={`${btnPrimary} min-h-12 rounded-full px-8`}>Open the Studio</Link>
        <Link to="/explorer" className={`${btn} min-h-12 rounded-full px-8`}>Explore the phenomena</Link>
        <Link to="/time-travel" className={`${btn} min-h-12 rounded-full px-8`}>Time Travel</Link>
      </div>
      <div className="mt-10"><HeroEarth /></div>
      <section aria-labelledby="steps-h" className="mt-14">
        <h2 id="steps-h" className={h2}>One moment, three ways to know it</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className={panel}><p className="text-xs uppercase tracking-[0.2em] text-signal">Step {i + 1}</p><p className="mt-1 font-display text-2xl text-ink-100">{t}</p><p className="mt-2 text-sm text-ink-300">{d}</p></li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="feat-h" className="mt-14">
        <h2 id="feat-h" className={h2}>What you can listen to</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {PHENOMENON_IDS.map((id) => {
            const p = PHENOMENA[id]
            return (
              <li key={id} className={panel}>
                <p className="font-display text-2xl text-ink-100">{p.title}</p>
                <p className="mt-1 text-ink-300">{p.tagline}</p>
                <p className="mt-2 text-sm text-ink-300">{p.hearing}</p>
                <p className="mt-4"><Link to={`/studio?p=${id}`} className="text-sm font-medium text-signal underline">Listen to {p.short.toLowerCase()}</Link></p>
              </li>
            )
          })}
        </ul>
      </section>
      <p className="mt-14 max-w-3xl text-sm text-ink-300">
        Every number comes from a NASA data file, and every page says which one, in what units, over what dates and with what limitations. Where real data cannot be loaded, the app says so; it can also play clearly labelled demo data, which is never presented as NASA measurements.
      </p>
    </>
  )
}
