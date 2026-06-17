import OpenAI from 'openai'
import type { SalesOpportunity } from '@prisma/client'
import type { WebsiteAuditResult } from './website-audit'
import type { MarketingAuditResult } from './marketing-auditor'
import type { EmailScoreResult } from './email-scorer'
import type { DiscoveredEmail } from './email-discovery'
import type { ScreenshotResult } from '../analysis/screenshot-capture'

export interface AuditAiResult {
  aiDesignScore: number
  aiTrustScore: number
  aiReadabilityScore: number
  aiCtaScore: number
  uxFindings: string[]
  problems: string[]
  businessImpact: string[]
  recommendations: string[]
  expertSummary: string
  pricingLanding: number
  pricingCompanySite: number
  pricingEcommerce: number
  rawResponse: Record<string, unknown>
}

const FALLBACK: AuditAiResult = {
  aiDesignScore: 45,
  aiTrustScore: 45,
  aiReadabilityScore: 45,
  aiCtaScore: 40,
  uxFindings: ['Wymaga oceny wizualnej'],
  problems: ['Brak nowoczesnego designu', 'Słaba widoczność CTA'],
  businessImpact: ['Utrata leadów', 'Obniżone zaufanie klientów'],
  recommendations: ['Modernizacja UX', 'Optymalizacja konwersji'],
  expertSummary: 'Strona wymaga poprawy pod kątem UX i konwersji.',
  pricingLanding: 4500,
  pricingCompanySite: 8500,
  pricingEcommerce: 18000,
  rawResponse: {},
}

function buildAuditPrompt(
  companyName: string,
  url: string,
  website: WebsiteAuditResult,
  marketing: MarketingAuditResult,
  email: EmailScoreResult,
  emails: DiscoveredEmail[],
  websiteScore: number,
  emailScore: number,
  marketingScore: number,
  hasScreenshots: boolean,
): string {
  return `Jesteś ekspertem od audytu biznesowego stron WWW dla agencji Pixel-app.
Przeanalizuj firmę "${companyName}" (${url}).
${hasScreenshots ? 'Dołączono zrzuty ekranu (desktop + mobile) — oceń design wizualnie.\n' : ''}

WYNIKI AUDYTU:
- Website Score: ${websiteScore}/100
- Email Score: ${emailScore}/100
- Marketing Score: ${marketingScore}/100

TECHNICZNE: SSL=${website.hasSsl}, HTTPS redirect=${website.hasHttpsRedirect}, Mobile=${website.isMobileFriendly}, Load=${website.loadTimeMs}ms
SEO: Title="${website.metaTitle ?? 'brak'}", H1="${website.h1Text ?? 'brak'}", Multiple H1=${website.hasMultipleH1}, Structured data=${website.hasStructuredData}
EMAIL: MX=${email.hasMx}, SPF=${email.hasSpf}, DKIM=${email.hasDkim}, DMARC=${email.hasDmarc}, Emails=${emails.map((e) => e.address).join(', ') || 'brak'}
MARKETING: GA=${marketing.hasGoogleAnalytics}, GTM=${marketing.hasGoogleTagManager}, Meta Pixel=${marketing.hasMetaPixel}, Social=${Object.keys(marketing.socialLinks).join(', ') || 'brak'}

Oceń UX: design quality, modern appearance, trustworthiness, readability, CTA visibility, conversion potential.

Odpowiedz TYLKO JSON:
{
  "aiDesignScore": <0-100>,
  "aiTrustScore": <0-100>,
  "aiReadabilityScore": <0-100>,
  "aiCtaScore": <0-100>,
  "uxFindings": ["finding 1", ...],
  "problems": ["problem 1", ...],
  "businessImpact": ["Lost leads / Reduced trust / Lower conversions / SEO limitations / Email deliverability risks", ...],
  "recommendations": ["action 1", ...],
  "expertSummary": "executive summary po polsku dla rozmowy sprzedażowej",
  "pricingLanding": <PLN>,
  "pricingCompanySite": <PLN>,
  "pricingEcommerce": <PLN>
}`
}

