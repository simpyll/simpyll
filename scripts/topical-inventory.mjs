import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { compile } from '@mdx-js/mdx'
import { collectArticles, readMetadata, resolveRegistry } from './redirects.mjs'
import { generateSearch } from './generate-search.mjs'
import { literal } from './validate-content.mjs'
import { topics, topicArticles, hubEligible } from '../src/lib/topics.ts'

const annotations = {
  'manual:001-python-fundamentals': ['Beginner developers', 'Functions, variables, CLI practice', 'Tutorial with a small application', 'Test calculator input boundaries with Python'],
  'notion:402b3577d26a804cbe45c6ce88398aa3': ['Clinicians and healthcare developers', 'Human factors, workflow, systems thinking', 'Long-form personal systems reflection; not clinical guidance', 'Translate one synthetic nursing workflow into requirements'],
  'manual:hello-world': ['New visitors', 'Introduction', 'Brief introduction', 'Link to a substantive project once released'],
  'notion:402b3577d26a80229136ef1dd83af10d': ['Clinicians learning development', 'Career transition, learning in public', 'Personal reflection', 'Document a bounded healthcare software learning milestone'],
  'manual:the-art-of-reading-code': ['Frontend developers and technical writers', 'React, MDX, accessibility, static publishing', 'Feature walkthrough with code and interactive examples', 'Explain accessible calculator error states'],
  'notion:403b3577d26a801eb8cde1e5aeef1347': ['Developers and readers interested in Simpyll', 'Unix philosophy, composition, software design', 'Design philosophy essay', 'Show composition in a small healthcare learning utility'],
}
async function internalLinks(source) {
  const links = new Set()
  await compile(source, { remarkPlugins: [() => tree => {
    function visit(node) {
      if (node.type === 'link' && node.url?.startsWith('/')) links.add(node.url)
      for (const attr of node.attributes ?? []) if (attr.name === 'href') {
        let value = attr.value
        if (value?.type === 'mdxJsxAttributeValueExpression') {
          try { value = literal(value.data.estree.body[0]?.expression) } catch { continue }
        }
        if (typeof value === 'string' && value.startsWith('/')) links.add(value)
      }
      for (const child of node.children ?? []) visit(child)
    }
    visit(tree)
  }] })
  return [...links].sort()
}
const cell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')
export async function inventory(root = process.cwd()) {
  const registry = await collectArticles(root, { history: new Map() })
  resolveRegistry(registry) // Fail on conflicting identities/canonical aliases.
  const documents = await generateSearch(root)
  const projects = JSON.parse(await readFile(resolve(root, 'content/projects.json'), 'utf8'))
  const rows = []
  for (const entry of registry.filter(a => a.status === 'published')) {
    const doc = documents.find(d => d.id === entry.id && d.slug === entry.slug)
    if (!doc) continue
    const source = await readFile(resolve(root, `src/content/blog/${entry.slug}.mdx`), 'utf8')
    const metadata = await readMetadata(source)
    const membership = topics.filter(t => topicArticles(t, [{ slug: entry.slug, metadata }]).length).map(t => t.title)
    const [audience, secondary, depth, opportunity] = annotations[entry.id] ?? ['Needs editorial classification', 'Unclassified', 'Needs review', 'Review before assigning a pillar']
    rows.push({ ...doc, canonical: `https://simpyll.com${doc.url}`, audience, secondary, depth, opportunity,
      primary: membership.join('; ') || 'Personal / journal (outside strategic pillars)',
      projects: projects.filter(p => p.visibility === 'public' && p.links.some(l => l.kind === 'article' && l.url === doc.url)).map(p => p.title),
      links: await internalLinks(source) })
  }
  const lines = ['# Published topical inventory', '',
    'Repository snapshot: 2026-10-26. Regenerate with `npm run audit:topics`. Sources: identity registry (`collectArticles`), published search extractor, literal MDX metadata/body links, `content/projects.json`, and editorial assignments in `src/lib/topics.ts`. No traffic, search-volume, or clinical-validation claims are inferred.', '',
    `## Coverage: ${rows.length} canonical published articles`, '',
    'One article directly examines healthcare systems. Three articles support engineering foundations. Two are personal introductions/reflections. None is a validated clinical reference, a clinical calculator guide, or a healthcare AI evaluation. The hospital essay also discusses engineering; pillar counts describe primary editorial assignments, not all mentions.', '',
    '| Article / canonical URL | Date | Category; tags | Primary pillar | Secondary topics; audience | Depth | Related projects | Existing body links | Supporting-content opportunity |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |']
  for (const r of rows) lines.push('| ' + [`[${r.title}](${r.canonical})`, r.date, `${r.category}; ${r.tags.join(', ')}`, r.primary, `${r.secondary}; ${r.audience}`, r.depth, r.projects.join(', ') || 'No explicit relationship', r.links.join(', ') || 'None', r.opportunity].map(cell).join(' | ') + ' |')
  lines.push('', '## Hub decisions', '', '| Candidate | Supporting articles | Eligible now | Decision |', '| --- | ---: | --- | --- |')
  for (const topic of topics) {
    const count = topicArticles(topic, rows.map(r => ({ slug: r.slug, metadata: { articleId: r.id, status: 'published' } }))).length
    lines.push(`| ${topic.title} | ${count} | ${hubEligible(count, false) ? 'Yes' : 'No'} | ${count ? 'Curated links in the existing Journal; no separate index' : 'Editorial opportunity only; no public placeholder'} |`)
  }
  lines.push('', 'A separate engineering guide could become useful after an original learning sequence is approved. A three-article minimum is a local editorial guardrail, not an SEO ranking rule. Existing `/blog` and `/explore` already provide canonical navigation and taxonomy filtering. No `/tools` route is justified while all healthcare tools remain planned. No new routes, sitemap entries, redirects, or breadcrumb levels are needed.', '',
    '## Publication and project lifecycle', '',
    `- Existing but unpublished article identities: ${registry.filter(a => a.status !== 'published').length}. This is a repository audit, not an inspection of private Notion drafts.`,
    '- Published case studies: Simpyll, AI Engineering, Simpyll Pulse. A published case study is not proof of a completed application.',
    ...['in-progress','shipped','on-deck','ideas','archived'].map(stage => `- ${stage}: ${projects.filter(p => p.workflowStage === stage).map(p => `${p.title} (${p.lifecycleStatus})`).join('; ') || 'None'}.`), '',
    'No released healthcare application is evidenced by the registry. RNtoNP’s external site link does not establish that its proposed database is live. Proposed editorial opportunities are in [the content roadmap](healthcare-content-roadmap.md); they are not published coverage.', '',
    '## Discovery and publishing audit', '',
    '- Home retains its approved “From bedside to build” hero. Proposed healthcare-first primary copy is held for owner review in the taxonomy document.',
    '- Project board and grid retain workflow/lifecycle labels. Existing `article` project links now connect the Simpyll and AI Engineering cards/case studies to their supporting writing; article pages derive reverse links from those same records.',
    '- Journal reading paths use immutable IDs and resolve current canonical posts; categories and tags still link to `/explore` query filters. No automatic keyword linking or MDX rewriting.',
    '- Related-article ranking (#15), previous/next navigation, search generation, citations, editorial history, breadcrumbs, sitemap, and static prerendering remain authoritative. No duplicate content index is introduced.',
    '- Notion publishing remains one-way and retains author-owned categories/tags. Taxonomy assignments live outside Notion-managed MDX. New or renamed articles require an editorial assignment/review, not a forced healthcare category.',
    '- Pulse and analytics are present on the audited main branch. No open PRs were returned by the connected GitHub repository search at audit time; this snapshot cannot guarantee future concurrency. This change does not edit Pulse, analytics, their generated data, or workflows.',
    '- Inventory body links exclude global navigation and computed recommendations; the latter still use their existing published registry. Article word counts would not establish clinical authority, so depth is a qualitative editorial assessment.', '')
  return lines.join('\n')
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await mkdir('docs/strategy', { recursive: true })
  await writeFile('docs/strategy/topical-inventory.md', await inventory())
  console.log('Published topical inventory written.')
}
