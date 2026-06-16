import { Badge } from '@/components/ui/badge'
import { LEAD_PRIORITY_LABELS } from '@/lib/constants'
import type { LeadPriority } from '@/lib/lead-priority'

const VARIANT: Record<LeadPriority, 'danger' | 'warning' | 'secondary'> = {
  HOT: 'danger',
  WARM: 'warning',
  COLD: 'secondary',
}

export function LeadPriorityBadge({ priority }: { priority: LeadPriority | null }) {
  if (!priority) return <Badge variant="outline">—</Badge>
  return <Badge variant={VARIANT[priority]}>{LEAD_PRIORITY_LABELS[priority]}</Badge>
}
