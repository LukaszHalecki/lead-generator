import { runCompanyAudit } from '../audit/audit.service'

/** @deprecated Use runCompanyAudit — kept as alias for backward compatibility */
export async function runCompanyAnalysis(
  companyId: string,
  organizationId: string,
  userId: string,
) {
  return runCompanyAudit(companyId, organizationId, userId)
}

export { runCompanyAudit } from '../audit/audit.service'
