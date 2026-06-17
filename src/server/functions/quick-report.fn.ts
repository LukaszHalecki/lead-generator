import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '@/server/db'
import { getOrgContext } from '@/server/middleware/context'
import { runQuickAudit, toClientQuickAuditResult } from '@/server/services/audit/quick-audit.service'

const quickReportSchema = z
  .object({
    website: z.string().trim().optional(),
    email: z
      .string()
      .trim()
      .optional()
      .refine((val) => !val || z.email().safeParse(val).success, {
        message: 'Nieprawidłowy adres email',
      }),
  })
  .refine((data) => Boolean(data.website?.trim() || data.email?.trim()), {
    message: 'Podaj adres strony WWW lub email',
  })
  .refine(
    (data) => {
      if (!data.website?.trim()) return true
      try {
        const url = data.website.startsWith('http') ? data.website : `https://${data.website}`
        new URL(url)
        return true
      } catch {
        return false
      }
    },
    { message: 'Nieprawidłowy adres strony WWW', path: ['website'] },
  )

export const runQuickReportFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => quickReportSchema.parse(data))
  .handler(async ({ data }) => {
    const { organizationId, userId } = await getOrgContext()

    const result = await runQuickAudit({
      website: data.website?.trim() || undefined,
      email: data.email?.trim() || undefined,
    })

    try {
      await db.activityLog.create({
        data: {
          organizationId,
          userId,
          type: 'AUDIT_COMPLETED',
          title: 'Szybki raport',
          description:
            result.mode === 'website'
              ? `WWW: ${result.website} — Website ${result.websiteScore}/100, Email ${result.emailScore}/100, Marketing ${result.marketingScore}/100`
              : `Email: ${result.email} — Email Score ${result.emailScore}/100`,
          metadata: {
            quickReport: true,
            mode: result.mode,
            website: result.website,
            email: result.email,
            websiteScore: result.websiteScore,
            emailScore: result.emailScore,
            marketingScore: result.marketingScore,
          },
        },
      })
    } catch {
      // Log failure must not block quick report results
    }

    return toClientQuickAuditResult(result)
  })
