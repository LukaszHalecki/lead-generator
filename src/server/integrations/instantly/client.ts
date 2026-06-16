import { db } from '@/server/db'

export interface InstantlyLeadPayload {
  email: string
  first_name?: string
  company_name?: string
  custom_variables?: Record<string, string>
}

export class InstantlyClient {
  constructor(private apiKey?: string) {}

  private get key() {
    return this.apiKey ?? process.env.INSTANTLY_API_KEY
  }

  async createCampaign(name: string): Promise<string | null> {
    if (!this.key) return `mock-campaign-${Date.now()}`
    try {
      const res = await fetch('https://api.instantly.ai/api/v1/campaign/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: this.key, campaign_name: name }),
      })
      const data = (await res.json()) as { campaign_id?: string }
      return data.campaign_id ?? null
    } catch {
      return `mock-campaign-${Date.now()}`
    }
  }

  async addLead(campaignId: string, lead: InstantlyLeadPayload): Promise<string | null> {
    if (!this.key) return `mock-lead-${Date.now()}`
    try {
      const res = await fetch('https://api.instantly.ai/api/v1/lead/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.key,
          campaign_id: campaignId,
          ...lead,
        }),
      })
      const data = (await res.json()) as { lead_id?: string }
      return data.lead_id ?? null
    } catch {
      return `mock-lead-${Date.now()}`
    }
  }

  async getCampaignAnalytics(campaignId: string) {
    if (!this.key) {
      return { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0 }
    }
    try {
      const res = await fetch(
        `https://api.instantly.ai/api/v1/analytics/campaign/summary?api_key=${this.key}&campaign_id=${campaignId}`,
      )
      return (await res.json()) as {
        sent?: number
        delivered?: number
        opened?: number
        clicked?: number
        replied?: number
      }
    } catch {
      return { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0 }
    }
  }
}

export async function syncInstantlyEngagement(
  organizationId: string,
  companyId: string,
  event: 'delivered' | 'opened' | 'clicked' | 'replied',
  messageId?: string,
) {
  const fieldMap = {
    delivered: 'emailDeliveredCount',
    opened: 'emailOpenedCount',
    clicked: 'emailClickedCount',
    replied: 'emailRepliedCount',
  } as const

  const activityMap = {
    delivered: 'EMAIL_DELIVERED',
    opened: 'EMAIL_OPENED',
    clicked: 'EMAIL_CLICKED',
    replied: 'REPLY_RECEIVED',
  } as const

  const now = new Date()

  if (messageId) {
    const updateData: Record<string, Date> = {}
    if (event === 'delivered') updateData.deliveredAt = now
    if (event === 'opened') updateData.openedAt = now
    if (event === 'clicked') updateData.clickedAt = now

    await db.message.update({
      where: { id: messageId },
      data: updateData,
    })
  }

  await db.company.update({
    where: { id: companyId },
    data: { [fieldMap[event]]: { increment: 1 } },
  })

  if (event === 'replied') {
    await db.company.update({
      where: { id: companyId },
      data: { status: 'REPLIED' },
    })
  }

  await db.activityLog.create({
    data: {
      organizationId,
      companyId,
      type: activityMap[event],
      title: `Email: ${event}`,
      description: `Zdarzenie Instantly: ${event}`,
      metadata: { messageId, event },
    },
  })
}

export async function addCompanyToCampaign(
  organizationId: string,
  userId: string,
  companyId: string,
  campaignId: string,
  messageId: string,
) {
  const [company, campaign, message] = await Promise.all([
    db.company.findFirst({ where: { id: companyId, organizationId } }),
    db.campaign.findFirst({ where: { id: campaignId, organizationId } }),
    db.message.findFirst({ where: { id: messageId, companyId } }),
  ])

  if (!company || !campaign || !message) {
    throw new Error('Brak danych kampanii lub wiadomości')
  }
  if (!company.email) throw new Error('Firma nie posiada adresu email')

  const client = new InstantlyClient()
  let instantlyCampaignId = campaign.instantlyCampaignId

  if (!instantlyCampaignId) {
    instantlyCampaignId = await client.createCampaign(campaign.name)
    if (instantlyCampaignId) {
      await db.campaign.update({
        where: { id: campaignId },
        data: { instantlyCampaignId, status: 'ACTIVE' },
      })
    }
  }

  const leadId = instantlyCampaignId
    ? await client.addLead(instantlyCampaignId, {
        email: company.email,
        first_name: company.name.split(' ')[0],
        company_name: company.name,
        custom_variables: { subject: message.subject, body: message.body },
      })
    : null

  await db.campaignLead.upsert({
    where: { campaignId_companyId: { campaignId, companyId } },
    create: {
      campaignId,
      companyId,
      status: 'ADDED',
      instantlyLeadId: leadId,
    },
    update: { status: 'ADDED', instantlyLeadId: leadId },
  })

  await db.message.update({
    where: { id: messageId },
    data: { campaignId, sentAt: new Date() },
  })

  await db.company.update({
    where: { id: companyId },
    data: { status: 'SENT' },
  })

  await db.campaign.update({
    where: { id: campaignId },
    data: { leadsCount: { increment: 1 }, sentCount: { increment: 1 } },
  })

  await db.activityLog.createMany({
    data: [
      {
        organizationId,
        companyId,
        userId,
        type: 'LEAD_ADDED',
        title: 'Dodano do kampanii Instantly',
        metadata: { campaignId, leadId },
      },
      {
        organizationId,
        companyId,
        userId,
        type: 'MESSAGE_SENT',
        title: 'Wysłano wiadomość',
        description: message.subject,
        metadata: { messageId, campaignId },
      },
    ],
  })

  return { leadId, campaignId }
}
