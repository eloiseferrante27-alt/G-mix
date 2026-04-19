# G-MIX Frontend

Business game platform frontend built with Next.js 15 (App Router), TypeScript, and Tailwind CSS.

## Features

- **Dual Backend Support**: Works with both Supabase and Django backends
- **Authentication**: Server actions for login/register with Supabase or Django
- **Role-based UI**: Different dashboards for admins, formateurs, and joueurs
- **Business Game Management**: Create and manage game sessions and scenarios
- **AI Scenario Generation**: Generate scenarios using Anthropic AI (when enabled)

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (auth & database)
- **React Hook Form** (forms)
- **Zod** (validation)
- **Jotai** (state management)

## Backend Selection

Set `BACKEND_TYPE` in `.env.local`:

- `supabase` (default): Uses Supabase for auth and database
- `django`: Proxies API calls to Django backend at `DJANGO_API_URL`

## Installation

```bash
npm install
cp .env.example .env.local
# Configure your environment variables
npm run dev
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── login/             # Login page
│   ├── formateur/         # Formateur dashboard
│   └── ...
├── components/            # Reusable components
│   ├── ui/               # UI primitives (Button, Card, etc.)
│   ├── auth/             # Authentication components
│   └── layout/           # Layout components
├── lib/                  # Utilities and helpers
│   ├── supabase/         # Supabase client setup
│   ├── backend/          # Backend abstraction layer
│   ├── session/          # Session management
│   └── plans/            # Plan configuration
└── types/               # TypeScript type definitions
```

## Environment Variables

See `.env.example` for required variables.

## Development

- **Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`