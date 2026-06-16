'use client'

import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { listCampaignsFn, createCampaignFn } from '@/server/functions/companies.fn'
import { PageHeader } from '@/components/layout/app-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export const Route = createFileRoute('/_app/campaigns/')({
  loader: () => listCampaignsFn(),
  component: CampaignsPage,
})

function CampaignsPage() {
  const initial = Route.useLoaderData()
  const [campaigns, setCampaigns] = useState(initial)
  const [name, setName] = useState('')
  const [scoreThreshold, setScoreThreshold] = useState(70)

  async function handleCreate() {
    if (!name.trim()) return
    await createCampaignFn({ data: { name, scoreThreshold } })
    setCampaigns(await listCampaignsFn())
    setName('')
  }

  return (
    <div>
      <PageHeader title="Kampanie mailingowe" description="Integracja z Instantly API" />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Nowa kampania</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div>
            <Label>Nazwa</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Próg Lead Score (poniżej)</Label>
            <Input
              type="number"
              value={scoreThreshold}
              onChange={(e) => setScoreThreshold(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreate}>Utwórz kampanię</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {campaigns.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-sm text-slate-500">Status: {c.status}</p>
              </div>
              <div className="flex gap-6 text-sm">
                <span>Leady: {c.leadsCount}</span>
                <span>Wysłane: {c.sentCount}</span>
                <span>Dostarczone: {c.deliveredCount}</span>
                <span>Otwarte: {c.openCount}</span>
                <span>Kliknięcia: {c.clickCount}</span>
                <span>Odpowiedzi: {c.replyCount}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
