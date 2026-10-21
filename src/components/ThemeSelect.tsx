import { useTheme, type ThemePreference } from '../theme/store'

export function ThemeSelect() {
  const { preference, setPreference } = useTheme()
  return (
    <label className="flex shrink-0 items-center gap-2 text-xs text-muted">
      <span className="sr-only sm:not-sr-only">Theme</span>
      <select
        className="min-h-11 rounded-lg border border-control-outline bg-surface px-2 text-sm text-foreground hover:bg-surface-hover"
        value={preference}
        onChange={event => setPreference(event.target.value as ThemePreference)}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  )
}
