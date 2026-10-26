import {readFile} from 'node:fs/promises'
import {validateSnapshot} from './core.mjs'
validateSnapshot(JSON.parse(await readFile('public/google-analytics.json','utf8')))
console.log('Public Google aggregate schema validated')
