'use client'

import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { listCompaniesFn } from '@/server/functions/companies.fn'
import { PageHeader } from '@/components/layout/app-sidebar'
import { CompanyStatusBadge } from '@/components/companies/company-status-badge'
import { LeadPriorityBadge } from '@/components/companies/lead-priority-badge'
import { LeadScoreIndicator, SalesOpportunityBadge } from '@/components/companies/score-badge'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LEAD_PRIORITY_DESCRIPTIONS, LEAD_PRIORITY_FILTERS, SCORE_FILTER_PRESETS } from '@/lib/constants'
import type { LeadPriority } from '@/lib/lead-priority'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_app/companies/')({
  loader: () =>
    listCompaniesFn({
      data: { sortBy: 'score', sortDir: 'asc' },
    }),
  component: CompaniesPage,
})

function CompaniesPage() {
  const initial = Route.useLoaderData()
  const [companies, setCompanies] = useState(initial)
  const [scoreMin, setScoreMin] = useState<number | undefined>()
  const [scoreMax, setScoreMax] = useState<number | undefined>()
  const [leadPriority, setLeadPriority] = useState<LeadPriority | undefined>()
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'createdAt' | 'status'>('score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [search, setSearch] = useState('')

  async function loadFilters(opts?: {
    min?: number
    max?: number
    priority?: LeadPriority | undefined
  }) {
    const min = opts?.min ?? scoreMin
    const max = opts?.max ?? scoreMax
    const priority = opts?.priority !== undefined ? opts.priority : leadPriority
    const result = await listCompaniesFn({
      data: {
        scoreMin: min,
        scoreMax: max,
        leadPriority: priority,
        sortBy,
        sortDir,
        search: search || undefined,
      },
    })
    setCompanies(result)
  }

  async function applyScorePreset(preset: { min: number; max: number }) {
    setScoreMin(preset.min)
    setScoreMax(preset.max)
    setLeadPriority(undefined)
    await loadFilters({ min: preset.min, max: preset.max, priority: undefined })
  }

  async function applyPriorityFilter(priority: LeadPriority) {
    setLeadPriority(priority)
    await loadFilters({ priority })
  }

  return (
    <div>
      <PageHeader
        title="Baza firm"
        description="Lista leadów z filtrowaniem po Lead Score i priorytecie sprzedażowym"
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {LEAD_PRIORITY_FILTERS.map((segment) => (
          <Card key={segment.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{segment.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-slate-500">
                {LEAD_PRIORITY_DESCRIPTIONS[segment.key]}
              </p>
              <Button
                variant={leadPriority === segment.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPriorityFilter(segment.key)}
              >
                Pokaż {segment.label}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {SCORE_FILTER_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => applyScorePreset(preset)}
          >
            {preset.label}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setScoreMin(undefined)
            setScoreMax(undefined)
            setLeadPriority(undefined)
            loadFilters({ min: undefined, max: undefined, priority: undefined })
          }}
        >
          Reset
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <Label>Szukaj</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nazwa, miasto, email"
          />
        </div>
        <div>
          <Label>Sortuj</Label>
          <select
            className="flex h-10 rounded-md border border-slate-200 px-3 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="score">Lead Score</option>
            <option value="name">Nazwa</option>
            <option value="status">Status</option>
            <option value="createdAt">Data dodania</option>
          </select>
        </div>
        <div>
          <Label>Kierunek</Label>
          <select
            className="flex h-10 rounded-md border border-slate-200 px-3 text-sm"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as typeof sortDir)}
          >
            <option value="asc">Rosnąco</option>
            <option value="desc">Malejąco</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={() => loadFilters()}>Filtruj</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left">
            <tr>
              <th className="p-4">Firma</th>
              <th className="p-4">Branża</th>
              <th className="p-4">Lead Score</th>
              <th className="p-4">Priorytet</th>
              <th className="p-4">Szansa AI</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="p-4 font-medium">{company.name}</td>
                <td className="p-4 text-slate-500">{company.industry ?? '—'}</td>
                <td className="p-4 w-40">
                  <LeadScoreIndicator score={company.latestScore} showLabel={false} />
                  <span className="text-xs text-slate-500">{company.latestScore ?? '—'}/100</span>
                </td>
                <td className="p-4">
                  <LeadPriorityBadge priority={company.latestLeadPriority} />
                </td>
                <td className="p-4">
                  <SalesOpportunityBadge opportunity={company.latestSalesOpportunity} />
                </td>
                <td className="p-4">
                  <CompanyStatusBadge status={company.status} />
                </td>
                <td className="p-4">
                  <Link
                    to="/companies/$companyId"
                    params={{ companyId: company.id }}
                    className="text-slate-900 underline"
                  >
                    Szczegóły
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
