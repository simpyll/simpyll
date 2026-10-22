import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

test('render boundaries never conceal server/prerender failures', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { ErrorBoundary } = await server.ssrLoadModule('/src/recovery/ErrorBoundary.tsx')
    function BrokenContent() { throw new Error('invalid article fixture') }
    for (const scope of ['route', 'application']) {
      assert.throws(() => renderToString(createElement(ErrorBoundary, { scope }, createElement(BrokenContent))), /invalid article fixture/)
    }
  } finally { await server.close() }
})
