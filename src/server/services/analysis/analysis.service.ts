import { db } from '@/server/db'
import { calculateLeadPriority } from '@/lib/lead-priority'
import { analyzeWithAi } from './ai-analyzer'
import {
  calculateLeadScore,
  scoreToCategory,
  technicalToCheckInput,
} from './score-calculator'
import { captureWebsiteScreenshots } from './screenshot-capture'
import { analyzeTechnical } from './technical-analyzer'

export async function runCompanyAnalysis(
  companyId: string,
  organizationId: string,
  userId: string,
) {
  const company = await db.company.findFirst({
    where: { id: companyId, organizationId },
  })

  if (!company) throw new Error('Firma nie znaleziona')
  if (!company.website) throw new Error('Firma nie posiada strony WWW')

  const technical = await analyzeTechnical(company.website)
  const checkInput = technicalToCheckInput(technical)

  const screenshots = await captureWebsiteScreenshots(company.website, companyId)

  const preliminaryScore = calculateLeadScore(checkInput)

  const ai = await analyzeWithAi(
    company.name,
    company.website,
    technical,
    preliminaryScore.score,
    undefined,
    screenshots,
  )

  const { score, breakdown } = calculateLeadScore(checkInput)
  const category = scoreToCategory(score)
  const leadPriority = calculateLeadPriority(score, ai.salesOpportunity)

  const analysis = await db.companyAnalysis.create({
    data: {
      companyId,
      score,
      category,
      scoreBreakdown: breakdown,
      aiSummary: ai.expertSummary,
      problems: ai.problems,
      businessImpact: ai.businessImpact,
      recommendations: ai.recommendations,
      expertSummary: ai.expertSummary,
      aiDesignScore: ai.aiDesignScore,
      aiContentScore: ai.aiContentScore,
      aiCtaScore: ai.aiCtaScore,
      salesOpportunity: ai.salesOpportunity,
      salesOpportunityReason: ai.salesOpportunityReason,
      pricingLanding: ai.pricingLanding,
      pricingCompanySite: ai.pricingCompanySite,
      pricingEcommerce: ai.pricingEcommerce,
      screenshotDesktopPath: screenshots.screenshotDesktopPath,
      screenshotMobilePath: screenshots.screenshotMobilePath,
      hasSsl: technical.hasSsl,
      sslValidUntil: technical.sslValidUntil,
      hasSecurityCertificate: technical.hasSecurityCertificate,
      isMobileFriendly: technical.isMobileFriendly,
      isResponsive: technical.isResponsive,
      hasContactForm: technical.hasContactForm,
      hasGoogleMaps: technical.hasGoogleMaps,
      hasGoogleAnalytics: technical.hasGoogleAnalytics,
      hasGoogleTagManager: technical.hasGoogleTagManager,
      hasFavicon: technical.hasFavicon,
      hasPrivacyPolicy: technical.hasPrivacyPolicy,
      domainAgeYears: technical.domainAgeYears,
      isTechnologyModern: technical.isTechnologyModern,
      hasMetaTitle: technical.hasMetaTitle,
      hasMetaDescription: technical.hasMetaDescription,
      hasH1: technical.hasH1,
      metaTitle: technical.metaTitle,
      metaDescription: technical.metaDescription,
      h1Text: technical.h1Text,
      socialMedia: technical.socialMedia,
      loadTimeMs: technical.loadTimeMs,
      pageSpeedScore: technical.pageSpeedScore,
      rawTechnicalData: {
        loadTimeMs: technical.loadTimeMs,
        pageSpeedScore: technical.pageSpeedScore,
        domainAgeYears: technical.domainAgeYears,
        isTechnologyModern: technical.isTechnologyModern,
        hasScreenshots: Boolean(screenshots.screenshotDesktopPath),
      },
      rawAiResponse: ai.rawResponse,
    },
  })

  const newStatus = score < 61 ? 'TO_CONTACT' : 'ANALYZED'

  await db.company.update({
    where: { id: companyId },
    data: {
      status: newStatus,
      latestScore: score,
      latestCategory: category,
      latestSalesOpportunity: ai.salesOpportunity,
      latestLeadPriority: leadPriority,
      latestPricingLanding: ai.pricingLanding,
      latestPricingCompanySite: ai.pricingCompanySite,
      latestPricingEcommerce: ai.pricingEcommerce,
    },
  })

  await db.activityLog.createMany({
    data: [
      {
        organizationId,
        companyId,
        userId,
        type: 'ANALYSIS_COMPLETED',
        title: 'Zakończono analizę strony',
        description: `Lead Score: ${score}/100 (${category})`,
        metadata: { analysisId: analysis.id, score, leadPriority },
      },
      {
        organizationId,
        companyId,
        userId,
        type: 'REPORT_GENERATED',
        title: 'Wygenerowano raport AI',
        description: ai.expertSummary,
        metadata: { analysisId: analysis.id },
      },
      {
        organizationId,
        companyId,
        userId,
        type: 'PRICING_GENERATED',
        title: 'Wygenerowano wycenę AI',
        description: `Landing: ${ai.pricingLanding} PLN, Strona firmowa: ${ai.pricingCompanySite} PLN, E-commerce: ${ai.pricingEcommerce} PLN`,
        metadata: {
          landing: ai.pricingLanding,
          companySite: ai.pricingCompanySite,
          ecommerce: ai.pricingEcommerce,
        },
      },
    ],
  })

  return analysis
}
