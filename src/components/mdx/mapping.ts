import type { MDXComponents } from 'mdx/types'
import { ArticleLink, RichTable, TableHeader, CodeBlock, InlineCode, ArticleImage, SemanticFigure, Caption, Details, Summary, Callout, Figure, Disclosure, Embed } from './components'

export const mdxComponents = {
  a: ArticleLink, table: RichTable, th: TableHeader, pre: CodeBlock, code: InlineCode,
  img: ArticleImage, figure: SemanticFigure, figcaption: Caption, details: Details, summary: Summary,
  MdxLink: ArticleLink, MdxTable: RichTable, MdxTh: TableHeader, MdxPre: CodeBlock, MdxCode: InlineCode,
  MdxImage: ArticleImage, MdxFigure: SemanticFigure, MdxCaption: Caption, MdxDetails: Details, MdxSummary: Summary,
  Callout, Figure, Disclosure, Embed,
} satisfies MDXComponents
