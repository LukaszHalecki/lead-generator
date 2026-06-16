import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/server/db'
import { syncInstantlyEngagement } from '@/server/integrations/instantly/client'

export const Route = createFileRoute('/api/webhooks/instantly')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          event?: string
          email_id?: string
          lead_email?: string
          campaign_id?: string
        }

        const eventMap: Record<string, 'delivered' | 'opened' | 'clicked' | 'replied'> = {
          email_delivered: 'delivered',
          email_opened: 'opened',
          email_clicked: 'clicked',
          reply_received: 'replied',
        }

        const event = body.event ? eventMap[body.event] : undefined
        if (!event || !body.lead_email) {
          return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const company = await db.company.findFirst({
          where: { email: body.lead_email },
          include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } },
        })

        if (company) {
          await syncInstantlyEngagement(
            company.organizationId,
            company.id,
            event,
            company.messages[0]?.id,
          )

          if (body.campaign_id) {
            const field =
              event === 'delivered'
                ? 'deliveredCount'
                : event === 'opened'
                  ? 'openCount'
                  : event === 'clicked'
                    ? 'clickCount'
                    : 'replyCount'
            await db.campaign.updateMany({
              where: { instantlyCampaignId: body.campaign_id },
              data: { [field]: { increment: 1 } },
            })
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
