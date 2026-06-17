import type { DiscoveredEmail } from './email-discovery'
import type { DomainDnsSummary } from './dns-auditor'
import { isFreeProvider } from './email-providers'

export interface EmailScoreResult {
  score: number
  hasMx: boolean
  hasSpf: boolean
  hasDkim: boolean
  hasDmarc: boolean
  usesBusinessDomain: boolean
  usesFreeEmailOnly: boolean
  findings: string[]
}

export function calculateEmailScore(
  emails: DiscoveredEmail[],
  dnsSummaries: DomainDnsSummary[],
  websiteDomain: string | null,
): EmailScoreResult {
  const findings: string[] = []
  let score = 0

  const primaryDns = dnsSummaries.find((d) => d.domain === websiteDomain?.replace(/^www\./, ''))
    ?? dnsSummaries[0]

  const hasMx = primaryDns?.hasMx ?? false
  const hasSpf = primaryDns?.hasSpf ?? false
  const hasDkim = primaryDns?.hasDkim ?? false
  const hasDmarc = primaryDns?.hasDmarc ?? false

  if (hasMx) {
    score += 20
    findings.push('MX records present — domain can receive email')
  } else {
    findings.push('Missing MX records — email delivery may fail')
  }

  if (hasSpf) {
    score += 20
    findings.push('SPF record configured')
  } else {
    score -= 10
    findings.push('Missing SPF — increased spoofing risk')
  }

  if (hasDkim) {
    score += 20
    findings.push('DKIM record detected')
  } else {
    score -= 10
    findings.push('Missing DKIM — reduced email deliverability')
  }

  if (hasDmarc) {
    score += 20
    findings.push('DMARC policy configured')
  } else {
    score -= 10
    findings.push('Missing DMARC — no email authentication policy')
  }

  const professionalEmails = emails.filter((e) => e.classification === 'PROFESSIONAL')
  const freeEmails = emails.filter((e) => isFreeProvider(e.classification))
  const usesBusinessDomain = professionalEmails.length > 0
  const usesFreeEmailOnly = emails.length > 0 && freeEmails.length === emails.length

  if (usesBusinessDomain) {
    score += 15
    findings.push('Professional business domain email detected')
  }

  if (emails.length >= 2) {
    score += 5
    findings.push(`Multiple contact addresses found (${emails.length})`)
  } else if (emails.length === 1) {
    score += 2
    findings.push('Single contact address found')
  } else {
    findings.push('No email addresses discovered on website')
  }

  if (usesFreeEmailOnly) {
    score -= 15
    findings.push('Only free email providers detected — unprofessional appearance')
  } else if (freeEmails.length > 0 && professionalEmails.length > 0) {
    findings.push('Mix of professional and free email addresses')
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    hasMx,
    hasSpf,
    hasDkim,
    hasDmarc,
    usesBusinessDomain,
    usesFreeEmailOnly,
    findings,
  }
}
