/** Owner-only contracts. Never import report instances into browser components. */
export type FindingSeverity = 'critical' | 'warning' | 'informational'
export type LinkKind = 'contextual' | 'breadcrumb' | 'related' | 'previous-next' | 'global' | 'footer' | 'navigation' | 'project' | 'other'
export interface AuditLink { href: string; anchor: string; contextual: boolean; kind: LinkKind }
export interface PulseFinding {
  id: string; rule: string; severity: FindingSeverity; route: string; field: string
  gate: 'error' | 'warning'; explanation: string; remediation: string
  status: 'baseline' | 'new' | 'existing'
}
export interface PrivatePulseReport {
  schemaVersion: 1; findings: PulseFinding[]; resolved: string[]
  routes: { route: string; crawlDepth: number | null; siteNavigationOrphan: boolean; contextualLinkOrphan: boolean; contextualInbound: string[]; duplicateContextualDestinations: { destination: string; count: number }[]; links: AuditLink[]; outbound: string[] }[]
}
