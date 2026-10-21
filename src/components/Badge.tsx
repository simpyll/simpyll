import type { ComponentPropsWithRef } from 'react'

/** Noninteractive metadata; use a button or link for an action. */
export function Badge({ className = '', ...props }: ComponentPropsWithRef<'span'>) {
  return <span className={`ui-badge ${className}`} {...props} />
}
