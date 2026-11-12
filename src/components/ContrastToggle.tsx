import { useContrast } from '../a11y/useContrast'

/** Manual high-contrast switch. State is conveyed by aria-pressed and by the filled/empty marker, not by color alone. */
export function ContrastToggle() {
  const { high, toggle } = useContrast()

  return (
    <button
      type="button"
      aria-pressed={high}
      onClick={toggle}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-ink-500 px-3 text-sm font-medium text-ink-100 hover:bg-space-800"
    >
      <span aria-hidden="true">{high ? '●' : '○'}</span>
      High contrast
    </button>
  )
}
