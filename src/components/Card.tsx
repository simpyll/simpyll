
import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  hoverable?: boolean
}

export function Card({
  children,
  hoverable = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl border border-outline bg-surface p-6 sm:p-8',
        hoverable
          ? 'transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:bg-surface-hover'
          : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
