import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface StatsCardsProps {
  stats: {
    totalCompanies: number
    avgLeadScore: number
    below40Count: number
    highOpportunityCount: number
    potentialValue: number
    campaignsCount: number
    repliesCount: number
    hotLeadsCount: number
    warmLeadsCount: number
    coldLeadsCount: number
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
    { title: 'Liczba firm', value: stats.totalCompanies },
    { title: 'Średni Lead Score', value: `${stats.avgLeadScore}/100` },
    { title: 'Firmy poniżej 40 pkt', value: stats.below40Count },
    { title: 'Wysoka szansa sprzedaży', value: stats.highOpportunityCount },
    { title: 'Potencjalna wartość projektów', value: formatCurrency(stats.potentialValue) },
    { title: 'Liczba kampanii', value: stats.campaignsCount },
    { title: 'Liczba odpowiedzi', value: stats.repliesCount },
    { title: 'Hot Leads', value: stats.hotLeadsCount },
    { title: 'Warm Leads', value: stats.warmLeadsCount },
    { title: 'Cold Leads', value: stats.coldLeadsCount },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

export function InstantlyStats({ engagement }: { engagement: StatsCardsProps['stats']['emailEngagement'] }) {
  const items = [
    { label: 'Dostarczone', value: engagement.delivered },
    { label: 'Otwarte', value: engagement.opened },
    { label: 'Kliknięcia', value: engagement.clicked },
    { label: 'Odpowiedzi', value: engagement.replied },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Instantly — {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
