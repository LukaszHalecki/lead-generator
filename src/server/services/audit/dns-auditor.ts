import { resolveTxt, resolveMx } from 'node:dns/promises'
import type { DnsRecordType } from '@prisma/client'

export interface DnsCheckResult {
  domain: string
  recordType: DnsRecordType
  value: string | null
  isValid: boolean
}

export interface DomainDnsSummary {
  domain: string
  hasMx: boolean
  hasSpf: boolean
  hasDkim: boolean
  hasDmarc: boolean
  records: DnsCheckResult[]
}

async function safeResolveTxt(name: string): Promise<string[][]> {
  try {
    return await resolveTxt(name)
  } catch {
    return []
  }
}

async function safeResolveMx(name: string): Promise<Array<{ exchange: string; priority: number }>> {
  try {
    return await resolveMx(name)
  } catch {
    return []
  }
}

async function checkSpf(domain: string): Promise<DnsCheckResult> {
  const records = await safeResolveTxt(domain)
  const flat = records.flat()
  const spf = flat.find((r) => r.toLowerCase().startsWith('v=spf1'))
  return {
    domain,
    recordType: 'SPF',
    value: spf ?? null,
    isValid: Boolean(spf),
  }
}

async function checkDmarc(domain: string): Promise<DnsCheckResult> {
  const records = await safeResolveTxt(`_dmarc.${domain}`)
  const flat = records.flat()
  const dmarc = flat.find((r) => r.toLowerCase().startsWith('v=dmarc1'))
  return {
    domain,
    recordType: 'DMARC',
    value: dmarc ?? null,
    isValid: Boolean(dmarc),
  }
}

async function checkDkim(domain: string): Promise<DnsCheckResult> {
  const selectors = ['default', 'google', 'selector1', 'selector2', 'k1', 'mail', 's1', 's2']
  for (const selector of selectors) {
    const records = await safeResolveTxt(`${selector}._domainkey.${domain}`)
    const flat = records.flat()
    const dkim = flat.find((r) => r.toLowerCase().includes('v=dkim1') || r.includes('p='))
    if (dkim) {
      return {
        domain,
        recordType: 'DKIM',
        value: dkim.slice(0, 500),
        isValid: true,
      }
    }
  }
  return { domain, recordType: 'DKIM', value: null, isValid: false }
}

async function checkMx(domain: string): Promise<DnsCheckResult> {
  const mx = await safeResolveMx(domain)
  const value = mx.length > 0 ? mx.map((m) => `${m.priority} ${m.exchange}`).join('; ') : null
  return {
    domain,
    recordType: 'MX',
    value,
    isValid: mx.length > 0,
  }
}

export async function auditDomainDns(domain: string): Promise<DomainDnsSummary> {
  const normalized = domain.replace(/^www\./, '').toLowerCase()
  const [mx, spf, dkim, dmarc] = await Promise.all([
    checkMx(normalized),
    checkSpf(normalized),
    checkDkim(normalized),
    checkDmarc(normalized),
  ])

  return {
    domain: normalized,
    hasMx: mx.isValid,
    hasSpf: spf.isValid,
    hasDkim: dkim.isValid,
    hasDmarc: dmarc.isValid,
    records: [mx, spf, dkim, dmarc],
  }
}

export function extractDomainsFromEmails(emails: string[], websiteDomain: string | null): string[] {
  const domains = new Set<string>()
  if (websiteDomain) domains.add(websiteDomain.replace(/^www\./, '').toLowerCase())
  for (const email of emails) {
    const domain = email.split('@')[1]?.toLowerCase()
    if (domain) domains.add(domain)
  }
  return Array.from(domains)
}
