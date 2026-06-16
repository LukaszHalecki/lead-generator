import type { AnalysisCategory } from '@prisma/client'
import { SCORE_RANGES } from '@/lib/constants'

export function scoreToCategory(score: number): AnalysisCategory {
  const range = SCORE_RANGES.find((r) => score >= r.min && score <= r.max)
  return range?.key ?? 'CRITICAL'
}

export interface ScoreBreakdown {
  ssl: number
  securityCertificate: number
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
  googleTagManager: number
  favicon: number
  privacyPolicy: number
  domainAge: number
  technologyModern: number
}

export interface TechnicalCheckInput {
  hasSsl: boolean
  hasSecurityCertificate: boolean
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
  hasGoogleTagManager: boolean
  hasFavicon: boolean
  hasPrivacyPolicy: boolean
  domainAgeYears: number | null
  isTechnologyModern: boolean
}

function speedPoints(loadTimeMs: number | null, pageSpeedScore: number | null): number {
  if (pageSpeedScore != null) {
    return Math.round((pageSpeedScore / 100) * 6)
  }
  if (loadTimeMs == null) return 0
  if (loadTimeMs < 2000) return 6
  if (loadTimeMs < 4000) return 4
  if (loadTimeMs < 6000) return 2
  return 0
}

function domainAgePoints(years: number | null): number {
  if (years == null) return 3
  if (years >= 5) return 6
  if (years >= 2) return 4
  return 2
}

export function calculateLeadScore(checks: TechnicalCheckInput): {
  score: number
  breakdown: ScoreBreakdown
} {
  const breakdown: ScoreBreakdown = {
    ssl: checks.hasSsl ? 6 : 0,
    securityCertificate: checks.hasSecurityCertificate ? 6 : 0,
    mobileFriendly: checks.isMobileFriendly ? 6 : 0,
    responsive: checks.isResponsive ? 6 : 0,
    speed: speedPoints(checks.loadTimeMs, checks.pageSpeedScore),
    metaTitle: checks.hasMetaTitle ? 6 : 0,
    metaDescription: checks.hasMetaDescription ? 6 : 0,
    h1: checks.hasH1 ? 6 : 0,
    contactForm: checks.hasContactForm ? 6 : 0,
    googleMaps: checks.hasGoogleMaps ? 6 : 0,
    socialMedia: checks.hasSocialMedia ? 6 : 0,
    googleAnalytics: checks.hasGoogleAnalytics ? 6 : 0,
    googleTagManager: checks.hasGoogleTagManager ? 6 : 0,
    favicon: checks.hasFavicon ? 6 : 0,
    privacyPolicy: checks.hasPrivacyPolicy ? 6 : 0,
    domainAge: domainAgePoints(checks.domainAgeYears),
    technologyModern: checks.isTechnologyModern ? 6 : 0,
  }

  const score = Math.min(
    100,
    Object.values(breakdown).reduce((sum, v) => sum + v, 0),
  )

  return { score, breakdown }
}

export function technicalToCheckInput(technical: {
  hasSsl: boolean
  hasSecurityCertificate: boolean
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
  hasGoogleTagManager: boolean
  hasFavicon: boolean
  hasPrivacyPolicy: boolean
  domainAgeYears: number | null
  isTechnologyModern: boolean
}): TechnicalCheckInput {
  return technical
}
