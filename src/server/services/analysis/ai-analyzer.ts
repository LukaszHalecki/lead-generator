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
  rawResponse: Record<string, unknown>
}

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
    'Potencjalna utrata klientów mobilnych',
    'Niższa konwersja z ruchu organicznego',
    'Słabsza widoczność w wynikach wyszukiwania',
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

Dane techniczne:
- SSL: ${technical.hasSsl}
- Mobile friendly: ${technical.isMobileFriendly}
- Responsywność: ${technical.isResponsive}
- Meta title: ${technical.metaTitle ?? 'brak'}
- Meta description: ${technical.metaDescription ?? 'brak'}
- H1: ${technical.h1Text ?? 'brak'}
- Formularz kontaktowy: ${technical.hasContactForm}
- Google Maps: ${technical.hasGoogleMaps}
- Social media: ${technical.hasSocialMedia ? JSON.stringify(technical.socialMedia) : 'brak'}
- Google Analytics: ${technical.hasGoogleAnalytics}
- Czas ładowania: ${technical.loadTimeMs}ms

Odpowiedz TYLKO poprawnym JSON:
{
  "aiDesignScore": <0-100>,
  "aiContentScore": <0-100>,
  "aiCtaScore": <0-100>,
  "problems": ["problem 1", "problem 2", ...],
  "businessImpact": ["wpływ 1", "wpływ 2", ...],
  "recommendations": ["rekomendacja 1", ...],
  "expertSummary": "krótkie podsumowanie eksperckie po polsku",
  "salesOpportunity": "LOW" | "MEDIUM" | "HIGH",
  "salesOpportunityReason": "krótkie uzasadnienie sprzedażowe po polsku"
}`
}

export async function analyzeWithAi(
  companyName: string,
  url: string,
  technical: TechnicalCheckResult,
  leadScore: number,
  apiKey?: string,
): Promise<AiAnalysisResult> {
  const key = apiKey ?? process.env.OPENAI_API_KEY
  if (!key) {
    return {
      ...FALLBACK_ANALYSIS,
      salesOpportunityReason: `Strona wygląda na wymagającą aktualizacji (Lead Score: ${leadScore}/100). Firma ${
        technical.hasSocialMedia ? 'posiada aktywne profile społecznościowe' : 'jest obecna online'
      }, co sugeruje potencjalne zainteresowanie modernizacją witryny.`,
    }
  }

  try {
    const client = new OpenAI({ apiKey: key })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: buildPrompt(companyName, url, technical, leadScore),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return FALLBACK_ANALYSIS

    const parsed = JSON.parse(content) as AiAnalysisResult
    return {
      aiDesignScore: Math.min(100, Math.max(0, parsed.aiDesignScore ?? 40)),
      aiContentScore: Math.min(100, Math.max(0, parsed.aiContentScore ?? 40)),
      aiCtaScore: Math.min(100, Math.max(0, parsed.aiCtaScore ?? 35)),
      problems: parsed.problems?.slice(0, 8) ?? FALLBACK_ANALYSIS.problems,
      businessImpact:
        parsed.businessImpact?.slice(0, 6) ?? FALLBACK_ANALYSIS.businessImpact,
      recommendations:
        parsed.recommendations?.slice(0, 8) ?? FALLBACK_ANALYSIS.recommendations,
      expertSummary: parsed.expertSummary ?? FALLBACK_ANALYSIS.expertSummary,
      salesOpportunity: ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.salesOpportunity)
        ? parsed.salesOpportunity
        : 'MEDIUM',
      salesOpportunityReason:
        parsed.salesOpportunityReason ?? FALLBACK_ANALYSIS.salesOpportunityReason,
      rawResponse: parsed as unknown as Record<string, unknown>,
    }
  } catch {
    return FALLBACK_ANALYSIS
  }
}