function fallbackPricing(websiteScore: number): Pick<AuditAiResult, 'pricingLanding' | 'pricingCompanySite' | 'pricingEcommerce'> {
  const severity = Math.max(0, 100 - websiteScore) / 100
  return {
    pricingLanding: Math.round(3000 + severity * 5000),
    pricingCompanySite: Math.round(6000 + severity * 10000),
    pricingEcommerce: Math.round(12000 + severity * 20000),
  }
}

export async function analyzeAuditWithAi(
  companyName: string,
  url: string,
  website: WebsiteAuditResult,
  marketing: MarketingAuditResult,
  email: EmailScoreResult,
  emails: DiscoveredEmail[],
  websiteScore: number,
  emailScore: number,
  marketingScore: number,
  apiKey?: string,
  screenshots?: ScreenshotResult,
): Promise<AuditAiResult> {
  const key = apiKey ?? process.env.OPENAI_API_KEY
  const pricing = fallbackPricing(websiteScore)
  const hasScreenshots = Boolean(screenshots?.desktopBase64 || screenshots?.mobileBase64)

  if (!key) {
    return {
      ...FALLBACK,
      ...pricing,
      problems: [
        ...website.findings.filter((f) => f.startsWith('✗')).map((f) => f.slice(2)),
        ...email.findings.filter((f) => !f.startsWith('✓')),
        ...marketing.findings.filter((f) => f.startsWith('✗')).map((f) => f.slice(2)),
      ].slice(0, 10),
      expertSummary: `Audyt wykazał Website Score ${websiteScore}/100, Email Score ${emailScore}/100, Marketing Score ${marketingScore}/100. Firma wymaga wsparcia w modernizacji obecności online.`,
    }
  }

  try {
    const client = new OpenAI({ apiKey: key })
    const prompt = buildAuditPrompt(
      companyName, url, website, marketing, email, emails,
      websiteScore, emailScore, marketingScore, hasScreenshots,
    )

    const imageParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = []
    if (screenshots?.desktopBase64) {
      imageParts.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${screenshots.desktopBase64}`, detail: 'low' } })
    }
    if (screenshots?.mobileBase64) {
      imageParts.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${screenshots.mobileBase64}`, detail: 'low' } })
    }

    const response = await client.chat.completions.create({
      model: hasScreenshots ? 'gpt-4o' : 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: imageParts.length > 0 ? [{ type: 'text', text: prompt }, ...imageParts] : prompt,
      }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return { ...FALLBACK, ...pricing }

    const parsed = JSON.parse(content) as AuditAiResult
    return {
      aiDesignScore: clamp(parsed.aiDesignScore, 40),
      aiTrustScore: clamp(parsed.aiTrustScore, 40),
      aiReadabilityScore: clamp(parsed.aiReadabilityScore, 40),
      aiCtaScore: clamp(parsed.aiCtaScore, 35),
      uxFindings: parsed.uxFindings?.slice(0, 10) ?? FALLBACK.uxFindings,
      problems: parsed.problems?.slice(0, 12) ?? FALLBACK.problems,
      businessImpact: parsed.businessImpact?.slice(0, 8) ?? FALLBACK.businessImpact,
      recommendations: parsed.recommendations?.slice(0, 12) ?? FALLBACK.recommendations,
      expertSummary: parsed.expertSummary ?? FALLBACK.expertSummary,
      pricingLanding: parsed.pricingLanding ?? pricing.pricingLanding,
      pricingCompanySite: parsed.pricingCompanySite ?? pricing.pricingCompanySite,
      pricingEcommerce: parsed.pricingEcommerce ?? pricing.pricingEcommerce,
      rawResponse: parsed as unknown as Record<string, unknown>,
    }
  } catch {
    return { ...FALLBACK, ...pricing }
  }
}

function clamp(val: number | undefined, fallback: number): number {
  return Math.min(100, Math.max(0, val ?? fallback))
}

export function blendWebsiteScoreWithUx(technicalScore: number, ai: AuditAiResult): number {
  const uxAvg = Math.round((ai.aiDesignScore + ai.aiTrustScore + ai.aiReadabilityScore + ai.aiCtaScore) / 4)
  return Math.round(technicalScore * 0.65 + uxAvg * 0.35)
}
