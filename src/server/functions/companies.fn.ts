import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '@/server/db'
import { getOrgContext } from '@/server/middleware/context'
import { runCompanyAnalysis } from '@/server/services/analysis/analysis.service'
import { importCsvCompanies, fetchOutscraperCompanies } from '@/server/services/import.service'
import { generateCompanyMessage } from '@/server/services/message-generator.service'
import { addCompanyToCampaign } from '@/server/integrations/instantly/client'

const listSchema = z.object({
  status: z.string().optional(),
  scoreMin: z.number().optional(),
  scoreMax: z.number().optional(),
  salesOpportunity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  leadPriority: z.enum(['HOT', 'WARM', 'COLD']).optional(),
  sortBy: z.enum(['name', 'score', 'createdAt', 'status']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
})

export const listCompaniesFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => listSchema.parse(data ?? {}))
  .handler(async ({ data }) => {
    const { organizationId } = await getOrgContext()

    const where = {
      organizationId,
      ...(data.status ? { status: data.status as never } : {}),
      ...(data.salesOpportunity ? { latestSalesOpportunity: data.salesOpportunity } : {}),
      ...(data.leadPriority ? { latestLeadPriority: data.leadPriority } : {}),
      ...(data.scoreMin !== undefined || data.scoreMax !== undefined
        ? {
            latestScore: {
              ...(data.scoreMin !== undefined ? { gte: data.scoreMin } : {}),
              ...(data.scoreMax !== undefined ? { lte: data.scoreMax } : {}),
            },
          }
        : {}),
      ...(data.search
        ? {
            OR: [
              { name: { contains: data.search, mode: 'insensitive' as const } },
              { city: { contains: data.search, mode: 'insensitive' as const } },
              { email: { contains: data.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const orderBy =
      data.sortBy === 'score'
        ? { latestScore: data.sortDir ?? 'asc' }
        : data.sortBy === 'status'
          ? { status: data.sortDir ?? 'asc' }
          : data.sortBy === 'createdAt'
            ? { createdAt: data.sortDir ?? 'desc' }
            : { name: data.sortDir ?? 'asc' }

    return db.company.findMany({
      where,
      orderBy,
      include: {
        analyses: { orderBy: { analyzedAt: 'desc' }, take: 1 },
      },
    })
  })

export const getCompanyFn = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: companyId }) => {
    const { organizationId } = await getOrgContext()

    const company = await db.company.findFirst({
      where: { id: companyId, organizationId },
      include: {
        analyses: { orderBy: { analyzedAt: 'desc' } },
        messages: { orderBy: { createdAt: 'desc' } },
        replies: { orderBy: { receivedAt: 'desc' } },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { name: true, email: true } } },
        },
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        campaignLeads: { include: { campaign: true } },
      },
    })

    if (!company) throw new Error('Firma nie znaleziona')
    return company
  })

export const analyzeCompanyFn = createServerFn({ method: 'POST' })
  .validator((id: string) => id)
  .handler(async ({ data: companyId }) => {
    const { organizationId, userId } = await getOrgContext()
    return runCompanyAnalysis(companyId, organizationId, userId)
  })

export const generateMessageFn = createServerFn({ method: 'POST' })
  .validator((id: string) => id)
  .handler(async ({ data: companyId }) => {
    const { organizationId, userId } = await getOrgContext()
    return generateCompanyMessage(companyId, organizationId, userId)
  })

export const addToCampaignFn = createServerFn({ method: 'POST' })
  .validator((data: { companyId: string; campaignId: string; messageId: string }) => data)
  .handler(async ({ data }) => {
    const { organizationId, userId } = await getOrgContext()
    return addCompanyToCampaign(
      organizationId,
      userId,
      data.companyId,
      data.campaignId,
      data.messageId,
    )
  })

export const updateCompanyStatusFn = createServerFn({ method: 'POST' })
  .validator((data: { companyId: string; status: string }) => data)
  .handler(async ({ data }) => {
    const { organizationId, userId } = await getOrgContext()
    const company = await db.company.update({
      where: { id: data.companyId, organizationId },
      data: { status: data.status as never },
    })
    await db.activityLog.create({
      data: {
        organizationId,
        companyId: data.companyId,
        userId,
        type: 'STATUS_CHANGED',
        title: 'Zmieniono status',
        metadata: { status: data.status },
      },
    })
    return company
  })

export const importCsvFn = createServerFn({ method: 'POST' })
  .validator((data: { content: string; fileName: string }) => data)
  .handler(async ({ data }) => {
    const { organizationId, userId } = await getOrgContext()
    return importCsvCompanies(organizationId, userId, data.content, data.fileName)
  })

export const fetchOutscraperFn = createServerFn({ method: 'POST' })
  .validator(
    (data: { industry: string; country: string; limit: number }) => data,
  )
  .handler(async ({ data }) => {
    const { organizationId, userId } = await getOrgContext()
    return fetchOutscraperCompanies(organizationId, userId, data)
  })

export const addNoteFn = createServerFn({ method: 'POST' })
  .validator((data: { companyId: string; content: string }) => data)
  .handler(async ({ data }) => {
    const { organizationId, userId } = await getOrgContext()
    const note = await db.note.create({
      data: {
        organizationId,
        companyId: data.companyId,
        authorId: userId,
        content: data.content,
      },
    })
    await db.activityLog.create({
      data: {
        organizationId,
        companyId: data.companyId,
        userId,
        type: 'NOTE_ADDED',
        title: 'Dodano notatkę',
        description: data.content.slice(0, 200),
      },
    })
    return note
  })

export const listCampaignsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { organizationId } = await getOrgContext()
  return db.campaign.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { leads: true } } },
  })
})

export const createCampaignFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      name: string
      scoreThreshold?: number
      requireEmail?: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    const { organizationId, userId } = await getOrgContext()
    const campaign = await db.campaign.create({
      data: {
        organizationId,
        name: data.name,
        scoreThreshold: data.scoreThreshold,
        requireEmail: data.requireEmail ?? true,
      },
    })
    await db.activityLog.create({
      data: {
        organizationId,
        userId,
        type: 'CAMPAIGN_CREATED',
        title: 'Utworzono kampanię',
        description: data.name,
        metadata: { campaignId: campaign.id },
      },
    })
    return campaign
  })

export const runWorkflowFn = createServerFn({ method: 'POST' })
  .validator(
    (data: { companyId: string; campaignId?: string }) => data,
  )
  .handler(async ({ data }) => {
    const { organizationId, userId } = await getOrgContext()

    const analysis = await runCompanyAnalysis(data.companyId, organizationId, userId)
    const message = await generateCompanyMessage(data.companyId, organizationId, userId)

    let campaignResult = null
    if (data.campaignId) {
      campaignResult = await addCompanyToCampaign(
        organizationId,
        userId,
        data.companyId,
        data.campaignId,
        message.id,
      )
    }

    return { analysis, message, campaignResult }
  })
