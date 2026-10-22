import assert from 'node:assert/strict'
import { test } from 'node:test'
import { visibleCount } from '../src/navigation/capacity.ts'

test('all-fit calculation reclaims More space; partial row reserves it', () => {
  assert.equal(visibleCount([60, 80, 70, 60], 340, 44, 72, 4, 10), 4)
  assert.equal(visibleCount([60, 80, 70, 60], 339, 44, 72, 4, 10), 2)
  assert.equal(visibleCount([60, 80, 70, 60], 260, 44, 72, 4, 10), 1)
  assert.equal(visibleCount([60, 80, 70, 60], 180, 44, 72, 4, 10), 0)
})

test('fractional thresholds, longer labels and future destinations use actual widths', () => {
  assert.equal(visibleCount([60.5, 80.25], 202.75, 44, 72, 4, 10), 2)
  assert.equal(visibleCount([60.5, 80.25], 202.74, 44, 72, 4, 10), 1)
  assert.equal(visibleCount([140, 200], 202.75, 44, 72, 4, 10), 0)
  assert.equal(visibleCount([40, 40, 40, 40, 40, 40], 999, 44, 72, 4, 10), 6)
})

test('capacity is stable, complete, monotonic and maximal for a stable prefix', () => {
  const widths = [60.5, 120.25, 80, 44, 150]
  let previous = 0
  for (let available = 150; available <= 800; available += .5) {
    const count = visibleCount(widths, available, 44, 72, 4, 14)
    assert.ok(count >= previous)
    assert.equal(visibleCount(widths, available, 44, 72, 4, 14), count)
    if (count > 0) {
      const used = widths.slice(0, count).reduce((sum, width) => sum + width, 0) + 44 + (count < widths.length ? 72 : 0) + 4 * (count + Number(count < widths.length)) + 14
      assert.ok(used <= available)
    }
    assert.deepEqual([...widths.slice(0, count), ...widths.slice(count)], widths)
    previous = count
  }
})
