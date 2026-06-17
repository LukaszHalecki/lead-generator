import type { EmailProviderType } from '@prisma/client'

export function providerLabel(type: EmailProviderType): string {
  const labels: Record<EmailProviderType, string> = {
    PROFESSIONAL: 'Professional Business Email',
    GMAIL: 'Gmail (Free Provider)',
    OUTLOOK: 'Outlook (Free Provider)',
    YAHOO: 'Yahoo (Free Provider)',
    WP_PL: 'WP.pl (Free Provider)',
    ONET: 'Onet (Free Provider)',
    INTERIA: 'Interia (Free Provider)',
    O2: 'O2 (Free Provider)',
    OTHER_FREE: 'Free Email Provider',
    UNKNOWN: 'Unknown',
  }
  return labels[type]
}

export function isFreeProvider(type: EmailProviderType): boolean {
  return type !== 'PROFESSIONAL' && type !== 'UNKNOWN'
}
