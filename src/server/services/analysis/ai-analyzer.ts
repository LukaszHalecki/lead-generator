import OpenAI from 'openai'
import type { SalesOpportunity } from '@prisma/client'
import type { TechnicalCheckResult } from './technical-analyzer'

export interface AiAnalysisResult {
  aiDesignScore: number
  aiContentScore: number
  aiCtaScore: number
  problems: string[]
  businessImpact: string[]
  recommendations: string[]
  expertSummary: string
  salesOpportunity: SalesOpportunity
  salesOpportunityReason: string
  pricingLanding: number
  pricingCompanySite: number
  pricingEcommerce: number
  rawResponse: Record<string, unknown>
}

const FALLBACK_PRICING = { landing: 4500, companySite: 8500, ecommerce: 18000 }

const FALLBACK_ANALYSIS: AiAnalysisResult = {
  aiDesignScore: 40,
  aiContentScore: 40,
  aiCtaScore: 35,
  problems: [
    'Brak responsywnego układu strony',
    'Nieoptymalna struktura nagłówków',
    'Słaba widoczność wezwań do działania',
  ],
  businessImpact: [
    'Utrata klientów mobilnych',
    'Słaba widoczność w wyszukiwarkach',
    'Niska konwersja z ruchu organicznego',
  ],
  recommendations: [
    'Wdrożyć responsywny design',
    'Zoptymalizować meta tagi SEO',
    'Dodać wyraźne wezwania do działania',
  ],
  expertSummary:
    'Strona wymaga modernizacji pod kątem UX, SEO i konwersji. Istnieje realny potencjał na projekt odświeżenia witryny.',
  salesOpportunity: 'MEDIUM',
  salesOpportunityReason:
    'Firma posiada stronę internetową z widocznymi brakami technicznymi, co sugeruje zainteresowanie poprawą obecności online.',
  pricingLanding: FALLBACK_PRICING.landing,
  pricingCompanySite: FALLBACK_PRICING.companySite,
  pricingEcommerce: FALLBACK_PRICING.ecommerce,
  rawResponse: {},
}

function buildPrompt(
  companyName: string,
  url: string,
  technical: TechnicalCheckResult,
  leadScore: number,
): string {
  return `Jesteś ekspertem od stron internetowych i sprzedaży usług webowych dla agencji Pixel-app.
Przeanalizuj stronę firmy "${companyName}" (${url}).

Wynik Lead Score: ${leadScore}/100

Dane techniczne (17 kryteriów):
- SSL: ${technical.hasSsl}
- Certyfikat bezpieczeństwa: ${technical.hasSecurityCertificate}
- Mobile friendly: ${technical.isMobileFriendly}
- Responsywność: ${technical.isResponsive}
- Szybkość: ${technical.loadTimeMs}ms
- Meta title: ${technical.metaTitle ?? 'brak'}
- Meta description: ${technical.metaDescription ?? 'brak'}
- H1: ${technical.h1Text ?? 'brak'}
- Formularz kontaktowy: ${technical.hasContactForm}
- Google Maps: ${technical.hasGoogleMaps}
- Social media: ${technical.hasSocialMedia ? JSON.stringify(technical.socialMedia) : 'brak'}
- Google Analytics: ${technical.hasGoogleAnalytics}
- Google Tag Manager: ${technical.hasGoogleTagManager}
- Favicon: ${technical.hasFavicon}
- Polityka prywatności: ${technical.hasPrivacyPolicy}
- Wiek domeny (szac.): ${technical.domainAgeYears ?? 'nieznany'} lat
- Aktualność technologii: ${technical.isTechnologyModern ? 'nowoczesna' : 'przestarzała'}

Na podstawie analizy wygeneruj raport i orientacyjną wycenę w PLN.

Odpowiedz TYLKO poprawnym JSON:
{
  "aiDesignScore": <0-100>,
  "aiContentScore": <0-100>,
  "aiCtaScore": <0-100>,
  "problems": ["problem 1", ...],
  "businessImpact": ["utrata klientów / słaba widoczność / niska konwersja", ...],
  "recommendations": ["rekomendacja 1", ...],
  "expertSummary": "krótkie podsumowanie eksperckie po polsku",
  "salesOpportunity": "LOW" | "MEDIUM" | "HIGH",
  "salesOpportunityReason": "krótkie uzasadnienie sprzedażowe po polsku",
  "pricingLanding": <liczba PLN landing page>,
  "pricingCompanySite": <liczba PLN strona firmowa>,
  "pricingEcommerce": <liczba PLN sklep internetowy>
}`
}

