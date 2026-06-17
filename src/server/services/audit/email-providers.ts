import type { EmailProviderType } from '@prisma/client'
import { isFreeProvider as isFree } from '@/lib/email-providers'

const FREE_PROVIDER_MAP: Record<string, EmailProviderType> = {
  'gmail.com': 'GMAIL',
  'googlemail.com': 'GMAIL',
  'outlook.com': 'OUTLOOK',
  'hotmail.com': 'OUTLOOK',
  'live.com': 'OUTLOOK',
  'yahoo.com': 'YAHOO',
  'yahoo.pl': 'YAHOO',
  'wp.pl': 'WP_PL',
  'onet.pl': 'ONET',
  'interia.pl': 'INTERIA',
  'o2.pl': 'O2',
  'poczta.onet.pl': 'ONET',
  'op.pl': 'O2',
  'tlen.pl': 'O2',
  'gazeta.pl': 'OTHER_FREE',
  'protonmail.com': 'OTHER_FREE',
  'icloud.com': 'OTHER_FREE',
}

export function classifyEmailProvider(email: string, websiteDomain?: string | null): EmailProviderType {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return 'UNKNOWN'

  if (websiteDomain) {
    const normalizedSite = websiteDomain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      ?.toLowerCase()
    if (normalizedSite && (domain === normalizedSite || domain.endsWith(`.${normalizedSite}`))) {
      return 'PROFESSIONAL'
    }
  }

  return FREE_PROVIDER_MAP[domain] ?? 'OTHER_FREE'
}

export function isFreeProvider(type: EmailProviderType): boolean {
  return isFree(type)
}
