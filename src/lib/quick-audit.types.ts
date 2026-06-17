import type { EmailProviderType, SalesOpportunity } from '@prisma/client'

export interface QuickAuditEmailRecord {
  address: string
  source: string
  classification: EmailProviderType
}

export interface QuickAuditDnsRecord {
  domain: string
  recordType: 'MX' | 'SPF' | 'DKIM' | 'DMARC'
  value: string | null
  isValid: boolean
}

export interface QuickAuditResult {
  mode: 'website' | 'email'
  website: string | null
  email: string | null
  websiteScore: number | null
  emailScore: number
  marketingScore: number | null
  leadScore: number | null
  category: string | null
  overallOpportunity: SalesOpportunity | null
  opportunityReason: string | null
  websiteAudit: {
    hasSsl: boolean
    hasHttpsRedirect: boolean
    isMobileFriendly: boolean
    hasContactForm: boolean
    hasRobotsTxt: boolean
    hasSitemap: boolean
  } | null
  marketingAudit: {
    hasGoogleAnalytics: boolean
    hasGa4: boolean
    hasMetaPixel: boolean
    hasGoogleMaps: boolean
    socialLinks?: Record<string, string> | null
  } | null
  emailRecords: QuickAuditEmailRecord[]
  dnsRecords: QuickAuditDnsRecord[]
  emailFindings: string[]
  hasMx: boolean
  hasSpf: boolean
  hasDkim: boolean
  hasDmarc: boolean
  usesBusinessDomain: boolean
  usesFreeEmailOnly: boolean
  problems: string[]
  businessImpact: string[]
  recommendations: string[]
  expertSummary: string | null
  uxFindings: string[]
}
