# Supabase Alternative Backend

Alternative backend implementation using Supabase for G-MIX platform.

## Features

- **Auth**: Supabase Auth with email/password and admin user creation
- **Database**: Supabase Postgres with RLS (Row Level Security)
- **Storage**: File storage for assets and resources
- **Functions**: Edge functions for business logic
- **Realtime**: Real-time updates for game sessions

## Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note your Project URL and API keys

2. **Environment Variables**
   ```bash
   SUPABASE_URL=your-project-url
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Database Schema**
   - Run the SQL schema in `db/schema.sql`
   - Enable RLS on all tables
   - Create policies in `db/policies.sql`

4. **Storage Buckets**
   - Create bucket: `game-assets`
   - Set public access for assets

5. **Edge Functions**
   - Deploy functions in `functions/`
   - Configure function permissions

## Database Structure

- `profiles`: User profiles with roles
- `organizations`: Organization management
- `scenarios`: Game scenarios
- `game_sessions`: Active game sessions
- `teams`: Team management
- `decisions`: Player decisions
- `turn_results`: Turn results and KPIs

## API Endpoints

- `GET /api/scenarios`: List scenarios
- `POST /api/sessions`: Create session
- `POST /api/decisions`: Submit decision
- `GET /api/results/:turnId`: Get results

## Development

```bash
# Install Supabase CLI
npm install -g @supabase/supabase

# Start local development
supabase start

# Push schema changes
supabase db push

# Deploy functions
supabase functions deploy