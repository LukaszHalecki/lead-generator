'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import {
  analyzeCompanyFn,
  generateMessageFn,
  addToCampaignFn,
  runWorkflowFn,
} from '@/server/functions/companies.fn'
import { ArrowRight, Loader2 } from 'lucide-react'

interface WorkflowPanelProps {
  companyId: string
  hasWebsite: boolean
  hasEmail: boolean
  hasAnalysis: boolean
  hasMessage: boolean
  campaigns: Array<{ id: string; name: string }>
  onComplete: () => void
}

export function WorkflowPanel({
  companyId,
  hasWebsite,
  hasEmail,
  hasAnalysis,
  hasMessage,
  campaigns,
  onComplete,
}: WorkflowPanelProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? '')
  const [messageId, setMessageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runStep(step: string, fn: () => Promise<unknown>) {
    setLoading(step)
    setError(null)
    try {
      const result = await fn()
      if (step === 'message' && result && typeof result === 'object' && 'id' in result) {
        setMessageId(result.id as string)
      }
      onComplete()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setLoading(null)
    }
  }

  async function runFullWorkflow() {
    setLoading('full')
    setError(null)
    try {
      await runWorkflowFn({ data: { companyId, campaignId: campaignId || undefined } })
      onComplete()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setLoading(null)
    }
  }

  const steps = [
    {
      id: 'analyze',
      label: '1. Analiza strony',
      disabled: !hasWebsite,
      done: hasAnalysis,
      action: () => runStep('analyze', () => analyzeCompanyFn({ data: companyId })),
    },
    {
      id: 'report',
      label: '2. Raport AI',
      disabled: !hasAnalysis,
      done: hasAnalysis,
      action: null,
    },
    {
      id: 'message',
      label: '3. Generuj wiadomość',
      disabled: !hasAnalysis,
      done: hasMessage,
      action: () => runStep('message', () => generateMessageFn({ data: companyId })),
    },
    {
      id: 'campaign',
      label: '4. Dodaj do kampanii',
      disabled: !hasMessage && !messageId,
      done: false,
      action: () => {
        if (!messageId) return Promise.resolve()
        return runStep('campaign', () =>
          addToCampaignFn({ data: { companyId, campaignId, messageId } }),
        )
      },
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow: Import → Analiza → Raport → Wiadomość → Kampania</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2">
              <Button
                variant={step.done ? 'secondary' : 'default'}
                size="sm"
                disabled={step.disabled || !!loading || (step.id === 'report')}
                onClick={step.action ?? undefined}
              >
                {loading === step.id && <Loader2 className="h-3 w-3 animate-spin" />}
                {step.label}
                {step.done && ' ✓'}
              </Button>
              {i < steps.length - 1 && <ArrowRight className="h-4 w-4 text-slate-400" />}
            </div>
          ))}
        </div>

        {campaigns.length > 0 && (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>Kampania Instantly</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={runFullWorkflow}
              disabled={!hasWebsite || !hasEmail || !!loading}
            >
              {loading === 'full' && <Loader2 className="h-4 w-4 animate-spin" />}
              Uruchom cały workflow
            </Button>
          </div>
        )}

        {!hasEmail && (
          <p className="text-sm text-amber-600">Firma nie posiada adresu email — wymagany do kampanii.</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  )
}
