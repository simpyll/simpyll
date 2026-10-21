
import type { ComponentPropsWithRef, ReactNode } from 'react'

type CardProps = ComponentPropsWithRef<'div'> & {
  children: ReactNode
  hoverable?: boolean
  padding?: 'default' | 'roomy'
}

export function Card({
  children,
  hoverable = false,
  padding = 'default',
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'ui-card',
        padding === 'roomy' ? 'ui-card--roomy' : '',
        hoverable
          ? 'ui-card--hoverable'
          : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
