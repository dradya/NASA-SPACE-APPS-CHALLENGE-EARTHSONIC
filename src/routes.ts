// Single source of truth for the app's pages: navigation, router and document titles all read this.
// Pure data and functions with no imports, so Node can test it directly.

export const SITE_NAME = 'EARTHSONIC'

export interface AppRoute {
  /** Stable key, also used for test ids. */
  key: string
  path: string
  /** Short label in the navigation bar. */
  navLabel: string
  /** Page title, also the text of the page's h1 unless a page overrides it. */
  title: string
}

export const APP_ROUTES: readonly AppRoute[] = [
  { key: 'home', path: '/', navLabel: 'Home', title: 'Hear the changing Earth' },
  { key: 'explorer', path: '/explorer', navLabel: 'Earth Explorer', title: 'Earth Explorer' },
  { key: 'studio', path: '/studio', navLabel: 'Studio', title: 'Sonification Studio' },
  {
    key: 'time-travel',
    path: '/time-travel',
    navLabel: 'Time Travel',
    title: 'Time Travel Through Sound',
  },
  { key: 'how-it-works', path: '/how-it-works', navLabel: 'How it works', title: 'How it works' },
  { key: 'accessibility', path: '/accessibility', navLabel: 'Accessibility', title: 'Accessibility' },
]

export const NOT_FOUND_TITLE = 'Page not found'

/** Remove a trailing slash (except for the root) so "/studio/" and "/studio" match the same page. */
export function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

export function findRoute(pathname: string): AppRoute | undefined {
  const path = normalizePath(pathname)
  return APP_ROUTES.find((route) => route.path === path)
}

/** Value for document.title (WCAG 2.4.2: every page needs a descriptive title). */
export function documentTitleFor(pathname: string): string {
  const route = findRoute(pathname)
  if (!route) return `${NOT_FOUND_TITLE} — ${SITE_NAME}`
  return route.key === 'home' ? `${SITE_NAME} — ${route.title}` : `${route.title} — ${SITE_NAME}`
}
