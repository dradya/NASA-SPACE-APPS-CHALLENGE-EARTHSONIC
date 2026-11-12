import type { MouseEvent } from 'react'

/** First focusable element on every page. Visible only while focused. */
export function SkipLink() {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    document.getElementById('main')?.focus()
  }

  return (
    <a
      href="#main"
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink-100 focus:px-4 focus:py-3 focus:font-medium focus:text-space-950"
    >
      Skip to main content
    </a>
  )
}
