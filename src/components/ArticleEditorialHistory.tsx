import type { EditorialMetadata } from '../lib/editorial.mjs'
import { correctionId, formatArticleDate } from '../lib/editorial.mjs'

export function ArticleEditorialHistory({ metadata }: { metadata: EditorialMetadata }) {
  return <>
    {!!metadata.corrections?.length && <section className="editorial-history mt-12 border-t border-outline pt-8" aria-labelledby="editorial-corrections-heading">
      <h2 id="editorial-corrections-heading" className="text-xl font-semibold">Editorial corrections</h2>
      <ol className="mt-6 space-y-6">
        {metadata.corrections.map(entry => {
          const id = correctionId(entry)
          return <li key={id} id={id} tabIndex={-1} className="scroll-mt-28 border-l-2 border-outline pl-4">
            <h3 className="font-medium"><a href={`#${id}`} className="underline underline-offset-4">Correction — <time dateTime={entry.date}>{formatArticleDate(entry.date)}</time><span className="sr-only">: {entry.description}</span></a></h3>
            <p className="mt-2 leading-relaxed text-muted">{entry.description}</p>
          </li>
        })}
      </ol>
    </section>}
    {!!metadata.revisions?.length && <section className="editorial-history mt-12 border-t border-outline pt-8" aria-labelledby="editorial-revisions-heading">
      <h2 id="editorial-revisions-heading" className="text-xl font-semibold">Revision history</h2>
      <ul className="mt-6 space-y-4">
        {metadata.revisions.map((entry, index) => <li key={`${entry.date}-${index}`} className="leading-relaxed text-muted"><time dateTime={entry.date}>{formatArticleDate(entry.date)}</time> — {entry.description}</li>)}
      </ul>
    </section>}
  </>
}
