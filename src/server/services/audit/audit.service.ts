import { db } from '@/server/db'
import { calculateLeadPriority } from '@/lib/lead-priority'
import { captureWebsiteScreenshots } from '../analysis/screenshot-capture'
import { calculateLeadScore, scoreToCategory, technicalToCheckInput } from '../analysis/score-calculator'
import { analyzeAuditWithAi, blendWebsiteScoreWithUx } from './audit-ai-analyzer'
import { auditDomainDns, extractDomainsFromEmails } from './dns-auditor'
import { discoverEmails } from './email-discovery'
import { calculateEmailScore } from './email-scorer'
import { runMarketingAudit } from './marketing-auditor'
import { calculateSalesOpportunity } from './opportunity-engine'
import { runWebsiteAudit } from './website-audit'

export async function runCompanyAudit(
  companyId: string,
  organizationId: string,
  userId: string,
) {
  const company = await db.company.findFirst({
    where: { id: companyId, organizationId },
  })

  if (!company) throw new Error('Firma nie znaleziona')
  if (!company.website) throw new Error('Firma nie posiada strony WWW')

  // 1. Website Audit
  const website = await runWebsiteAudit(company.website)

  // 2. Email Discovery + DNS Audit
  const { emails, websiteDomain } = await discoverEmails(company.website)
  const emailAddresses = emails.map((e) => e.address)
  const domains = extractDomainsFromEmails(emailAddresses, websiteDomain)
  const dnsSummaries = await Promise.all(domains.map((d) => auditDomainDns(d)))
  const emailResult = calculateEmailScore(emails, dnsSummaries, websiteDomain)

  // 3. Marketing Audit
  const marketing = runMarketingAudit(website, website.rawHtml)

  // 4. Screenshots
  const screenshots = await captureWebsiteScreenshots(company.website, companyId)

  // 5. AI Business Assessment
  const preliminaryWebsiteScore = website.websiteScore
  const ai = await analyzeAuditWithAi(
    company.name,
    company.website,
    website,
    marketing,
    emailResult,
    emails,
    preliminaryWebsiteScore,
    emailResult.score,
    marketing.marketingScore,
    undefined,
    screenshots,
  )

  const websiteScore = blendWebsiteScoreWithUx(preliminaryWebsiteScore, ai)

  // 6. Lead Score (legacy compat)
  const checkInput = technicalToCheckInput({
    ...website,
    hasSecurityCertificate: website.hasSsl,
    pageSpeedScore: website.loadTimeMs
      ? website.loadTimeMs < 1500 ? 95 : website.loadTimeMs < 3000 ? 75 : 50
      : null,
  })
  const { score: leadScore, breakdown } = calculateLeadScore(checkInput)
  const category = scoreToCategory(leadScore)

  // 7. Sales Opportunity
  const opportunity = calculateSalesOpportunity(websiteScore, emailResult.score, marketing.marketingScore)
  const leadPriority = calculateLeadPriority(leadScore, opportunity.overallOpportunity)

  // 8. Persist audit
  const audit = await db.companyAudit.create({
    data: {
      companyId,
      websiteScore,
      emailScore: emailResult.score,
      marketingScore: marketing.marketingScore,
      leadScore,
      category,
      overallOpportunity: opportunity.overallOpportunity,
      opportunityReason: opportunity.opportunityReason,
      hasSsl: website.hasSsl,
      sslValidUntil: website.sslValidUntil,
      hasHttpsRedirect: website.hasHttpsRedirect,
      isMobileFriendly: website.isMobileFriendly,
      isResponsive: website.isResponsive,
      loadTimeMs: website.loadTimeMs,
      hasMetaTitle: website.hasMetaTitle,
      hasMetaDescription: website.hasMetaDescription,
      hasH1: website.hasH1,
      metaTitle: website.metaTitle,
      metaDescription: website.metaDescription,
      h1Text: website.h1Text,
      h1Count: website.h1Count,
      hasFavicon: website.hasFavicon,
      hasRobotsTxt: website.hasRobotsTxt,
      hasSitemap: website.hasSitemap,
      hasContactForm: website.hasContactForm,
      hasGoogleMaps: website.hasGoogleMaps,
      hasPrivacyPolicy: website.hasPrivacyPolicy,
      hasCookieBanner: website.hasCookieBanner,
      titleLength: website.titleLength,
      descriptionLength: website.descriptionLength,
      hasMultipleH1: website.hasMultipleH1,
      hasMissingHeadings: website.hasMissingHeadings,
      internalLinksCount: website.internalLinksCount,
      hasStructuredData: website.hasStructuredData,
      aiDesignScore: ai.aiDesignScore,
      aiTrustScore: ai.aiTrustScore,
      aiReadabilityScore: ai.aiReadabilityScore,
      aiCtaScore: ai.aiCtaScore,
      uxFindings: ai.uxFindings,
      problems: ai.problems,
      businessImpact: ai.businessImpact,
      recommendations: ai.recommendations,
      expertSummary: ai.expertSummary,
      pricingLanding: ai.pricingLanding,
      pricingCompanySite: ai.pricingCompanySite,
      pricingEcommerce: ai.pricingEcommerce,
      screenshotDesktopPath: screenshots.screenshotDesktopPath,
      screenshotMobilePath: screenshots.screenshotMobilePath,
      scoreBreakdown: breakdown,
      websiteFindings: website.findings,
      rawWebsiteData: {
        finalUrl: website.finalUrl,
        domainAgeYears: website.domainAgeYears,
        isTechnologyModern: website.isTechnologyModern,
      },
      rawAiResponse: ai.rawResponse,
      emailAudit: {
        create: {
          emailScore: emailResult.score,
          hasMx: emailResult.hasMx,
          hasSpf: emailResult.hasSpf,
          hasDkim: emailResult.hasDkim,
          hasDmarc: emailResult.hasDmarc,
          usesBusinessDomain: emailResult.usesBusinessDomain,
          usesFreeEmailOnly: emailResult.usesFreeEmailOnly,
          findings: emailResult.findings,
          emailRecords: {
            create: emails.map((e) => ({
              address: e.address,
              source: e.source,
              classification: e.classification,
            })),
          },
          dnsRecords: {
            create: dnsSummaries.flatMap((d) =>
              d.records.map((r) => ({
                domain: r.domain,
                recordType: r.recordType,
                value: r.value,
                isValid: r.isValid,
              })),
            ),
          },
        },
      },
      marketingAudit: {
        create: {
          marketingScore: marketing.marketingScore,
          hasGoogleAnalytics: marketing.hasGoogleAnalytics,
          hasGa4: marketing.hasGa4,
          hasGoogleTagManager: marketing.hasGoogleTagManager,
          hasMetaPixel: marketing.hasMetaPixel,
          hasLinkedInInsight: marketing.hasLinkedInInsight,
          socialLinks: marketing.socialLinks,
          hasGoogleMaps: marketing.hasGoogleMaps,
          hasAddress: marketing.hasAddress,
          hasPhone: marketing.hasPhone,
          findings: marketing.findings,
        },
      },
    },
    include: {
      emailAudit: { include: { emailRecords: true, dnsRecords: true } },
      marketingAudit: true,
    },
  })

  // Legacy CompanyAnalysis record for backward compat
  await db.companyAnalysis.create({
    data: {
      companyId,
      score: leadScore,
      category,
      scoreBreakdown: breakdown,
      aiSummary: ai.expertSummary,
      problems: ai.problems,
      businessImpact: ai.businessImpact,
      recommendations: ai.recommendations,
      expertSummary: ai.expertSummary,
      aiDesignScore: ai.aiDesignScore,
      aiContentScore: ai.aiReadabilityScore,
      aiCtaScore: ai.aiCtaScore,
      salesOpportunity: opportunity.overallOpportunity,
      salesOpportunityReason: opportunity.opportunityReason,
      pricingLanding: ai.pricingLanding,
      pricingCompanySite: ai.pricingCompanySite,
      pricingEcommerce: ai.pricingEcommerce,
      screenshotDesktopPath: screenshots.screenshotDesktopPath,
      screenshotMobilePath: screenshots.screenshotMobilePath,
      hasSsl: website.hasSsl,
      sslValidUntil: website.sslValidUntil,
      hasSecurityCertificate: website.hasSsl,
      isMobileFriendly: website.isMobileFriendly,
      isResponsive: website.isResponsive,
      hasContactForm: website.hasContactForm,
      hasGoogleMaps: website.hasGoogleMaps,
      hasGoogleAnalytics: marketing.hasGoogleAnalytics,
      hasGoogleTagManager: marketing.hasGoogleTagManager,
      hasFavicon: website.hasFavicon,
      hasPrivacyPolicy: website.hasPrivacyPolicy,
      domainAgeYears: website.domainAgeYears,
      isTechnologyModern: website.isTechnologyModern,
      hasMetaTitle: website.hasMetaTitle,
      hasMetaDescription: website.hasMetaDescription,
      hasH1: website.hasH1,
      metaTitle: website.metaTitle,
      metaDescription: website.metaDescription,
      h1Text: website.h1Text,
      socialMedia: marketing.socialLinks,
      loadTimeMs: website.loadTimeMs,
      pageSpeedScore: website.loadTimeMs
        ? website.loadTimeMs < 1500 ? 95 : website.loadTimeMs < 3000 ? 75 : 50
        : null,
      rawTechnicalData: { auditId: audit.id, websiteScore, emailScore: emailResult.score, marketingScore: marketing.marketingScore },
      rawAiResponse: ai.rawResponse,
    },
  })

  const newStatus = leadScore < 61 ? 'TO_CONTACT' : 'ANALYZED'

  await db.company.update({
    where: { id: companyId },
    data: {
      status: newStatus,
      latestScore: leadScore,
      latestCategory: category,
      latestSalesOpportunity: opportunity.overallOpportunity,
      latestLeadPriority: leadPriority,
      latestPricingLanding: ai.pricingLanding,
      latestPricingCompanySite: ai.pricingCompanySite,
      latestPricingEcommerce: ai.pricingEcommerce,
      latestWebsiteScore: websiteScore,
      latestEmailScore: emailResult.score,
      latestMarketingScore: marketing.marketingScore,
      hasSpf: emailResult.hasSpf,
      hasDkim: emailResult.hasDkim,
      hasDmarc: emailResult.hasDmarc,
      usesFreeEmail: emailResult.usesFreeEmailOnly,
      ...(emails.length > 0 && !company.email ? { email: emails[0]!.address } : {}),
    },
  })

  await db.activityLog.createMany({
    data: [
      {
        organizationId,
        companyId,
        userId,
        type: 'AUDIT_COMPLETED',
        title: 'Zakończono audyt WWW & Email',
        description: `Website: ${websiteScore}/100, Email: ${emailResult.score}/100, Marketing: ${marketing.marketingScore}/100`,
        metadata: { auditId: audit.id, websiteScore, emailScore: emailResult.score, marketingScore: marketing.marketingScore },
      },
      {
        organizationId,
        companyId,
        userId,
        type: 'ANALYSIS_COMPLETED',
        title: 'Lead Score obliczony',
        description: `Lead Score: ${leadScore}/100 (${category})`,
        metadata: { auditId: audit.id, leadScore, leadPriority },
      },
      {
        organizationId,
        companyId,
        userId,
        type: 'REPORT_GENERATED',
        title: 'Wygenerowano raport AI',
        description: ai.expertSummary,
        metadata: { auditId: audit.id },
      },
      {
        organizationId,
        companyId,
        userId,
        type: 'PRICING_GENERATED',
        title: 'Wygenerowano wycenę AI',
        description: `Landing: ${ai.pricingLanding} PLN, Strona firmowa: ${ai.pricingCompanySite} PLN, E-commerce: ${ai.pricingEcommerce} PLN`,
        metadata: { landing: ai.pricingLanding, companySite: ai.pricingCompanySite, ecommerce: ai.pricingEcommerce },
      },
    ],
  })

  return audit
}
