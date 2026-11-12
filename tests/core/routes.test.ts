import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  APP_ROUTES,
  NOT_FOUND_TITLE,
  SITE_NAME,
  documentTitleFor,
  findRoute,
  normalizePath,
} from '../../src/routes.ts'

test('every page has a unique key, a unique absolute path and non-empty text', () => {
  const keys = new Set(APP_ROUTES.map((r) => r.key))
  const paths = new Set(APP_ROUTES.map((r) => r.path))
  assert.equal(keys.size, APP_ROUTES.length)
  assert.equal(paths.size, APP_ROUTES.length)
  for (const route of APP_ROUTES) {
    assert.ok(route.path.startsWith('/'), route.key)
    assert.ok(route.navLabel.trim().length > 0, route.key)
    assert.ok(route.title.trim().length > 0, route.key)
  }
})

test('the six pages from the project plan exist', () => {
  assert.deepEqual(
    APP_ROUTES.map((r) => r.path),
    ['/', '/explorer', '/studio', '/time-travel', '/how-it-works', '/accessibility'],
  )
})

test('documentTitleFor gives each page a distinct, descriptive title', () => {
  assert.equal(documentTitleFor('/'), `${SITE_NAME} — Hear the changing Earth`)
  assert.equal(documentTitleFor('/explorer'), `Earth Explorer — ${SITE_NAME}`)
  assert.equal(documentTitleFor('/nope'), `${NOT_FOUND_TITLE} — ${SITE_NAME}`)
  const titles = APP_ROUTES.map((r) => documentTitleFor(r.path))
  assert.equal(new Set(titles).size, titles.length)
})

test('trailing slashes do not create a "not found" page', () => {
  assert.equal(normalizePath('/studio/'), '/studio')
  assert.equal(normalizePath('/'), '/')
  assert.equal(findRoute('/studio/')?.key, 'studio')
  assert.equal(findRoute('/missing'), undefined)
})
