import type { ScoreBreakdownLine } from '@/lib/score-breakdown'
import * as cheerio from 'cheerio'
import { ensureHttps } from '@/lib/url'
import tls from 'node:tls'

export interface WebsiteAuditResult {
  // Technical
  hasSsl: boolean
  sslValidUntil: Date | null
  hasHttpsRedirect: boolean
  isMobileFriendly: boolean
  isResponsive: boolean
  loadTimeMs: number | null
  hasMetaTitle: boolean
  hasMetaDescription: boolean
  hasH1: boolean
  metaTitle: string | null
  metaDescription: string | null
  h1Text: string | null
  h1Count: number
  hasFavicon: boolean
  hasRobotsTxt: boolean
  hasSitemap: boolean
  hasContactForm: boolean
  hasGoogleMaps: boolean
  hasPrivacyPolicy: boolean
  hasCookieBanner: boolean

  // SEO
  titleLength: number
  descriptionLength: number
  hasMultipleH1: boolean
  hasMissingHeadings: boolean
  internalLinksCount: number
  hasStructuredData: boolean

  // Legacy compat
  hasGoogleAnalytics: boolean
  hasGoogleTagManager: boolean
  socialMedia: Record<string, string>
  hasSocialMedia: boolean
  domainAgeYears: number | null
  isTechnologyModern: boolean
  hasSecurityCertificate: boolean
  rawHtml: string
  finalUrl: string

  websiteScore: number
  findings: string[]
  scoreBreakdown: ScoreBreakdownLine[]
}

const OUTDATED_TECH = [/jquery-1\./i, /<marquee/i, /<font\b/i, /table[^>]*layout/i]

async function fetchWithTiming(url: string): Promise<{ html: string; finalUrl: string; loadTimeMs: number }> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LeadGenerator/1.0 Audit' },
      redirect: 'follow',
    })
    clearTimeout(timeout)
    const html = await response.text()
    return { html, finalUrl: response.url, loadTimeMs: Date.now() - start }
  } catch {
    return { html: '', finalUrl: url, loadTimeMs: Date.now() - start }
  }
}

async function checkHttpsRedirect(url: string): Promise<boolean> {
  try {
    const httpUrl = url.replace(/^https:\/\//, 'http://')
    if (httpUrl === url) return false
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(httpUrl, {
      signal: controller.signal,
      redirect: 'manual',
      headers: { 'User-Agent': 'LeadGenerator/1.0 Audit' },
    })
    clearTimeout(timeout)
    const location = response.headers.get('location') ?? ''
    return response.status >= 300 && response.status < 400 && location.startsWith('https://')
  } catch {
    return false
  }
}

async function getSslExpiry(hostname: string): Promise<Date | null> {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate()
      socket.end()
      if (cert?.valid_to) resolve(new Date(cert.valid_to))
      else resolve(null)
    })
    socket.on('error', () => resolve(null))
    socket.setTimeout(5000, () => {
      socket.destroy()
      resolve(null)
    })
  })
}

