// Synthetic API fixtures; no production page text, credentials, or signed URLs.
export const ROOT = '11111111111111111111111111111111'
export const DB = '22222222222222222222222222222222'
export const SOURCE = '33333333333333333333333333333333'
export const PAGE = '44444444444444444444444444444444'
export const CHILD = '55555555555555555555555555555555'
export const rt = (text, annotations = {}, link = null) => ({ type: 'text', text: { content: text, link: link ? { url: link } : null }, plain_text: text, annotations })
export const block = (type, text, extra = {}) => ({ object: 'block', id: CHILD, type, has_children: false, [type]: { rich_text: [rt(text)] }, ...extra })
export const page = (overrides = {}) => ({
  object: 'page', id: PAGE, in_trash: false, created_time: '2026-10-20T12:00:00Z', last_edited_time: '2026-10-20T12:30:00Z',
  properties: {
    Name: { type: 'title', title: [rt('Notion fixture article')] },
    Status: { type: 'status', status: { name: 'Published' } },
    Slug: { type: 'rich_text', rich_text: [rt('notion-fixture')] },
    Category: { type: 'select', select: { name: 'Technology' } },
    Tags: { type: 'multi_select', multi_select: [{ name: 'Notion' }, { name: 'MDX' }] },
    'Published Date': { type: 'date', date: { start: '2026-10-20' } },
  }, ...overrides,
})
export const blocks = [
  block('paragraph', '', { paragraph: { rich_text: [rt('Fixture intro. '), rt('Bold', { bold: true }), rt(' italic', { italic: true }), rt(' Link', {}, 'https://example.com?q=1&b=2'), rt(' {process.env.TOKEN} <script> & * [x]'), rt(' inline', { code: true })] } }),
  block('heading_1', 'First heading'), block('heading_2', 'Second heading'), block('heading_3', 'Third heading'),
  block('bulleted_list_item', 'Bullet', { has_children: true }), block('numbered_list_item', 'Number'),
  block('quote', 'A quotation'), block('code', 'const value = `<tag>{notCode}</tag>`;\nexport default value;'),
  { id: CHILD, type: 'image', has_children: false, image: { type: 'file', file: { url: 'https://prod-files-secure.s3.us-west-2.amazonaws.com/fixture.png?signature=one' }, caption: [rt('Fixture image')] } },
]
export const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWMwTpv5HwAENAIyeXoBdAAAAABJRU5ErkJggg==', 'base64')
export function fixture({ pages = [page()], content = blocks, statusType = 'status', nested = false, latest, queryPages = false } = {}) {
  const calls = []
  const result = (results, cursor = null) => ({ object: 'list', results: structuredClone(results), has_more: Boolean(cursor), next_cursor: cursor })
  const source = { object: 'data_source', id: SOURCE, properties: { Name: { type: 'title' }, Status: { type: statusType } } }
  const api = async (path, body) => {
    calls.push({ path, body })
    const [route, query] = path.split('?')
    if (route === `databases/${ROOT}`) { const e = new Error('Not a database'); e.status = 404; throw e }
    if (route === `blocks/${ROOT}/children`) {
      if (!new URLSearchParams(query).has('start_cursor')) return result([], 'second')
      return result(nested ? [{ id: CHILD, type: 'child_page' }] : [{ id: DB, type: 'child_database' }])
    }
    if (route === `blocks/${CHILD}/children`) return result(nested ? [{ id: DB, type: 'child_database' }] : [block('paragraph', 'Nested paragraph')])
    if (route === `databases/${DB}`) return { object: 'database', id: DB, data_sources: [{ id: SOURCE }] }
    if (route === `data_sources/${SOURCE}`) return structuredClone(source)
    if (route === `data_sources/${SOURCE}/query`) {
      if (queryPages && !body.start_cursor) return result(pages.slice(0, 1), 'next-article')
      return result(queryPages ? pages.slice(1) : pages)
    }
    if (/^blocks\/[a-f0-9]{32}\/children$/.test(route)) {
      return new URLSearchParams(query).has('start_cursor') ? result(content.slice(2)) : result(content.slice(0, 2), 'more-blocks')
    }
    if (route.startsWith('pages/')) return structuredClone(latest ?? pages.find(p => p.id.replaceAll('-', '') === route.slice(6)))
    throw new Error(`Unexpected fixture API route: ${route}`)
  }
  return { api, calls, source }
}
