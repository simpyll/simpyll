import type { ComponentProps } from 'react'

/** Preserve compiler-assigned IDs and semantic headings without interactive chrome. */
export function ArticleHeading({ level, id, children, ...props }: ComponentProps<'h2'> & { level: 2 | 3 | 4 }) {
  const Heading = `h${level}` as 'h2' | 'h3' | 'h4'
  return <Heading {...props} id={id}>{children}</Heading>
}
export function Heading2(props: ComponentProps<'h2'>) { return <ArticleHeading {...props} level={2} /> }
export function Heading3(props: ComponentProps<'h3'>) { return <ArticleHeading {...props} level={3} /> }
export function Heading4(props: ComponentProps<'h4'>) { return <ArticleHeading {...props} level={4} /> }
