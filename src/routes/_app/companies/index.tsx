'use client'

import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  listCompaniesFn,
  listCampaignsFn,
  createCompanyFn,
  bulkDeleteCompaniesFn,
  bulkAnalyzeCompaniesFn,
  bulkAddToCampaignFn,
} from '@/server/functions/companies.fn'
import { PageHeader } from '@/components/layout/app-sidebar'
import { CompanyStatusBadge } from '@/components/companies/company-status-badge'
import { LeadPriorityBadge } from '@/components/companies/lead-priority-badge'
import { LeadScoreIndicator, SalesOpportunityBadge } from '@/components/companies/score-badge'
import { CompanyFormDialog } from '@/components/companies/company-form-dialog'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LEAD_PRIORITY_DESCRIPTIONS, LEAD_PRIORITY_FILTERS, SCORE_FILTER_PRESETS } from '@/lib/constants'
import type { LeadPriority } from '@/lib/lead-priority'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CompanyFormValues } from '@/lib/validators/company.schema'
import { Loader2, Plus, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/_app/companies/')({
  loader: async () => {
    const [companies, campaigns] = await Promise.all([
      listCompaniesFn({ data: { sortBy: 'createdAt', sortDir: 'desc' } }),
      listCampaignsFn(),
    ])
    return { companies, campaigns }
  },
  component: CompaniesPage,
})

