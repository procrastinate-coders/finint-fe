import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

/**
 * ⚠️ NODE 26 SHADOWS JSDOM'S localStorage. Node now defines a global
 * `localStorage` which is `undefined` unless the process was started with
 * `--localstorage-file`, and it takes precedence over jsdom's implementation —
 * so `window.localStorage` is undefined too, and every test that touches the
 * auth session store dies at `beforeEach`.
 *
 * This is environmental, not a code change: the same tests pass on an older
 * Node and fail on this one with nothing in the repo different. Rather than pin
 * a Node version (which fixes CI and not the laptop), install a minimal
 * in-memory Storage when the environment does not supply a working one, so the
 * suite stops depending on which Node happens to be on PATH.
 */
function installStorage(name: 'localStorage' | 'sessionStorage') {
  const existing = (globalThis as Record<string, unknown>)[name]
  if (existing && typeof (existing as Storage).getItem === 'function') return
  let map = new Map<string, string>()
  const shim: Storage = {
    get length() {
      return map.size
    },
    clear: () => {
      map = new Map()
    },
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => {
      map.delete(k)
    },
    setItem: (k: string, v: string) => {
      map.set(k, String(v))
    },
  }
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: shim,
  })
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, name, {
      configurable: true,
      writable: true,
      value: shim,
    })
  }
}
installStorage('localStorage')
installStorage('sessionStorage')

// jsdom gaps used by radix primitives: polyfill so they mount under test.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {}
}
if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => {}
}

// MSW lifecycle: fail on any request a handler doesn't cover.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
