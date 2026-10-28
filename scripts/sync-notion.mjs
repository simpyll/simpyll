import { compile } from '@mdx-js/mdx'
import { notionClient, synchronize } from './notion/publisher.mjs'

try {
  const result = await synchronize({
    root: process.cwd(),
    api: notionClient(process.env.NOTION_API_TOKEN),
    pageId: process.env.NOTION_PAGE_ID,
    dryRun: process.argv.includes('--dry-run'),
    validate: async mdx => {
      try { await compile(mdx) } catch { throw new Error('MDX validation failed') }
    },
  })
  console.log(`Notion sync: ${result.articles} published articles; ${result.changed ? 'changes detected' : 'unchanged'}${process.argv.includes('--dry-run') ? ' (read-only)' : ''}.`)
} catch {
  // Compiler errors can contain article excerpts; do not print them or API payloads.
  console.error('Notion sync failed: source access, conversion, ownership or content validation failed. Inspect sanitized stage evidence and retry on trusted main.');
  process.exitCode = 1
}
