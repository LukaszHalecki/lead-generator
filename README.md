# Lead Generator

SaaS do pozyskiwania klientów dla agencji tworzącej strony internetowe (Pixel-app).

## Stos technologiczny

- **Frontend:** React 19, TanStack Start, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** TanStack Start Server Functions, PostgreSQL, Prisma ORM
- **Integracje:** Outscraper API, OpenAI API, Instantly API

## Dokumentacja projektowa

| Dokument | Opis |
|----------|------|
| [Architektura](docs/architecture.md) | Wzorce, przepływy danych, moduły, bezpieczeństwo |
| [Struktura katalogów](docs/directory-structure.md) | Pełna struktura plików i konwencje |
| [Roadmapa](docs/roadmap.md) | Plan implementacji MVP w 8 fazach |
| [Schemat Prisma](prisma/schema.prisma) | Model bazy danych multi-tenant |

## Status

**Faza projektowa** — przygotowano architekturę, schemat bazy i roadmapę. Pełna implementacja kodu w kolejnych iteracjach.

## MVP — zakres funkcjonalny

1. Dashboard z metrykami KPI
2. Import firm (CSV + Outscraper API) z deduplikacją
3. Baza firm ze statusami workflow
4. Analiza stron WWW (techniczna + AI, wynik 0–100)
5. Raporty AI (problemy, rekomendacje)
6. Kampanie mailingowe z filtrami
7. Integracja Instantly (kampanie, leady, statystyki, odpowiedzi)
8. Generator wiadomości AI (spersonalizowane emaile)
9. CRM (historia analiz, wiadomości, odpowiedzi, notatki)

## Uruchomienie (po implementacji)

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm prisma migrate dev
pnpm dev
```
