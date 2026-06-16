import type { AnalysisCategory, CompanyStatus, SalesOpportunity } from '@prisma/client'
import type { LeadPriority } from '@/lib/lead-priority'

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  NEW: 'Nowy',
  ANALYZED: 'Przeanalizowany',
  TO_CONTACT: 'Do kontaktu',
  SENT: 'Wysłano',
  REPLIED: 'Odpowiedział',
  CLIENT: 'Klient',
}

export const ANALYSIS_CATEGORY_LABELS: Record<AnalysisCategory, string> = {
  CRITICAL: 'Bardzo słaba strona',
  POOR: 'Duże problemy',
  AVERAGE: 'Wymaga modernizacji',
  GOOD: 'Dobra',
  EXCELLENT: 'Bardzo dobra',
}

export const SALES_OPPORTUNITY_LABELS: Record<SalesOpportunity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  HOT: 'Hot Leads',
  WARM: 'Warm Leads',
  COLD: 'Cold Leads',
}

export const LEAD_PRIORITY_DESCRIPTIONS: Record<LeadPriority, string> = {
  HOT: 'Lead Score < 40 + High Opportunity',
  WARM: 'Lead Score 40–60 + Medium Opportunity',
  COLD: 'Lead Score > 60 + Low Opportunity',
}

/** Zakresy Lead Score zgodne ze specyfikacją MVP */
export const SCORE_RANGES = [
  { min: 0, max: 20, label: 'Bardzo słaba strona', key: 'CRITICAL' as const },
  { min: 21, max: 40, label: 'Duże problemy', key: 'POOR' as const },
  { min: 41, max: 60, label: 'Wymaga modernizacji', key: 'AVERAGE' as const },
  { min: 61, max: 80, label: 'Dobra', key: 'GOOD' as const },
  { min: 81, max: 100, label: 'Bardzo dobra', key: 'EXCELLENT' as const },
] as const

export const LEAD_SCORE_WEIGHTS = {
  ssl: 6,
  securityCertificate: 6,
  mobileFriendly: 6,
  responsive: 6,
  speed: 6,
  metaTitle: 6,
  metaDescription: 6,
  h1: 6,
  contactForm: 6,
  googleMaps: 6,
  socialMedia: 6,
  googleAnalytics: 6,
  googleTagManager: 6,
  favicon: 6,
  privacyPolicy: 6,
  domainAge: 6,
  technologyModern: 6,
} as const

export const SCORE_FILTER_PRESETS = [
  { label: 'Wszystkie', min: 0, max: 100 },
  { label: 'Bardzo słaba (0–20)', min: 0, max: 20 },
  { label: 'Duże problemy (21–40)', min: 21, max: 40 },
  { label: 'Modernizacja (41–60)', min: 41, max: 60 },
  { label: 'Dobra (61–80)', min: 61, max: 80 },
  { label: 'Bardzo dobra (81–100)', min: 81, max: 100 },
  { label: 'Poniżej 40', min: 0, max: 39 },
] as const

export const LEAD_PRIORITY_FILTERS: Array<{ key: LeadPriority; label: string }> = [
  { key: 'HOT', label: 'Hot Leads' },
  { key: 'WARM', label: 'Warm Leads' },
  { key: 'COLD', label: 'Cold Leads' },
]

export const AGENCY_SIGNATURE = 'Pixel-app'
