import {readFile,writeFile,rename} from 'node:fs/promises'
import {emptySnapshot,serialize,validateSnapshot} from './core.mjs'
import {refresh} from './refresh.mjs'
const path='public/google-analytics.json'
let previous
try { previous=validateSnapshot(JSON.parse(await readFile(path,'utf8'))) } catch(e) { if(e.code!=='ENOENT') throw e;previous=emptySnapshot() }
const snapshot=await refresh(previous,process.env)
const output=serialize(snapshot)
if(output!==serialize(previous)) {await writeFile(path+'.tmp',output,{mode:0o600});await rename(path+'.tmp',path)}
