import { createFileRoute } from '@tanstack/react-router'
import { getDashboardStatsFn } from '@/server/functions/dashboard.fn'
import { PageHeader } from '@/components/layout/app-sidebar'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'

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
        <StatsCards stats={stats} />
        <DashboardCharts
          scoreChartData={stats.scoreChartData}
          statusChartData={stats.statusChartData}
          analysisTrendData={stats.analysisTrendData}
        />
      </div>
    </div>
  )
}
