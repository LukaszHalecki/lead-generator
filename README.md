# Lead Generator

SaaS do pozyskiwania klientów dla agencji tworzącej strony internetowe (Pixel-app).

## Stos technologiczny

- **Frontend:** React 19, TanStack Start, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** TanStack Start Server Functions, PostgreSQL, Prisma ORM
- **Integracje:** Outscraper API, OpenAI API, Instantly API

## Funkcjonalności MVP

### Lead Score (0–100) — 17 kryteriów

SSL, Mobile Friendly, Responsywność, Szybkość, Meta Title/Description, H1, Formularz, Google Maps, Social Media, Google Analytics, Google Tag Manager, Favicon, Polityka prywatności, Certyfikat bezpieczeństwa, Wiek domeny, Aktualność technologii.

**Zakresy:** 0–20 Bardzo słaba | 21–40 Duże problemy | 41–60 Modernizacja | 61–80 Dobra | 81–100 Bardzo dobra

### Priorytet leadów

- **Hot Leads** — Score &lt; 40 + High Opportunity
- **Warm Leads** — Score 40–60 + Medium Opportunity
- **Cold Leads** — Score &gt; 60 + Low Opportunity

### Pozostałe moduły

AI Sales Opportunity, wycena AI (Landing / Strona firmowa / E-commerce), raport AI, dashboard KPI + wykresy, CRM, Instantly webhooks, workflow jednym kliknięciem.

## Uruchomienie

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Aplikacja: http://localhost:3000
