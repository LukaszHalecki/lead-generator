'use client'

import { useState } from 'react'
import { runQuickReportFn } from '@/server/functions/dashboard.fn'
import type { QuickAuditResult } from '@/lib/quick-audit.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { SalesOpportunityBadge } from '@/components/companies/score-badge'
import { providerLabel } from '@/lib/email-providers'
import { Check, Loader2, Search, X } from 'lucide-react'

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-bold">{score}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-red-500" />}
      <span>{label}</span>
    </div>
  )
}

export function QuickReportPanel() {
  const [website, setWebsite] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<QuickAuditResult | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await runQuickReportFn({
        data: {
          website: website.trim() || undefined,
          email: email.trim() || undefined,
        },
      })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd audytu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Szybki raport</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Label htmlFor="quick-website">Strona WWW</Label>
            <Input
              id="quick-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="np. firma.pl lub https://firma.pl"
              disabled={loading}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="quick-email">Email (opcjonalnie)</Label>
            <Input
              id="quick-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="np. kontakt@firma.pl"
              disabled={loading}
            />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={loading || (!website.trim() && !email.trim())}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Sprawdź
            </Button>
          </div>
        </form>

        <p className="text-xs text-slate-500">
          Podaj stronę WWW, sam email, lub oba. Audyt jest pasywny — nie wysyłamy testowych wiadomości.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && <QuickReportResults result={result} />}
      </CardContent>
    </Card>
  )
}

function QuickReportResults({ result }: { result: QuickAuditResult }) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-600">
          {result.mode === 'website' ? result.website : result.email}
        </span>
        {result.overallOpportunity && <SalesOpportunityBadge opportunity={result.overallOpportunity} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {result.websiteScore != null && <ScoreBar label="Website Score" score={result.websiteScore} />}
        <ScoreBar label="Email Score" score={result.emailScore} />
        {result.marketingScore != null && <ScoreBar label="Marketing Score" score={result.marketingScore} />}
      </div>

      {result.opportunityReason && (
        <p className="text-sm text-slate-700">{result.opportunityReason}</p>
      )}

      {result.websiteAudit && (
        <div>
          <p className="mb-2 text-sm font-medium">Website — kluczowe checki</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <CheckItem ok={result.websiteAudit.hasSsl} label="SSL" />
            <CheckItem ok={result.websiteAudit.hasHttpsRedirect} label="HTTPS Redirect" />
            <CheckItem ok={result.websiteAudit.isMobileFriendly} label="Mobile Friendly" />
            <CheckItem ok={result.websiteAudit.hasContactForm} label="Formularz kontaktowy" />
            <CheckItem ok={result.websiteAudit.hasRobotsTxt} label="robots.txt" />
            <CheckItem ok={result.websiteAudit.hasSitemap} label="sitemap.xml" />
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Email — infrastruktura</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <CheckItem ok={result.hasMx} label="MX" />
          <CheckItem ok={result.hasSpf} label="SPF" />
          <CheckItem ok={result.hasDkim} label="DKIM" />
          <CheckItem ok={result.hasDmarc} label="DMARC" />
        </div>
      </div>

      {result.emailRecords.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Wykryte emaile</p>
          <div className="space-y-1">
            {result.emailRecords.map((rec) => (
              <div key={rec.address} className="flex flex-wrap gap-2 text-sm">
                <span className="font-mono">{rec.address}</span>
                <span className="text-slate-500">{providerLabel(rec.classification)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.marketingAudit && (
        <div>
          <p className="mb-2 text-sm font-medium">Marketing</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <CheckItem ok={result.marketingAudit.hasGoogleAnalytics} label="Google Analytics" />
            <CheckItem ok={result.marketingAudit.hasGa4} label="GA4" />
            <CheckItem ok={result.marketingAudit.hasMetaPixel} label="Meta Pixel" />
            <CheckItem ok={result.marketingAudit.hasGoogleMaps} label="Google Maps" />
            <CheckItem ok={Boolean(Object.keys(result.marketingAudit.socialLinks ?? {}).length)} label="Social Media" />
          </div>
        </div>
      )}

      {result.expertSummary && (
        <div>
          <p className="mb-1 text-sm font-medium">Podsumowanie</p>
          <p className="text-sm text-slate-700">{result.expertSummary}</p>
        </div>
      )}

      {result.problems.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Problemy</p>
          <ul className="list-inside list-disc text-sm text-slate-700">
            {result.problems.slice(0, 6).map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Rekomendacje</p>
          <ul className="list-inside list-disc text-sm text-slate-700">
            {result.recommendations.slice(0, 6).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