function fallbackPricing(leadScore: number): {
  pricingLanding: number
  pricingCompanySite: number
  pricingEcommerce: number
} {
  const severity = Math.max(0, 100 - leadScore) / 100
  return {
    pricingLanding: Math.round(3000 + severity * 5000),
    pricingCompanySite: Math.round(6000 + severity * 10000),
    pricingEcommerce: Math.round(12000 + severity * 20000),
  }
}

export async function analyzeWithAi(
  companyName: string,
  url: string,
  technical: TechnicalCheckResult,
  leadScore: number,
  apiKey?: string,
): Promise<AiAnalysisResult> {
  const key = apiKey ?? process.env.OPENAI_API_KEY
  const pricingFallback = fallbackPricing(leadScore)

  if (!key) {
    return {
      ...FALLBACK_ANALYSIS,
      ...pricingFallback,
      salesOpportunity:
        leadScore < 40 ? 'HIGH' : leadScore <= 60 ? 'MEDIUM' : 'LOW',
      salesOpportunityReason: `Strona wygląda na wymagającą aktualizacji (Lead Score: ${leadScore}/100). Firma ${
        technical.hasSocialMedia ? 'posiada aktywne profile społecznościowe' : 'jest obecna online'
      }, co sugeruje potencjalne zainteresowanie modernizacją witryny.`,
    }
  }

  try {
    const client = new OpenAI({ apiKey: key })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: buildPrompt(companyName, url, technical, leadScore) }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return { ...FALLBACK_ANALYSIS, ...pricingFallback }

    const parsed = JSON.parse(content) as AiAnalysisResult
    return {
      aiDesignScore: Math.min(100, Math.max(0, parsed.aiDesignScore ?? 40)),
      aiContentScore: Math.min(100, Math.max(0, parsed.aiContentScore ?? 40)),
      aiCtaScore: Math.min(100, Math.max(0, parsed.aiCtaScore ?? 35)),
      problems: parsed.problems?.slice(0, 10) ?? FALLBACK_ANALYSIS.problems,
      businessImpact:
        parsed.businessImpact?.slice(0, 8) ?? FALLBACK_ANALYSIS.businessImpact,
      recommendations:
        parsed.recommendations?.slice(0, 10) ?? FALLBACK_ANALYSIS.recommendations,
      expertSummary: parsed.expertSummary ?? FALLBACK_ANALYSIS.expertSummary,
      salesOpportunity: ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.salesOpportunity)
        ? parsed.salesOpportunity
        : leadScore < 40
          ? 'HIGH'
          : leadScore <= 60
            ? 'MEDIUM'
            : 'LOW',
      salesOpportunityReason:
        parsed.salesOpportunityReason ?? FALLBACK_ANALYSIS.salesOpportunityReason,
      pricingLanding: parsed.pricingLanding ?? pricingFallback.pricingLanding,
      pricingCompanySite: parsed.pricingCompanySite ?? pricingFallback.pricingCompanySite,
      pricingEcommerce: parsed.pricingEcommerce ?? pricingFallback.pricingEcommerce,
      rawResponse: parsed as unknown as Record<string, unknown>,
    }
  } catch {
    return { ...FALLBACK_ANALYSIS, ...pricingFallback }
  }
}
