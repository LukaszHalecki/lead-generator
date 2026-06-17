import { ensureHttps } from '@/lib/url'
import type { QuickAuditResult } from '@/lib/quick-audit.types'
import { calculateLeadScore, scoreToCategory, technicalToCheckInput } from '../analysis/score-calculator'
import { analyzeAuditWithAi, blendWebsiteScoreWithUx } from './audit-ai-analyzer'
import { auditDomainDns, extractDomainsFromEmails } from './dns-auditor'
import { classifyEmailProvider } from './email-providers'
import { discoverEmails } from './email-discovery'
import { calculateEmailScore } from './email-scorer'
import { runMarketingAudit } from './marketing-auditor'
import { calculateSalesOpportunity } from './opportunity-engine'
import { runWebsiteAudit, type WebsiteAuditResult } from './website-audit'
import type { MarketingAuditResult } from './marketing-auditor'

export type { QuickAuditResult } from '@/lib/quick-audit.types'

function slimWebsiteAudit(website: WebsiteAuditResult): QuickAuditResult['websiteAudit'] {
  return {
    hasSsl: website.hasSsl,
    hasHttpsRedirect: website.hasHttpsRedirect,
    isMobileFriendly: website.isMobileFriendly,
    hasContactForm: website.hasContactForm,
    hasRobotsTxt: website.hasRobotsTxt,
    hasSitemap: website.hasSitemap,
  }
}

function slimMarketingAudit(marketing: MarketingAuditResult): QuickAuditResult['marketingAudit'] {
  return {
    hasGoogleAnalytics: marketing.hasGoogleAnalytics,
    hasGa4: marketing.hasGa4,
    hasMetaPixel: marketing.hasMetaPixel,
    hasGoogleMaps: marketing.hasGoogleMaps,
    socialLinks: marketing.socialLinks,
  }
}

export function toClientQuickAuditResult(result: QuickAuditResult): QuickAuditResult {
  return {
    ...result,
    websiteAudit: result.websiteAudit
      ? 'rawHtml' in result.websiteAudit
        ? slimWebsiteAudit(result.websiteAudit as WebsiteAuditResult)
        : result.websiteAudit
      : null,
    marketingAudit: result.marketingAudit
      ? 'findings' in result.marketingAudit && !('hasGa4' in result.marketingAudit)
        ? result.marketingAudit
        : slimMarketingAudit(result.marketingAudit as MarketingAuditResult)
      : null,
  }
}

export async function runQuickAudit(input: {
  website?: string
  email?: string
}): Promise<QuickAuditResult> {
  const website = input.website?.trim() || null
  const email = input.email?.trim().toLowerCase() || null

  if (!website && !email) {
    throw new Error('Podaj adres strony WWW lub email')
  }

  if (!website && email) {
    return runEmailOnlyAudit(email)
  }

  return runWebsiteQuickAudit(website!, email)
}

async function runEmailOnlyAudit(email: string): Promise<QuickAuditResult> {
  const domain = email.split('@')[1]
  if (!domain) throw new Error('Nieprawidłowy adres email')

  const classification = classifyEmailProvider(email, null)
  const discovered = {
    address: email,
    source: 'manual',
    classification,
  }

  const dnsSummary = await auditDomainDns(domain)
  const emailResult = calculateEmailScore([discovered], [dnsSummary], null)

  const findings = [...emailResult.findings, `Klasyfikacja: ${classification}`]

  return {
    mode: 'email',
    website: null,
    email,
    websiteScore: null,
    emailScore: emailResult.score,
    marketingScore: null,
    leadScore: null,
    category: null,
    overallOpportunity: emailResult.score < 50 ? 'HIGH' : emailResult.score < 70 ? 'MEDIUM' : 'LOW',
    opportunityReason:
      emailResult.score < 50
        ? `Słaba infrastruktura email (${emailResult.score}/100) — brakujące rekordy DNS zwiększają ryzyko niedostarczenia wiadomości.`
        : `Infrastruktura email oceniona na ${emailResult.score}/100.`,
    websiteAudit: null,
    marketingAudit: null,
    emailRecords: [discovered],
    dnsRecords: dnsSummary.records,
    emailFindings: findings,
    hasMx: emailResult.hasMx,
    hasSpf: emailResult.hasSpf,
    hasDkim: emailResult.hasDkim,
    hasDmarc: emailResult.hasDmarc,
    usesBusinessDomain: emailResult.usesBusinessDomain,
    usesFreeEmailOnly: emailResult.usesFreeEmailOnly,
    problems: findings.filter((f) => f.includes('Missing') || f.includes('Brak') || f.includes('No ')),
    businessImpact: emailResult.score < 50
      ? ['Ryzyko niedostarczenia emaili', 'Obniżone zaufanie odbiorców', 'Większe ryzyko trafienia do spamu']
      : [],
    recommendations: [
      !emailResult.hasSpf ? 'Skonfiguruj rekord SPF' : null,
      !emailResult.hasDkim ? 'Skonfiguruj DKIM' : null,
      !emailResult.hasDmarc ? 'Dodaj politykę DMARC' : null,
      emailResult.usesFreeEmailOnly ? 'Rozważ profesjonalny email na własnej domenie' : null,
    ].filter(Boolean) as string[],
    expertSummary: `Audyt infrastruktury email dla ${email}: wynik ${emailResult.score}/100.`,
    uxFindings: [],
  }
}

