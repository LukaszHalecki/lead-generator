import type { SalesOpportunity } from '@prisma/client'

export type LeadPriority = 'HOT' | 'WARM' | 'COLD'

/**
 * Hot:  Lead Score < 40  + High Opportunity
 * Warm: Lead Score 40–60 + Medium Opportunity
 * Cold: Lead Score > 60  + Low Opportunity
 */
export function calculateLeadPriority(
  score: number | null | undefined,
  opportunity: SalesOpportunity | null | undefined,
): LeadPriority | null {
  if (score == null || opportunity == null) return null

  if (score < 40 && opportunity === 'HIGH') return 'HOT'
  if (score >= 40 && score <= 60 && opportunity === 'MEDIUM') return 'WARM'
  if (score > 60 && opportunity === 'LOW') return 'COLD'

  return null
}

export function matchesPriorityFilter(
  priority: LeadPriority,
  score: number | null | undefined,
  opportunity: SalesOpportunity | null | undefined,
): boolean {
  if (score == null || opportunity == null) return false
  if (priority === 'HOT') return score < 40 && opportunity === 'HIGH'
  if (priority === 'WARM') return score >= 40 && score <= 60 && opportunity === 'MEDIUM'
  return score > 60 && opportunity === 'LOW'
}
