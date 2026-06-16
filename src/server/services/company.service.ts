import { db } from '@/server/db'
import { normalizeCompanyInput, type CompanyFormValues } from '@/lib/validators/company.schema'

export async function assertNoDuplicateCompany(
  organizationId: string,
  websiteNormalized: string | null,
  emailNormalized: string | null,
  excludeId?: string,
) {
  if (websiteNormalized) {
    const byWebsite = await db.company.findFirst({
      where: {
        organizationId,
        websiteNormalized,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })
    if (byWebsite) throw new Error('Firma z tą stroną WWW już istnieje w bazie')
  }

  if (emailNormalized) {
    const byEmail = await db.company.findFirst({
      where: {
        organizationId,
        emailNormalized,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })
    if (byEmail) throw new Error('Firma z tym adresem email już istnieje w bazie')
  }
}

export async function createCompanyRecord(
  organizationId: string,
  userId: string,
  data: CompanyFormValues,
) {
  const normalized = normalizeCompanyInput(data)
  await assertNoDuplicateCompany(
    organizationId,
    normalized.websiteNormalized,
    normalized.emailNormalized,
  )

  const company = await db.company.create({
    data: {
      organizationId,
      name: normalized.name,
      website: normalized.website,
      email: normalized.email,
      phone: normalized.phone,
      industry: normalized.industry,
      city: normalized.city,
      country: normalized.country,
      websiteNormalized: normalized.websiteNormalized,
      emailNormalized: normalized.emailNormalized,
      source: 'MANUAL',
    },
  })

  if (data.notes?.trim()) {
    await db.note.create({
      data: {
        organizationId,
        companyId: company.id,
        authorId: userId,
        content: data.notes.trim(),
      },
    })
  }

  await db.activityLog.create({
    data: {
      organizationId,
      companyId: company.id,
      userId,
      type: 'COMPANY_CREATED',
      title: 'Dodano firmę ręcznie',
      description: normalized.name,
    },
  })

  return company
}

export async function updateCompanyRecord(
  organizationId: string,
  userId: string,
  companyId: string,
  data: CompanyFormValues,
) {
  const existing = await db.company.findFirst({
    where: { id: companyId, organizationId },
  })
  if (!existing) throw new Error('Firma nie znaleziona')

  const normalized = normalizeCompanyInput(data)
  await assertNoDuplicateCompany(
    organizationId,
    normalized.websiteNormalized,
    normalized.emailNormalized,
    companyId,
  )

  const company = await db.company.update({
    where: { id: companyId },
    data: {
      name: normalized.name,
      website: normalized.website,
      email: normalized.email,
      phone: normalized.phone,
      industry: normalized.industry,
      city: normalized.city,
      country: normalized.country,
      websiteNormalized: normalized.websiteNormalized,
      emailNormalized: normalized.emailNormalized,
    },
  })

  await db.activityLog.create({
    data: {
      organizationId,
      companyId,
      userId,
      type: 'COMPANY_UPDATED',
      title: 'Zaktualizowano dane firmy',
      description: normalized.name,
    },
  })

  return company
}

export async function deleteCompanyRecord(
  organizationId: string,
  userId: string,
  companyId: string,
) {
  const existing = await db.company.findFirst({
    where: { id: companyId, organizationId },
  })
  if (!existing) throw new Error('Firma nie znaleziona')

  await db.company.delete({ where: { id: companyId } })

  await db.activityLog.create({
    data: {
      organizationId,
      userId,
      type: 'COMPANY_DELETED',
      title: 'Usunięto firmę',
      description: existing.name,
      metadata: { companyId },
    },
  })
}
