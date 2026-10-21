import { test } from 'node:test'
import assert from 'node:assert/strict'
import { observeReveal } from '../src/motion/reveal.ts'

function setup({ reduced = false, fail = false } = {}) {
  let callback, listener, options, frames
  let disconnected = 0, cancelled = 0, removed = 0, observed = 0
  const preference = {
    matches: reduced,
    addEventListener: (_, fn) => { listener = fn },
    removeEventListener: (_, fn) => { assert.equal(fn, listener); removed++ },
  }
  class Observer {
    constructor(fn) { callback = fn }
    observe() { observed++ }
    disconnect() { disconnected++ }
  }
  const element = { animate: (keyframes, timing) => {
    if (fail) throw Error('Animation unavailable')
    frames = keyframes; options = timing
    return { cancel: () => { cancelled++ } }
  } }
  globalThis.window = { matchMedia: () => preference, IntersectionObserver: Observer }
  globalThis.IntersectionObserver = Observer
  globalThis.getComputedStyle = () => ({ getPropertyValue: name => ({
    '--ui-duration-expressive': '600ms', '--ui-motion-stagger': '120ms',
    '--ui-motion-reveal': '24px', '--ui-ease-entrance': 'cubic-bezier(0.22, 1, 0.36, 1)',
  })[name] })
  return { element, preference, intersect: () => callback([{ isIntersecting: true }]),
    reduce: () => { preference.matches = true; listener() },
    state: () => ({ options, frames, disconnected, cancelled, removed, observed }) }
}

test('existing reveal uses CSS tokens, bounded stagger, once-only observation and cleanup', () => {
  const fixture = setup()
  const cleanup = observeReveal(fixture.element, 99)
  fixture.intersect()
  assert.equal(fixture.state().options.duration, 600)
  assert.equal(fixture.state().options.delay, 480)
  assert.equal(fixture.state().options.fill, 'backwards')
  assert.deepEqual(fixture.state().frames[1], { opacity: 1, transform: 'none' })
  fixture.intersect()
  assert.equal(fixture.state().disconnected, 1)
  cleanup()
  assert.equal(fixture.state().cancelled, 1)
  assert.equal(fixture.state().removed, 1)
})
test('reduced motion skips observation and animation', () => {
  const fixture = setup({ reduced: true })
  observeReveal(fixture.element)()
  assert.equal(fixture.state().observed, 0)
  assert.equal(fixture.state().options, undefined)
})
test('live reduced-motion changes cancel in-flight animation and prevent replay', () => {
  const fixture = setup()
  const cleanup = observeReveal(fixture.element)
  fixture.intersect(); fixture.reduce()
  assert.equal(fixture.state().cancelled, 1)
  cleanup()
  assert.equal(fixture.state().removed, 1)
})
test('unmount before intersection disconnects observer and removes listener', () => {
  const fixture = setup()
  observeReveal(fixture.element)()
  assert.equal(fixture.state().disconnected, 1)
  assert.equal(fixture.state().removed, 1)
  assert.equal(fixture.state().options, undefined)
})
test('missing browser APIs and animation failures preserve visible DOM fallback', () => {
  const fixture = setup({ fail: true })
  const cleanup = observeReveal(fixture.element)
  assert.doesNotThrow(fixture.intersect)
  cleanup()
  delete window.IntersectionObserver
  assert.doesNotThrow(() => observeReveal(fixture.element)())
})
