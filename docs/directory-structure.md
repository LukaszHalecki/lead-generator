# Lead Generator — Struktura katalogów

Konwencja oparta na TanStack Start (file-based routing) z podziałem na warstwy domenowe.

```
lead-generator/
├── .env.example
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── components.json                 # shadcn/ui config
├── tailwind.config.ts
├── postcss.config.js
│
├── prisma/
│   ├── schema.prisma               # Schemat bazy danych
│   ├── migrations/                 # Migracje Prisma
│   └── seed.ts                     # Dane deweloperskie
│
├── public/
│   ├── favicon.ico
│   └── logo.svg
│
├── docs/
│   ├── architecture.md
│   ├── directory-structure.md
│   └── roadmap.md
│
└── src/
    ├── router.tsx                  # Konfiguracja TanStack Router
    ├── routeTree.gen.ts            # Auto-generowany (nie edytować)
    ├── styles/
    │   └── globals.css             # Tailwind directives + CSS variables
    │
    ├── routes/                     # File-based routing
    │   ├── __root.tsx              # Root layout (html, head, providers)
    │   ├── index.tsx               # Redirect → /dashboard
    │   │
    │   ├── _auth/                  # Pathless layout — strony bez sidebara
    │   │   ├── route.tsx
    │   │   ├── login.tsx
    │   │   └── register.tsx
    │   │
    │   ├── _app/                   # Pathless layout — chroniony panel
    │   │   ├── route.tsx           # Sidebar + auth guard
    │   │   │
    │   │   ├── dashboard/
    │   │   │   └── index.tsx       # /dashboard — metryki KPI
    │   │   │
    │   │   ├── companies/
    │   │   │   ├── index.tsx       # /companies — lista firm (tabela + filtry)
    │   │   │   ├── $companyId.tsx  # /companies/:id — szczegóły + CRM
    │   │   │   └── import.tsx      # /companies/import — CSV + Outscraper
    │   │   │
    │   │   ├── analysis/
    │   │   │   └── index.tsx       # /analysis — kolejka analiz
    │   │   │
    │   │   ├── campaigns/
    │   │   │   ├── index.tsx       # /campaigns — lista kampanii
    │   │   │   ├── new.tsx         # /campaigns/new — tworzenie + filtry
    │   │   │   └── $campaignId.tsx # /campaigns/:id — statystyki Instantly
    │   │   │
    │   │   └── settings/
    │   │       ├── index.tsx       # /settings — ogólne
    │   │       └── integrations.tsx# /settings/integrations — klucze API
    │   │
    │   └── api/                    # Server routes (REST)
    │       ├── health.ts           # GET /api/health
    │       └── webhooks/
    │           └── instantly.ts    # POST /api/webhooks/instantly
    │
    ├── components/
    │   ├── ui/                     # shadcn/ui primitives
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── table.tsx
    │   │   ├── dialog.tsx
    │   │   ├── form.tsx
    │   │   ├── input.tsx
    │   │   ├── select.tsx
    │   │   ├── badge.tsx
    │   │   ├── tabs.tsx
    │   │   └── ...
    │   │
    │   ├── layout/
    │   │   ├── app-sidebar.tsx
    │   │   ├── app-header.tsx
    │   │   └── page-header.tsx
    │   │
    │   ├── dashboard/
    │   │   ├── stats-cards.tsx
    │   │   └── stats-card.tsx
    │   │
    │   ├── companies/
    │   │   ├── company-table.tsx
    │   │   ├── company-filters.tsx
    │   │   ├── company-status-badge.tsx
    │   │   ├── score-badge.tsx
    │   │   ├── csv-import-form.tsx
    │   │   └── outscraper-form.tsx
    │   │
    │   ├── analysis/
    │   │   ├── analysis-report.tsx
    │   │   ├── technical-checks.tsx
    │   │   ├── problems-list.tsx
    │   │   └── recommendations-list.tsx
    │   │
    │   ├── campaigns/
    │   │   ├── campaign-form.tsx
    │   │   ├── campaign-filters.tsx
    │   │   ├── campaign-stats.tsx
    │   │   └── message-preview.tsx
    │   │
    │   └── crm/
    │       ├── activity-timeline.tsx
    │       ├── note-form.tsx
    │       └── reply-card.tsx
    │
    ├── server/
    │   ├── db.ts                   # Singleton Prisma Client
    │   │
    │   ├── middleware/
    │   │   ├── auth.ts             # Weryfikacja sesji
    │   │   └── organization.ts     # Kontekst organizacji + RBAC
    │   │
    │   ├── repositories/           # Warstwa dostępu do danych
    │   │   ├── company.repository.ts
    │   │   ├── analysis.repository.ts
    │   │   ├── campaign.repository.ts
    │   │   ├── message.repository.ts
    │   │   ├── activity.repository.ts
    │   │   └── import.repository.ts
    │   │
    │   ├── services/               # Logika biznesowa
    │   │   ├── dashboard.service.ts
    │   │   ├── company.service.ts
    │   │   ├── import.service.ts
    │   │   ├── deduplication.service.ts
    │   │   ├── analysis/
    │   │   │   ├── analysis.service.ts
    │   │   │   ├── technical-analyzer.ts
    │   │   │   ├── ai-analyzer.ts
    │   │   │   └── score-calculator.ts
    │   │   ├── campaign.service.ts
    │   │   ├── message-generator.service.ts
    │   │   ├── crm.service.ts
    │   │   └── credential.service.ts
    │   │
    │   ├── integrations/           # Klienci zewnętrznych API
    │   │   ├── outscraper/
    │   │   │   ├── client.ts
    │   │   │   ├── types.ts
    │   │   │   └── mapper.ts
    │   │   ├── instantly/
    │   │   │   ├── client.ts
    │   │   │   ├── types.ts
    │   │   │   └── webhook-handler.ts
    │   │   └── openai/
    │   │       ├── client.ts
    │   │       ├── prompts/
    │   │       │   ├── analysis.prompt.ts
    │   │       │   └── email.prompt.ts
    │   │       └── types.ts
    │   │
    │   ├── jobs/                   # Zadania w tle
    │   │   ├── queue.ts
    │   │   ├── analyze-company.job.ts
    │   │   ├── import-csv.job.ts
    │   │   ├── outscraper-fetch.job.ts
    │   │   └── sync-instantly.job.ts
    │   │
    │   └── functions/              # Server Functions (createServerFn)
    │       ├── dashboard.fn.ts
    │       ├── companies.fn.ts
    │       ├── import.fn.ts
    │       ├── analysis.fn.ts
    │       ├── campaigns.fn.ts
    │       ├── messages.fn.ts
    │       └── crm.fn.ts
    │
    └── lib/
        ├── utils.ts                # cn(), formatters
        ├── constants.ts            # Statusy, progi score, etykiety PL
        ├── validators/
        │   ├── company.schema.ts
        │   ├── import.schema.ts
        │   ├── campaign.schema.ts
        │   └── outscraper.schema.ts
        ├── auth/
        │   ├── session.ts
        │   └── password.ts
        ├── crypto.ts               # Szyfrowanie ApiCredential
        └── url.ts                  # Normalizacja URL (deduplikacja)
```

