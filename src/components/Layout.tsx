import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useRouteFocus } from '../a11y/useRouteFocus'
import { Brand } from './Brand'
import { ContrastToggle } from './ContrastToggle'
import { NavBar } from './NavBar'
import { SkipLink } from './SkipLink'

/** The shell shared by every page: skip link, banner with navigation, main region, footer. */
export function Layout() {
  useRouteFocus()
  const location = useLocation()

  useEffect(() => {
    const main = document.getElementById('main')
    if (!main) return

    const targets = [
      ...Array.from(main.children),
      ...Array.from(main.querySelectorAll('li, figure')),
    ].filter((element): element is HTMLElement => element instanceof HTMLElement && !element.classList.contains('rise'))
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    targets.forEach((element, index) => {
      element.classList.add('scroll-reveal')
      element.style.setProperty('--reveal-delay', `${(index % 5) * 75}ms`)
    })

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      targets.forEach((element) => element.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.06, rootMargin: '0px 0px -36px 0px' },
    )

    targets.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [location.pathname, location.search])

  return (
    <>
      <SkipLink />
      <div className="sky" aria-hidden="true" />
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 sm:px-8">
        <Brand />
        <NavBar />
        <ContrastToggle />
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl px-5 pb-24 pt-8 sm:px-8 sm:pt-14"
      >
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-6xl border-t border-edge px-5 py-8 text-sm text-ink-500 sm:px-8">
        <p>
          EARTHSONIC is an independent project for the 2026 NASA Space Apps Challenge. It is not
          endorsed by NASA. Original code is open source under the Apache License 2.0.
        </p>
      </footer>
    </>
  )
}
