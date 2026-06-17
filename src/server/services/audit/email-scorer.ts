import type { ScoreBreakdownLine } from '@/lib/score-breakdown'
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
  breakdown: ScoreBreakdownLine[]
}

export function calculateEmailScore(
  emails: DiscoveredEmail[],
  dnsSummaries: DomainDnsSummary[],
  websiteDomain: string | null,
): EmailScoreResult {
  const findings: string[] = []
  const breakdown: ScoreBreakdownLine[] = []
  let score = 0

  const primaryDns = dnsSummaries.find((d) => d.domain === websiteDomain?.replace(/^www\./, ''))
    ?? dnsSummaries[0]

  const hasMx = primaryDns?.hasMx ?? false
  const hasSpf = primaryDns?.hasSpf ?? false
  const hasDkim = primaryDns?.hasDkim ?? false
  const hasDmarc = primaryDns?.hasDmarc ?? false

  const add = (points: number, label: string, pass: boolean, passMsg: string, failMsg: string) => {
    if (pass) {
      score += points
      breakdown.push({ label, points })
      findings.push(passMsg)
    } else if (points > 0) {
      breakdown.push({ label: `${label} (brak)`, points: 0 })
      findings.push(failMsg)
    } else {
      score += points
      breakdown.push({ label, points })
      findings.push(failMsg)
    }
  }

  add(20, 'MX records', hasMx, 'MX records present — domain can receive email', 'Missing MX records — email delivery may fail')
  add(hasSpf ? 20 : -10, 'SPF', hasSpf, 'SPF record configured', 'Missing SPF — increased spoofing risk')
  add(hasDkim ? 20 : -10, 'DKIM', hasDkim, 'DKIM record detected', 'Missing DKIM — reduced email deliverability')
  add(hasDmarc ? 20 : -10, 'DMARC', hasDmarc, 'DMARC policy configured', 'Missing DMARC — no email authentication policy')

  const professionalEmails = emails.filter((e) => e.classification === 'PROFESSIONAL')
  const freeEmails = emails.filter((e) => isFreeProvider(e.classification))
  const usesBusinessDomain = professionalEmails.length > 0
  const usesFreeEmailOnly = emails.length > 0 && freeEmails.length === emails.length

  if (usesBusinessDomain) {
    score += 15
    breakdown.push({ label: 'Email firmowy (własna domena)', points: 15 })
    findings.push('Professional business domain email detected')
  }

  if (emails.length >= 2) {
    score += 5
    breakdown.push({ label: `Wiele adresów kontaktowych (${emails.length})`, points: 5 })
    findings.push(`Multiple contact addresses found (${emails.length})`)
  } else if (emails.length === 1) {
    score += 2
    breakdown.push({ label: 'Jeden adres kontaktowy', points: 2 })
    findings.push('Single contact address found')
  } else {
    breakdown.push({ label: 'Brak adresów email', points: 0 })
    findings.push('No email addresses discovered on website')
  }

  if (usesFreeEmailOnly) {
    score -= 15
    breakdown.push({ label: 'Tylko darmowe providery (Gmail, WP itd.)', points: -15 })
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
    breakdown,
  }
}
