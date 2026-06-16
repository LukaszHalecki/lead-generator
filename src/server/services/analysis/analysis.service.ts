import { db } from '@/server/db'
import { analyzeWithAi } from './ai-analyzer'
import {
  calculateLeadScore,
  calculatePricing,
  scoreToCategory,
} from './score-calculator'
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

  const preliminaryScore = calculateLeadScore({
    hasSsl: technical.hasSsl,
    isMobileFriendly: technical.isMobileFriendly,
    isResponsive: technical.isResponsive,
    loadTimeMs: technical.loadTimeMs,
    pageSpeedScore: technical.pageSpeedScore,
    hasMetaTitle: technical.hasMetaTitle,
    hasMetaDescription: technical.hasMetaDescription,
    hasH1: technical.hasH1,
    hasContactForm: technical.hasContactForm,
    hasGoogleMaps: technical.hasGoogleMaps,
    hasSocialMedia: technical.hasSocialMedia,
    hasGoogleAnalytics: technical.hasGoogleAnalytics,
  })

  const ai = await analyzeWithAi(
    company.name,
    company.website,
    technical,
    preliminaryScore.score,
  )

  const aiAverage = Math.round(
    (ai.aiDesignScore + ai.aiContentScore + ai.aiCtaScore) / 3,
  )

  const { score, breakdown } = calculateLeadScore({
    hasSsl: technical.hasSsl,
    isMobileFriendly: technical.isMobileFriendly,
    isResponsive: technical.isResponsive,
    loadTimeMs: technical.loadTimeMs,
    pageSpeedScore: technical.pageSpeedScore,
    hasMetaTitle: technical.hasMetaTitle,
    hasMetaDescription: technical.hasMetaDescription,
    hasH1: technical.hasH1,
    hasContactForm: technical.hasContactForm,
    hasGoogleMaps: technical.hasGoogleMaps,
    hasSocialMedia: technical.hasSocialMedia,
    hasGoogleAnalytics: technical.hasGoogleAnalytics,
    aiAverageScore: aiAverage,
  })

  const category = scoreToCategory(score)
  const pricing = calculatePricing(score, true)

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
      pricingLanding: pricing.landing,
      pricingCompanySite: pricing.companySite,
      pricingEcommerce: pricing.ecommerce,
      hasSsl: technical.hasSsl,
      sslValidUntil: technical.sslValidUntil,
      isMobileFriendly: technical.isMobileFriendly,
      isResponsive: technical.isResponsive,
      hasContactForm: technical.hasContactForm,
      hasGoogleMaps: technical.hasGoogleMaps,
      hasGoogleAnalytics: technical.hasGoogleAnalytics,
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
      },
      rawAiResponse: ai.rawResponse,
    },
  })

  const newStatus = score < 70 ? 'TO_CONTACT' : 'ANALYZED'

  await db.company.update({
    where: { id: companyId },
    data: {
      status: newStatus,
      latestScore: score,
      latestCategory: category,
      latestSalesOpportunity: ai.salesOpportunity,
      latestPricingLanding: pricing.landing,
      latestPricingCompanySite: pricing.companySite,
      latestPricingEcommerce: pricing.ecommerce,
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
        metadata: { analysisId: analysis.id, score },
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
        title: 'Wygenerowano wycenę projektu',
        description: `Landing: ${pricing.landing} PLN, Strona firmowa: ${pricing.companySite} PLN`,
        metadata: pricing,
      },
    ],
  })

  return analysis
}
