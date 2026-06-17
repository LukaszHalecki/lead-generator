export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message

  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>

    if (typeof obj.message === 'string' && obj.message) return obj.message

    if (Array.isArray(obj.issues)) {
      const first = obj.issues[0] as { message?: string } | undefined
      if (first?.message) return first.message
    }

    if (obj.data && typeof obj.data === 'object') {
      const data = obj.data as Record<string, unknown>
      if (typeof data.message === 'string') return data.message
    }
  }

  return 'Nie udało się wykonać audytu. Sprawdź adres i spróbuj ponownie.'
}
