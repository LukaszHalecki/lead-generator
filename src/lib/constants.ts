import type { AnalysisCategory, CompanyStatus, SalesOpportunity } from '@prisma/client'

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  NEW: 'Nowy',
  ANALYZED: 'Przeanalizowany',
  TO_CONTACT: 'Do kontaktu',
  SENT: 'Wysłano',
  REPLIED: 'Odpowiedział',
  CLIENT: 'Klient',
}

export const ANALYSIS_CATEGORY_LABELS: Record<AnalysisCategory, string> = {
  CRITICAL: 'Krytyczna',
  POOR: 'Słaba',
  AVERAGE: 'Przeciętna',
  GOOD: 'Dobra',
  EXCELLENT: 'Bardzo dobra',
}

export const SALES_OPPORTUNITY_LABELS: Record<SalesOpportunity, string> = {
  LOW: 'Niska',
  MEDIUM: 'Średnia',
  HIGH: 'Wysoka',
}

export const SCORE_RANGES = [
  { min: 0, max: 30, label: 'Krytyczna', key: 'CRITICAL' as const },
  { min: 31, max: 50, label: 'Słaba', key: 'POOR' as const },
  { min: 51, max: 70, label: 'Przeciętna', key: 'AVERAGE' as const },
  { min: 71, max: 85, label: 'Dobra', key: 'GOOD' as const },
  { min: 86, max: 100, label: 'Bardzo dobra', key: 'EXCELLENT' as const },
] as const

export const LEAD_SCORE_WEIGHTS = {
  ssl: 10,
  mobileFriendly: 10,
  responsive: 8,
  speed: 12,
  metaTitle: 8,
  metaDescription: 8,
  h1: 6,
  contactForm: 10,
  googleMaps: 6,
  socialMedia: 6,
  googleAnalytics: 6,
  aiBonus: 10,
} as const

export const SCORE_FILTER_PRESETS = [
  { label: 'Wszystkie', min: 0, max: 100 },
  { label: 'Krytyczne (0-30)', min: 0, max: 30 },
  { label: 'Słabe (31-50)', min: 31, max: 50 },
  { label: 'Przeciętne (51-70)', min: 51, max: 70 },
  { label: 'Dobre (71-85)', min: 71, max: 85 },
  { label: 'Bardzo dobre (86-100)', min: 86, max: 100 },
  { label: 'Poniżej 40', min: 0, max: 39 },
] as const

export const AGENCY_SIGNATURE = 'Pixel-app'
