import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,writeFile,unlink} from 'node:fs/promises'
import {transpileModule,ModuleKind,JsxEmit} from 'typescript'
import {createElement} from 'react'
import {renderToString} from 'react-dom/server'
import {emptySnapshot,dateShift} from './core.mjs'
// Compile just this typed view for SSR fixture tests; no browser globals or Google services.
test('Google view renders connected, partial, missing and failed sources from real-shaped fixtures',async()=>{
 const path=new URL('./.dashboard-fixture.mjs',import.meta.url)
 let source=await readFile(new URL('../../src/analytics/GoogleMetrics.tsx',import.meta.url),'utf8')
 source=source.replace("import snapshot from '../../public/google-analytics.json'","const snapshot = {}")
 source=source.replace("from './summary'","from '../../src/analytics/summary.ts'")
 await writeFile(path,transpileModule(source,{compilerOptions:{module:ModuleKind.ESNext,jsx:JsxEmit.ReactJSX}}).outputText)
 try {
  const {GoogleMetrics}=await import(path.href)
  const s=emptySnapshot(),end='2026-10-20'
  s.searchConsole={status:'ok',updated:'2026-10-24',timezone:'America/Los_Angeles',days:Array.from({length:56},(_,i)=>({date:dateShift(end,i-55),clicks:2,impressions:10,position:3}))}
  let html=renderToString(createElement(GoogleMetrics,{data:s}))
  assert.match(html,/CTR \(%\)/);assert.match(html,/versus/);assert.match(html,/lower is better/);assert.match(html,/Not connected/);assert.match(html,/<svg/);assert.match(html,/<caption/)
  s.searchConsole.days.splice(4,1);s.ga4.status='error'
  html=renderToString(createElement(GoogleMetrics,{data:s}));assert.match(html,/both periods need every reported date/);assert.match(html,/Latest refresh failed/)
  s.ga4={status:'ok',updated:'2026-10-24',timezone:'America/Chicago',days:[]}
  html=renderToString(createElement(GoogleMetrics,{data:s}));assert.match(html,/no reported rows/);assert.doesNotMatch(html,/NaN|Infinity/)
 } finally {await unlink(path)}
})
