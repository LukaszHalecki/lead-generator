'use client'

import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { importCsvFn, fetchOutscraperFn } from '@/server/functions/companies.fn'
import { PageHeader } from '@/components/layout/app-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export const Route = createFileRoute('/_app/companies/import')({
  component: ImportPage,
})

function ImportPage() {
  const [csvResult, setCsvResult] = useState<string | null>(null)
  const [outscraperResult, setOutscraperResult] = useState<string | null>(null)
  const [industry, setIndustry] = useState('restauracja')
  const [country, setCountry] = useState('PL')
  const [limit, setLimit] = useState(10)
  const [loading, setLoading] = useState(false)

  async function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const content = await file.text()
      const result = await importCsvFn({ data: { content, fileName: file.name } })
      setCsvResult(
        `Zaimportowano: ${result.importedCount}, duplikaty: ${result.duplicateCount}, błędy: ${result.errorCount}`,
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleOutscraper() {
    setLoading(true)
    try {
      const result = await fetchOutscraperFn({ data: { industry, country, limit } })
      setOutscraperResult(
        `Pobrano: ${result.total}, zaimportowano: ${result.importedCount}, duplikaty: ${result.duplicateCount}`,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader title="Import firm" description="CSV z Outscraper lub API Outscraper" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Import CSV</CardTitle>
          </CardHeader>
          <CardContent>
            <Input type="file" accept=".csv" onChange={handleCsv} disabled={loading} />
            {csvResult && <p className="mt-3 text-sm text-emerald-700">{csvResult}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outscraper API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Branża</Label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div>
              <Label>Kraj</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div>
              <Label>Limit wyników</Label>
              <Input
                type="number"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </div>
            <Button onClick={handleOutscraper} disabled={loading}>
              Pobierz firmy
            </Button>
            {outscraperResult && (
              <p className="text-sm text-emerald-700">{outscraperResult}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
