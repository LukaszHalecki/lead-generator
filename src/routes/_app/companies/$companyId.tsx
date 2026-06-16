'use client'

import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  getCompanyFn,
  addNoteFn,
  listCampaignsFn,
} from '@/server/functions/companies.fn'
import { PageHeader } from '@/components/layout/app-sidebar'
import { CompanyStatusBadge } from '@/components/companies/company-status-badge'
import { LeadPriorityBadge } from '@/components/companies/lead-priority-badge'
import { LeadScoreIndicator, SalesOpportunityBadge } from '@/components/companies/score-badge'
import { AnalysisReport } from '@/components/analysis/analysis-report'
import { ActivityTimeline } from '@/components/crm/activity-timeline'
import { WorkflowPanel } from '@/components/workflow/workflow-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_app/companies/$companyId')({
  loader: async ({ params }) => {
    const [company, campaigns] = await Promise.all([
      getCompanyFn({ data: params.companyId }),
      listCampaignsFn(),
    ])
    return { company, campaigns }
  },
  component: CompanyDetailPage,
})

function CompanyDetailPage() {
  const { company: initial, campaigns } = Route.useLoaderData()
  const [company, setCompany] = useState(initial)
  const [note, setNote] = useState('')
  const latestAnalysis = company.analyses[0]
  const latestMessage = company.messages[0]

  async function refresh() {
    const updated = await getCompanyFn({ data: company.id })
    setCompany(updated)
  }

  async function handleAddNote() {
    if (!note.trim()) return
    await addNoteFn({ data: { companyId: company.id, content: note } })
    setNote('')
    await refresh()
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/companies" className="text-sm text-slate-500 hover:text-slate-900">
          ← Powrót do listy
        </Link>
      </div>

      <PageHeader title={company.name} description={company.website ?? 'Brak strony WWW'} />

      <div className="mb-6 flex flex-wrap gap-3">
        <CompanyStatusBadge status={company.status} />
        <SalesOpportunityBadge opportunity={company.latestSalesOpportunity} />
        <LeadPriorityBadge priority={company.latestLeadPriority} />
        {company.latestScore !== null && (
          <span className="text-sm font-medium">Lead Score: {company.latestScore}/100</span>
        )}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Email" value={company.email ?? '—'} />
        <InfoCard label="Telefon" value={company.phone ?? '—'} />
        <InfoCard label="Branża" value={company.industry ?? '—'} />
        <InfoCard label="Miasto" value={company.city ?? '—'} />
      </div>

      <div className="mb-8">
        <WorkflowPanel
          companyId={company.id}
          hasWebsite={!!company.website}
          hasEmail={!!company.email}
          hasAnalysis={company.analyses.length > 0}
          hasMessage={company.messages.length > 0}
          latestScore={company.latestScore}
          campaigns={campaigns}
          onComplete={refresh}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          {latestAnalysis ? (
            <AnalysisReport analysis={latestAnalysis} />
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">
                Brak analizy — uruchom workflow lub kliknij „Analiza strony”.
              </CardContent>
            </Card>
          )}

          {company.latestPricingCompanySite && (
            <Card>
              <CardHeader>
                <CardTitle>Ostatnia wycena</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Landing Page</p>
                  <p className="font-bold">{formatCurrency(company.latestPricingLanding ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Strona firmowa</p>
                  <p className="font-bold">{formatCurrency(company.latestPricingCompanySite)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Sklep</p>
                  <p className="font-bold">{formatCurrency(company.latestPricingEcommerce ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Instantly — engagement</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <Stat label="Dostarczone" value={company.emailDeliveredCount} />
              <Stat label="Otwarte" value={company.emailOpenedCount} />
              <Stat label="Kliknięcia" value={company.emailClickedCount} />
              <Stat label="Odpowiedzi" value={company.emailRepliedCount} />
            </CardContent>
          </Card>

          {company.latestScore !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Wskaźnik jakości</CardTitle>
              </CardHeader>
              <CardContent>
                <LeadScoreIndicator score={company.latestScore} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>CRM — oś czasu</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline
                activities={company.activities}
                analyses={company.analyses}
                messages={company.messages}
                replies={company.replies}
                notes={company.notes}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dodaj notatkę</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Notatka CRM..."
              />
              <Button onClick={handleAddNote}>Zapisz notatkę</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-medium">{value}</p>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
