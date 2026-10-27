import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseHTML } from 'linkedom'
test('prerendered clinical controls have explicit unique labels separate from select options',async()=>{
 const html=await readFile('dist/tools/lipidpath/index.html','utf8')
 const {document}=parseHTML(html)
 const controls=[...document.querySelectorAll('main .lp-field input, main .lp-field select')]
 assert.ok(controls.length>=10)
 const ids=controls.map(c=>c.id)
 assert.equal(new Set(ids).size,ids.length)
 for(const control of controls){
  const label=[...document.querySelectorAll('label')].find(l=>l.getAttribute('for')===control.id)
  assert.ok(label,control.outerHTML)
  assert.ok(label.textContent.trim())
  assert.equal(label.querySelectorAll('select,input,option').length,0)
  const hint=control.getAttribute('aria-describedby')
  if(hint)assert.ok(document.getElementById(hint)?.textContent.trim())
 }
 assert.match(html,/https:\/\/simpyll.com\/tools\/lipidpath/)
 assert.ok(!document.querySelector('main form[action]'))
})
