import { Link } from 'react-router'

export function Brand() {
  return (
    <Link to="/" aria-label="EARTHSONIC, home" className="inline-flex min-h-11 items-center gap-3 rounded-md">
      <svg aria-hidden="true" focusable="false" viewBox="0 0 64 64" className="h-8 w-8">
        <circle cx="32" cy="32" r="29" className="fill-space-900 stroke-signal" strokeWidth="2" />
        <path
          d="M12 38c6-10 14-10 20 0s14 10 20 0"
          className="fill-none stroke-signal"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M12 28c6-8 14-8 20 0s14 8 20 0"
          className="fill-none stroke-ember"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-display text-xl font-light tracking-[0.18em] text-ink-100">EARTHSONIC</span>
    </Link>
  )
}
