#!/usr/bin/env bash
set -e

# Install deps if venv doesn't exist
if [ ! -d ".venv" ]; then
  python -m venv .venv
  source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate
  pip install -r requirements.txt
else
  source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate
fi

# Copy .env.example → .env if not present
[ -f ".env" ] || cp .env.example .env

# Run migrations then start dev server
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
