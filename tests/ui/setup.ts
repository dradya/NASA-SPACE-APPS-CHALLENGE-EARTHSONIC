import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'

beforeEach(() => {
  // index.html provides this in the real app; the test DOM has no index.html.
  document.documentElement.lang = 'en'
})

afterEach(() => {
  cleanup()
  delete document.documentElement.dataset.contrast
  window.localStorage.clear()
})
