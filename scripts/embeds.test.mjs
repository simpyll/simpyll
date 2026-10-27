import { test } from 'node:test'
import assert from 'node:assert/strict'
import { approvedEmbed } from '../src/lib/embeds.mjs'
import { convertBlocks } from './notion/publisher.mjs'

test('approved YouTube URLs produce only a canonical privacy-enhanced player', () => {
  for (const url of ['https://www.youtube.com/watch?v=abcdefghijk', 'https://youtu.be/abcdefghijk', 'https://www.youtube-nocookie.com/embed/abcdefghijk']) {
    assert.deepEqual(approvedEmbed(url), { provider: 'YouTube', src: 'https://www.youtube-nocookie.com/embed/abcdefghijk' })
  }
})
test('unsafe hosts, schemes, paths and ambiguous URLs are rejected', () => {
  for (const url of ['http://youtube.com/watch?v=abcdefghijk', 'javascript:alert(1)', 'data:text/html,x', 'blob:https://youtube.com/x', '//youtube.com/watch?v=abcdefghijk', 'https://youtube.com.evil.test/watch?v=abcdefghijk', 'https://youtube.com@evil.test/watch?v=abcdefghijk', 'https://user@youtube.com/watch?v=abcdefghijk', 'https://youtube.com/watch?v=abcdefghijk&v=12345678901', 'https://youtube.com/shorts/abcdefghijk', 'https://youtu.be/abcdefghijk?x=1', 'not a url']) assert.equal(approvedEmbed(url), null, url)
})
test('Notion embed output keeps safe fallbacks and rejects unsafe URLs', async () => {
  const convert = block => convertBlocks([block], async () => '')
  assert.match(await convert({ type: 'embed', embed: { url: 'https://youtu.be/abcdefghijk' } }), /<Embed url=/)
  assert.match(await convert({ type: 'embed', embed: { url: 'https://example.com/demo' } }), /example.com/)
  await assert.rejects(convert({ type: 'embed', embed: { url: 'javascript:alert(1)' } }), /HTTPS/)
  await assert.rejects(convert({ type: 'video', video: { type: 'file', file: { url: 'https://example.com' } } }), /HTTPS/)
})
