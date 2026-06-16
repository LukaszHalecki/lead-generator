import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10)

  const org = await db.organization.upsert({
    where: { slug: 'pixel-app' },
    update: {},
    create: {
      name: 'Pixel-app',
      slug: 'pixel-app',
    },
  })

  const user = await db.user.upsert({
    where: { email: 'demo@pixel-app.pl' },
    update: {},
    create: {
      email: 'demo@pixel-app.pl',
      name: 'Demo User',
      passwordHash,
    },
  })

  await db.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: user.id },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: 'OWNER',
    },
  })

  const campaign = await db.campaign.upsert({
    where: { id: 'seed-campaign-1' },
    update: {},
    create: {
      id: 'seed-campaign-1',
      organizationId: org.id,
      name: 'Kampania Q2 — strony poniżej 70 pkt',
      scoreThreshold: 70,
      status: 'DRAFT',
    },
  })

  const sampleCompanies = [
    {
      name: 'Restauracja Pod Dębem',
      industry: 'Gastronomia',
      city: 'Kraków',
      email: 'kontakt@poddebem.pl',
      phone: '+48 12 345 67 89',
      website: 'https://example.com',
      latestScore: 32,
      latestCategory: 'POOR' as const,
      latestSalesOpportunity: 'HIGH' as const,
      status: 'TO_CONTACT' as const,
      latestPricingLanding: 4500,
      latestPricingCompanySite: 8500,
      latestPricingEcommerce: 18000,
    },
    {
      name: 'AutoSerwis Max',
      industry: 'Motoryzacja',
      city: 'Warszawa',
      email: 'biuro@autoserwis-max.pl',
      phone: '+48 22 111 22 33',
      website: 'https://example.org',
      latestScore: 58,
      latestCategory: 'AVERAGE' as const,
      latestSalesOpportunity: 'MEDIUM' as const,
      status: 'ANALYZED' as const,
      latestPricingLanding: 3800,
      latestPricingCompanySite: 7200,
      latestPricingEcommerce: 15000,
    },
    {
      name: 'Kancelaria Prawna Nowak',
      industry: 'Prawo',
      city: 'Gdańsk',
      email: 'info@kancelaria-nowak.pl',
      website: 'https://example.net',
      latestScore: 78,
      latestCategory: 'GOOD' as const,
      latestSalesOpportunity: 'LOW' as const,
      status: 'NEW' as const,
    },
  ]

  for (const c of sampleCompanies) {
    const websiteNormalized = c.website
      ?.replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .toLowerCase()

    await db.company.upsert({
      where: {
        organizationId_websiteNormalized: {
          organizationId: org.id,
          websiteNormalized: websiteNormalized ?? `no-website-${c.name}`,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        name: c.name,
        industry: c.industry,
        city: c.city,
        email: c.email,
        phone: c.phone,
        website: c.website,
        websiteNormalized: websiteNormalized ?? `no-website-${c.name}`,
        emailNormalized: c.email?.toLowerCase(),
        latestScore: c.latestScore,
        latestCategory: c.latestCategory,
        latestSalesOpportunity: c.latestSalesOpportunity,
        latestPricingLanding: c.latestPricingLanding,
        latestPricingCompanySite: c.latestPricingCompanySite,
        latestPricingEcommerce: c.latestPricingEcommerce,
        status: c.status,
        source: 'MANUAL',
        analyses: c.latestScore
          ? {
              create: {
                score: c.latestScore,
                category: c.latestCategory!,
                problems: [
                  'Brak responsywnego designu',
                  'Słabe meta tagi SEO',
                  'Brak wyraźnych CTA',
                ],
                businessImpact: [
                  'Utrata klientów mobilnych',
                  'Niska konwersja z wyszukiwarek',
                  'Słaba widoczność online',
                ],
                recommendations: [
                  'Modernizacja układu strony',
                  'Optymalizacja SEO',
                  'Dodanie formularza kontaktowego',
                ],
                expertSummary:
                  'Strona wymaga odświeżenia — widoczne braki techniczne i UX sugerują potencjał na projekt.',
                salesOpportunity: c.latestSalesOpportunity,
                salesOpportunityReason:
                  'Firma posiada aktywną obecność online z przestarzałą stroną — dobry moment na ofertę modernizacji.',
                pricingLanding: c.latestPricingLanding,
                pricingCompanySite: c.latestPricingCompanySite,
                pricingEcommerce: c.latestPricingEcommerce,
                hasSsl: c.latestScore > 50,
                isMobileFriendly: c.latestScore > 60,
                isResponsive: c.latestScore > 55,
                hasContactForm: c.latestScore > 40,
                hasGoogleMaps: true,
                hasGoogleAnalytics: c.latestScore > 45,
                hasMetaTitle: c.latestScore > 50,
                hasMetaDescription: c.latestScore > 45,
                hasH1: true,
              },
            }
          : undefined,
      },
    })
  }

  console.log('Seed completed:', { org: org.name, user: user.email, campaign: campaign.name })
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
