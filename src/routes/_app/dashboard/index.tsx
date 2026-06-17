import { createFileRoute } from '@tanstack/react-router'
import { getDashboardStatsFn } from '@/server/functions/dashboard.fn'
import { PageHeader } from '@/components/layout/app-sidebar'
import { StatsCards, InstantlyStats } from '@/components/dashboard/stats-cards'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { QuickReportPanel } from '@/components/dashboard/quick-report-panel'

export const Route = createFileRoute('/_app/dashboard/')({
  loader: () => getDashboardStatsFn(),
  component: DashboardPage,
})

function DashboardPage() {
  const stats = Route.useLoaderData()

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Przegląd leadów, analiz i kampanii mailingowych"
      />
      <div className="space-y-8">
        <QuickReportPanel />
        <StatsCards stats={stats} />
        <InstantlyStats engagement={stats.emailEngagement} />
        <DashboardCharts
          scoreChartData={stats.scoreChartData}
          websiteScoreChartData={stats.websiteScoreChartData}
          emailScoreChartData={stats.emailScoreChartData}
          marketingScoreChartData={stats.marketingScoreChartData}
          opportunityChartData={stats.opportunityChartData}
          statusChartData={stats.statusChartData}
          analysisTrendData={stats.analysisTrendData}
        />
      </div>
    </div>
  )
}
