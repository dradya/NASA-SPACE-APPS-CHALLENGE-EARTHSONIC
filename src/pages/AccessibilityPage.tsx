import { PageHeader } from '../components/PageHeader'
import { h2, panel } from '../components/ui'

const NOW = [
  'Everything works with the keyboard alone. Every control is a native button, slider, list, checkbox or radio group with a visible label.',
  'A skip link, page landmarks, one main heading per page that receives focus when you navigate, and a descriptive title on every page.',
  'A timeline slider that reads the year or date aloud (not just a number), plus buttons to jump to computed milestones.',
  'A text caption of what is sounding right now, in plain words, including note names and the data value behind each voice. "Describe this moment" reads it on demand; "Announce each step" reads it as it plays (off by default so speech does not talk over the sound).',
  'Playback changes (playing, paused, stopped, errors) and finished loading are announced to screen readers.',
  'Every chart has a written summary and a data table. Charts use line styles and position, not color alone. Pictures have text descriptions and written values.',
  'High-contrast mode (also switched on automatically if your system asks for it) and reduced motion are respected.',
  'Sound safety: pitches limited to a comfortable range, a limiter, a soft start and a moderate default volume. A scientific mode (continuous pitch) and a musical mode (pentatonic notes) are both available.',
  'Playback pauses automatically when the browser tab is hidden, because browsers slow background timers and the sound would stutter.',
  'Every sonification can be downloaded as an audio file, so the experience does not depend on a live browser session.',
]
const SHORTCUTS = [['Space', 'Play or pause'], ['← →', 'Step back or forward'], ['D', 'Describe this moment'], ['M', 'Switch listening mode']]

export function AccessibilityPage() {
  return (
    <>
      <PageHeader eyebrow="For everyone" title="Accessibility" lead="Hearing Earth science should not depend on sight. Accessibility is a core requirement of this project, not an extra." />
      <section aria-labelledby="now-h" className="mt-12 max-w-3xl">
        <h2 id="now-h" className={h2}>What is built in</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-300">{NOW.map((t) => <li key={t}>{t}</li>)}</ul>
      </section>
      <section aria-labelledby="keys-h" className={`${panel} mt-10 max-w-xl`}>
        <h2 id="keys-h" className={h2}>Keyboard shortcuts</h2>
        <p className="mt-1 text-sm text-ink-300">They work when no control has focus, so they never override a screen reader or a focused control.</p>
        <table className="mt-3 w-full text-left text-sm">
          <caption className="sr-only">Keyboard shortcuts in the Studio and Time Travel pages</caption>
          <thead><tr><th scope="col" className="py-1">Key</th><th scope="col" className="py-1">Action</th></tr></thead>
          <tbody>{SHORTCUTS.map(([k, a]) => <tr key={k}><th scope="row" className="py-1 font-normal"><kbd>{k}</kbd></th><td>{a}</td></tr>)}</tbody>
        </table>
      </section>
      <section aria-labelledby="honest-h" className="mt-10 max-w-3xl">
        <h2 id="honest-h" className={h2}>What has and has not been tested</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-300">
          <li>Automated checks (axe) run on every page in the project&rsquo;s tests, and contrast of every color pair is verified in both themes.</li>
          <li>Testing with real screen readers (NVDA, JAWS, VoiceOver) and with real users who are blind or have low vision has <strong className="text-ink-100">not yet been done</strong>. Please tell us what you find.</li>
          <li>Optional haptic (vibration) feedback is not implemented.</li>
        </ul>
      </section>
    </>
  )
}
