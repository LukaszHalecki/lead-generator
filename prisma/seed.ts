import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const AUDIT_SAMPLES = [
  {
    websiteScore: 28,
    emailScore: 35,
    marketingScore: 22,
    hasSpf: false,
    hasDkim: false,
    hasDmarc: false,
    usesFreeEmail: false,
    emails: [
      { address: 'kontakt@poddebem.pl', source: 'homepage:footer', classification: 'PROFESSIONAL' as const },
      { address: 'biuro@poddebem.pl', source: 'contact:mailto', classification: 'PROFESSIONAL' as const },
    ],
  },
  {
    websiteScore: 52,
    emailScore: 55,
    marketingScore: 48,
    hasSpf: true,
    hasDkim: false,
    hasDmarc: false,
    usesFreeEmail: false,
    emails: [
      { address: 'biuro@autoserwis-max.pl', source: 'homepage', classification: 'PROFESSIONAL' as const },
    ],
  },
  {
    websiteScore: 82,
    emailScore: 78,
    marketingScore: 75,
    hasSpf: true,
    hasDkim: true,
    hasDmarc: true,
    usesFreeEmail: false,
    emails: [
      { address: 'info@kancelaria-nowak.pl', source: 'homepage:mailto', classification: 'PROFESSIONAL' as const },
    ],
  },
  {
    websiteScore: 22,
    emailScore: 18,
    marketingScore: 15,
    hasSpf: false,
    hasDkim: false,
    hasDmarc: false,
    usesFreeEmail: true,
    emails: [
      { address: 'kontakt@gmail.com', source: 'homepage:footer', classification: 'GMAIL' as const },
    ],
  },
]

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10)

  const org = await db.organization.upsert({
    where: { slug: 'pixel-app' },
    update: {},
    create: { name: 'Pixel-app', slug: 'pixel-app' },
  })

  const user = await db.user.upsert({
    where: { email: 'demo@pixel-app.pl' },
    update: {},
    create: { email: 'demo@pixel-app.pl', name: 'Demo User', passwordHash },
  })

  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
    update: {},
    create: { organizationId: org.id, userId: user.id, role: 'OWNER' },
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
      latestLeadPriority: 'HOT' as const,
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
      latestLeadPriority: 'WARM' as const,
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
      latestLeadPriority: 'COLD' as const,
      status: 'NEW' as const,
    },
    {
      name: 'Sklep Meblowy Drewno',
      industry: 'Meble',
      city: 'Poznań',
      email: 'kontakt@gmail.com',
      website: 'https://example.edu',
      latestScore: 25,
      latestCategory: 'CRITICAL' as const,
      latestSalesOpportunity: 'HIGH' as const,
      latestLeadPriority: 'HOT' as const,
      status: 'TO_CONTACT' as const,
      latestPricingLanding: 5000,
      latestPricingCompanySite: 9500,
      latestPricingEcommerce: 22000,
    },
  ]

  for (let i = 0; i < sampleCompanies.length; i++) {
    const c = sampleCompanies[i]!
    const audit = AUDIT_SAMPLES[i] ?? AUDIT_SAMPLES[0]!
    const websiteNormalized = c.website
      ?.replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .toLowerCase()

    const company = await db.company.upsert({
      where: {
        organizationId_websiteNormalized: {
          organizationId: org.id,
          websiteNormalized: websiteNormalized ?? `no-website-${c.name}`,
        },
      },
      update: {
        latestWebsiteScore: audit.websiteScore,
        latestEmailScore: audit.emailScore,
        latestMarketingScore: audit.marketingScore,
        hasSpf: audit.hasSpf,
        hasDkim: audit.hasDkim,
        hasDmarc: audit.hasDmarc,
        usesFreeEmail: audit.usesFreeEmail ?? c.email?.includes('gmail.com') ?? false,
      },
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
        latestLeadPriority: c.latestLeadPriority,
        latestPricingLanding: c.latestPricingLanding,
        latestPricingCompanySite: c.latestPricingCompanySite,
        latestPricingEcommerce: c.latestPricingEcommerce,
        latestWebsiteScore: audit.websiteScore,
        latestEmailScore: audit.emailScore,
        latestMarketingScore: audit.marketingScore,
        hasSpf: audit.hasSpf,
        hasDkim: audit.hasDkim,
        hasDmarc: audit.hasDmarc,
        usesFreeEmail: c.email?.includes('gmail.com') ?? false,
        status: c.status,
        source: 'MANUAL',
      },
    })

    const existingAudit = await db.companyAudit.findFirst({
      where: { companyId: company.id },
    })

    if (!existingAudit && c.latestScore) {
      await db.companyAudit.create({
        data: {
          companyId: company.id,
          websiteScore: audit.websiteScore,
          emailScore: audit.emailScore,
          marketingScore: audit.marketingScore,
          leadScore: c.latestScore,
          category: c.latestCategory!,
          overallOpportunity: c.latestSalesOpportunity!,
          opportunityReason: `Website Score ${audit.websiteScore}/100, Email Score ${audit.emailScore}/100, Marketing Score ${audit.marketingScore}/100.`,
          hasSsl: audit.websiteScore > 50,
          isMobileFriendly: audit.websiteScore > 55,
          isResponsive: audit.websiteScore > 50,
          hasMetaTitle: true,
          hasMetaDescription: audit.websiteScore > 40,
          hasH1: true,
          hasContactForm: audit.websiteScore > 35,
          hasGoogleMaps: audit.marketingScore > 30,
          hasPrivacyPolicy: audit.websiteScore > 60,
          problems: ['Brak responsywnego designu', 'Słabe meta tagi SEO'],
          businessImpact: ['Utrata leadów', 'Obniżone zaufanie klientów'],
          recommendations: ['Modernizacja UX', 'Konfiguracja SPF/DKIM/DMARC'],
          expertSummary: 'Firma wymaga poprawy obecności online — dobry kandydat na usługi agencji.',
          pricingLanding: c.latestPricingLanding,
          pricingCompanySite: c.latestPricingCompanySite,
          pricingEcommerce: c.latestPricingEcommerce,
          websiteFindings: ['✗ Brak SSL', '✗ Brak analytics'],
          emailAudit: {
            create: {
              emailScore: audit.emailScore,
              hasMx: true,
              hasSpf: audit.hasSpf,
              hasDkim: audit.hasDkim,
              hasDmarc: audit.hasDmarc,
              usesBusinessDomain: !c.email?.includes('gmail.com'),
              usesFreeEmailOnly: c.email?.includes('gmail.com') ?? false,
              findings: audit.hasSpf ? ['✓ SPF configured'] : ['✗ Missing SPF'],
              emailRecords: {
                create: (audit.emails ?? []).map((e) => ({
                  address: e.address,
                  source: e.source,
                  classification: e.classification,
                })),
              },
              dnsRecords: {
                create: [
                  { domain: 'example.com', recordType: 'MX', value: '10 mail.example.com', isValid: true },
                  { domain: 'example.com', recordType: 'SPF', value: audit.hasSpf ? 'v=spf1 include:_spf.google.com ~all' : null, isValid: audit.hasSpf },
                  { domain: 'example.com', recordType: 'DKIM', value: audit.hasDkim ? 'v=DKIM1; p=...' : null, isValid: audit.hasDkim },
                  { domain: 'example.com', recordType: 'DMARC', value: audit.hasDmarc ? 'v=DMARC1; p=reject' : null, isValid: audit.hasDmarc },
                ],
              },
            },
          },
          marketingAudit: {
            create: {
              marketingScore: audit.marketingScore,
              hasGoogleAnalytics: audit.marketingScore > 40,
              hasGa4: audit.marketingScore > 50,
              hasGoogleTagManager: audit.marketingScore > 45,
              hasMetaPixel: false,
              hasLinkedInInsight: false,
              socialLinks: audit.marketingScore > 40 ? { facebook: 'https://facebook.com/example' } : {},
              hasGoogleMaps: audit.marketingScore > 30,
              hasAddress: true,
              hasPhone: true,
              findings: audit.marketingScore > 50 ? ['✓ Analytics detected'] : ['✗ No analytics tracking'],
            },
          },
        },
      })

      await db.companyAnalysis.create({
        data: {
          companyId: company.id,
          score: c.latestScore,
          category: c.latestCategory!,
          problems: ['Brak responsywnego designu'],
          businessImpact: ['Utrata klientów mobilnych'],
          recommendations: ['Modernizacja układu strony'],
          expertSummary: 'Strona wymaga odświeżenia.',
          salesOpportunity: c.latestSalesOpportunity,
          salesOpportunityReason: 'Potencjał na modernizację.',
          pricingLanding: c.latestPricingLanding,
          pricingCompanySite: c.latestPricingCompanySite,
          pricingEcommerce: c.latestPricingEcommerce,
          hasSsl: audit.websiteScore > 50,
          isMobileFriendly: audit.websiteScore > 60,
          hasContactForm: true,
          hasMetaTitle: true,
          hasH1: true,
        },
      })
    }
  }

  console.log('Seed completed:', { org: org.name, user: user.email, campaign: campaign.name })
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
