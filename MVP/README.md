# G-MIX Platform

Business game platform for pedagogical simulations.

## Project Structure

```
MVP/
├── frontend/                    # Next.js frontend (App Router)
│   ├── src/
│   │   ├── app/                # Pages and routes
│   │   ├── components/         # React components
│   │   ├── lib/               # Utilities and helpers
│   │   └── types/             # TypeScript types
│   ├── .env                    # Environment variables (configured)
│   ├── .env.example            # Environment template
│   └── package.json
│
├── backend/
│   ├── django_alternative/     # Django REST API backend
│   │   ├── .env               # Environment variables (configured)
│   │   ├── .env.example       # Environment template
│   │   ├── gmix/              # Django project settings
│   │   ├── accounts/          # Authentication & profiles
│   │   ├── organizations/     # Organization management
│   │   ├── scenarios/         # Scenario management
│   │   ├── sessions/          # Game sessions
│   │   ├── game/              # Game engine & decisions
│   │   └── ai_generation/     # AI scenario generation
│   │
│   └── supabase_alternative/   # Supabase backend alternative
│       ├── .env               # Environment variables (configured)
│       ├── .env.example       # Environment template
│       ├── db/                # Database schema & policies
│       └── README.md
│
└── usage/                      # Utility scripts and shared packages
    ├── README.md
    ├── extract_source_maps.py # Source map extraction tool
    ├── package.json           # Root package.json (moved)
    ├── packages/              # Shared packages (moved)
    │   ├── ai/               # AI scenario builder
    │   ├── game-engine/      # Game calculation engine
    │   └── shared/           # Shared TypeScript types
    └── frontend_recovered/    # Recovered frontend files (archive)
```

## Quick Start

### Frontend

```bash
cd frontend
npm install
# Environment is already configured
npm run dev
```

### Django Backend

```bash
cd backend/django_alternative
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
# Environment is already configured
python manage.py migrate
python manage.py runserver
```

## Backend Selection

The frontend can work with either backend:

1. **Supabase (default)**: Set `BACKEND_TYPE=supabase` in frontend `.env.local`
2. **Django**: Set `BACKEND_TYPE=django` and `DJANGO_API_URL=http://localhost:8000`

## Features

- **Multi-role platform**: Admin, Formateur, Joueur
- **Business game sessions**: Create and manage game sessions
- **AI scenario generation**: Generate custom scenarios with Anthropic Claude
- **Team management**: Organize players into teams
- **Decision tracking**: Record and calculate game decisions
- **Real-time results**: Calculate KPIs and scores

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Django REST Framework or Supabase
- **Database**: PostgreSQL (local or Supabase)
- **AI**: Anthropic Claude for scenario generation
- **Auth**: JWT (Django) or Supabase Auth

## Environment Variables

All environment files are pre-configured with the necessary keys.

### Frontend (.env)
- Supabase URL and keys configured
- Backend type: supabase

### Django Backend (.env)
- Database credentials configured
- Anthropic API key configured
- CORS settings configured

### Supabase Alternative (.env)
- Supabase credentials configured
- Anthropic API key configured

## API Documentation

See individual backend folders for API documentation:
- [Django API](backend/django_alternative/README.md)
- [Supabase Schema](backend/supabase_alternative/README.md)

## Note

The `apps/` directory contains some locked files from a previous Next.js build that cannot be deleted while the system is running. After restarting your computer, you can safely delete the `apps/` directory.