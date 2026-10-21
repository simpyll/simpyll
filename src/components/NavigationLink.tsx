import type { ComponentPropsWithRef } from 'react'

/** Native anchor for document/section navigation; retains standard browser behavior. */
export function NavigationLink({ className = '', ...props }: ComponentPropsWithRef<'a'>) {
  return <a className={`ui-nav-link ${className}`} {...props} />
}
