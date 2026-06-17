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
    findings.push(hasGa4 ? '✓ Google Analytics 4 detected' : '✓ Google Analytics detected')
  } else {
    findings.push('✗ No analytics tracking — blind to visitor behavior')
  }

  if (hasGoogleTagManager) {
    score += 10
    findings.push('✓ Google Tag Manager configured')
  }

  if (hasMetaPixel) {
    score += 10
    findings.push('✓ Meta Pixel detected')
  } else {
    findings.push('✗ No Meta Pixel — missing retargeting capability')
  }

  if (hasLinkedInInsight) {
    score += 8
    findings.push('✓ LinkedIn Insight Tag detected')
  }

  const socialLinks = website.socialMedia as MarketingAuditResult['socialLinks']
  const socialCount = Object.keys(socialLinks).length
  if (socialCount >= 3) {
    score += 20
    findings.push(`✓ Strong social presence (${socialCount} platforms)`)
  } else if (socialCount >= 1) {
    score += 10
    findings.push(`⚠ Limited social presence (${socialCount} platform${socialCount > 1 ? 's' : ''})`)
  } else {
    findings.push('✗ No social media links found')
  }

  if (website.hasGoogleMaps) {
    score += 12
    findings.push('✓ Google Maps integration')
  } else {
    findings.push('✗ No Google Maps — weak local presence')
  }

  const $ = cheerio.load(html)
  const bodyText = $('body').text()
  const hasAddress = ADDRESS_PATTERNS.some((p) => p.test(bodyText))
  const hasPhone = PHONE_PATTERNS.some((p) => p.test(bodyText)) || $('a[href^="tel:"]').length > 0

  if (hasAddress) {
    score += 10
    findings.push('✓ Physical address detected')
  } else {
    findings.push('✗ No physical address found')
  }

  if (hasPhone) {
    score += 10
    findings.push('✓ Phone number detected')
  } else {
    findings.push('✗ No phone number found')
  }

  if (website.hasContactForm) {
    score += 5
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
  }
}
