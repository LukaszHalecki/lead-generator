'use client'

import type { CompanyAudit, EmailAudit, EmailRecord, MarketingAudit, DnsRecord } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SalesOpportunityBadge } from '@/components/companies/score-badge'
import { providerLabel } from '@/lib/email-providers'
import { Check, X, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type FullAudit = CompanyAudit & {
  emailAudit: (EmailAudit & { emailRecords: EmailRecord[]; dnsRecords: DnsRecord[] }) | null
  marketingAudit: MarketingAudit | null
}

interface AuditReportProps {
  audit: FullAudit
}

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

function CheckItem({ ok, label }: { ok: boolean | null | undefined; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-red-500" />}
      <span>{label}</span>
    </div>
  )
}

export function AuditReport({ audit }: AuditReportProps) {
  const websiteFindings = (audit.websiteFindings as string[]) ?? []
  const uxFindings = (audit.uxFindings as string[]) ?? []
  const problems = audit.problems as string[]
  const businessImpact = audit.businessImpact as string[]
  const recommendations = audit.recommendations as string[]
  const emailAudit = audit.emailAudit
  const marketingAudit = audit.marketingAudit

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Wyniki audytu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <ScoreBar label="Website Score" score={audit.websiteScore} />
            <ScoreBar label="Email Score" score={audit.emailScore} />
            <ScoreBar label="Marketing Score" score={audit.marketingScore} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SalesOpportunityBadge opportunity={audit.overallOpportunity} />
            <span className="text-sm text-slate-500">Lead Score: {audit.leadScore}/100</span>
            {audit.loadTimeMs && (
              <span className="text-sm text-slate-500">Load: {audit.loadTimeMs}ms</span>
            )}
          </div>
          <p className="text-sm text-slate-700">{audit.opportunityReason}</p>
        </CardContent>
      </Card>

      {(audit.screenshotDesktopPath || audit.screenshotMobilePath) && (
        <Card>
          <CardHeader><CardTitle>Zrzuty ekranu</CardTitle></CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {audit.screenshotDesktopPath && (
              <ScreenshotPreview label="Desktop" src={audit.screenshotDesktopPath} />
            )}
            {audit.screenshotMobilePath && (
              <ScreenshotPreview label="Mobile" src={audit.screenshotMobilePath} />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Website Audit — Technical</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <CheckItem ok={audit.hasSsl} label="SSL Certificate" />
          <CheckItem ok={audit.hasHttpsRedirect} label="HTTPS Redirect" />
          <CheckItem ok={audit.isMobileFriendly} label="Mobile Friendly" />
          <CheckItem ok={audit.isResponsive} label="Responsive Design" />
          <CheckItem ok={audit.hasMetaTitle} label="Meta Title" />
          <CheckItem ok={audit.hasMetaDescription} label="Meta Description" />
          <CheckItem ok={audit.hasH1} label="H1 Heading" />
          <CheckItem ok={!audit.hasMultipleH1} label="Single H1 (no duplicates)" />
          <CheckItem ok={audit.hasFavicon} label="Favicon" />
          <CheckItem ok={audit.hasRobotsTxt} label="robots.txt" />
          <CheckItem ok={audit.hasSitemap} label="sitemap.xml" />
          <CheckItem ok={audit.hasContactForm} label="Contact Form" />
          <CheckItem ok={audit.hasGoogleMaps} label="Google Maps" />
          <CheckItem ok={audit.hasPrivacyPolicy} label="Privacy Policy" />
          <CheckItem ok={audit.hasCookieBanner} label="Cookie Banner" />
          <CheckItem ok={audit.hasStructuredData} label="Structured Data" />
          {audit.sslValidUntil && (
            <div className="flex items-center gap-2 text-sm sm:col-span-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>SSL expires: {new Date(audit.sslValidUntil).toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Website Audit — SEO</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {audit.metaTitle && <p><strong>Title:</strong> {audit.metaTitle} ({audit.titleLength} chars)</p>}
          {audit.metaDescription && <p><strong>Description:</strong> {audit.metaDescription.slice(0, 120)}... ({audit.descriptionLength} chars)</p>}
          {audit.h1Text && <p><strong>H1:</strong> {audit.h1Text}</p>}
          <p>Internal links: {audit.internalLinksCount ?? 0}</p>
          <ul className="list-inside list-disc space-y-1 text-slate-600">
            {websiteFindings.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </CardContent>
      </Card>

      {(audit.aiDesignScore != null) && (
        <Card>
          <CardHeader><CardTitle>Website Audit — UX (AI)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ScoreBar label="Design" score={audit.aiDesignScore ?? 0} />
              <ScoreBar label="Trust" score={audit.aiTrustScore ?? 0} />
              <ScoreBar label="Readability" score={audit.aiReadabilityScore ?? 0} />
              <ScoreBar label="CTA" score={audit.aiCtaScore ?? 0} />
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
              {uxFindings.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {emailAudit && (
        <Card>
          <CardHeader><CardTitle>Email Audit</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ScoreBar label="Email Score" score={emailAudit.emailScore} />
            <div className="grid gap-2 sm:grid-cols-2">
              <CheckItem ok={emailAudit.hasMx} label="MX Records" />
              <CheckItem ok={emailAudit.hasSpf} label="SPF" />
              <CheckItem ok={emailAudit.hasDkim} label="DKIM" />
              <CheckItem ok={emailAudit.hasDmarc} label="DMARC" />
              <CheckItem ok={emailAudit.usesBusinessDomain} label="Business Domain Email" />
              <CheckItem ok={!emailAudit.usesFreeEmailOnly} label="No Free-Only Email" />
            </div>

            {emailAudit.emailRecords.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Discovered Emails</p>
                <div className="space-y-2">
                  {emailAudit.emailRecords.map((rec) => (
                    <div key={rec.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 px-3 py-2 text-sm">
                      <span className="font-mono">{rec.address}</span>
                      <span className="text-slate-500">{providerLabel(rec.classification)}</span>
                      <span className="text-xs text-slate-400">{rec.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {emailAudit.dnsRecords.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">DNS Records</p>
                <div className="space-y-1 text-xs font-mono text-slate-600">
                  {emailAudit.dnsRecords.map((r) => (
                    <div key={r.id} className="flex gap-2">
                      {r.isValid ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-red-500" />}
                      <span>{r.domain} — {r.recordType}</span>
                      {r.value && <span className="truncate text-slate-400">({r.value.slice(0, 80)})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {marketingAudit && (
        <Card>
          <CardHeader><CardTitle>Marketing Audit</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ScoreBar label="Marketing Score" score={marketingAudit.marketingScore} />
            <div className="grid gap-2 sm:grid-cols-2">
              <CheckItem ok={marketingAudit.hasGoogleAnalytics} label="Google Analytics" />
              <CheckItem ok={marketingAudit.hasGa4} label="GA4" />
              <CheckItem ok={marketingAudit.hasGoogleTagManager} label="Google Tag Manager" />
              <CheckItem ok={marketingAudit.hasMetaPixel} label="Meta Pixel" />
              <CheckItem ok={marketingAudit.hasLinkedInInsight} label="LinkedIn Insight Tag" />
              <CheckItem ok={marketingAudit.hasGoogleMaps} label="Google Maps" />
              <CheckItem ok={marketingAudit.hasAddress} label="Physical Address" />
              <CheckItem ok={marketingAudit.hasPhone} label="Phone Number" />
            </div>
            {marketingAudit.socialLinks && Object.keys(marketingAudit.socialLinks as object).length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Social Media</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(marketingAudit.socialLinks as Record<string, string>).map(([platform, url]) => (
                    <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                      className="rounded bg-slate-100 px-2 py-1 text-xs capitalize hover:bg-slate-200">
                      {platform}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
              {((marketingAudit.findings as string[]) ?? []).map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      <ReportSection title="AI Report — Problems" items={problems} />
      <ReportSection title="Business Impact" items={businessImpact} />
      <ReportSection title="Recommendations" items={recommendations} />

      <Card>
        <CardHeader><CardTitle>Expert Summary</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-700">{audit.expertSummary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Wycena projektu</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <PricingItem label="Landing Page" value={audit.pricingLanding} />
          <PricingItem label="Strona firmowa" value={audit.pricingCompanySite} />
          <PricingItem label="E-commerce" value={audit.pricingEcommerce} />
        </CardContent>
      </Card>
    </div>
  )
}

function ReportSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </CardContent>
    </Card>
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

function ScreenshotPreview({ label, src }: { label: string; src: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-600">{label}</p>
      <a href={src} target="_blank" rel="noopener noreferrer">
        <img src={src} alt={label} className="w-full rounded-lg border border-slate-200 shadow-sm" />
      </a>
    </div>
  )
}
