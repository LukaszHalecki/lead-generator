import { Link } from '@tanstack/react-router'
import {
  Building2,
  LayoutDashboard,
  Mail,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/companies', label: 'Baza firm', icon: Building2 },
  { to: '/companies/import', label: 'Import', icon: Upload },
  { to: '/campaigns', label: 'Kampanie', icon: Mail },
] as const

export function AppSidebar() {
  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 p-6">
        <Link to="/dashboard" className="text-lg font-bold text-slate-900">
          Lead Generator
        </Link>
        <p className="text-xs text-slate-500">Pixel-app</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900',
            )}
            activeProps={{
              className:
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-white text-slate-900 shadow-sm',
            }}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

export function PageHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  )
}