## Konwencje nazewnictwa

| Typ | Konwencja | Przykład |
|-----|-----------|----------|
| Route file | kebab-case lub camelCase | `$companyId.tsx` |
| Komponent | PascalCase | `CompanyTable.tsx` |
| Service | `*.service.ts` | `import.service.ts` |
| Repository | `*.repository.ts` | `company.repository.ts` |
| Server Function | `*.fn.ts` | `companies.fn.ts` |
| Schema Zod | `*.schema.ts` | `company.schema.ts` |
| Job | `*.job.ts` | `analyze-company.job.ts` |

## Mapowanie tras → funkcjonalności MVP

| Trasa | Moduł MVP |
|-------|-----------|
| `/dashboard` | Dashboard — KPI |
| `/companies` | Baza firm |
| `/companies/import` | Import CSV + Outscraper |
| `/companies/:id` | Szczegóły firmy + raport AI + CRM |
| `/analysis` | Kolejka / masowa analiza |
| `/campaigns` | Kampanie mailingowe |
| `/campaigns/new` | Filtry + tworzenie kampanii |
| `/campaigns/:id` | Statystyki Instantly |
| `/settings/integrations` | Klucze API |

## Zależności między warstwami

```
routes → server/functions → server/services → server/repositories → Prisma
                         → server/integrations (zewnętrzne API)
                         → server/jobs (async)
components → server/functions (przez TanStack Query / loader)
```

**Reguła:** `components/` nie importuje bezpośrednio z `prisma/` ani `server/repositories/`.
