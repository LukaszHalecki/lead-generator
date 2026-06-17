'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { COMPANY_STATUS_LABELS } from '@/lib/constants'
import type { CompanyStatus } from '@prisma/client'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#059669']
const OPPORTUNITY_COLORS: Record<string, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f97316',
  LOW: '#22c55e',
}

interface DashboardChartsProps {
  scoreChartData: { range: string; count: number }[]
  websiteScoreChartData: { range: string; count: number }[]
  emailScoreChartData: { range: string; count: number }[]
  marketingScoreChartData: { range: string; count: number }[]
  opportunityChartData: { opportunity: string; count: number }[]
  statusChartData: { status: CompanyStatus; count: number }[]
  analysisTrendData: { date: string; count: number; avgScore: number }[]
}

function ScoreBarChart({ title, data }: { title: string; data: { range: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function DashboardCharts({
  scoreChartData,
  websiteScoreChartData,
  emailScoreChartData,
  marketingScoreChartData,
  opportunityChartData,
  statusChartData,
  analysisTrendData,
}: DashboardChartsProps) {
  const statusData = statusChartData.map((s) => ({
    name: COMPANY_STATUS_LABELS[s.status],
    value: s.count,
  }))

  const opportunityData = opportunityChartData.map((o) => ({
    name: o.opportunity,
    value: o.count,
  }))

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ScoreBarChart title="Rozkład Website Score" data={websiteScoreChartData} />
      <ScoreBarChart title="Rozkład Email Score" data={emailScoreChartData} />
      <ScoreBarChart title="Rozkład Marketing Score" data={marketingScoreChartData} />
      <ScoreBarChart title="Rozkład Lead Score" data={scoreChartData} />

      <Card>
        <CardHeader><CardTitle>Opportunity Breakdown</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={opportunityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {opportunityData.map((entry) => (
                  <Cell key={entry.name} fill={OPPORTUNITY_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Firmy według statusów</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Trendy analiz</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analysisTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="count" fill="#94a3b8" name="Liczba analiz" />
              <Line yAxisId="right" type="monotone" dataKey="avgScore" stroke="#0f172a" strokeWidth={2} name="Śr. Lead Score" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
