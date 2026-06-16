import { db } from '@/server/db'
import { normalizeEmail, normalizeUrl } from '@/lib/url'
import Papa from 'papaparse'

interface CsvRow {
  name?: string
  title?: string
  industry?: string
  category?: string
  city?: string
  email?: string
  phone?: string
  website?: string
  site?: string
}

export async function importCsvCompanies(
  organizationId: string,
  userId: string,
  csvContent: string,
  fileName: string,
) {
  const job = await db.importJob.create({
    data: {
      organizationId,
      type: 'CSV',
      status: 'PROCESSING',
      fileName,
      startedAt: new Date(),
    },
  })

  const parsed = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  })

  let importedCount = 0
  let duplicateCount = 0
  const errors: { row: number; message: string }[] = []

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i]!
    const name = row.name ?? row.title
    if (!name?.trim()) {
      errors.push({ row: i + 2, message: 'Brak nazwy firmy' })
      continue
    }

    const website = row.website ?? row.site ?? null
    const websiteNormalized = normalizeUrl(website)
    const emailNormalized = normalizeEmail(row.email)

    const existing = await db.company.findFirst({
      where: {
        organizationId,
        OR: [
          ...(websiteNormalized ? [{ websiteNormalized }] : []),
          ...(emailNormalized ? [{ emailNormalized }] : []),
        ],
      },
    })

    if (existing) {
      duplicateCount++
      continue
    }

    try {
      await db.company.create({
        data: {
          organizationId,
          name: name.trim(),
          industry: row.industry ?? row.category ?? null,
          city: row.city ?? null,
          email: row.email ?? null,
          phone: row.phone ?? null,
          website,
          websiteNormalized,
          emailNormalized,
          source: 'CSV_IMPORT',
        },
      })
      importedCount++
    } catch (e) {
      errors.push({
        row: i + 2,
        message: e instanceof Error ? e.message : 'Błąd zapisu',
      })
    }
  }

  await db.importJob.update({
    where: { id: job.id },
    data: {
      status: 'COMPLETED',
      totalRows: parsed.data.length,
      importedCount,
      duplicateCount,
      errorCount: errors.length,
      errors,
      completedAt: new Date(),
    },
  })

  await db.activityLog.create({
    data: {
      organizationId,
      userId,
      type: 'IMPORT_COMPLETED',
      title: 'Import CSV zakończony',
      description: `Zaimportowano ${importedCount} firm, duplikaty: ${duplicateCount}`,
      metadata: { jobId: job.id, importedCount, duplicateCount },
    },
  })

  return { importedCount, duplicateCount, errorCount: errors.length, errors }
}

export async function fetchOutscraperCompanies(
  organizationId: string,
  userId: string,
  params: { industry: string; country: string; limit: number },
) {
  const job = await db.importJob.create({
    data: {
      organizationId,
      type: 'OUTSCRAPER',
      status: 'PROCESSING',
      params,
      startedAt: new Date(),
    },
  })

  const apiKey = process.env.OUTSCRAPER_API_KEY
  let results: Array<{
    name: string
    industry?: string
    city?: string
    email?: string
    phone?: string
    website?: string
  }> = []

  if (apiKey) {
    try {
      const query = encodeURIComponent(`${params.industry} ${params.country}`)
      const url = `https://api.app.outscraper.com/maps/search-v3?query=${query}&limit=${params.limit}&async=false`
      const res = await fetch(url, {
        headers: { 'X-API-KEY': apiKey },
      })
      const data = (await res.json()) as {
        data?: Array<Array<Record<string, string>>>
      }
      const items = data.data?.[0] ?? []
      results = items.map((item) => ({
        name: item.name ?? item.title ?? 'Unknown',
        industry: params.industry,
        city: item.city ?? item.full_address,
        email: item.email,
        phone: item.phone,
        website: item.site ?? item.website,
      }))
    } catch {
      results = generateMockCompanies(params)
    }
  } else {
    results = generateMockCompanies(params)
  }

  let importedCount = 0
  let duplicateCount = 0

  for (const item of results) {
    const websiteNormalized = normalizeUrl(item.website)
    const emailNormalized = normalizeEmail(item.email)

    const existing = await db.company.findFirst({
      where: {
        organizationId,
        OR: [
          ...(websiteNormalized ? [{ websiteNormalized }] : []),
          ...(emailNormalized ? [{ emailNormalized }] : []),
        ],
      },
    })

    if (existing) {
      duplicateCount++
      continue
    }

    await db.company.create({
      data: {
        organizationId,
        name: item.name,
        industry: item.industry,
        city: item.city,
        email: item.email,
        phone: item.phone,
        website: item.website,
        websiteNormalized,
        emailNormalized,
        source: 'OUTSCRAPER',
      },
    })
    importedCount++
  }

  await db.importJob.update({
    where: { id: job.id },
    data: {
      status: 'COMPLETED',
      totalRows: results.length,
      importedCount,
      duplicateCount,
      completedAt: new Date(),
    },
  })

  await db.activityLog.create({
    data: {
      organizationId,
      userId,
      type: 'IMPORT_COMPLETED',
      title: 'Pobrano firmy z Outscraper',
      description: `Zaimportowano ${importedCount} firm`,
      metadata: { jobId: job.id, params },
    },
  })

  return { importedCount, duplicateCount, total: results.length }
}

function generateMockCompanies(params: { industry: string; country: string; limit: number }) {
  return Array.from({ length: Math.min(params.limit, 10) }, (_, i) => ({
    name: `${params.industry} Firma ${i + 1}`,
    industry: params.industry,
    city: params.country === 'PL' ? 'Warszawa' : 'Berlin',
    email: `kontakt@firma${i + 1}.pl`,
    phone: `+48 500 100 ${100 + i}`,
    website: `https://firma${i + 1}.example.com`,
  }))
}
