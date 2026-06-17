import * as cheerio from 'cheerio'
import { ensureHttps } from '@/lib/url'
import { classifyEmailProvider } from './email-providers'
import type { EmailProviderType } from '@prisma/client'

export interface DiscoveredEmail {
  address: string
  source: string
  classification: EmailProviderType
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

function extractEmailsFromText(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) ?? []
  return [...new Set(matches.map((e) => e.toLowerCase()))]
}

function isValidEmail(email: string): boolean {
  if (email.includes('..')) return false
  if (email.endsWith('.png') || email.endsWith('.jpg') || email.endsWith('.gif')) return false
  if (email.includes('example.com') || email.includes('sentry.io')) return false
  const parts = email.split('@')
  if (parts.length !== 2) return false
  const [local, domain] = parts
  if (!local || !domain || domain.split('.').length < 2) return false
  return true
}

async function fetchPage(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LeadGenerator/1.0 Audit' },
      redirect: 'follow',
    })
    clearTimeout(timeout)
    if (!response.ok) return ''
    return await response.text()
  } catch {
    return ''
  }
}

function findContactPageUrl(baseUrl: string, html: string, $: cheerio.CheerioAPI): string | null {
  const contactPatterns = [/kontakt/i, /contact/i, /napisz/i, /o-nas/i]
  for (const el of $('a[href]').toArray()) {
    const href = $(el).attr('href') ?? ''
    const text = $(el).text().toLowerCase()
    if (contactPatterns.some((p) => p.test(href) || p.test(text))) {
      try {
        return new URL(href, baseUrl).href
      } catch {
        continue
      }
    }
  }
  return null
}

export async function discoverEmails(
  websiteUrl: string,
): Promise<{ emails: DiscoveredEmail[]; websiteDomain: string | null }> {
  const targetUrl = ensureHttps(websiteUrl)
  let websiteDomain: string | null = null
  try {
    websiteDomain = new URL(targetUrl).hostname.replace(/^www\./, '')
  } catch {
    websiteDomain = null
  }

  const homepageHtml = await fetchPage(targetUrl)
  const $ = cheerio.load(homepageHtml)
  const contactUrl = findContactPageUrl(targetUrl, homepageHtml, $)
  const contactHtml = contactUrl ? await fetchPage(contactUrl) : ''

  const found = new Map<string, DiscoveredEmail>()

  function addEmails(html: string, source: string) {
    const $page = cheerio.load(html)

    // mailto links
    $page('a[href^="mailto:"]').each((_, el) => {
      const href = $page(el).attr('href') ?? ''
      const email = href.replace(/^mailto:/i, '').split('?')[0]?.trim().toLowerCase()
      if (email && isValidEmail(email)) {
        found.set(email, {
          address: email,
          source: `${source}:mailto`,
          classification: classifyEmailProvider(email, websiteDomain),
        })
      }
    })

    // JSON-LD structured data
    $page('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($page(el).html() ?? '{}')
        const jsonStr = JSON.stringify(json)
        for (const email of extractEmailsFromText(jsonStr)) {
          if (isValidEmail(email)) {
            found.set(email, {
              address: email,
              source: `${source}:structured_data`,
              classification: classifyEmailProvider(email, websiteDomain),
            })
          }
        }
      } catch {
        // ignore invalid JSON-LD
      }
    })

    // Footer
    const footerText = $page('footer').text()
    for (const email of extractEmailsFromText(footerText)) {
      if (isValidEmail(email)) {
        found.set(email, {
          address: email,
          source: `${source}:footer`,
          classification: classifyEmailProvider(email, websiteDomain),
        })
      }
    }

    // Full page text
    for (const email of extractEmailsFromText($page('body').text())) {
      if (isValidEmail(email)) {
        if (!found.has(email)) {
          found.set(email, {
            address: email,
            source,
            classification: classifyEmailProvider(email, websiteDomain),
          })
        }
      }
    }
  }

  addEmails(homepageHtml, 'homepage')
  if (contactHtml) addEmails(contactHtml, 'contact')

  return { emails: Array.from(found.values()), websiteDomain }
}
