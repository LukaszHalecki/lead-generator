import type { CompanyAnalysis } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LeadScoreIndicator, SalesOpportunityBadge } from '@/components/companies/score-badge'
import { formatCurrency } from '@/lib/utils'
import { Check, X } from 'lucide-react'

interface AnalysisReportProps {
  analysis: CompanyAnalysis
}

const CHECKS = [
  { key: 'hasSsl', label: 'SSL' },
  { key: 'hasSecurityCertificate', label: 'Certyfikat bezpieczeństwa' },
  { key: 'isMobileFriendly', label: 'Mobile Friendly' },
  { key: 'isResponsive', label: 'Responsywność' },
  { key: 'hasMetaTitle', label: 'Meta Title' },
  { key: 'hasMetaDescription', label: 'Meta Description' },
  { key: 'hasH1', label: 'H1' },
  { key: 'hasContactForm', label: 'Formularz kontaktowy' },
  { key: 'hasGoogleMaps', label: 'Google Maps' },
  { key: 'hasGoogleAnalytics', label: 'Google Analytics' },
  { key: 'hasGoogleTagManager', label: 'Google Tag Manager' },
  { key: 'hasFavicon', label: 'Favicon' },
  { key: 'hasPrivacyPolicy', label: 'Polityka prywatności' },
  { key: 'isTechnologyModern', label: 'Aktualność technologii' },
] as const

export function AnalysisReport({ analysis }: AnalysisReportProps) {
  const problems = analysis.problems as string[]
  const businessImpact = analysis.businessImpact as string[]
  const recommendations = analysis.recommendations as string[]
  const hasSocial = analysis.socialMedia && Object.keys(analysis.socialMedia as object).length > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LeadScoreIndicator score={analysis.score} />
          <div className="flex flex-wrap gap-2">
            <SalesOpportunityBadge opportunity={analysis.salesOpportunity} />
            {analysis.loadTimeMs && (
              <span className="text-sm text-slate-500">
                Czas ładowania: {analysis.loadTimeMs}ms
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Szansa sprzedażowa AI</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700">{analysis.salesOpportunityReason}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wycena projektu</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <PricingItem label="Landing Page" value={analysis.pricingLanding} />
          <PricingItem label="Strona firmowa" value={analysis.pricingCompanySite} />
          <PricingItem label="Sklep internetowy" value={analysis.pricingEcommerce} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kontrole techniczne</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {CHECKS.map((check) => {
            const value = analysis[check.key]
            return (
              <div key={check.key} className="flex items-center gap-2 text-sm">
                {value ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span>{check.label}</span>
              </div>
            )
          })}
          <div className="flex items-center gap-2 text-sm">
            {hasSocial ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <X className="h-4 w-4 text-red-500" />
            )}
            <span>Social Media</span>
          </div>
          {analysis.domainAgeYears != null && (
            <div className="flex items-center gap-2 text-sm sm:col-span-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Wiek domeny (szac.): {analysis.domainAgeYears} lat</span>
            </div>
          )}
        </CardContent>
      </Card>

      <ReportSection title="Problemy" items={problems} />
      <ReportSection title="Wpływ biznesowy" items={businessImpact} />
      <ReportSection title="Rekomendacje" items={recommendations} />

      <Card>
        <CardHeader>
          <CardTitle>Podsumowanie eksperckie</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-700">{analysis.expertSummary}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function PricingItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-xl font-bold">{value ? formatCurrency(value) : '—'}</p>
    </div>
  )
}

function ReportSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
