import { Heading2, Heading3, Heading4 } from './ArticleHeading'
import type { MDXComponents } from 'mdx/types'
import { ArticleLink, RichTable, TableHeader, CodeBlock, InlineCode, ArticleImage, SemanticFigure, Caption, Details, Summary, Callout, Figure, Gallery, Disclosure, Embed } from './components'

export const mdxComponents = {
  h2: Heading2, h3: Heading3, h4: Heading4, MdxH2: Heading2, MdxH3: Heading3, MdxH4: Heading4,
  a: ArticleLink, table: RichTable, th: TableHeader, pre: CodeBlock, code: InlineCode,
  img: ArticleImage, figure: SemanticFigure, figcaption: Caption, details: Details, summary: Summary,
  MdxLink: ArticleLink, MdxTable: RichTable, MdxTh: TableHeader, MdxPre: CodeBlock, MdxCode: InlineCode,
  MdxImage: ArticleImage, MdxFigure: SemanticFigure, MdxCaption: Caption, MdxDetails: Details, MdxSummary: Summary,
  Callout, Figure, Gallery, Disclosure, Embed,
} satisfies MDXComponents