function CompaniesPage() {
  const navigate = useNavigate()
  const { companies: initial, campaigns } = Route.useLoaderData()
  const [companies, setCompanies] = useState(initial)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [bulkCampaignId, setBulkCampaignId] = useState(campaigns[0]?.id ?? '')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)

  const [scoreMin, setScoreMin] = useState<number | undefined>()
  const [scoreMax, setScoreMax] = useState<number | undefined>()
  const [leadPriority, setLeadPriority] = useState<LeadPriority | undefined>()
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'websiteScore' | 'emailScore' | 'marketingScore' | 'createdAt' | 'status'>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')
  const [auditFilter, setAuditFilter] = useState<'none' | 'missingSpf' | 'missingDkim' | 'missingDmarc' | 'freeEmail' | 'highOpportunity'>('none')

  async function reload(opts?: {
    min?: number
    max?: number
    priority?: LeadPriority | undefined
    audit?: typeof auditFilter
  }) {
    const filter = opts?.audit !== undefined ? opts.audit : auditFilter
    const result = await listCompaniesFn({
      data: {
        scoreMin: opts?.min ?? scoreMin,
        scoreMax: opts?.max ?? scoreMax,
        leadPriority: opts?.priority !== undefined ? opts.priority : leadPriority,
        salesOpportunity: filter === 'highOpportunity' ? 'HIGH' : undefined,
        missingSpf: filter === 'missingSpf' ? true : undefined,
        missingDkim: filter === 'missingDkim' ? true : undefined,
        missingDmarc: filter === 'missingDmarc' ? true : undefined,
        usesFreeEmail: filter === 'freeEmail' ? true : undefined,
        sortBy,
        sortDir,
        search: search || undefined,
      },
    })
    setCompanies(result)
    setSelected(new Set())
  }

  async function applyScorePreset(preset: { min: number; max: number }) {
    setScoreMin(preset.min)
    setScoreMax(preset.max)
    setLeadPriority(undefined)
    await reload({ min: preset.min, max: preset.max, priority: undefined })
  }

  async function applyPriorityFilter(priority: LeadPriority) {
    setLeadPriority(priority)
    await reload({ priority })
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === companies.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(companies.map((c) => c.id)))
    }
  }

  async function handleCreate(values: CompanyFormValues) {
    const company = await createCompanyFn({ data: values })
    await reload()
    navigate({ to: '/companies/$companyId', params: { companyId: company.id } })
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Usunąć ${selected.size} firm?`)) return
    setBulkLoading(true)
    setBulkMessage(null)
    try {
      await bulkDeleteCompaniesFn({ data: { companyIds: Array.from(selected) } })
      setBulkMessage(`Usunięto ${selected.size} firm`)
      await reload()
    } catch (e) {
      setBulkMessage(e instanceof Error ? e.message : 'Błąd usuwania')
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleBulkAnalyze() {
    if (selected.size === 0) return
    setBulkLoading(true)
    setBulkMessage(null)
    try {
      const results = await bulkAnalyzeCompaniesFn({ data: { companyIds: Array.from(selected) } })
      const ok = results.filter((r) => r.ok).length
      setBulkMessage(`Przeanalizowano ${ok}/${results.length} firm`)
      await reload()
    } catch (e) {
      setBulkMessage(e instanceof Error ? e.message : 'Błąd analizy')
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleBulkCampaign() {
    if (selected.size === 0 || !bulkCampaignId) return
    setBulkLoading(true)
    setBulkMessage(null)
    try {
      const results = await bulkAddToCampaignFn({
        data: { companyIds: Array.from(selected), campaignId: bulkCampaignId },
      })
      const ok = results.filter((r) => r.ok).length
      setBulkMessage(`Dodano do kampanii ${ok}/${results.length} firm`)
      await reload()
    } catch (e) {
      setBulkMessage(e instanceof Error ? e.message : 'Błąd kampanii')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Baza firm"
          description="Zarządzanie leadami — dodawanie, edycja, bulk actions i workflow"
        />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nowa firma
        </Button>
      </div>

      <CompanyFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nowa firma"
        description="Po zapisaniu przejdziesz do widoku firmy z pełnym workflow."
        submitLabel="Utwórz firmę"
        onSubmit={handleCreate}
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
          <Button key={preset.label} variant="outline" size="sm" onClick={() => applyScorePreset(preset)}>
            {preset.label}
          </Button>
        ))}
        {[
          { key: 'missingSpf' as const, label: 'Brak SPF' },
          { key: 'missingDkim' as const, label: 'Brak DKIM' },
          { key: 'missingDmarc' as const, label: 'Brak DMARC' },
          { key: 'freeEmail' as const, label: 'Free email' },
          { key: 'highOpportunity' as const, label: 'HIGH Opportunity' },
        ].map((f) => (
          <Button
            key={f.key}
            variant={auditFilter === f.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              const next = auditFilter === f.key ? 'none' : f.key
              setAuditFilter(next)
              reload({ audit: next })
            }}
          >
            {f.label}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setScoreMin(undefined)
            setScoreMax(undefined)
            setLeadPriority(undefined)
            setAuditFilter('none')
            reload({ min: undefined, max: undefined, priority: undefined, audit: 'none' })
          }}
        >
          Reset
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="min-w-[220px] flex-1">
          <Label>Szukaj</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nazwa, strona WWW, email, miasto"
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
            <option value="websiteScore">Website Score</option>
            <option value="emailScore">Email Score</option>
            <option value="marketingScore">Marketing Score</option>
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
          <Button onClick={() => reload()}>Filtruj</Button>
        </div>
      </div>

      {selected.size > 0 && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <span className="text-sm font-medium">Wybrano: {selected.size}</span>
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkLoading}
              onClick={handleBulkDelete}
            >
              {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Usuń zaznaczone
            </Button>
            <Button variant="outline" size="sm" disabled={bulkLoading} onClick={handleBulkAnalyze}>
              Uruchom audyt
            </Button>
            {campaigns.length > 0 && (
              <>
                <select
                  className="h-8 rounded-md border border-slate-200 px-2 text-sm"
                  value={bulkCampaignId}
                  onChange={(e) => setBulkCampaignId(e.target.value)}
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button variant="outline" size="sm" disabled={bulkLoading} onClick={handleBulkCampaign}>
                  Dodaj do kampanii
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {bulkMessage && <p className="mb-4 text-sm text-slate-600">{bulkMessage}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left">
            <tr>
              <th className="p-4 w-10">
                <input
                  type="checkbox"
                  checked={companies.length > 0 && selected.size === companies.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="p-4">Firma</th>
              <th className="p-4">WWW / Email</th>
              <th className="p-4">Miasto</th>
              <th className="p-4">Website</th>
              <th className="p-4">Email</th>
              <th className="p-4">Marketing</th>
              <th className="p-4">Lead Score</th>
              <th className="p-4">Opportunity</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500">
                  Brak firm — kliknij „Nowa firma”, aby dodać pierwszą.
                </td>
              </tr>
            )}
            {companies.map((company) => (
              <tr key={company.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selected.has(company.id)}
                    onChange={() => toggleOne(company.id)}
                  />
                </td>
                <td className="p-4 font-medium">{company.name}</td>
                <td className="p-4 text-slate-500">
                  <div>{company.website ?? '—'}</div>
                  <div className="text-xs">{company.email ?? ''}</div>
                </td>
                <td className="p-4 text-slate-500">{company.city ?? '—'}</td>
                <td className="p-4 text-center text-xs">{company.latestWebsiteScore ?? '—'}</td>
                <td className="p-4 text-center text-xs">{company.latestEmailScore ?? '—'}</td>
                <td className="p-4 text-center text-xs">{company.latestMarketingScore ?? '—'}</td>
                <td className="p-4 w-36">
                  <LeadScoreIndicator score={company.latestScore} showLabel={false} />
                  <span className="text-xs text-slate-500">{company.latestScore ?? '—'}/100</span>
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
