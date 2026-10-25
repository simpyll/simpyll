import test from 'node:test'
import { parseHTML } from 'linkedom'
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
    for (const path of ['content','src','public','scripts','package.json','performance-budgets.json', 'package-lock.json','index.html','vite.config.ts','tsconfig.json','tsconfig.app.json','tsconfig.node.json']) await cp(path,join(root,path),{recursive:true})
    await symlink(resolve('node_modules'),join(root,'node_modules'),'dir')
    await symlink(resolve('.git'),join(root,'.git'),'dir')
    const data = JSON.parse(await readFile(join(root,'content/projects.json'),'utf8'))
    for (const visibility of ['draft','private']) data.push({...data[0],id:`hidden-${visibility}`,slug:`hidden-${visibility}`,title:`UNPUBLISHED_SENTINEL_${visibility}`,visibility})
    await writeFile(join(root,'content/case-studies/unassociated.json'),JSON.stringify({sections:[{id:'private',title:'UNPUBLISHED_SENTINEL_editorial',paragraphs:['Not public'] }]}))
    data.push({...data[0],id:'fixture-second',slug:'fixture-unique-slug',title:'Fixture second study',seoDescription:'An independent second case study used to verify canonical project associations.',featured:{enabled:false,order:99},caseStudy:{contentKey:'fixture-editorial'}})
    await writeFile(join(root,'content/case-studies/fixture-editorial.json'),JSON.stringify({sections:[{id:'overview',title:'Fixture overview',paragraphs:['Second study fixture content.']}]}))
    for (const visibility of ['draft','private']) data.push({...data[0],id:`study-${visibility}`,slug:`study-${visibility}`,featured:{enabled:false,order:99},caseStudy:{contentKey:`unpublished-editorial-${visibility}`,visibility}})
    await writeFile(join(root,'content/projects.json'),JSON.stringify(data))
    const options={cwd:root,maxBuffer:4e6,env:{...process.env,SMOKE_BUILD_SHA:(await exec('git',['rev-parse','HEAD'])).stdout.trim()}}
    await exec('npm',['run','build'],options)
    const files=await readdir(join(root,'dist'),{recursive:true})
    for(const file of files.filter(f=>/\.(html|js|json|xml|css)$/.test(f))) assert.doesNotMatch(await readFile(join(root,'dist',file),'utf8'),/UNPUBLISHED_SENTINEL|hidden-private|hidden-draft/)
    const html=await readFile(join(root,'dist/index.html'),'utf8')
    assert.match(html, /<h3[^>]*>Simpyll<\/h3>/)
    assert.ok(html.indexOf('>Simpyll</h3>') < html.indexOf('>AI Engineering</h3>'))
    assert.match(await readFile(join(root,'dist/sitemap.xml'),'utf8'),/\/projects\/simpyll<\/loc>/)
    const hub=await readFile(join(root,'dist/projects/index.html'),'utf8')
    assert.equal(parseHTML(hub).document.querySelector('[data-project="fixture-second"] a[aria-label="View Case Study for Fixture second study"]').getAttribute('href'),'/projects/fixture-unique-slug')
    assert.match(await readFile(join(root,'dist/projects/fixture-unique-slug/index.html'),'utf8'),/Second study fixture content/)
    assert.match(await readFile(join(root,'dist/sitemap.xml'),'utf8'),/https:\/\/simpyll.com\/projects\/fixture-unique-slug<\/loc>/)
    assert.doesNotMatch(hub,/href="\/projects\/study-(draft|private)"/)
    data.push(data[0]);await writeFile(join(root,'content/projects.json'),JSON.stringify(data))
    await assert.rejects(exec('npm',['run','build'],options), error=>error.code===1 && /Project "simpyll": slug duplicates/.test(error.stderr))
  } finally { await rm(root,{recursive:true,force:true}) }
})
