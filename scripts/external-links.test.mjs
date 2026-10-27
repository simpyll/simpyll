import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractArticle, normalize, deduplicate, publicAddress, resolvePublic, check, compare } from './external-links/core.mjs'

const meta = 'export const metadata = { title: "Test", status: "published" }\n\n'
test('extracts Markdown, references, and literal MDX links without private articles', async () => {
  const items = await extractArticle(`${meta}[one](https://example.com/a#x) [two][ref]\n\n[ref]: https://example.com/a\n\n<a href="https://example.com/b">link</a>\n`, 'article.mdx', 'test')
  assert.equal(items.length, 3); assert.equal(deduplicate(items).length, 2); assert.equal(deduplicate(items)[0].sources.length, 2)
  assert.ok(items[0].line > 0)
  assert.deepEqual(await extractArticle(meta.replace('published', 'draft') + '[x](https://example.com)', 'x', 'x'), [])
})
test('normalization excludes credentials, queries, internal and unsupported destinations', () => {
  for (const value of ['mailto:a@b.com', 'http://user:password@example.com', 'https://example.com/?token=secret', 'https://simpyll.com/x', 'file:///etc/passwd']) assert.equal(normalize(value), null)
  assert.equal(normalize('https://EXAMPLE.com:443/path#x'), 'https://example.com/path')
})
test('rejects special IPv4 and IPv6 including mapped addresses and mixed DNS answers', async () => {
  for (const address of ['127.0.0.1','10.1.2.3','169.254.169.254','0.0.0.0','100.64.0.1','192.0.2.1','::1','fc00::1','fe80::1','::ffff:8.8.8.8','2001:db8::1']) assert.equal(publicAddress(address), false, address)
  assert.equal(publicAddress('8.8.8.8'), true); assert.equal(publicAddress('2606:4700:4700::1111'), true)
  await assert.rejects(resolvePublic('example.com', async () => [{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]))
})
test('validates redirects on each hop, detects loops and handles GET fallback', async () => {
  const visited = [], resolveHost = async h => { visited.push(h); if (h === 'private.test') throw new Error('non-public destination'); return {address:'8.8.8.8',family:4} }
  const redirect = async () => ({status:301, location:'http://private.test/'})
  assert.equal((await check('https://example.com/', {resolveHost,request:redirect})).status, 'inconclusive'); assert.deepEqual(visited, ['example.com','private.test'])
  assert.equal((await check('https://example.com/', {resolveHost,request:async () => ({status:301,location:'/'})})).detail, 'redirect loop')
  const methods = []; const result = await check('https://example.com/', {resolveHost,request:async (_u,_a,method) => { methods.push(method); return {status:method === 'HEAD' ? 405 : 200} }})
  assert.deepEqual(methods, ['HEAD','GET']); assert.equal(result.status, 'healthy')
})
test('classifies response codes and timeout conservatively', async () => {
  const resolveHost = async () => ({address:'8.8.8.8',family:4})
  for (const [code,status] of [[404,'broken'],[410,'broken'],[403,'inconclusive'],[429,'inconclusive'],[503,'potential'],[200,'healthy']]) assert.equal((await check('https://example.com/', {resolveHost,request:async () => ({status:code})})).status, status)
  assert.equal((await check('https://example.com/', {resolveHost,request:async () => { throw new Error('timeout') }})).status, 'inconclusive')
})
test('requires consecutive findings and recognizes recovery', () => {
  const item = {url:'https://example.com/', sources:[], result:{status:'broken'}}
  const a = compare([item]); assert.equal(a.results[0].persistent, false)
  const b = compare([item],a.state); assert.equal(b.results[0].persistent, true)
  const c = compare([{...item,result:{status:'healthy'}}],b.state); assert.equal(c.results[0].recovered, true)
  assert.deepEqual(compare([]).results, [])
})

test('complete monitoring runs use mocked checks, preserve state, redact secrets and recover', async () => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os'); const { join } = await import('node:path')
  const { run } = await import('./external-links/run.mjs')
  const root = await mkdtemp(join(tmpdir(), 'links-test-'))
  try {
    await mkdir(join(root, 'src/content/blog'), {recursive:true}); await mkdir(join(root, 'content'), {recursive:true})
    await writeFile(join(root, 'src/content/blog/public.mdx'), meta + '[a](https://example.com/secret-path)\n[b](https://example.com/?token=secret)')
    await writeFile(join(root, 'src/content/blog/private.mdx'), meta.replace('published','draft') + '[x](https://private.example.com/)')
    await writeFile(join(root, 'content/projects.json'), JSON.stringify([{visibility:'private', links:[{url:'https://private.example.com/'}]}]))
    const checked = []; let status = 'broken'
    const checker = async url => { checked.push(url); return {status, detail: status === 'broken' ? 'HTTP 404' : 'HTTP 200'} }
    const opts = {root, checker, sleep:async () => {}}
    const first = await run(opts); assert.equal(first.count, 1); assert.equal(first.actionable, false)
    const second = await run(opts); assert.equal(second.actionable, true)
    assert.ok(!second.report.includes('secret-path')); assert.ok(!second.report.includes('token=secret')); assert.ok(!second.report.includes('private.example.com'))
    status = 'healthy'; const third = await run(opts); assert.equal(third.actionable, false); assert.match(third.report, /recovered/)
    assert.ok(checked.every(url => url === 'https://example.com/secret-path'))
    assert.ok(!(await readFile(join(root,'.external-link-state/state.json'),'utf8')).includes('secret-path'))
  } finally { await rm(root, {recursive:true,force:true}) }
})

