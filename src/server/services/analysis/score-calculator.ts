import type { AnalysisCategory } from '@prisma/client'
import { SCORE_RANGES } from '@/lib/constants'

export function scoreToCategory(score: number): AnalysisCategory {
  const range = SCORE_RANGES.find((r) => score >= r.min && score <= r.max)
  return range?.key ?? 'CRITICAL'
}

export interface ScoreBreakdown {
  ssl: number
  mobileFriendly: number
  responsive: number
  speed: number
  metaTitle: number
  metaDescription: number
  h1: number
  contactForm: number
  googleMaps: number
  socialMedia: number
  googleAnalytics: number
  aiBonus: number
}

export interface TechnicalCheckInput {
  hasSsl: boolean
  isMobileFriendly: boolean
  isResponsive: boolean
  loadTimeMs: number | null
  pageSpeedScore: number | null
  hasMetaTitle: boolean
  hasMetaDescription: boolean
  hasH1: boolean
  hasContactForm: boolean
  hasGoogleMaps: boolean
  hasSocialMedia: boolean
  hasGoogleAnalytics: boolean
  aiAverageScore?: number
}

export function calculateLeadScore(checks: TechnicalCheckInput): {
  score: number
  breakdown: ScoreBreakdown
} {
  const speedScore = checks.pageSpeedScore
    ? Math.round((checks.pageSpeedScore / 100) * 12)
    : checks.loadTimeMs
      ? checks.loadTimeMs < 2000
        ? 12
        : checks.loadTimeMs < 4000
          ? 8
          : checks.loadTimeMs < 6000
            ? 4
            : 0
      : 0

  const aiBonus = checks.aiAverageScore
    ? Math.round((checks.aiAverageScore / 100) * 10)
    : 0

  const breakdown: ScoreBreakdown = {
    ssl: checks.hasSsl ? 10 : 0,
    mobileFriendly: checks.isMobileFriendly ? 10 : 0,
    responsive: checks.isResponsive ? 8 : 0,
    speed: speedScore,
    metaTitle: checks.hasMetaTitle ? 8 : 0,
    metaDescription: checks.hasMetaDescription ? 8 : 0,
    h1: checks.hasH1 ? 6 : 0,
    contactForm: checks.hasContactForm ? 10 : 0,
    googleMaps: checks.hasGoogleMaps ? 6 : 0,
    socialMedia: checks.hasSocialMedia ? 6 : 0,
    googleAnalytics: checks.hasGoogleAnalytics ? 6 : 0,
    aiBonus,
  }

  const score = Math.min(
    100,
    Object.values(breakdown).reduce((sum, v) => sum + v, 0),
  )

  return { score, breakdown }
}

export function calculatePricing(score: number, hasWebsite: boolean): {
  landing: number
  companySite: number
  ecommerce: number
} {
  const baseMultiplier = hasWebsite ? 1 : 1.2
  const severity = Math.max(0, 100 - score) / 100

  const landing = Math.round((3000 + severity * 4000) * baseMultiplier)
  const companySite = Math.round((6000 + severity * 9000) * baseMultiplier)
  const ecommerce = Math.round((12000 + severity * 18000) * baseMultiplier)

  return { landing, companySite, ecommerce }
}
