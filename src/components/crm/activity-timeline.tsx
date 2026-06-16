import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ActivityLog, Message, Note, Reply, CompanyAnalysis } from '@prisma/client'

type TimelineItem =
  | { type: 'activity'; data: ActivityLog; date: Date }
  | { type: 'analysis'; data: CompanyAnalysis; date: Date }
  | { type: 'message'; data: Message; date: Date }
  | { type: 'reply'; data: Reply; date: Date }
  | { type: 'note'; data: Note & { author: { name: string | null; email: string } }; date: Date }

interface ActivityTimelineProps {
  activities: ActivityLog[]
  analyses: CompanyAnalysis[]
  messages: Message[]
  replies: Reply[]
  notes: Array<Note & { author: { name: string | null; email: string } }>
}

export function ActivityTimeline({
  activities,
  analyses,
  messages,
  replies,
  notes,
}: ActivityTimelineProps) {
  const items: TimelineItem[] = [
    ...activities.map((a) => ({ type: 'activity' as const, data: a, date: a.createdAt })),
    ...analyses.map((a) => ({ type: 'analysis' as const, data: a, date: a.analyzedAt })),
    ...messages.map((m) => ({ type: 'message' as const, data: m, date: m.createdAt })),
    ...replies.map((r) => ({ type: 'reply' as const, data: r, date: r.receivedAt })),
    ...notes.map((n) => ({ type: 'note' as const, data: n, date: n.createdAt })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Brak aktywności</p>
  }

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4 border-l-2 border-slate-200 pl-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{item.type}</Badge>
              <span className="text-xs text-slate-400">{formatDate(item.date)}</span>
            </div>
            <TimelineContent item={item} />
          </div>
        </div>
      ))}
    </div>
  )
}

function TimelineContent({ item }: { item: TimelineItem }) {
  switch (item.type) {
    case 'activity':
      return (
        <div className="mt-1">
          <p className="font-medium text-sm">{item.data.title}</p>
          {item.data.description && (
            <p className="text-sm text-slate-600">{item.data.description}</p>
          )}
        </div>
      )
    case 'analysis':
      return (
        <div className="mt-1">
          <p className="font-medium text-sm">Analiza — Lead Score: {item.data.score}/100</p>
          <p className="text-sm text-slate-600">{item.data.expertSummary}</p>
        </div>
      )
    case 'message':
      return (
        <div className="mt-1">
          <p className="font-medium text-sm">{item.data.subject}</p>
          <p className="text-sm text-slate-600 line-clamp-2">{item.data.body}</p>
          <div className="mt-1 flex gap-2 text-xs text-slate-400">
            {item.data.deliveredAt && <span>Dostarczono</span>}
            {item.data.openedAt && <span>Otwarto</span>}
            {item.data.clickedAt && <span>Kliknięto</span>}
            {item.data.sentAt && <span>Wysłano</span>}
          </div>
        </div>
      )
    case 'reply':
      return (
        <div className="mt-1">
          <p className="font-medium text-sm">Odpowiedź: {item.data.fromEmail}</p>
          <p className="text-sm text-slate-600 line-clamp-3">{item.data.body}</p>
        </div>
      )
    case 'note':
      return (
        <div className="mt-1">
          <p className="text-xs text-slate-400">
            {item.data.author.name ?? item.data.author.email}
          </p>
          <p className="text-sm text-slate-700">{item.data.content}</p>
        </div>
      )
  }
}
