import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { getOrgContext } from '@/server/middleware/context'

function buildScoreDistribution(scores: (number | null)[]) {
  const chart = [
    { range: '0-20', count: 0 },
    { range: '21-40', count: 0 },
    { range: '41-60', count: 0 },
    { range: '61-80', count: 0 },
    { range: '81-100', count: 0 },
  ]
  for (const s of scores) {
    if (s == null) continue
    if (s <= 20) chart[0]!.count++
    else if (s <= 40) chart[1]!.count++
    else if (s <= 60) chart[2]!.count++
    else if (s <= 80) chart[3]!.count++
    else chart[4]!.count++
  }
  return chart
}

export const getDashboardStatsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { organizationId } = await getOrgContext()

  const [
    totalCompanies,
    avgScoreResult,
    avgWebsiteResult,
    avgEmailResult,
    avgMarketingResult,
    below40Count,
    highOpportunityCount,
    missingSpfCount,
    missingDkimCount,
    missingDmarcCount,
    freeEmailCount,
    highAuditOpportunityCount,
    campaignsCount,
    repliesCount,
    pricingAgg,
    statusDistribution,
    analysisTrend,
    emailEngagement,
    companiesWithScore,
    allScoredCompanies,
    auditCompanies,
    opportunityBreakdown,
  ] = await Promise.all([
    db.company.count({ where: { organizationId } }),
    db.company.aggregate({
      where: { organizationId, latestScore: { not: null } },
      _avg: { latestScore: true },
    }),
    db.company.aggregate({
      where: { organizationId, latestWebsiteScore: { not: null } },
      _avg: { latestWebsiteScore: true },
    }),
    db.company.aggregate({
      where: { organizationId, latestEmailScore: { not: null } },
      _avg: { latestEmailScore: true },
    }),
    db.company.aggregate({
      where: { organizationId, latestMarketingScore: { not: null } },
      _avg: { latestMarketingScore: true },
    }),
    db.company.count({ where: { organizationId, latestScore: { lt: 40 } } }),
    db.company.count({
      where: { organizationId, latestScore: { lt: 40 }, latestSalesOpportunity: 'HIGH' },
    }),
    db.company.count({ where: { organizationId, hasSpf: false } }),
    db.company.count({ where: { organizationId, hasDkim: false } }),
    db.company.count({ where: { organizationId, hasDmarc: false } }),
    db.company.count({ where: { organizationId, usesFreeEmail: true } }),
    db.company.count({ where: { organizationId, latestSalesOpportunity: 'HIGH' } }),
    db.campaign.count({ where: { organizationId } }),
    db.reply.count({ where: { company: { organizationId } } }),
    db.company.aggregate({
      where: { organizationId, latestPricingCompanySite: { not: null } },
      _sum: { latestPricingLanding: true, latestPricingCompanySite: true, latestPricingEcommerce: true },
    }),
    db.company.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
    db.companyAnalysis.findMany({
      where: { company: { organizationId } },
      select: { analyzedAt: true, score: true },
      orderBy: { analyzedAt: 'asc' },
      take: 90,
    }),
    db.company.aggregate({
      where: { organizationId },
      _sum: { emailDeliveredCount: true, emailOpenedCount: true, emailClickedCount: true, emailRepliedCount: true },
    }),
    db.company.findMany({
      where: { organizationId, latestScore: { not: null } },
      select: { latestScore: true },
    }),
    db.company.findMany({
      where: { organizationId, latestScore: { not: null } },
      select: { latestScore: true, latestSalesOpportunity: true, latestLeadPriority: true },
    }),
    db.company.findMany({
      where: { organizationId },
      select: { latestWebsiteScore: true, latestEmailScore: true, latestMarketingScore: true },
    }),
    db.company.groupBy({
      by: ['latestSalesOpportunity'],
      where: { organizationId, latestSalesOpportunity: { not: null } },
      _count: true,
    }),
  ])

  const potentialValue =
    (pricingAgg._sum.latestPricingLanding ?? 0) +
    (pricingAgg._sum.latestPricingCompanySite ?? 0) +
    (pricingAgg._sum.latestPricingEcommerce ?? 0)

  const hotLeadsCount = allScoredCompanies.filter(
    (c) => c.latestScore! < 40 && c.latestSalesOpportunity === 'HIGH',
  ).length
  const warmLeadsCount = allScoredCompanies.filter(
    (c) => c.latestScore! >= 40 && c.latestScore! <= 60 && c.latestSalesOpportunity === 'MEDIUM',
  ).length
  const coldLeadsCount = allScoredCompanies.filter(
    (c) => c.latestScore! > 60 && c.latestSalesOpportunity === 'LOW',
  ).length

  const trendMap = new Map<string, { count: number; totalScore: number }>()
  for (const a of analysisTrend) {
    const day = a.analyzedAt.toISOString().slice(0, 10)
    const existing = trendMap.get(day) ?? { count: 0, totalScore: 0 }
    existing.count += 1
    existing.totalScore += a.score
    trendMap.set(day, existing)
  }

  const analysisTrendData = Array.from(trendMap.entries()).map(([date, v]) => ({
    date,
    count: v.count,
    avgScore: Math.round(v.totalScore / v.count),
  }))

  return {
    totalCompanies,
    avgLeadScore: Math.round(avgScoreResult._avg.latestScore ?? 0),
    avgWebsiteScore: Math.round(avgWebsiteResult._avg.latestWebsiteScore ?? 0),
    avgEmailScore: Math.round(avgEmailResult._avg.latestEmailScore ?? 0),
    avgMarketingScore: Math.round(avgMarketingResult._avg.latestMarketingScore ?? 0),
    below40Count,
    highOpportunityCount,
    highAuditOpportunityCount,
    missingSpfCount,
    missingDkimCount,
    missingDmarcCount,
    freeEmailCount,
    potentialValue,
    campaignsCount,
    repliesCount,
    hotLeadsCount,
    warmLeadsCount,
    coldLeadsCount,
    scoreChartData: buildScoreDistribution(companiesWithScore.map((c) => c.latestScore)),
    websiteScoreChartData: buildScoreDistribution(auditCompanies.map((c) => c.latestWebsiteScore)),
    emailScoreChartData: buildScoreDistribution(auditCompanies.map((c) => c.latestEmailScore)),
    marketingScoreChartData: buildScoreDistribution(auditCompanies.map((c) => c.latestMarketingScore)),
    opportunityChartData: opportunityBreakdown.map((o) => ({
      opportunity: o.latestSalesOpportunity ?? 'UNKNOWN',
      count: o._count,
    })),
    statusChartData: statusDistribution.map((s) => ({ status: s.status, count: s._count })),
    analysisTrendData,
    emailEngagement: {
      delivered: emailEngagement._sum.emailDeliveredCount ?? 0,
      opened: emailEngagement._sum.emailOpenedCount ?? 0,
      clicked: emailEngagement._sum.emailClickedCount ?? 0,
      replied: emailEngagement._sum.emailRepliedCount ?? 0,
    },
  }
})
