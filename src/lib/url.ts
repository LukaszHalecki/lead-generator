export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    return parsed.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return url.trim().toLowerCase().replace(/^www\./, '')
  }
}

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email?.trim()) return null
  return email.trim().toLowerCase()
}

export function ensureHttps(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}
