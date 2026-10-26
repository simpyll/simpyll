import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { compile } from '@mdx-js/mdx'
import { parse, passages, discover, apply, hash, authorizedDecisions, bodyLinks } from './internal-links/core.mjs'
const sourceText='React hydration mismatches require careful hydration mismatch analysis and stable rendering.'
async function fixture(text=sourceText) {
 const source={id:'manual:source',slug:'source',kind:'article',title:'Source',category:'Engineering',tags:['hydration mismatch'],url:'/blog/source',tree:await parse(text),links:[]}
 const target={id:'manual:target',slug:'target',kind:'project',title:'Understanding hydration mismatch analysis',description:'React hydration mismatches and stable rendering',category:'Engineering',tags:['hydration mismatch'],url:'/blog/target',links:[]}
 return [source,target]
}
test('deterministic relevance, suppression, duplicate and existing targets',async()=>{
 const docs=await fixture(), a=discover(docs)
 assert.equal(a.length,1); assert.deepEqual(discover(docs),a)
 assert.equal(discover(docs,[{...a[0],decision:'rejected'}]).length,0)
 docs[0].links=['/blog/target']; assert.equal(discover(docs).length,0)
 assert.equal(discover(await fixture('React is useful.')).length,0)
})
test('protected Markdown and JSX structures yield no writable passages',async()=>{
 for(const text of ['# hydration mismatch','[hydration mismatch](/blog/x)','[hydration mismatch][ref]\n\n[ref]: /blog/x','`hydration mismatch`','```js\nhydration mismatch\n```','<Box>hydration mismatch</Box>','<p><em>{"hydration mismatch"}</em></p>','![hydration mismatch](/x.png)','text[^1]\n\n[^1]: hydration mismatch','Dose medication hydration mismatch','citation [@paper] hydration mismatch']) assert.equal(passages(await parse(text)).length,0,text)
 assert.equal(passages(await parse('<p>{"Unicode café hydration mismatch"}</p>')).length,1)
})
test('only approvals apply; exact context fails safely after edits or moves',async()=>{
 for(const decision of ['pending','rejected','approved']) {
 const docs=await fixture(), s=discover(docs)[0]
 const result=apply(docs[0].tree,docs[0],docs,[{...s,decision}])
 assert.equal(bodyLinks(docs[0].tree).includes('/blog/target'),decision==='approved')
 if(decision==='approved') assert.equal(result[0].status,'applied')
 }
 const docs=await fixture(), d={...discover(docs)[0],decision:'approved'}
 for(const text of [sourceText+' Changed.','Intro.\n\n'+sourceText]) {
 docs[0].tree=await parse(text); assert.equal(apply(docs[0].tree,docs[0],docs,[d])[0].status,'stale')
 }
 docs[0].tree=await parse(sourceText); assert.equal(apply(docs[0].tree,docs[0],[docs[0]],[d])[0].status,'invalid')
})
test('signatures bind exact manifest and owner evidence; merge alone grants nothing',async()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519'), docs=await fixture()
 const manifest={schemaVersion:1,decisions:[{...discover(docs)[0],decision:'approved'}]}, authorization={reviewer:'owner',commit:'abc',run:'123'}
 const envelope={manifest,authorization}; envelope.signature=sign(null,Buffer.from(JSON.stringify(envelope)),privateKey).toString('base64')
 assert.equal(authorizedDecisions(envelope,publicKey).length,1)
 envelope.manifest.decisions[0].decision='rejected'; assert.throws(()=>authorizedDecisions(envelope,publicKey),/unauthorized/)
 assert.throws(()=>authorizedDecisions({manifest},publicKey),/unauthorized/)
 assert.deepEqual(authorizedDecisions({manifest:{schemaVersion:1,decisions:[]}},''),[])
 assert.equal(hash({a:1}),hash({a:1}))
})
test('shared MDX compiler emits static link for Markdown and Notion; canonical identity migration',async()=>{
 for(const text of [sourceText,`<p>{${JSON.stringify(sourceText)}}</p>`]) {
 const docs=await fixture(text), d={...discover(docs)[0],decision:'approved'}
 docs[1].url='/blog/migrated'
 const compiled=String(await compile(text,{remarkPlugins:[()=>tree=>{apply(tree,docs[0],docs,[d])}]}))
 assert.match(compiled,/href: "\/blog\/migrated"/)
 assert.match(compiled,/hydration mismatch/)
 }
})
test('workflow adapters never execute PR code or accept comment commands',async()=>{
 const {readFile}=await import('node:fs/promises')
 for(const path of ['internal-links','authorize-internal-links']) {
 const text=await readFile(`.github/workflows/${path}.yml`,'utf8')
 assert.doesNotMatch(text,/pull_request_target|issue_comment|schedule:|secrets\..*PAT/)
 assert.match(text,/contents: read/); assert.match(text,/refs\/heads\/main/)
 }
})
test('approved compiler output renders a native accessible anchor without JavaScript',async()=>{
 const {evaluate}=await import('@mdx-js/mdx'), runtime=await import('react/jsx-runtime')
 const {createElement}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server')
 const docs=await fixture(), d={...discover(docs)[0],decision:'approved'}
 const module=await evaluate(sourceText,{...runtime,remarkPlugins:[()=>tree=>{apply(tree,docs[0],docs,[d])}]})
 const html=renderToStaticMarkup(createElement(module.default))
 assert.match(html,/<a href="\/blog\/target">hydration mismatch<\/a>/)
 assert.equal(html.replace(/<[^>]*>/g,''),sourceText)
})

test('existing adjacent links and repeated anchors withhold suggestions',async()=>{
 assert.equal(discover(await fixture('[Existing](/blog/other)\n\n'+sourceText)).length,0)
 assert.equal(discover(await fixture(sourceText+' hydration mismatch.')).length,0)
})
