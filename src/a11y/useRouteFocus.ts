import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { documentTitleFor } from '../routes'

/**
 * Keeps single-page navigation accessible:
 * - sets a descriptive document title for every page (WCAG 2.4.2);
 * - after a navigation (not on first load) moves focus to the page's main heading, so screen reader
 *   and keyboard users land at the top of the new page instead of staying on the link they clicked.
 */
export function useRouteFocus(): void {
  const { pathname } = useLocation()
  const previous = useRef<string | null>(null)

  useEffect(() => {
    document.title = documentTitleFor(pathname)
    if (previous.current === null) {
      previous.current = pathname // first load: leave focus where the browser put it
      return
    }
    if (previous.current === pathname) return // React StrictMode runs effects twice in development
    previous.current = pathname
    document.querySelector<HTMLElement>('[data-page-heading]')?.focus()
  }, [pathname])
}
