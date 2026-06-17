import type { ScoreBreakdownLine } from '@/lib/score-breakdown'
import * as cheerio from 'cheerio'
import type { WebsiteAuditResult } from './website-audit'

export interface MarketingAuditResult {
  marketingScore: number
  hasGoogleAnalytics: boolean
  hasGa4: boolean
  hasGoogleTagManager: boolean
  hasMetaPixel: boolean
  hasLinkedInInsight: boolean
  socialLinks: {
    facebook?: string
    instagram?: string
    linkedin?: string
    youtube?: string
    tiktok?: string
    twitter?: string
  }
  hasGoogleMaps: boolean
  hasAddress: boolean
  hasPhone: boolean
  findings: string[]
  scoreBreakdown: ScoreBreakdownLine[]
}

const ADDRESS_PATTERNS = [
  /\bul\.\s+[A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s]+\d+/i,
  /\b\d{2}-\d{3}\s+[A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+/,
  /\b\d+\s+[A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s]+(?:street|st\.|avenue|ave\.)/i,
]

const PHONE_PATTERNS = [
  /\+?\d{2}[\s-]?\d{2,3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/,
  /tel[:\s.]+\+?\d[\d\s-]{8,}/i,
]

export function runMarketingAudit(
  website: WebsiteAuditResult,
  html: string,
): MarketingAuditResult {
  const findings: string[] = []
  const breakdown: ScoreBreakdownLine[] = []
  let score = 0

  const hasGa4 = html.includes('G-') && (html.includes('gtag') || html.includes('google-analytics'))
  const hasGoogleAnalytics = website.hasGoogleAnalytics || hasGa4
  const hasGoogleTagManager = website.hasGoogleTagManager
  const hasMetaPixel =
    html.includes('connect.facebook.net') ||
    html.includes('fbq(') ||
    html.includes('facebook.com/tr')
  const hasLinkedInInsight =
    html.includes('snap.licdn.com') || html.includes('linkedin.com/insight')

  if (hasGoogleAnalytics || hasGa4) {
    score += 15
    breakdown.push({ label: hasGa4 ? 'Google Analytics 4' : 'Google Analytics', points: 15 })
    findings.push(hasGa4 ? '✓ Google Analytics 4 detected' : '✓ Google Analytics detected')
  } else {
    breakdown.push({ label: 'Analytics (brak)', points: 0 })
    findings.push('✗ No analytics tracking — blind to visitor behavior')
  }

  if (hasGoogleTagManager) {
    score += 10
    breakdown.push({ label: 'Google Tag Manager', points: 10 })
    findings.push('✓ Google Tag Manager configured')
  }

  if (hasMetaPixel) {
    score += 10
    breakdown.push({ label: 'Meta Pixel', points: 10 })
    findings.push('✓ Meta Pixel detected')
  } else {
    breakdown.push({ label: 'Meta Pixel (brak)', points: 0 })
    findings.push('✗ No Meta Pixel — missing retargeting capability')
  }

  if (hasLinkedInInsight) {
    score += 8
    breakdown.push({ label: 'LinkedIn Insight Tag', points: 8 })
    findings.push('✓ LinkedIn Insight Tag detected')
  }

  const socialLinks = website.socialMedia as MarketingAuditResult['socialLinks']
  const socialCount = Object.keys(socialLinks).length
  if (socialCount >= 3) {
    score += 20
    breakdown.push({ label: `Social media (${socialCount} platformy)`, points: 20 })
    findings.push(`✓ Strong social presence (${socialCount} platforms)`)
  } else if (socialCount >= 1) {
    score += 10
    breakdown.push({ label: `Social media (${socialCount} platforma)`, points: 10 })
    findings.push(`⚠ Limited social presence (${socialCount} platform${socialCount > 1 ? 's' : ''})`)
  } else {
    breakdown.push({ label: 'Social media (brak)', points: 0 })
    findings.push('✗ No social media links found')
  }

  if (website.hasGoogleMaps) {
    score += 12
    breakdown.push({ label: 'Google Maps', points: 12 })
    findings.push('✓ Google Maps integration')
  } else {
    breakdown.push({ label: 'Google Maps (brak)', points: 0 })
    findings.push('✗ No Google Maps — weak local presence')
  }

  const $ = cheerio.load(html)
  const bodyText = $('body').text()
  const hasAddress = ADDRESS_PATTERNS.some((p) => p.test(bodyText))
  const hasPhone = PHONE_PATTERNS.some((p) => p.test(bodyText)) || $('a[href^="tel:"]').length > 0

  if (hasAddress) {
    score += 10
    breakdown.push({ label: 'Adres fizyczny', points: 10 })
    findings.push('✓ Physical address detected')
  } else {
    breakdown.push({ label: 'Adres fizyczny (brak)', points: 0 })
    findings.push('✗ No physical address found')
  }

  if (hasPhone) {
    score += 10
    breakdown.push({ label: 'Numer telefonu', points: 10 })
    findings.push('✓ Phone number detected')
  } else {
    breakdown.push({ label: 'Numer telefonu (brak)', points: 0 })
    findings.push('✗ No phone number found')
  }

  if (website.hasContactForm) {
    score += 5
    breakdown.push({ label: 'Formularz kontaktowy', points: 5 })
    findings.push('✓ Contact form available')
  }

  return {
    marketingScore: Math.min(100, Math.max(0, score)),
    hasGoogleAnalytics,
    hasGa4,
    hasGoogleTagManager,
    hasMetaPixel,
    hasLinkedInInsight,
    socialLinks,
    hasGoogleMaps: website.hasGoogleMaps,
    hasAddress,
    hasPhone,
    findings,
    scoreBreakdown: breakdown,
  }
}
