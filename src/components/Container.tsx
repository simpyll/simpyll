import type { ReactNode } from 'react'

type ContainerProps = {
  children: ReactNode
  className?: string
}

export function Container({
  children,
  className = '',
}: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-6 sm:px-8 lg:px-12 ${className}`}>
      {children}
    </div>
  )
}
