import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { getOrgContext } from '@/server/middleware/context'

export const getDashboardStatsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { organizationId } = await getOrgContext()

  const [
    totalCompanies,
    avgScoreResult,
    below40Count,
    highOpportunityCount,
    campaignsCount,
    repliesCount,
    pricingAgg,
    statusDistribution,
    analysisTrend,
    emailEngagement,
    companiesWithScore,
    allScoredCompanies,
  ] = await Promise.all([
    db.company.count({ where: { organizationId } }),
    db.company.aggregate({
      where: { organizationId, latestScore: { not: null } },
      _avg: { latestScore: true },
    }),
    db.company.count({
      where: { organizationId, latestScore: { lt: 40 } },
    }),
    db.company.count({
      where: {
        organizationId,
        latestScore: { lt: 40 },
        latestSalesOpportunity: 'HIGH',
      },
    }),
    db.campaign.count({ where: { organizationId } }),
    db.reply.count({ where: { company: { organizationId } } }),
    db.company.aggregate({
      where: { organizationId, latestPricingCompanySite: { not: null } },
      _sum: {
        latestPricingLanding: true,
        latestPricingCompanySite: true,
        latestPricingEcommerce: true,
      },
    }),
    db.company.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    }),
    db.companyAnalysis.findMany({
      where: { company: { organizationId } },
      select: { analyzedAt: true, score: true },
      orderBy: { analyzedAt: 'asc' },
      take: 90,
    }),
    db.company.aggregate({
      where: { organizationId },
      _sum: {
        emailDeliveredCount: true,
        emailOpenedCount: true,
        emailClickedCount: true,
        emailRepliedCount: true,
      },
    }),
    db.company.findMany({
      where: { organizationId, latestScore: { not: null } },
      select: { latestScore: true },
    }),
    db.company.findMany({
      where: { organizationId, latestScore: { not: null } },
      select: { latestScore: true, latestSalesOpportunity: true, latestLeadPriority: true },
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
    (c) =>
      c.latestScore! >= 40 &&
      c.latestScore! <= 60 &&
      c.latestSalesOpportunity === 'MEDIUM',
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

  const scoreChartData = [
    { range: '0-20', count: 0 },
    { range: '21-40', count: 0 },
    { range: '41-60', count: 0 },
    { range: '61-80', count: 0 },
    { range: '81-100', count: 0 },
  ]

  for (const c of companiesWithScore) {
    const s = c.latestScore!
    if (s <= 20) scoreChartData[0]!.count++
    else if (s <= 40) scoreChartData[1]!.count++
    else if (s <= 60) scoreChartData[2]!.count++
    else if (s <= 80) scoreChartData[3]!.count++
    else scoreChartData[4]!.count++
  }

  return {
    totalCompanies,
    avgLeadScore: Math.round(avgScoreResult._avg.latestScore ?? 0),
    below40Count,
    highOpportunityCount,
    potentialValue,
    campaignsCount,
    repliesCount,
    hotLeadsCount,
    warmLeadsCount,
    coldLeadsCount,
    scoreChartData,
    statusChartData: statusDistribution.map((s) => ({
      status: s.status,
      count: s._count,
    })),
    analysisTrendData,
    emailEngagement: {
      delivered: emailEngagement._sum.emailDeliveredCount ?? 0,
      opened: emailEngagement._sum.emailOpenedCount ?? 0,
      clicked: emailEngagement._sum.emailClickedCount ?? 0,
      replied: emailEngagement._sum.emailRepliedCount ?? 0,
    },
  }
})
