import { db } from '@/server/db'

const DEFAULT_ORG_SLUG = 'pixel-app'

export async function getOrgContext(): Promise<{
  organizationId: string
  userId: string
  organizationName: string
}> {
  const org = await db.organization.findFirst({
    where: { slug: DEFAULT_ORG_SLUG },
    include: {
      members: {
        include: { user: true },
        take: 1,
      },
    },
  })

  if (!org || !org.members[0]) {
    throw new Error('Brak skonfigurowanej organizacji. Uruchom: pnpm db:seed')
  }

  return {
    organizationId: org.id,
    userId: org.members[0].userId,
    organizationName: org.name,
  }
}
