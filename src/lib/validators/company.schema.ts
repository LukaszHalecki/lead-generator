import { z } from 'zod'
import { normalizeEmail, normalizeUrl } from '@/lib/url'

const optionalString = z.string().trim().optional().or(z.literal(''))

export const companyFormSchema = z.object({
  name: z.string().trim().min(1, 'Nazwa firmy jest wymagana'),
  website: optionalString.refine(
    (val) => {
      if (!val) return true
      try {
        const url = val.startsWith('http') ? val : `https://${val}`
        new URL(url)
        return true
      } catch {
        return false
      }
    },
    { message: 'Nieprawidłowy adres strony WWW' },
  ),
  email: optionalString.refine(
    (val) => !val || z.string().email().safeParse(val).success,
    { message: 'Nieprawidłowy adres email' },
  ),
  phone: optionalString,
  industry: optionalString,
  city: optionalString,
  country: optionalString,
  notes: optionalString,
})

export type CompanyFormValues = z.infer<typeof companyFormSchema>

export const companyUpdateSchema = companyFormSchema

export const bulkIdsSchema = z.object({
  companyIds: z.array(z.string()).min(1, 'Wybierz co najmniej jedną firmę'),
})

export const bulkCampaignSchema = bulkIdsSchema.extend({
  campaignId: z.string().min(1, 'Wybierz kampanię'),
})

export function emptyCompanyForm(): CompanyFormValues {
  return {
    name: '',
    website: '',
    email: '',
    phone: '',
    industry: '',
    city: '',
    country: '',
    notes: '',
  }
}

export function toCompanyFormValues(company: {
  name: string
  website: string | null
  email: string | null
  phone: string | null
  industry: string | null
  city: string | null
  country?: string | null
}): CompanyFormValues {
  return {
    name: company.name,
    website: company.website ?? '',
    email: company.email ?? '',
    phone: company.phone ?? '',
    industry: company.industry ?? '',
    city: company.city ?? '',
    country: company.country ?? '',
    notes: '',
  }
}

export function normalizeCompanyInput(data: CompanyFormValues) {
  const website = data.website?.trim() || null
  const email = data.email?.trim() || null

  return {
    name: data.name.trim(),
    website: website ? (website.startsWith('http') ? website : `https://${website}`) : null,
    email,
    phone: data.phone?.trim() || null,
    industry: data.industry?.trim() || null,
    city: data.city?.trim() || null,
    country: data.country?.trim() || null,
    websiteNormalized: normalizeUrl(website),
    emailNormalized: normalizeEmail(email),
  }
}
