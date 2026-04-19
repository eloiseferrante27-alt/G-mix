# G-MIX Platform

Plateforme de business game pédagogique permettant aux organismes de formation de créer et animer des simulations de gestion en équipe.

## Démarrage rapide

```bash
cd MVP

# Supabase (défaut)
./start_app.sh

# Django comme backend
./start_app.sh django

# Arrêter
./stop_app.sh
```

L'application est accessible sur **http://localhost:3000**

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | `admin@gmix.fr` | `gmix1234` |
| Organisme | `organisme@gmix.fr` | `gmix1234` |
| Formateur | `formateur@gmix.fr` | `gmix1234` |
| Joueur | `joueur@gmix.fr` | `gmix1234` |

## Structure du projet

```
MVP/
├── start_app.sh                 # Démarrage (supabase ou django)
├── stop_app.sh                  # Arrêt propre
│
├── frontend/                    # Next.js 15 — App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/           # Interface administrateur
│   │   │   ├── organisme/       # Interface organisme (dashboard, membres, invitations)
│   │   │   ├── formateur/       # Interface formateur (sessions, scénarios, équipes)
│   │   │   ├── jeu/             # Interface joueur
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── actions/         # Server actions (auth, etc.)
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, layout partagé
│   │   │   └── ui/              # Composants UI (Button, Card, Badge…)
│   │   └── lib/
│   │       ├── supabase/        # Clients Supabase (server, service)
│   │       ├── session.ts       # Gestion de la session cookie
│   │       ├── backend.ts       # Abstraction Supabase/Django
│   │       └── plans.ts         # Configuration des plans tarifaires
│   ├── public/
│   │   └── gmix-logo.png        # Logo officiel
│   ├── .env.local               # Variables d'environnement (à créer depuis .env.example)
│   └── .env.example             # Template des variables
│
└── backend/
    ├── django_alternative/      # Backend Django REST Framework
    │   ├── accounts/            # Auth & profils
    │   ├── organizations/       # Gestion des organisations
    │   ├── scenarios/           # Scénarios de jeu
    │   ├── sessions/            # Sessions de jeu
    │   └── requirements.txt
    │
    └── supabase_alternative/    # Backend Supabase (primaire)
        └── db/
            ├── schema.sql       # Schéma complet (source de vérité)
            └── policies.sql     # Politiques RLS
```

## Rôles utilisateur

| Rôle | Description | Accès |
|------|-------------|-------|
| **Admin** | Équipe G-MIX | Vue globale, gestion de toutes les organisations et utilisateurs |
| **Organisme** | Établissement de formation | Crée son organisation, gère les accès formateurs/joueurs, contrôle les plans |
| **Formateur** | Animateur de sessions | Crée et anime les sessions, gère les équipes, invite des joueurs |
| **Joueur** | Participant | Accède à ses sessions, soumet ses décisions |

## Choix du backend

Le frontend fonctionne avec deux backends interchangeables via la variable `BACKEND_TYPE` dans `.env.local` :

| Backend | Variable | Prérequis |
|---------|----------|-----------|
| **Supabase** (défaut) | `BACKEND_TYPE=supabase` | Clés Supabase dans `.env.local` |
| **Django** | `BACKEND_TYPE=django` | Serveur Django sur port 8000 |

`start_app.sh` met à jour `BACKEND_TYPE` automatiquement selon l'argument passé.

## Variables d'environnement

Copier `frontend/.env.example` → `frontend/.env.local` et renseigner :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Backend
BACKEND_TYPE=supabase          # ou django
DJANGO_API_URL=http://localhost:8000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# IA (optionnel — pour la génération de scénarios)
ANTHROPIC_API_KEY=sk-ant-...
```

## Stack technique

- **Frontend** : Next.js 15, React, TypeScript, Tailwind CSS
- **Backend primaire** : Supabase (PostgreSQL + Auth + RLS)
- **Backend alternatif** : Django REST Framework + SimpleJWT
- **IA** : Anthropic Claude (génération de scénarios)
- **Auth** : Supabase Auth (JWT) ou Django SimpleJWT

## Base de données (Supabase)

Le schéma complet est dans [`backend/supabase_alternative/db/schema.sql`](backend/supabase_alternative/db/schema.sql).  
Les politiques RLS sont dans [`backend/supabase_alternative/db/policies.sql`](backend/supabase_alternative/db/policies.sql).

Tables principales : `organizations`, `profiles`, `scenarios`, `game_sessions`, `teams`, `team_members`, `turns`, `decisions`, `turn_results`, `organization_invites`.

## Installation manuelle (sans start_app.sh)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # puis éditer .env.local
npm run dev
```

### Django (optionnel)

```bash
cd backend/django_alternative
python -m venv .venv
source .venv/Scripts/activate   # Windows : .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
