import type { AnalysisCategory, SalesOpportunity } from '@prisma/client'
import {
  ANALYSIS_CATEGORY_LABELS,
  SALES_OPPORTUNITY_LABELS,
} from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export function ScoreBadge({ score, category }: { score: number | null; category?: AnalysisCategory | null }) {
  if (score === null) return <Badge variant="outline">Brak</Badge>

  const variant =
    score <= 30 ? 'danger' : score <= 50 ? 'warning' : score <= 70 ? 'secondary' : 'success'

  return (
    <Badge variant={variant}>
      {score}/100{category ? ` · ${ANALYSIS_CATEGORY_LABELS[category]}` : ''}
    </Badge>
  )
}

export function LeadScoreIndicator({
  score,
  showLabel = true,
  className,
}: {
  score: number | null
  showLabel?: boolean
  className?: string
}) {
  const value = score ?? 0

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Lead Score</span>
          <span className="font-bold text-slate-900">{value}/100</span>
        </div>
      )}
      <Progress value={value} />
    </div>
  )
}

export function SalesOpportunityBadge({ opportunity }: { opportunity: SalesOpportunity | null }) {
  if (!opportunity) return <Badge variant="outline">—</Badge>
  const variant =
    opportunity === 'HIGH' ? 'success' : opportunity === 'MEDIUM' ? 'warning' : 'secondary'
  return <Badge variant={variant}>{SALES_OPPORTUNITY_LABELS[opportunity]}</Badge>
}
