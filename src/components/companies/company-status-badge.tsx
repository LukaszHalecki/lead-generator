import { COMPANY_STATUS_LABELS } from '@/lib/constants'
import type { CompanyStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'

const STATUS_VARIANT: Record<CompanyStatus, 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger'> = {
  NEW: 'outline',
  ANALYZED: 'secondary',
  TO_CONTACT: 'warning',
  SENT: 'default',
  REPLIED: 'success',
  CLIENT: 'success',
}

export function CompanyStatusBadge({ status }: { status: CompanyStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{COMPANY_STATUS_LABELS[status]}</Badge>
}
