import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseHTML } from 'linkedom'

test('prerendered biography has truthful chronology, shared identity and structured data', async () => {
  const { document } = parseHTML(await readFile('dist/about/index.html', 'utf8'))
  const main = document.querySelector('main')
  assert.match(main.textContent, /David Becker, RN, BSN, CCRN/)
  assert.match(main.textContent, /May 2018–April 2021/)
  assert.match(main.textContent, /July 2017–April 2021/)
  assert.match(main.textContent, /continuing graduate nursing education/)
  assert.doesNotMatch(main.textContent, /Your Name|Lorem ipsum|license number|credential ID/i)
  const scripts = document.querySelectorAll('script[type="application/ld+json"]')
  assert.equal(scripts.length, 1)
  const schema = JSON.parse(scripts[0].textContent)
  assert.equal(schema['@type'], 'ProfilePage')
  assert.equal(schema.mainEntity.name, 'David Becker')
  assert.deepEqual(schema.mainEntity.sameAs, ['https://www.linkedin.com/in/david-becker-rn-ccrn/'])
  assert.equal(schema.mainEntity.alumniOf.length, 2)
  assert.equal(document.querySelectorAll('h1').length, 1)
  const { document: home } = parseHTML(await readFile('dist/index.html', 'utf8'))
  assert.match(home.querySelector('#about').textContent, /I’m David Becker/)
  assert.ok(home.querySelector('#about a[href="/about"]'))
  const release = JSON.parse(await readFile('dist/deployment.json', 'utf8'))
  assert.ok(release.routes.some(route => route.path === '/about'))
})
