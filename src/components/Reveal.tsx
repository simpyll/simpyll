import { useEffect, useRef, type ReactNode } from 'react'
import { observeReveal } from '../motion/reveal'

type RevealProps = {
  children: ReactNode
  /** Legacy explicit delay in seconds; prefer bounded staggerIndex for sequences. */
  delay?: number
  staggerIndex?: number
}

export function Reveal({ children, delay = 0, staggerIndex = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) return observeReveal(ref.current, staggerIndex, delay)
  }, [staggerIndex, delay])
  return <div ref={ref} data-reveal="">{children}</div>
}
