import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, cp, symlink, rm, readFile, writeFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
const exec = promisify(execFile)
test('real production build excludes unpublished metadata and fails on invalid records', {timeout:120000}, async () => {
  const root = await mkdtemp(join(tmpdir(),'project-build-'))
  try {
    for (const path of ['content','src','public','scripts','package.json','package-lock.json','index.html','vite.config.ts','tsconfig.json','tsconfig.app.json','tsconfig.node.json']) await cp(path,join(root,path),{recursive:true})
    await symlink(resolve('node_modules'),join(root,'node_modules'),'dir')
    await symlink(resolve('.git'),join(root,'.git'),'dir')
    const data = JSON.parse(await readFile(join(root,'content/projects.json'),'utf8'))
    for (const visibility of ['draft','private']) data.push({...data[0],id:`hidden-${visibility}`,slug:`hidden-${visibility}`,title:`UNPUBLISHED_SENTINEL_${visibility}`,visibility})
    await writeFile(join(root,'content/projects.json'),JSON.stringify(data))
    const options={cwd:root,maxBuffer:4e6,env:{...process.env,SMOKE_BUILD_SHA:(await exec('git',['rev-parse','HEAD'])).stdout.trim()}}
    await exec('npm',['run','build'],options)
    const files=await readdir(join(root,'dist'),{recursive:true})
    for(const file of files.filter(f=>/\.(html|js|json|xml|css)$/.test(f))) assert.doesNotMatch(await readFile(join(root,'dist',file),'utf8'),/UNPUBLISHED_SENTINEL|hidden-private|hidden-draft/)
    const html=await readFile(join(root,'dist/index.html'),'utf8')
    assert.match(html, /<h3[^>]*>Simpyll<\/h3>/)
    assert.ok(html.indexOf('>Simpyll</h3>') < html.indexOf('>AI Engineering</h3>'))
    assert.match(await readFile(join(root,'dist/sitemap.xml'),'utf8'),/\/projects\/simpyll<\/loc>/)
    data.push(data[0]);await writeFile(join(root,'content/projects.json'),JSON.stringify(data))
    await assert.rejects(exec('npm',['run','build'],options), error=>error.code===1 && /Project "simpyll": slug duplicates/.test(error.stderr))
  } finally { await rm(root,{recursive:true,force:true}) }
})
