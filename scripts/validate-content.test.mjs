import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { validateContent } from './validate-content.mjs'

const metadata = { title: 'Example', description: 'An article', date: '2024-02-29', category: 'Journal', author: 'David', tags: [] }
const article = (body = '', data = metadata) => `export const metadata = ${JSON.stringify(data)}\n\n${body}\n`
async function fixture(t, files = { 'valid.mdx': article() }) {
  const root = await mkdtemp(join(tmpdir(), 'validate-content-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'src/content/blog'), { recursive: true })
  await mkdir(join(root, 'src/config'), { recursive: true })
  await mkdir(join(root, 'public/images'), { recursive: true })
  await writeFile(join(root, 'src/config/site.ts'), "export const siteConfig = { url: 'https://simpyll.com' }")
  await writeFile(join(root, 'public/images/photo.png'), 'image fixture')
  for (const [file, content] of Object.entries(files)) {
    await mkdir(join(root, 'src/content/blog', file, '..'), { recursive: true })
    await writeFile(join(root, 'src/content/blog', file), content)
  }
  return root
}

test('valid manual and publisher JSX, references, code, local and external destinations', async t => {
  const root = await fixture(t, { 'valid.mdx': article(`
[Home](/) [Blog](/blog/) [Article](https://simpyll.com/blog/valid?from=test#section)
[Relative](../valid/) [Email](mailto:hello@example.com) [Phone](tel:+15555555555)
[Unavailable external](https://unresolvable.invalid/a%20b)
![External](//images.example.invalid/picture.png)
![Local](/images/photo.png?v=1) [Reference][target]

[target]: /blog/valid

<a href={"/blog/valid"}>Notion link</a>
<img src={"/images/photo.png"} alt="Notion image" />
<Link to="/blog" />

\`[Not a link](/missing)\`

\`\`\`mdx
<img src="/missing.png" />
\`\`\`
`) })
  assert.deepEqual((await validateContent({ root })).errors, [])
})

for (const field of ['title', 'description', 'date', 'category', 'author', 'tags']) {
  test(`missing metadata.${field}`, async t => {
    const data = { ...metadata }; delete data[field]
    const root = await fixture(t, { 'invalid.mdx': article('', data) })
    assert.match((await validateContent({ root })).errors.join('\n'), new RegExp(`invalid.mdx: metadata.${field}`))
  })
}
for (const [field, value] of [['title', 42], ['description', ' '], ['author', null], ['category', []], ['tags', 'tag'], ['tags', [1]], ['tags', [' ']], ['date', '2023-02-29'], ['date', '2024-02-30'], ['date', '2024-13-01'], ['date', 'yesterday'], ['date', '2024-01-01T12:00:00Z'], ['slug', 'different']]) {
  test(`invalid ${field}: ${JSON.stringify(value)}`, async t => {
    const root = await fixture(t, { 'invalid.mdx': article('', { ...metadata, [field]: value }) })
    assert.match((await validateContent({ root })).errors.join('\n'), new RegExp(`metadata.${field}`))
  })
}
for (const [body, expected] of [
  ['<Unclosed>', /MDX compilation failed/],
  ['[Missing](/blog/missing)', /Broken internal link/],
  ['[Same origin](https://simpyll.com/missing)', /Broken internal link/],
  ['![Missing](/images/missing.png)', /Missing local image/],
  ['<img src={"/images/missing.png"} />', /Missing local image/],
  ['<a href="/missing">Link</a>', /Broken internal link/],
  ['[Reference][x]\n\n[x]: /missing', /Broken internal link/],
  ['[Unsafe](javascript:alert)', /Unsafe URL protocol/],
  ['[Unsafe](/%2e%2e/private)', /Unsafe path traversal/],
  ['[Unsafe](../../../private)', /Unsafe path traversal/],
  ['[Unsafe](/images%2fphoto.png)', /Unsafe encoded path/],
  ['[Unsafe](/%252e%252e/private)', /Unsafe multiply encoded/],
  ['[Malformed](/bad%ZZ)', /URI malformed/],
  ['<img src="/images/&#92;photo.png" />', /Unsafe or malformed/],
]) {
  test(body, async t => {
    const root = await fixture(t, { 'invalid.mdx': article(body) })
    const result = await validateContent({ root })
    assert.match(result.errors.join('\n'), expected)
    assert.match(result.errors.join('\n'), /src\/content\/blog\/invalid.mdx/)
  })
}

test('metadata is required and executable metadata is never evaluated', async t => {
  const root = await fixture(t, {
    'missing.mdx': '# No metadata',
    'unsafe.mdx': 'export const metadata = (() => { throw new Error("EXECUTED") })()\n',
  })
  const result = await validateContent({ root })
  assert.match(result.errors.join('\n'), /Missing metadata/)
  assert.match(result.errors.join('\n'), /literal metadata/)
  assert.doesNotMatch(result.errors.join('\n'), /EXECUTED/)
})

test('invalid filenames, nested articles, and duplicate slugs fail', async t => {
  const root = await fixture(t, {
    'valid.mdx': article(), 'nested/valid.mdx': article(), 'Wrong.MDX': article(),
    'bad name.mdx': article(), 'double--hyphen.mdx': article(),
  })
  const result = await validateContent({ root })
  assert.equal(result.count, 5)
  assert.match(result.errors.join('\n'), /Duplicate slug "valid"/)
  assert.equal(result.errors.filter(error => error.includes('Invalid filename')).length, 4)
})

test('article symlinks and public assets escaping public are rejected', async t => {
  const root = await fixture(t, { 'valid.mdx': article('![Escape](/images/escape.png)') })
  await symlink(join(root, 'src/config/site.ts'), join(root, 'src/content/blog/linked.mdx'))
  await symlink(join(root, 'src/config/site.ts'), join(root, 'public/images/escape.png'))
  const result = await validateContent({ root })
  assert.match(result.errors.join('\n'), /symbolic link/)
  assert.match(result.errors.join('\n'), /Missing local image/)
})

test('dynamic JSX URLs warn rather than rejecting authored components', async t => {
  const root = await fixture(t, { 'valid.mdx': article('<img src={imageUrl} />') })
  const result = await validateContent({ root })
  assert.deepEqual(result.errors, [])
  assert.match(result.warnings.join('\n'), /dynamic src/)
})

test('CLI exits nonzero and identifies each invalid article', async t => {
  const root = await fixture(t, { 'one.mdx': article('[Missing](/missing)'), 'two.mdx': article('<Broken>') })
  const result = spawnSync(process.execPath, [new URL('./validate-content.mjs', import.meta.url).pathname], { cwd: root, encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /one.mdx:3:1/)
  assert.match(result.stderr, /two.mdx/)
  assert.match(result.stdout, /2 error\(s\)/)
})

test('manual editorial metadata is validated through the existing content gate', async t => {
  const data = { ...metadata, updatedAt: '2026-10-25', revisions: [{ date: '2026-10-25', description: 'Updated instructions.' }], corrections: [{ id: 'example', date: '2026-10-24', description: 'Corrected an example.' }] }
  const root = await fixture(t, { 'valid.mdx': article('', data) })
  assert.deepEqual((await validateContent({ root })).errors, [])
  await writeFile(join(root, 'src/content/blog/valid.mdx'), article('', { ...data, updatedAt: '2024-02-28' }))
  assert.match((await validateContent({ root })).errors.join('\n'), /updatedAt must not precede/)
})

for (const [url, expected] of [
  ['https://doi.org/10.1000/example', null],
  ['https://react.dev/reference/react-dom/client/hydrateRoot', null],
  ['https://doi.org/invalid', /canonical DOI/],
  ['http://doi.org/10.1000/example', /canonical DOI/],
  ['javascript:alert%281%29', /Unsafe URL/],
  ['https://user:secret@example.com/reference', /Credential-bearing/],
]) test(`footnote source validation: ${url.replace(/user:secret/, 'redacted')}`, async t => {
  const root = await fixture(t, { 'valid.mdx': article(`Claim.[^source]\n\n[^source]: [Source](${url})`) })
  const { errors } = await validateContent({ root })
  if (expected) assert.match(errors.join('\n'), expected)
  else assert.deepEqual(errors, [])
  assert.doesNotMatch(errors.join('\n'), /user:secret/)
})
