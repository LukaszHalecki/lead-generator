import * as cheerio from 'cheerio'
import { ensureHttps } from '@/lib/url'

export interface TechnicalCheckResult {
  hasSsl: boolean
  sslValidUntil: Date | null
  hasSecurityCertificate: boolean
  isMobileFriendly: boolean
  isResponsive: boolean
  hasContactForm: boolean
  hasGoogleMaps: boolean
  hasGoogleAnalytics: boolean
  hasGoogleTagManager: boolean
  hasFavicon: boolean
  hasPrivacyPolicy: boolean
  domainAgeYears: number | null
  isTechnologyModern: boolean
  hasMetaTitle: boolean
  hasMetaDescription: boolean
  hasH1: boolean
  metaTitle: string | null
  metaDescription: string | null
  h1Text: string | null
  socialMedia: {
    facebook?: string
    instagram?: string
    linkedin?: string
    twitter?: string
  }
  hasSocialMedia: boolean
  loadTimeMs: number | null
  pageSpeedScore: number | null
  rawHtml: string
}

const SOCIAL_PATTERNS = {
  facebook: /facebook\.com/i,
  instagram: /instagram\.com/i,
  linkedin: /linkedin\.com/i,
  twitter: /(twitter\.com|x\.com)/i,
}

const OUTDATED_TECH_PATTERNS = [
  /jquery-1\./i,
  /jquery\.min\.js\?ver=1\./i,
  /<marquee/i,
  /<font\b/i,
  /table[^>]*layout/i,
  /frontpage/i,
]

function estimateDomainAgeYears(html: string, bodyText: string): number | null {
  const currentYear = new Date().getFullYear()
  const copyrightMatch = bodyText.match(/(?:©|copyright)\s*(\d{4})/i)
  if (copyrightMatch) {
    const year = parseInt(copyrightMatch[1]!, 10)
    if (year > 1990 && year <= currentYear) {
      return Math.max(0, currentYear - year)
    }
  }
  const builtMatch = html.match(/(?:od\s+)?(\d{4})\s*(?:roku|r\.)/i)
  if (builtMatch) {
    const year = parseInt(builtMatch[1]!, 10)
    if (year > 1990 && year <= currentYear) {
      return Math.max(0, currentYear - year)
    }
  }
  return null
}

export async function analyzeTechnical(url: string): Promise<TechnicalCheckResult> {
  const targetUrl = ensureHttps(url)
  const start = Date.now()

  let html = ''
  let finalUrl = targetUrl
  let hasSsl = targetUrl.startsWith('https://')

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LeadGenerator/1.0' },
      redirect: 'follow',
    })
    clearTimeout(timeout)
    html = await response.text()
    finalUrl = response.url
    hasSsl = finalUrl.startsWith('https://')
  } catch {
    html = ''
  }

  const loadTimeMs = Date.now() - start
  const $ = cheerio.load(html)
  const bodyText = $('body').text().toLowerCase()
  const allLinks = $('a[href]')
    .map((_, el) => $(el).attr('href') ?? '')
    .get()
    .join(' ')

  const metaTitle = $('title').first().text().trim() || null
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    null
  const h1Text = $('h1').first().text().trim() || null

  const viewport = $('meta[name="viewport"]').attr('content') ?? ''
  const hasMediaQueries = html.includes('@media')
  const isMobileFriendly =
    viewport.includes('width=device-width') || viewport.includes('initial-scale')
  const isResponsive = isMobileFriendly && (hasMediaQueries || html.includes('responsive'))

  const hasContactForm =
    $('form').length > 0 &&
    (bodyText.includes('kontakt') ||
      bodyText.includes('contact') ||
      $('input[type="email"]').length > 0 ||
      $('textarea').length > 0)

  const hasGoogleMaps =
    allLinks.includes('google.com/maps') ||
    allLinks.includes('maps.google') ||
    $('iframe[src*="google.com/maps"]').length > 0

  const hasGoogleTagManager =
    html.includes('googletagmanager.com/gtm.js') ||
    html.includes('GTM-') ||
    html.includes('google_tag_manager')

  const hasGoogleAnalytics =
    !hasGoogleTagManager &&
    (html.includes('google-analytics.com') ||
      html.includes('gtag(') ||
      html.includes('G-') ||
      html.includes('UA-'))

  const hasFavicon =
    $('link[rel="icon"]').length > 0 ||
    $('link[rel="shortcut icon"]').length > 0 ||
    html.includes('favicon.ico')

  const hasPrivacyPolicy =
    allLinks.toLowerCase().includes('polityka') ||
    allLinks.toLowerCase().includes('privacy') ||
    allLinks.toLowerCase().includes('rodo') ||
    bodyText.includes('polityka prywatności') ||
    bodyText.includes('privacy policy')

  const hasSecurityCertificate = hasSsl

  const isTechnologyModern = !OUTDATED_TECH_PATTERNS.some((p) => p.test(html))

  const domainAgeYears = estimateDomainAgeYears(html, $('body').text())

  const socialMedia: TechnicalCheckResult['socialMedia'] = {}
  for (const [key, pattern] of Object.entries(SOCIAL_PATTERNS)) {
    const link = allLinks.split(' ').find((l) => pattern.test(l))
    if (link) {
      socialMedia[key as keyof typeof socialMedia] = link
    }
  }

  const pageSpeedScore =
    loadTimeMs < 1500 ? 95 : loadTimeMs < 3000 ? 75 : loadTimeMs < 5000 ? 50 : 25

  return {
    hasSsl,
    sslValidUntil: hasSsl ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null,
    hasSecurityCertificate,
    isMobileFriendly,
    isResponsive,
    hasContactForm,
    hasGoogleMaps,
    hasGoogleAnalytics: hasGoogleAnalytics || hasGoogleTagManager,
    hasGoogleTagManager,
    hasFavicon,
    hasPrivacyPolicy,
    domainAgeYears,
    isTechnologyModern,
    hasMetaTitle: Boolean(metaTitle && metaTitle.length > 3),
    hasMetaDescription: Boolean(metaDescription && metaDescription.length > 10),
    hasH1: Boolean(h1Text && h1Text.length > 1),
    metaTitle,
    metaDescription,
    h1Text,
    socialMedia,
    hasSocialMedia: Object.keys(socialMedia).length > 0,
    loadTimeMs,
    pageSpeedScore,
    rawHtml: html.slice(0, 50000),
  }
}
