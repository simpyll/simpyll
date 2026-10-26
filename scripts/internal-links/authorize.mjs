import { readFile, writeFile } from 'node:fs/promises'
import { sign } from 'node:crypto'
import { validateManifest } from './core.mjs'
const [owner,repo]=process.env.GITHUB_REPOSITORY.split('/')
const actor=process.env.GITHUB_ACTOR
// Trusted API identity, never an editable manifest field. Initial deployment is owner-only.
const response=await fetch(`https://api.github.com/repos/${owner}/${repo}`,{headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,'X-GitHub-Api-Version':'2022-11-28'}})
if(!response.ok) throw new Error('Cannot verify repository owner')
const repository=await response.json()
if(repository.owner.type !== 'User' || actor !== repository.owner.login || process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Owner on main required')
const manifest=validateManifest(JSON.parse(await readFile('content/internal-links/review.json','utf8')))
const authorization={reviewer:actor,commit:process.env.GITHUB_SHA,run:`https://github.com/${owner}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`,date:new Date().toISOString()}
const payload={manifest,authorization}
const signature=sign(null,Buffer.from(JSON.stringify(payload)),process.env.INTERNAL_LINKS_PRIVATE_KEY).toString('base64')
await writeFile('content/internal-links/decisions.json',JSON.stringify({...payload,signature},null,2)+'\n')