test('issue workflow creates only when needed, updates one bot issue, and rejects duplicates', async () => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os'); const { join } = await import('node:path'); const { spawnSync } = await import('node:child_process')
  const yaml = await readFile('.github/workflows/external-links.yml','utf8')
  const block = yaml.split("node - <<'NODE'\n")[1].split('\n          NODE')[0].split('\n').map(line => line.replace(/^          /, '')).join('\n')
  const dir = await mkdtemp(join(tmpdir(),'issue-test-'))
  try {
    await mkdir(join(dir,'report')); await mkdir(join(dir,'bin'))
    await writeFile(join(dir,'bin/gh'), '#!/usr/bin/env node\nconst fs=require("fs"); fs.appendFileSync(process.env.LOG,JSON.stringify(process.argv.slice(2))+"\\n"); if(process.argv.includes("--slurp")) console.log(process.env.ISSUES);\n', {mode:0o755})
    const marker = '<!-- simpyll-external-link-monitor-v1 -->', bot = {number:17,user:{login:'github-actions[bot]'},body:marker+'\nold'}
    function execute(issues, actionable) {
      const log = join(dir,'calls')
      return Promise.all([writeFile(log,''),writeFile(join(dir,'report/issue.json'), JSON.stringify({actionable,body:'report'}))]).then(async () => {
        const result = spawnSync(process.execPath, ['-e', block], {cwd:dir,encoding:'utf8',env:{...process.env,PATH:join(dir,'bin')+':'+process.env.PATH,LOG:log,ISSUES:JSON.stringify([issues]),GH_REPO:'owner/repo'}})
        return {result,calls:(await readFile(log,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse)}
      })
    }
    let actual = await execute([],false); assert.equal(actual.result.status,0); assert.equal(actual.calls.length,1)
    actual = await execute([],true); assert.equal(actual.result.status,0); assert.ok(actual.calls[1].includes('POST'))
    actual = await execute([bot],true); assert.equal(actual.result.status,0); assert.ok(actual.calls[1].includes('PATCH'))
    actual = await execute([bot,bot],true); assert.notEqual(actual.result.status,0); assert.equal(actual.calls.length,1)
  } finally { await rm(dir,{recursive:true,force:true}) }
})
