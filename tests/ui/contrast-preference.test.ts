import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CONTRAST_STORAGE_KEY,
  applyContrast,
  currentContrast,
  initContrast,
  parseContrastMode,
  readStoredContrast,
  resolveInitialContrast,
} from '../../src/a11y/contrast'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('contrast preference', () => {
  it('only accepts the two known modes', () => {
    expect(parseContrastMode('high')).toBe('high')
    expect(parseContrastMode('normal')).toBe('normal')
    expect(parseContrastMode('banana')).toBeNull()
    expect(parseContrastMode(null)).toBeNull()
  })

  it('lets a saved choice win over the system setting', () => {
    expect(resolveInitialContrast('normal', true)).toBe('normal')
    expect(resolveInitialContrast('high', false)).toBe('high')
    expect(resolveInitialContrast(null, true)).toBe('high')
    expect(resolveInitialContrast(null, false)).toBe('normal')
  })

  it('applies the mode to the document element', () => {
    applyContrast('high')
    expect(currentContrast()).toBe('high')
    applyContrast('normal')
    expect(currentContrast()).toBe('normal')
  })

  it('treats unavailable storage as "nothing saved" instead of crashing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    expect(readStoredContrast()).toBeNull()
  })

  it('initContrast follows the system request when nothing is saved', () => {
    window.localStorage.removeItem(CONTRAST_STORAGE_KEY)
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-contrast: more') }))
    expect(initContrast()).toBe('high')
    expect(document.documentElement.dataset.contrast).toBe('high')
  })
})
