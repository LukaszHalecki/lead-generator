import type { SalesOpportunity } from '@prisma/client'

export interface OpportunityResult {
  overallOpportunity: SalesOpportunity
  opportunityReason: string
}

export function calculateSalesOpportunity(
  websiteScore: number,
  emailScore: number,
  marketingScore: number,
): OpportunityResult {
  const avgScore = (websiteScore + emailScore + marketingScore) / 3
  const weaknessCount = [websiteScore, emailScore, marketingScore].filter((s) => s < 50).length
  const criticalWeakness = [websiteScore, emailScore, marketingScore].some((s) => s < 35)

  let overallOpportunity: SalesOpportunity
  let opportunityReason: string

  if (avgScore < 45 || weaknessCount >= 2 || criticalWeakness) {
    overallOpportunity = 'HIGH'
    const issues: string[] = []
    if (websiteScore < 50) issues.push('słaba jakość strony WWW')
    if (emailScore < 50) issues.push('niekompletna infrastruktura email')
    if (marketingScore < 50) issues.push('słaba obecność marketingowa')
    opportunityReason =
      issues.length > 0
        ? `Website Score ${websiteScore}/100, Email Score ${emailScore}/100, Marketing Score ${marketingScore}/100. ` +
          `Wykryto: ${issues.join(', ')}. Silna szansa na projekt modernizacji strony, email marketing i analitykę.`
        : `Niski średni wynik audytu (${Math.round(avgScore)}/100) — firma wymaga kompleksowej poprawy obecności online.`
  } else if (avgScore < 65 || weaknessCount === 1) {
    overallOpportunity = 'MEDIUM'
    opportunityReason =
      `Website Score ${websiteScore}/100, Email Score ${emailScore}/100, Marketing Score ${marketingScore}/100. ` +
      `Firma posiada podstawową obecność online, ale widoczne luki w ${websiteScore < 60 ? 'jakości strony' : emailScore < 60 ? 'infrastrukturze email' : 'marketingu'} — dobry moment na ofertę ulepszeń.`
  } else {
    overallOpportunity = 'LOW'
    opportunityReason =
      `Website Score ${websiteScore}/100, Email Score ${emailScore}/100, Marketing Score ${marketingScore}/100. ` +
      `Firma ma dobrze rozwiniętą obecność online — ograniczony potencjał na pełną przebudowę, możliwe drobne usprawnienia.`
  }

  return { overallOpportunity, opportunityReason }
}
