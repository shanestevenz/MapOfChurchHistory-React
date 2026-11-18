import assert from 'node:assert/strict'
import test from 'node:test'
import { MODE_KEY, SHELVED_SKINS, SKIN_KEY, SKINS, THEME_INIT_SCRIPT } from '../lib/theme.ts'

/** Runs the <head> script against a fake document and storage. */
function runInit(stored, prefersDark = false) {
  const classes = new Set(['dark'])
  const attributes = {}
  const root = {
    style: {},
    setAttribute: (name, value) => { attributes[name] = value },
    classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) },
  }
  const context = {
    localStorage: { getItem: (key) => stored[key] ?? null },
    matchMedia: () => ({ matches: prefersDark }),
    document: { documentElement: root },
  }
  new Function('localStorage', 'matchMedia', 'document', THEME_INIT_SCRIPT)(
    context.localStorage, context.matchMedia, context.document,
  )
  return { skin: attributes['data-skin'], dark: classes.has('dark'), scheme: root.style.colorScheme }
}

test('the head script defaults to the Modern skin in dark mode', () => {
  assert.deepEqual(runInit({}), { skin: 'modern', dark: true, scheme: 'dark' })
})

test('the head script applies a saved skin and mode', () => {
  assert.deepEqual(
    runInit({ [SKIN_KEY]: 'glass', [MODE_KEY]: 'light' }),
    { skin: 'glass', dark: false, scheme: 'light' },
  )
})

test('system mode follows the operating system', () => {
  assert.equal(runInit({ [MODE_KEY]: 'system' }, true).dark, true)
  assert.equal(runInit({ [MODE_KEY]: 'system' }, false).dark, false)
})

test('unknown saved values fall back to the defaults', () => {
  assert.deepEqual(
    runInit({ [SKIN_KEY]: 'neon-vaporwave', [MODE_KEY]: 'sepia' }),
    { skin: 'modern', dark: true, scheme: 'dark' },
  )
})

test('every skin has a preview for both modes', () => {
  for (const skin of SKINS) {
    assert.equal(skin.preview.light.colors.length, 3, skin.id)
    assert.equal(skin.preview.dark.colors.length, 3, skin.id)
  }
})

test('a saved shelved skin falls back to the default', () => {
  for (const skin of SHELVED_SKINS) {
    assert.ok(!SKINS.some((offered) => offered.id === skin.id), `${skin.id} is shelved`)
    assert.equal(runInit({ [SKIN_KEY]: skin.id }).skin, 'modern')
  }
})
