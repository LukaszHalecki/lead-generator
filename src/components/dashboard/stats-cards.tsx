import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface StatsCardsProps {
  stats: {
    totalCompanies: number
    analyzedCount: number
    toContactCount: number
    sentMessages: number
    repliesCount: number
    avgLeadScore: number
    below40Count: number
    highOpportunityCount: number
    potentialValue: number
    emailEngagement: {
      delivered: number
      opened: number
      clicked: number
      replied: number
    }
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    { title: 'Firmy w bazie', value: stats.totalCompanies },
    { title: 'Przeanalizowane', value: stats.analyzedCount },
    { title: 'Do kontaktu', value: stats.toContactCount },
    { title: 'Wysłane wiadomości', value: stats.sentMessages },
    { title: 'Odpowiedzi', value: stats.repliesCount },
    { title: 'Średni Lead Score', value: `${stats.avgLeadScore}/100` },
    { title: 'Wynik poniżej 40', value: stats.below40Count },
    { title: 'Wysoka szansa sprzedaży', value: stats.highOpportunityCount },
    { title: 'Potencjalna wartość', value: formatCurrency(stats.potentialValue) },
    { title: 'Dostarczone (Instantly)', value: stats.emailEngagement.delivered },
    { title: 'Otwarte (Instantly)', value: stats.emailEngagement.opened },
    { title: 'Kliknięcia (Instantly)', value: stats.emailEngagement.clicked },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
