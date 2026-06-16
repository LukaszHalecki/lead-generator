import { db } from '@/server/db'
import { AGENCY_SIGNATURE } from '@/lib/constants'
import type { CompanyAnalysis } from '@prisma/client'

export async function generateCompanyMessage(
  companyId: string,
  organizationId: string,
  userId: string,
) {
  const company = await db.company.findFirst({
    where: { id: companyId, organizationId },
    include: {
      analyses: { orderBy: { analyzedAt: 'desc' }, take: 1 },
    },
  })

  if (!company) throw new Error('Firma nie znaleziona')

  const analysis = company.analyses[0]
  if (!analysis) throw new Error('Brak analizy — najpierw przeanalizuj stronę')

  const problems = (analysis.problems as string[]).slice(0, 3)
  const subject = `Kilka uwag dotyczących strony ${company.name}`

  const body = `Dzień dobry,

Przeanalizowaliśmy stronę internetową firmy ${company.name} i przyznaliśmy jej wynik ${analysis.score}/100 punktów.

Najważniejsze obszary do poprawy:
${problems.map((p, i) => `${i + 1}. ${p}`).join('\n')}

${analysis.expertSummary ?? ''}

Chętnie omówimy modernizację obecnej strony lub stworzenie nowej witryny dopasowanej do potrzeb Państwa firmy.

Orientacyjna wycena strony firmowej: od ${analysis.pricingCompanySite?.toLocaleString('pl-PL')} PLN.

Pozdrawiamy,
Zespół ${AGENCY_SIGNATURE}`

  const message = await db.message.create({
    data: {
      companyId,
      subject,
      body,
      generatedByAi: true,
    },
  })

  await db.activityLog.create({
    data: {
      organizationId,
      companyId,
      userId,
      type: 'MESSAGE_GENERATED',
      title: 'Wygenerowano wiadomość AI',
      description: subject,
      metadata: { messageId: message.id },
    },
  })

  return message
}

export function getTopProblems(analysis: CompanyAnalysis, limit = 3): string[] {
  return (analysis.problems as string[]).slice(0, limit)
}
