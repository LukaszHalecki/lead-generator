# Lead Generator

SaaS do pozyskiwania klientów dla agencji tworzącej strony internetowe (Pixel-app).

## Stos technologiczny

- **Frontend:** React 19, TanStack Start, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** TanStack Start Server Functions, PostgreSQL, Prisma ORM
- **Integracje:** Outscraper API, OpenAI API, Instantly API

## Funkcjonalności MVP

1. **Lead Score (0–100)** — SSL, mobile, responsywność, szybkość, meta tagi, H1, formularz, Maps, social, GA
2. **AI Sales Opportunity** — Low / Medium / High + uzasadnienie sprzedażowe
3. **Automatyczna wycena** — Landing Page, Strona firmowa, Sklep internetowy
4. **Rozbudowany raport AI** — problemy, wpływ biznesowy, rekomendacje, podsumowanie eksperckie
5. **Dashboard** — KPI, wykresy Lead Score, statusy, trendy analiz, Instantly engagement
6. **CRM** — historia analiz, raportów, wiadomości, notatki, oś czasu
7. **Instantly** — delivered, opened, clicked, replied (webhook + agregaty)
8. **Workflow** — Import → Analiza → Raport → Wiadomość → Kampania (jeden widok firmy)

## Uruchomienie

```bash
pnpm install
docker compose up -d   # lub lokalny PostgreSQL
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Aplikacja: http://localhost:3000

## Dokumentacja

| Dokument | Opis |
|----------|------|
| [Architektura](docs/architecture.md) | Wzorce, przepływy danych, moduły |
| [Struktura katalogów](docs/directory-structure.md) | Pełna struktura plików |
| [Roadmapa](docs/roadmap.md) | Plan implementacji |
| [Schemat Prisma](prisma/schema.prisma) | Model bazy danych |