async function runWebsiteQuickAudit(website: string, manualEmail: string | null): Promise<QuickAuditResult> {
  const url = ensureHttps(website)
  const displayName = new URL(url).hostname.replace(/^www\./, '')

  const websiteAudit = await runWebsiteAudit(url)
  const { emails: discovered, websiteDomain } = await discoverEmails(url)

  if (manualEmail && !discovered.some((e) => e.address === manualEmail)) {
    discovered.unshift({
      address: manualEmail,
      source: 'manual',
      classification: classifyEmailProvider(manualEmail, websiteDomain),
    })
  }

  const emailAddresses = discovered.map((e) => e.address)
  const domains = extractDomainsFromEmails(emailAddresses, websiteDomain)
  const dnsSummaries = await Promise.all(domains.map((d) => auditDomainDns(d)))
  const emailResult = calculateEmailScore(discovered, dnsSummaries, websiteDomain)
  const marketingAudit = runMarketingAudit(websiteAudit, websiteAudit.rawHtml)

  const preliminaryWebsiteScore = websiteAudit.websiteScore
  const ai = await analyzeAuditWithAi(
    displayName,
    url,
    websiteAudit,
    marketingAudit,
    emailResult,
    discovered,
    preliminaryWebsiteScore,
    emailResult.score,
    marketingAudit.marketingScore,
  )

  const websiteScore = blendWebsiteScoreWithUx(preliminaryWebsiteScore, ai)
  const checkInput = technicalToCheckInput({
    ...websiteAudit,
    hasSecurityCertificate: websiteAudit.hasSsl,
    pageSpeedScore: websiteAudit.loadTimeMs
      ? websiteAudit.loadTimeMs < 1500 ? 95 : websiteAudit.loadTimeMs < 3000 ? 75 : 50
      : null,
  })
  const { score: leadScore } = calculateLeadScore(checkInput)
  const category = scoreToCategory(leadScore)
  const opportunity = calculateSalesOpportunity(websiteScore, emailResult.score, marketingAudit.marketingScore)

  return {
    mode: 'website',
    website: url,
    email: manualEmail ?? discovered[0]?.address ?? null,
    websiteScore,
    emailScore: emailResult.score,
    marketingScore: marketingAudit.marketingScore,
    leadScore,
    category,
    overallOpportunity: opportunity.overallOpportunity,
    opportunityReason: opportunity.opportunityReason,
    websiteAudit: slimWebsiteAudit(websiteAudit),
    marketingAudit: slimMarketingAudit(marketingAudit),
    emailRecords: discovered,
    dnsRecords: dnsSummaries.flatMap((d) => d.records),
    emailFindings: emailResult.findings,
    hasMx: emailResult.hasMx,
    hasSpf: emailResult.hasSpf,
    hasDkim: emailResult.hasDkim,
    hasDmarc: emailResult.hasDmarc,
    usesBusinessDomain: emailResult.usesBusinessDomain,
    usesFreeEmailOnly: emailResult.usesFreeEmailOnly,
    problems: ai.problems,
    businessImpact: ai.businessImpact,
    recommendations: ai.recommendations,
    expertSummary: ai.expertSummary,
    uxFindings: ai.uxFindings,
  }
}
