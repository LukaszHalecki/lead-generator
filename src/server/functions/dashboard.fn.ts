import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { getOrgContext } from '@/server/middleware/context'

export const getOrgContextFn = createServerFn({ method: 'GET' }).handler(async () => {
  return getOrgContext()
})

export const getDashboardStatsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { organizationId } = await getOrgContext()

  const [
    totalCompanies,
    analyzedCount,
    toContactCount,
    sentMessages,
    repliesCount,
    avgScoreResult,
    below40Count,
    highOpportunityCount,
    pricingAgg,
    scoreDistribution,
    statusDistribution,
    analysisTrend,
    emailEngagement,
  ] = await Promise.all([
    db.company.count({ where: { organizationId } }),
    db.company.count({
      where: { organizationId, status: { not: 'NEW' } },
    }),
    db.company.count({ where: { organizationId, status: 'TO_CONTACT' } }),
    db.message.count({
      where: { company: { organizationId }, sentAt: { not: null } },
    }),
    db.reply.count({ where: { company: { organizationId } } }),
    db.company.aggregate({
      where: { organizationId, latestScore: { not: null } },
      _avg: { latestScore: true },
    }),
    db.company.count({
      where: { organizationId, latestScore: { lt: 40 } },
    }),
    db.company.count({
      where: { organizationId, latestSalesOpportunity: 'HIGH' },
    }),
    db.company.aggregate({
      where: { organizationId, latestPricingCompanySite: { not: null } },
      _sum: {
        latestPricingLanding: true,
        latestPricingCompanySite: true,
        latestPricingEcommerce: true,
      },
    }),
    db.company.groupBy({
      by: ['latestCategory'],
      where: { organizationId, latestCategory: { not: null } },
      _count: true,
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
  ])

  const potentialValue =
    (pricingAgg._sum.latestPricingLanding ?? 0) +
    (pricingAgg._sum.latestPricingCompanySite ?? 0) +
    (pricingAgg._sum.latestPricingEcommerce ?? 0)

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
    { range: '0-30', count: 0 },
    { range: '31-50', count: 0 },
    { range: '51-70', count: 0 },
    { range: '71-85', count: 0 },
    { range: '86-100', count: 0 },
  ]

  const companiesWithScore = await db.company.findMany({
    where: { organizationId, latestScore: { not: null } },
    select: { latestScore: true },
  })

  for (const c of companiesWithScore) {
    const s = c.latestScore!
    if (s <= 30) scoreChartData[0]!.count++
    else if (s <= 50) scoreChartData[1]!.count++
    else if (s <= 70) scoreChartData[2]!.count++
    else if (s <= 85) scoreChartData[3]!.count++
    else scoreChartData[4]!.count++
  }

  return {
    totalCompanies,
    analyzedCount,
    toContactCount,
    sentMessages,
    repliesCount,
    avgLeadScore: Math.round(avgScoreResult._avg.latestScore ?? 0),
    below40Count,
    highOpportunityCount,
    potentialValue,
    scoreChartData,
    statusChartData: statusDistribution.map((s) => ({
      status: s.status,
      count: s._count,
    })),
    categoryChartData: scoreDistribution.map((s) => ({
      category: s.latestCategory,
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