async function checkResourceExists(baseUrl: string, path: string): Promise<boolean> {
  try {
    const url = new URL(path, baseUrl).href
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'HEAD',
      headers: { 'User-Agent': 'LeadGenerator/1.0 Audit' },
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

function estimateDomainAge(html: string, bodyText: string): number | null {
  const currentYear = new Date().getFullYear()
  const match = bodyText.match(/(?:©|copyright)\s*(\d{4})/i) ?? html.match(/(?:od\s+)?(\d{4})\s*(?:roku|r\.)/i)
  if (match) {
    const year = parseInt(match[1]!, 10)
    if (year > 1990 && year <= currentYear) return Math.max(0, currentYear - year)
  }
  return null
}

function calculateWebsiteScore(checks: Omit<WebsiteAuditResult, 'websiteScore' | 'findings' | 'scoreBreakdown' | 'rawHtml' | 'finalUrl'>): {
  score: number
  findings: string[]
  breakdown: ScoreBreakdownLine[]
} {
  const findings: string[] = []
  const breakdown: ScoreBreakdownLine[] = []
  let score = 0

  const add = (pts: number, pass: boolean, label: string, passMsg: string, failMsg: string) => {
    if (pass) {
      score += pts
      breakdown.push({ label, points: pts })
      findings.push(`✓ ${passMsg}`)
    } else {
      breakdown.push({ label: `${label} (brak)`, points: 0 })
      findings.push(`✗ ${failMsg}`)
    }
  }

  add(8, checks.hasSsl, 'SSL', 'SSL certificate present', 'No SSL certificate')
  add(5, checks.hasHttpsRedirect, 'HTTPS redirect', 'HTTPS redirect configured', 'No HTTPS redirect from HTTP')
  add(8, checks.isMobileFriendly, 'Mobile friendly', 'Mobile-friendly viewport', 'Not mobile-friendly')
  add(7, checks.isResponsive, 'Responsywność', 'Responsive design detected', 'No responsive design')
  add(6, checks.loadTimeMs !== null && checks.loadTimeMs < 3000, 'Szybkość ładowania', `Page load time acceptable (${checks.loadTimeMs}ms)`, `Slow page load (${checks.loadTimeMs}ms)`)
  add(5, checks.hasMetaTitle, 'Meta title', 'Meta title present', 'Missing meta title')
  add(5, checks.hasMetaDescription, 'Meta description', 'Meta description present', 'Missing meta description')
  add(5, checks.hasH1 && !checks.hasMultipleH1, 'H1', 'Single H1 heading', checks.hasMultipleH1 ? 'Multiple H1 tags detected' : 'Missing H1 heading')
  add(3, checks.hasFavicon, 'Favicon', 'Favicon present', 'Missing favicon')
  add(4, checks.hasRobotsTxt, 'robots.txt', 'robots.txt found', 'Missing robots.txt')
  add(4, checks.hasSitemap, 'sitemap.xml', 'sitemap.xml found', 'Missing sitemap.xml')
  add(6, checks.hasContactForm, 'Formularz kontaktowy', 'Contact form present', 'No contact form')
  add(4, checks.hasGoogleMaps, 'Google Maps', 'Google Maps integration', 'No Google Maps')
  add(4, checks.hasPrivacyPolicy, 'Polityka prywatności', 'Privacy policy page', 'Missing privacy policy')
  add(3, checks.hasCookieBanner, 'Cookie banner', 'Cookie consent banner', 'No cookie banner')
  add(5, checks.hasStructuredData, 'Structured data', 'Structured data (JSON-LD)', 'No structured data')
  add(4, !checks.hasMissingHeadings, 'Nagłówki H2/H3', 'Heading hierarchy OK', 'Missing heading structure (H2/H3)')
  add(3, checks.internalLinksCount >= 5, 'Linki wewnętrzne', `Internal linking (${checks.internalLinksCount} links)`, 'Insufficient internal links')

  if (checks.titleLength >= 30 && checks.titleLength <= 60) {
    score += 3
    breakdown.push({ label: 'Długość title (30–60 znaków)', points: 3 })
    findings.push('✓ Title length optimal (30-60 chars)')
  } else if (checks.hasMetaTitle) {
    breakdown.push({ label: 'Długość title (poza zakresem)', points: 0 })
    findings.push(`⚠ Title length suboptimal (${checks.titleLength} chars)`)
  }

  if (checks.descriptionLength >= 120 && checks.descriptionLength <= 160) {
    score += 3
    breakdown.push({ label: 'Długość description (120–160 znaków)', points: 3 })
    findings.push('✓ Description length optimal (120-160 chars)')
  } else if (checks.hasMetaDescription) {
    breakdown.push({ label: 'Długość description (poza zakresem)', points: 0 })
    findings.push(`⚠ Description length suboptimal (${checks.descriptionLength} chars)`)
  }

  return { score: Math.min(100, Math.max(0, score)), findings, breakdown }
}

export async function runWebsiteAudit(url: string): Promise<WebsiteAuditResult> {
  const targetUrl = ensureHttps(url)
  let hostname = ''
  try {
    hostname = new URL(targetUrl).hostname
  } catch {
    hostname = ''
  }

  const [{ html, finalUrl, loadTimeMs }, hasHttpsRedirect, sslValidUntil, hasRobotsTxt, hasSitemap] =
    await Promise.all([
      fetchWithTiming(targetUrl),
      checkHttpsRedirect(targetUrl),
      hostname ? getSslExpiry(hostname) : Promise.resolve(null),
      checkResourceExists(targetUrl, '/robots.txt'),
      checkResourceExists(targetUrl, '/sitemap.xml'),
    ])

  const hasSsl = finalUrl.startsWith('https://')
  const $ = cheerio.load(html)
  const bodyText = $('body').text().toLowerCase()
  const allLinks = $('a[href]').map((_, el) => $(el).attr('href') ?? '').get()

  const metaTitle = $('title').first().text().trim() || null
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    null
  const h1Elements = $('h1')
  const h1Count = h1Elements.length
  const h1Text = h1Elements.first().text().trim() || null

  const viewport = $('meta[name="viewport"]').attr('content') ?? ''
  const hasMediaQueries = html.includes('@media')
  const isMobileFriendly = viewport.includes('width=device-width') || viewport.includes('initial-scale')
  const isResponsive = isMobileFriendly && (hasMediaQueries || html.includes('responsive'))

  const hasContactForm =
    $('form').length > 0 &&
    (bodyText.includes('kontakt') ||
      bodyText.includes('contact') ||
      $('input[type="email"]').length > 0 ||
      $('textarea').length > 0)

  const linksStr = allLinks.join(' ')
  const hasGoogleMaps =
    linksStr.includes('google.com/maps') ||
    linksStr.includes('maps.google') ||
    $('iframe[src*="google.com/maps"]').length > 0

  const hasFavicon =
    $('link[rel="icon"]').length > 0 ||
    $('link[rel="shortcut icon"]').length > 0 ||
    html.includes('favicon.ico')

  const hasPrivacyPolicy =
    linksStr.toLowerCase().includes('polityka') ||
    linksStr.toLowerCase().includes('privacy') ||
    linksStr.toLowerCase().includes('rodo') ||
    bodyText.includes('polityka prywatności')

  const hasCookieBanner =
    bodyText.includes('cookie') ||
    bodyText.includes('ciasteczk') ||
    html.includes('cookie-consent') ||
    html.includes('cookieconsent') ||
    $('[class*="cookie"]').length > 0 ||
    $('[id*="cookie"]').length > 0

  const hasStructuredData = $('script[type="application/ld+json"]').length > 0
  const hasH2 = $('h2').length > 0
  const hasH3 = $('h3').length > 0
  const hasMissingHeadings = Boolean(h1Text) && !hasH2

  let internalLinksCount = 0
  try {
    const base = new URL(finalUrl)
    for (const href of allLinks) {
      try {
        const linkUrl = new URL(href, finalUrl)
        if (linkUrl.hostname === base.hostname) internalLinksCount++
      } catch {
        // skip invalid URLs
      }
    }
  } catch {
    internalLinksCount = 0
  }

  const SOCIAL_PATTERNS: Record<string, RegExp> = {
    facebook: /facebook\.com/i,
    instagram: /instagram\.com/i,
    linkedin: /linkedin\.com/i,
    twitter: /(twitter\.com|x\.com)/i,
    youtube: /youtube\.com/i,
    tiktok: /tiktok\.com/i,
  }
  const socialMedia: Record<string, string> = {}
  for (const [key, pattern] of Object.entries(SOCIAL_PATTERNS)) {
    const link = allLinks.find((l) => pattern.test(l))
    if (link) socialMedia[key] = link
  }

  const hasGoogleTagManager =
    html.includes('googletagmanager.com/gtm.js') || html.includes('GTM-')
  const hasGoogleAnalytics =
    hasGoogleTagManager ||
    html.includes('google-analytics.com') ||
    html.includes('gtag(') ||
    html.includes('G-') ||
    html.includes('UA-')

  const baseChecks = {
    hasSsl,
    sslValidUntil,
    hasHttpsRedirect,
    isMobileFriendly,
    isResponsive,
    loadTimeMs,
    hasMetaTitle: Boolean(metaTitle && metaTitle.length > 3),
    hasMetaDescription: Boolean(metaDescription && metaDescription.length > 10),
    hasH1: Boolean(h1Text && h1Text.length > 1),
    metaTitle,
    metaDescription,
    h1Text,
    h1Count,
    hasFavicon,
    hasRobotsTxt,
    hasSitemap,
    hasContactForm,
    hasGoogleMaps,
    hasPrivacyPolicy,
    hasCookieBanner,
    titleLength: metaTitle?.length ?? 0,
    descriptionLength: metaDescription?.length ?? 0,
    hasMultipleH1: h1Count > 1,
    hasMissingHeadings,
    internalLinksCount,
    hasStructuredData,
    hasGoogleAnalytics,
    hasGoogleTagManager,
    socialMedia,
    hasSocialMedia: Object.keys(socialMedia).length > 0,
    domainAgeYears: estimateDomainAge(html, $('body').text()),
    isTechnologyModern: !OUTDATED_TECH.some((p) => p.test(html)),
    hasSecurityCertificate: hasSsl,
  }

  const { score, findings, breakdown } = calculateWebsiteScore(baseChecks)

  return {
    ...baseChecks,
    rawHtml: html.slice(0, 50000),
    finalUrl,
    websiteScore: score,
    findings,
    scoreBreakdown: breakdown,
  }
}
