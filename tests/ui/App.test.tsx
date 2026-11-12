import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from '../../src/App'
import { APP_ROUTES, documentTitleFor } from '../../src/routes'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

async function accessibilityViolations() {
  // jsdom cannot compute real colors, so the color-contrast rule is skipped here; contrast is
  // verified separately against the real stylesheet in tests/core/design-tokens.test.ts.
  const results = await axe.run(document, { rules: { 'color-contrast': { enabled: false } } })
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`)
}

describe('app shell', () => {
  it('puts a skip link to #main first in the tab order', async () => {
    renderAt('/')
    const user = userEvent.setup()
    await user.tab()
    const skip = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skip).toHaveFocus()
    expect(skip).toHaveAttribute('href', '#main')
  })

  it('moves focus to the main region when the skip link is activated', async () => {
    renderAt('/')
    const user = userEvent.setup()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(document.getElementById('main')).toHaveFocus()
  })

  it('has banner, primary navigation, main and footer landmarks', () => {
    renderAt('/')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('lists every page in the navigation and marks only the current one', () => {
    renderAt('/studio')
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    for (const route of APP_ROUTES) {
      expect(nav).toHaveTextContent(route.navLabel)
    }
    expect(screen.getByRole('link', { name: 'Studio' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })
})

describe('pages', () => {
  it.each(APP_ROUTES.map((route) => [route.key, route.path] as const))(
    'renders one h1 and a matching document title for %s',
    (_key, path) => {
      renderAt(path)
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(document.title).toBe(documentTitleFor(path))
    },
  )

  it('shows the project tagline on the home page', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hear the changing Earth.')
  })

  it('shows a not-found page with its own title for unknown addresses', () => {
    renderAt('/does-not-exist')
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(document.title).toBe(documentTitleFor('/does-not-exist'))
  })

  it('moves focus to the new page heading after navigating', async () => {
    renderAt('/')
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: 'Earth Explorer' }))
    const heading = await screen.findByRole('heading', { level: 1, name: 'Earth Explorer' })
    expect(heading).toHaveFocus()
    expect(document.title).toBe(documentTitleFor('/explorer'))
  })
})

describe('high-contrast toggle', () => {
  it('switches the page theme, reports its state, and remembers the choice', async () => {
    renderAt('/')
    const user = userEvent.setup()
    const toggle = screen.getByRole('button', { name: /high contrast/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset.contrast).toBe('high')
    expect(window.localStorage.getItem('earthsonic:contrast')).toBe('high')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(document.documentElement.dataset.contrast).toBe('normal')
  })
})

describe('automated accessibility audit (axe)', () => {
  it.each(APP_ROUTES.map((route) => [route.key, route.path] as const))(
    'finds no violations on %s',
    async (_key, path) => {
      renderAt(path)
      expect(await accessibilityViolations()).toEqual([])
    },
  )

  it('finds no violations on the not-found page', async () => {
    renderAt('/does-not-exist')
    expect(await accessibilityViolations()).toEqual([])
  })
})
