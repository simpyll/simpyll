import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

test('render boundaries never conceal server/prerender failures', async () => {
  // server.ws:false disables Vite 8's standalone WebSocket transport, which otherwise
  // binds the default port 24678 and collides across parallel node:test files.
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { ErrorBoundary } = await server.ssrLoadModule('/src/recovery/ErrorBoundary.tsx')
    function BrokenContent() { throw new Error('invalid article fixture') }
    for (const scope of ['route', 'application']) {
      assert.throws(() => renderToString(createElement(ErrorBoundary, { scope }, createElement(BrokenContent))), /invalid article fixture/)
    }
  } finally { await server.close() }
})
