/** Keep a stable prefix. Reserve More only after testing the complete row. */
export function visibleCount(widths: number[], available: number, theme: number, more: number, gap: number, inset: number) {
  const fits = (count: number, overflow: boolean) => {
    const controls = count + 1 + Number(overflow)
    return widths.slice(0, count).reduce((sum, width) => sum + width, 0)
      + theme + (overflow ? more : 0) + gap * (controls - 1) + inset <= available
  }
  if (fits(widths.length, false)) return widths.length
  for (let count = widths.length - 1; count > 0; count--) {
    if (fits(count, true)) return count
  }
  return 0
}
