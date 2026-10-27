import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { validateProjects, createProjectSelectors, normalizeProjectUrl } from '../src/projects/schema.ts'
import { generateProjects } from './generate-projects.mjs'
const minimal = () => ({ id:'sample', slug:'sample', title:'Sample', summary:'An illustrative test project.', workflowStage:'shipped', lifecycleStatus:'active', projectType:'Software', visibility:'public', technologies:[], links:[], featured:{enabled:true,order:1}, order:1 })
test('minimal and fully populated metadata normalize without optional defaults', () => {
  assert.deepEqual(validateProjects([minimal()]).errors, [])
  const full = {...minimal(), subtitle:'Subtitle', description:'Description', category:'Software', tags:['Learning'], role:'Developer', startDate:'2026-01-01', completionDate:'2026-02-01', updatedDate:'2026-03-01', seoDescription:'Example', technologies:['react','typescript'], links:[{kind:'repository',label:'Source',url:'https://github.com/example/example'}], cover:{src:'/images/sample.png',alt:'Example screen',width:800,height:600,order:0,focalPoint:{x:0.5,y:0.5}}, screenshots:[{src:'/images/other.png',alt:'',decorative:true,order:1}], relatedArticles:['hello-world'], caseStudy:{contentKey:'sample-story'}}
  const result = validateProjects([full], () => true)
  assert.deepEqual(result.errors, [])
  assert.equal(result.projects[0].links[0].external, true)
  assert.equal('subtitle' in validateProjects([minimal()]).projects[0], false)
})
const invalid = {
  'missing required title': p => delete p.title,
  'invalid slug': p => p.slug='Bad--slug',
  'reserved slug': p => p.slug='new',
  'invalid status': p => p.workflowStage='unknown',
  'unsafe URL': p => p.links=[{kind:'live',label:'Run',url:'javascript:alert(1)'}],
  'bad date': p => p.startDate='2026-02-30',
  'date relationship': p => { p.startDate='2026-03-01'; p.completionDate='2026-02-01' },
  'duplicate technologies': p => p.technologies=['react','react'],
  'unknown technology': p => p.technologies=['React'],
  'invalid screenshot': p => p.screenshots=[{src:'/images/missing.png',alt:'',order:-1}],
  'invalid featured': p => p.featured={enabled:true,order:-1},
  'unknown properties': p => p.revenue=1000,
  'duplicate normalized URLs': p => p.links=[{kind:'live',label:'One',url:'https://example.com'},{kind:'demo',label:'Two',url:'https://example.com/'}],
  'private public media': p => {p.visibility='private';p.cover={src:'/images/private.png',alt:'Private',order:0}},
}
for (const [name, mutate] of Object.entries(invalid)) test(name, () => {
  const p = minimal(); mutate(p)
  const result = validateProjects([p], () => false)
  assert.ok(result.errors.length, name)
  assert.match(result.errors.join('\n'), /Project "sample":/)
  assert.deepEqual(result.projects, [])
})
for (const field of ['slug','id']) test(`duplicate ${field} fails`, () => {
  const second = {...minimal(),id:'second',slug:'second'}; second[field]='sample'
  assert.match(validateProjects([minimal(),second]).errors.join('\n'), new RegExp(`${field} duplicates`))
})
test('safe URL normalization and unsafe encodings', () => {
  assert.deepEqual(normalizeProjectUrl('/blog/hello-world#hello'), {url:'/blog/hello-world#hello',external:false})
  for (const url of ['data:text/html,hi','//evil.com','/%2fexample.com','/%252fexample.com','/../secret','https://user:pass@example.com','https://example.com/\\evil','https://example.com/%0a']) assert.throws(() => normalizeProjectUrl(url), url)
})
test('selectors sort, filter, limit and look up safely without mutating input', () => {
  const data = validateProjects([
    {...minimal(),id:'z',slug:'z'},
    {...minimal(),id:'a',slug:'a'},
    {...minimal(),id:'draft',slug:'draft',visibility:'draft'},
    {...minimal(),id:'private',slug:'private',visibility:'private'},
    {...minimal(),id:'unfeatured',slug:'unfeatured',order:2,featured:{enabled:false,order:0}},
  ]).projects.reverse()
  const selectors = createProjectSelectors(data)
  assert.equal(selectors.getAllProjects().length,5)
  assert.equal(selectors.getPublicProjects().length,3)
  assert.deepEqual(selectors.getFeaturedProjects().map(p=>p.id),['a','z'])
  assert.equal(selectors.getFeaturedProjects(1).length,1)
  assert.equal(selectors.getProjectById('a').slug,'a')
  assert.equal(selectors.getProjectBySlug('a').id,'a')
  for (const key of ['unknown','draft','private']) assert.equal(selectors.getProjectBySlug(key),undefined)
  assert.deepEqual(createProjectSelectors([]).getFeaturedProjects(),[])
})
test('generator emits public metadata only; invalid CLI exits nonzero and removes stale output', async () => {
  const root = await mkdtemp(join(tmpdir(),'project-schema-'))
  try {
    await mkdir(join(root,'public')); await mkdir(join(root,'content'))
    const data = [minimal(),{...minimal(),id:'secret',slug:'secret',title:'PRIVATE_SENTINEL',visibility:'private'}]
    await writeFile(join(root,'content/projects.json'),JSON.stringify(data))
    await generateProjects(root)
    const output = await readFile(join(root,'src/generated/projects.json'),'utf8')
    assert.ok(!output.includes('PRIVATE_SENTINEL'))
    data.push(minimal()); await writeFile(join(root,'content/projects.json'),JSON.stringify(data))
    const cli = spawnSync(process.execPath,[new URL('./generate-projects.mjs',import.meta.url).pathname],{cwd:root,encoding:'utf8'})
    assert.equal(cli.status,1); assert.match(cli.stderr,/slug duplicates/)
    await assert.rejects(readFile(join(root,'src/generated/projects.json')))
  } finally {await rm(root,{recursive:true,force:true})}
})
test('production build validates project metadata and PR fixtures test projects before deployment', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  for (const key of ['dev', 'build', 'build:client', 'build:server']) {
    assert.ok(pkg.scripts[key].startsWith('npm run validate:projects &&'), `${key} must validate projects`)
  }
  const validate = await readFile(new URL('../.github/workflows/validate.yml', import.meta.url), 'utf8')
  const deploy = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8')
  assert.match(validate, /run: npm run test:projects/, 'PR fixtures must test project metadata')
  assert.match(deploy, /run: npm run build/, 'deployment must build and validate projects')
  assert.doesNotMatch(deploy, /run: npm run test:projects/, 'deployment must not repeat PR project tests')
})
test('homepage uses selectors and preserves authored text in prerendered output',async()=>{
  const source=await readFile(new URL('../src/components/FeaturedWork.tsx',import.meta.url),'utf8')
  assert.match(source,/getFeaturedProjects\(\)/); assert.doesNotMatch(source,/This site, in progress/)
  // Static HTML is checked in the existing build-dependent prerender suite.
})
