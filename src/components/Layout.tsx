import { Outlet } from 'react-router'
import { useRouteFocus } from '../a11y/useRouteFocus'
import { Brand } from './Brand'
import { ContrastToggle } from './ContrastToggle'
import { NavBar } from './NavBar'
import { SkipLink } from './SkipLink'

/** The shell shared by every page: skip link, banner with navigation, main region, footer. */
export function Layout() {
  useRouteFocus()

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
